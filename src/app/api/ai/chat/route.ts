import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { ChatCalendarService, type ChatResponse } from '@/services/ai/ChatCalendarService';
import { FriendAIService } from '@/services/ai/FriendAIService';
import { EmailService, emailService } from '@/services/email/EmailService';
import { getCalendarClient } from '@/lib/google-auth';
import { convertGoogleEventsToCalendarEvents } from '@/utils/typeConverters';
import { createClient } from '@supabase/supabase-js';
import { getUserFriendlyErrorMessage, getErrorSuggestions } from '@/lib/error-messages';
import { checkDuplicateEvent, recentEventCache, getDuplicateWarningMessage } from '@/lib/duplicate-detector';
import { generateSmartSuggestions } from '@/lib/smart-suggestions';
import { successResponse, errorResponse, ApiError, ErrorCodes } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/middleware/rateLimiter';
import { verifyToken } from '@/lib/auth/supabase-auth';
import type { CalendarEvent } from '@/types';

const chatService = new ChatCalendarService();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  let body: any;
  let locale = 'ko';
  
  try {
    // Rate limiting (AI endpoints are expensive)
    const rateLimitResponse = await checkRateLimit(request, 'ai');
    if (rateLimitResponse) return rateLimitResponse;
    body = await request.json();
    const { message, type = 'text', imageData, mimeType, sessionId, timezone = 'Asia/Seoul', lastExtractedEvent } = body;
    locale = body.locale || 'ko';

    logger.info('AI Chat API request received', { 
      messageLength: message?.length, 
      type, 
      hasImage: !!imageData,
      imageDataLength: imageData?.length,
      mimeType,
      sessionId,
      locale,
      timezone
    });

    // Get auth tokens
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;
    const authToken = cookieStore.get('auth-token')?.value;
    
    // Debug logging for production
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      logger.debug('Cookie check', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasAuthToken: !!authToken,
        cookiesPresent: cookieStore.getAll().map(c => c.name),
        type: type,
        locale: locale
      });
    }
    
    // Check for email auth first
    let isEmailAuth = false;
    let emailUser: any = null;
    if (authToken) {
      try {
        emailUser = await verifyToken(authToken);
        if (emailUser) {
          isEmailAuth = true;
          logger.info('Email auth user detected', { userId: emailUser.id, email: emailUser.email });
        }
      } catch (error) {
        logger.warn('Email token validation failed', { error });
      }
    }
    
    // For email auth users, we won't have Google Calendar access
    // So we'll provide limited functionality
    let calendar = null;
    if (!isEmailAuth) {
      if (!accessToken) {
        logger.warn('No access token found in cookies');
        throw new ApiError(
          401,
          ErrorCodes.UNAUTHENTICATED,
          getUserFriendlyErrorMessage({ code: 'UNAUTHENTICATED' }, locale)
        );
      }
      calendar = getCalendarClient(accessToken, refreshToken);
    }

    // Get user profile for context
    const profilePromise = (async () => {
      try {
        let userId = null;
        let userEmail = null;
        
        if (isEmailAuth && emailUser) {
          userId = emailUser.id;
          userEmail = emailUser.email;
        } else if (accessToken) {
          // For Google OAuth users, fetch user info from Google API
          try {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            
            if (userInfoResponse.ok) {
              const userInfo = await userInfoResponse.json();
              userId = userInfo.id;
              userEmail = userInfo.email;
              logger.debug('Google user info fetched', { userId, userEmail });
            }
          } catch (googleError) {
            logger.error('Failed to fetch Google user info', googleError);
          }
        }
        
        logger.debug('User detected', { userId, userEmail, isEmailAuth });
        
        if (userId) {
          // Try to get profile from our database using Google ID or email
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .or(`user_id.eq.${userId},email.eq.${userEmail}`)
            .single();
          
          if (profile) {
            return { ...profile, userId, userEmail };
          } else {
            // Return basic info if no profile exists
            return { userId, userEmail };
          }
        }
      } catch (error) {
        logger.error('Failed to fetch user profile', error);
      }
      return null;
    })();

    // Start fetching events in parallel with processing
    const eventsPromise = (async () => {
      if (!calendar) {
        // For email auth users, return empty events or fetch from database
        logger.info('Email auth user - no Google Calendar access');
        return [];
      }
      
      try {
        const now = new Date();
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: now.toISOString(),
          timeMax: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          maxResults: 50,
          singleEvents: true,
          orderBy: 'startTime'
        });
        return convertGoogleEventsToCalendarEvents(response.data.items);
      } catch (error) {
        logger.error('Failed to fetch events', error);
        return [];
      }
    })();

    let chatResponse: ChatResponse;
    let currentEvents: CalendarEvent[] = [];
    let userProfile: any = null;
    
    // Process based on type - start processing immediately
    if (type === 'image' && imageData) {
      // Process image in parallel with events fetching
      const [imageResponse, events, profile] = await Promise.all([
        chatService.extractEventFromImage(imageData, mimeType || 'image/png', locale, sessionId),
        eventsPromise,
        profilePromise
      ]);
      chatResponse = imageResponse;
      currentEvents = events;
      userProfile = profile;
    } else {
      // For text processing, we need events context first (but still fetch in parallel)
      const [events, profile] = await Promise.all([eventsPromise, profilePromise]);
      currentEvents = events;
      userProfile = profile;

      // Check for friend-related commands first
      const friendService = new FriendAIService(locale);
      const friendAction = await friendService.parseCommand(message);
      if (friendAction) {
        logger.info('Friend command detected', { action: friendAction });

        // Handle friend actions
        let friendResult: any = { success: false };

        try {
          // Get the actual Supabase user ID
          let userId = null;

          if (isEmailAuth && emailUser) {
            userId = emailUser.id;
          } else if (userProfile?.userEmail) {
            // For Google OAuth users, look up their Supabase user ID by email
            logger.info('Looking up user by email for friend request', { email: userProfile.userEmail });
            const { data: currentUser } = await supabaseAdmin
              .from('users')
              .select('id')
              .eq('email', userProfile.userEmail)
              .single();

            if (currentUser) {
              userId = currentUser.id;
              logger.info('Found user ID', { userId, email: userProfile.userEmail });
            } else {
              logger.warn('User not found in database', { email: userProfile.userEmail });
            }
          }

          if (!userId) {
            logger.error('Could not determine user ID for friend request');
            friendResult = {
              success: false,
              error: 'Authentication error'
            };
          } else {
            switch (friendAction.type) {
            case 'list':
              const friendsRes = await fetch(`${request.url.replace('/ai/chat', '/friends')}`, {
                headers: { Cookie: request.headers.get('Cookie') || '' }
              });
              const friendsData = await friendsRes.json();
              friendResult = {
                success: friendsData.success,
                friends: friendsData.data?.friends || []
              };
              break;

            case 'add':
              logger.info('Sending friend request', { email: friendAction.data?.email, userId });

              const friendEmail = friendAction.data?.email;

              if (!friendEmail) {
                logger.error('No email provided for friend request');
                friendResult = {
                  success: false,
                  error: 'Email is required'
                };
                break;
              }

              // Check if friend user exists
              logger.info('Checking if friend user exists', { friendEmail });
              const { data: friendUsers, error: friendUserError } = await supabaseAdmin
                .from('users')
                .select('id, email, name')
                .eq('email', friendEmail);

              const friendUser = friendUsers && friendUsers.length > 0 ? friendUsers[0] : null;

              logger.info('Friend user check result', {
                friendUser,
                error: friendUserError?.message,
                hasUser: !!friendUser,
                resultCount: friendUsers?.length || 0
              });

              if (friendUserError || !friendUser) {
                // User doesn't exist - send invitation email
                logger.info('Friend user not found, sending invitation', { friendEmail });

                // Create invitation
                const invitationCode = Math.random().toString(36).substring(2, 15) +
                                     Math.random().toString(36).substring(2, 15);

                const { data: invitation, error: inviteError } = await supabaseAdmin
                  .from('friend_invitations')
                  .insert({
                    inviter_id: userId,
                    invitee_email: friendEmail,
                    invitation_code: invitationCode,
                    message: '친구 요청을 보냈습니다!',
                    status: 'pending'
                  })
                  .select()
                  .single();

                if (inviteError) {
                  logger.error('Error creating invitation', { error: inviteError });
                  friendResult = {
                    success: false,
                    email: friendEmail,
                    error: 'Failed to create invitation'
                  };
                } else {
                  // Send invitation email
                  try {
                    const inviterName = emailUser?.name || userProfile?.name || 'Geulpi 사용자';
                    const inviterEmail = emailUser?.email || userProfile?.userEmail || 'noreply@geulpi.com';
                    const invitationUrl = EmailService.generateInvitationUrl(invitationCode);

                    const emailSent = await emailService.sendFriendInvitation({
                      inviterName,
                      inviterEmail,
                      inviteeEmail: friendEmail,
                      invitationCode,
                      invitationUrl,
                      message: '친구가 되어주세요!'
                    });

                    logger.info('Invitation email sent', { emailSent, friendEmail });

                    friendResult = {
                      success: true,
                      email: friendEmail,
                      type: 'invitation',
                      message: `${friendEmail}님이 아직 가입하지 않았습니다. 초대 이메일을 보냈습니다!`
                    };
                  } catch (emailError) {
                    logger.error('Failed to send invitation email', { error: emailError });
                    // Still consider it a success since invitation was created
                    friendResult = {
                      success: true,
                      email: friendEmail,
                      type: 'invitation',
                      message: `${friendEmail}님이 아직 가입하지 않았습니다. 초대장을 생성했습니다.`
                    };
                  }
                }
              } else {
                // Check if already friends
                logger.info('Checking existing friend relationship', { userId, friendId: friendUser.id });
                const { data: existingFriends, error: existingError } = await supabaseAdmin
                  .from('friends')
                  .select('id, status')
                  .or(`and(user_id.eq.${userId},friend_id.eq.${friendUser.id}),and(user_id.eq.${friendUser.id},friend_id.eq.${userId})`);

                const existingFriend = existingFriends && existingFriends.length > 0 ? existingFriends[0] : null;

                logger.info('Existing friend check result', {
                  existingFriend,
                  error: existingError?.message,
                  resultCount: existingFriends?.length || 0
                });

                if (existingFriend) {
                  logger.info('Friend relationship already exists', {
                    status: existingFriend.status
                  });
                  friendResult = {
                    success: false,
                    email: friendEmail,
                    error: existingFriend.status === 'accepted' ? '이미 친구입니다.' : '이미 친구 요청이 진행 중입니다.'
                  };
                } else {
                  // Create friend request
                  logger.info('Creating new friend request', {
                    userId,
                    friendId: friendUser.id
                  });
                  const { data: friendRequests, error: requestError } = await supabaseAdmin
                    .from('friends')
                    .insert({
                      user_id: userId,
                      friend_id: friendUser.id,
                      status: 'pending',
                      notes: ''
                    })
                    .select();

                  const friendRequest = friendRequests && friendRequests.length > 0 ? friendRequests[0] : null;

                  if (requestError) {
                    logger.error('Failed to create friend request', {
                      error: requestError.message,
                      code: requestError.code,
                      details: requestError.details
                    });
                    friendResult = {
                      success: false,
                      email: friendEmail,
                      error: 'Failed to send friend request'
                    };
                  } else {
                    logger.info('Friend request created successfully', {
                      friendRequest
                    });
                    friendResult = {
                      success: true,
                      email: friendEmail,
                      friend: friendUser
                    };
                  }
                }
              }
              break;

            case 'view_requests':
              const requestsRes = await fetch(`${request.url.replace('/ai/chat', '/friends/requests')}`, {
                headers: { Cookie: request.headers.get('Cookie') || '' }
              });
              const requestsData = await requestsRes.json();
              friendResult = {
                success: requestsData.success,
                requests: requestsData.data?.requests || []
              };
              break;

            case 'accept':
              // Get pending requests first
              const pendingRes = await fetch(`${request.url.replace('/ai/chat', '/friends/requests')}`, {
                headers: { Cookie: request.headers.get('Cookie') || '' }
              });
              const pendingData = await pendingRes.json();
              const firstRequest = pendingData.data?.requests?.[0];

              if (firstRequest) {
                const acceptRes = await fetch(`${request.url.replace('/ai/chat', '/friends/respond')}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Cookie: request.headers.get('Cookie') || ''
                  },
                  body: JSON.stringify({
                    requestId: firstRequest.id,
                    action: 'accept'
                  })
                });
                const acceptData = await acceptRes.json();
                friendResult = { success: acceptData.success };
              } else {
                friendResult = { success: false, message: '대기 중인 친구 요청이 없습니다.' };
              }
              break;

            case 'schedule_meeting':
              // This can be combined with calendar creation
              const friendName = friendAction.data?.friendName;
              const meetingTime = friendAction.data?.time || '14:00';
              const meetingDate = friendAction.data?.date;

              // Create a calendar event with friend
              chatResponse = await chatService.processMessage(
                `${friendName}와 미팅 ${meetingDate || '오늘'} ${meetingTime}`,
                currentEvents,
                {
                  sessionId,
                  timezone,
                  locale,
                  userProfile
                }
              );

              // Override the response message
              chatResponse.message = friendService.generateResponse(friendAction, {
                success: true,
                friendName
              });

              return successResponse(chatResponse);

            default:
              friendResult = { success: false };
          }
          }  // Close the else block for userId check
        } catch (error) {
          logger.error('Friend action failed', { error, action: friendAction });
          friendResult = { success: false };
        }

        // Generate response for friend action
        chatResponse = {
          message: friendService.generateResponse(friendAction, friendResult),
          action: {
            type: 'create' as const,  // Use a valid action type
            data: {
              ...friendResult,
              friendAction: friendAction.type
            }
          },
          suggestions: friendService.generateSuggestions()
        };

        return successResponse(chatResponse);
      }

      // Check if message is referring to last extracted event
      const isReferenceCommand = message && (
        message.toLowerCase().includes('register this') ||
        message.toLowerCase().includes('add this') ||
        message.toLowerCase().includes('create this') ||
        message.includes('이것을 등록') ||
        message.includes('이거 등록') ||
        message.includes('등록해줘') ||
        message.includes('추가해줘')
      );
      
      if (isReferenceCommand && lastExtractedEvent) {
        // Create event from last extracted data
        chatResponse = {
          message: locale === 'ko' 
            ? `네, "${lastExtractedEvent.title}" 일정을 등록하겠습니다.`
            : `Sure, I'll register "${lastExtractedEvent.title}" to your calendar.`,
          action: {
            type: 'create',
            data: lastExtractedEvent
          },
          suggestions: locale === 'ko'
            ? ['일정 확인하기', '다른 일정 추가', '오늘 일정 보기']
            : ['Check schedule', 'Add another event', 'View today events']
        };
      } else {
        // Process text message normally with user profile
        chatResponse = await chatService.processMessage(message, currentEvents, {
          sessionId: sessionId,
          timezone: timezone,
          locale: locale,
          lastExtractedEvent: lastExtractedEvent,
          userProfile: userProfile
        });
      }
    }

    // Execute action if present
    if (chatResponse.action && calendar) {
      // Only execute calendar actions if we have Google Calendar access
      try {
        const { type: actionType, data } = chatResponse.action;
        
        switch (actionType) {
          case 'create':
            logger.debug('Create action data', {
              hasTitle: !!data.title,
              hasDate: !!data.date,
              hasTime: !!data.time,
              data: data
            });
            // Create event with duplicate check
            if (data.title && data.date && data.time) {
              // Check for duplicates
              const duplicateCheck = checkDuplicateEvent(data, currentEvents);
              
              if (duplicateCheck.isDuplicate && !data.forceCreate) {
                // Return warning instead of creating
                chatResponse.message = getDuplicateWarningMessage(duplicateCheck, locale);
                chatResponse.requiresConfirmation = true;
                chatResponse.pendingAction = {
                  type: 'create',
                  data: { ...data, forceCreate: true }
                };
                chatResponse.suggestions = locale === 'ko' 
                  ? ['네, 추가해주세요', '아니요, 취소합니다', '기존 일정 보기']
                  : ['Yes, add it', 'No, cancel', 'View existing event'];
                break;
              }
              
              // 사용자가 입력한 날짜와 시간을 그대로 사용 (타임존 변환 없이)
              // Google Calendar API는 timeZone 파라미터와 함께 사용하면 해당 타임존의 시간으로 처리
              const [year, month, day] = data.date.split('-');
              const [hour, minute] = data.time.split(':');
              
              // 시작 시간과 종료 시간 계산
              const startHour = parseInt(hour);
              const startMinute = parseInt(minute);
              const durationMinutes = data.duration || 60;
              
              let endHour = startHour + Math.floor(durationMinutes / 60);
              let endMinute = startMinute + (durationMinutes % 60);
              
              // 분이 60을 넘으면 시간으로 변환
              if (endMinute >= 60) {
                endHour += 1;
                endMinute -= 60;
              }
              
              // 날짜가 바뀌는 경우 처리 (24시 이후)
              let endDate = data.date;
              if (endHour >= 24) {
                const nextDay = new Date(data.date);
                nextDay.setDate(nextDay.getDate() + 1);
                endDate = nextDay.toISOString().split('T')[0];
                endHour = endHour % 24;
              }
              
              // RFC3339 형식으로 날짜시간 문자열 생성
              const startDateTimeString = `${data.date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`;
              const endDateTimeString = `${endDate}T${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
              
              const event = {
                summary: data.title,
                description: data.description || '',
                location: data.location,
                start: {
                  dateTime: startDateTimeString,
                  timeZone: timezone,
                },
                end: {
                  dateTime: endDateTimeString,
                  timeZone: timezone,
                },
                attendees: data.attendees?.map((email: string) => ({ email }))
              };
              
              logger.info('Attempting to create calendar event', {
                eventSummary: event.summary,
                timezone,
                locale,
                isPastDate: new Date(data.date) < new Date(new Date().toDateString()),
                parsedDate: data.date,
                parsedTime: data.time
              });
              const result = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
              });
              
              logger.info('Event created successfully', {
                eventId: result.data.id,
                title: result.data.summary,
                start: result.data.start
              });
              
              // Add to recent events cache
              recentEventCache.addEvent(sessionId, data);
              
              // Store the created event ID for highlighting
              if (result.data.id) {
                chatResponse.createdEventId = result.data.id;
              }
              
              chatResponse.message += locale === 'ko' 
                ? '\n✅ 캘린더에 일정이 등록되었습니다.'
                : '\n✅ Event has been added to your calendar.';
            } else {
              logger.warn('Missing required fields for event creation', {
                title: data.title,
                date: data.date,
                time: data.time
              });
              chatResponse.message += locale === 'ko'
                ? '\n⚠️ 일정 생성에 필요한 정보가 부족합니다. 제목, 날짜, 시간을 모두 입력해주세요.'
                : '\n⚠️ Missing required information for event creation. Please provide title, date, and time.';
            }
            break;

          case 'update':
            // Update event logic
            if (data.eventId) {
              const updates: any = {};
              if (data.title) updates.summary = data.title;
              if (data.location) updates.location = data.location;
              if (data.description) updates.description = data.description;
              
              if (data.date && data.time) {
                // 타임존 변환 없이 사용자 입력 시간 그대로 사용
                const [hour, minute] = data.time.split(':');
                const startHour = parseInt(hour);
                const startMinute = parseInt(minute);
                const durationMinutes = data.duration || 60;
                
                let endHour = startHour + Math.floor(durationMinutes / 60);
                let endMinute = startMinute + (durationMinutes % 60);
                
                if (endMinute >= 60) {
                  endHour += 1;
                  endMinute -= 60;
                }
                
                let endDate = data.date;
                if (endHour >= 24) {
                  const nextDay = new Date(data.date);
                  nextDay.setDate(nextDay.getDate() + 1);
                  endDate = nextDay.toISOString().split('T')[0];
                  endHour = endHour % 24;
                }
                
                const startDateTimeString = `${data.date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`;
                const endDateTimeString = `${endDate}T${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
                
                updates.start = {
                  dateTime: startDateTimeString,
                  timeZone: timezone,
                };
                updates.end = {
                  dateTime: endDateTimeString,
                  timeZone: timezone,
                };
              }
              
              await calendar.events.patch({
                calendarId: 'primary',
                eventId: data.eventId,
                requestBody: updates
              });
              
              logger.info('Event updated', { eventId: data.eventId });
              chatResponse.message += '\n✅ 일정이 수정되었습니다.';
            } else {
              logger.warn('Update action without eventId', { data });
              chatResponse.message += locale === 'ko'
                ? '\n⚠️ 수정할 일정을 찾을 수 없습니다. 어떤 일정을 수정하시겠어요?'
                : '\n⚠️ Could not find the event to update. Which event would you like to modify?';
            }
            break;

          case 'delete':
            // Delete event
            if (data.eventId) {
              await calendar.events.delete({
                calendarId: 'primary',
                eventId: data.eventId
              });
              
              logger.info('Event deleted', { eventId: data.eventId });
              chatResponse.message += '\n✅ 일정이 삭제되었습니다.';
            }
            break;

          case 'list':
          case 'search':
            // Search events
            const searchParams: any = {
              calendarId: 'primary',
              maxResults: 10,
              singleEvents: true,
              orderBy: 'startTime'
            };
            
            if (data.query) {
              searchParams.q = data.query;
            }
            
            if (data.startDate) {
              searchParams.timeMin = new Date(data.startDate).toISOString();
            } else {
              searchParams.timeMin = new Date().toISOString();
            }
            
            if (data.endDate) {
              searchParams.timeMax = new Date(data.endDate).toISOString();
            }
            
            const searchResult = await calendar.events.list(searchParams);
            chatResponse.events = convertGoogleEventsToCalendarEvents(searchResult.data.items);
            break;
        }
      } catch (actionError: any) {
        logger.error('Action execution failed', actionError, {
          message: actionError?.message,
          code: actionError?.code,
          status: actionError?.status,
          errors: actionError?.errors,
          response: actionError?.response?.data,
          action: chatResponse.action,
          requestData: chatResponse.action?.data
        });
        const errorMessage = getUserFriendlyErrorMessage(actionError, locale);
        chatResponse.message += `\n⚠️ ${errorMessage}`;
        chatResponse.suggestions = getErrorSuggestions(actionError, locale);
      }
    } else if (chatResponse.action && !calendar) {
      // Email auth user trying to use calendar features
      chatResponse.message += locale === 'ko'
        ? '\n⚠️ 캘린더 기능을 사용하려면 Google 계정으로 로그인해주세요.'
        : '\n⚠️ Please sign in with Google to use calendar features.';
      chatResponse.suggestions = locale === 'ko'
        ? ['Google로 로그인하기', 'AI 채팅 계속하기', '도움말 보기']
        : ['Sign in with Google', 'Continue AI chat', 'Get help'];
    }

    // Generate smart suggestions if not already provided
    if (!chatResponse.suggestions || chatResponse.suggestions.length === 0) {
      chatResponse.suggestions = generateSmartSuggestions({
        currentTime: new Date(),
        recentEvents: currentEvents,
        lastAction: chatResponse.action?.type,
        locale: locale,
        timezone: timezone,
        upcomingEvents: currentEvents.filter(e => {
          const eventTime = new Date(e.start?.dateTime || e.start?.date || '');
          return eventTime > new Date();
        }).slice(0, 5)
      });
    }
    
    logger.info('Returning chat response', {
      messageLength: chatResponse.message?.length,
      hasAction: !!chatResponse.action,
      suggestionCount: chatResponse.suggestions?.length,
      sessionId
    });
    
    return successResponse({
      ...chatResponse,
      sessionId
    });

  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }
    
    logger.error('AI Chat API error', error);
    const locale = body?.locale || 'ko';
    
    const apiError = new ApiError(
      500,
      ErrorCodes.INTERNAL_ERROR,
      getUserFriendlyErrorMessage(error, locale)
    );
    apiError.suggestions = getErrorSuggestions(error, locale);
    
    return errorResponse(apiError);
  }
}
