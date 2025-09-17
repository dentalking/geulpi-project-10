import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { ChatCalendarService, type ChatResponse } from '@/services/ai/ChatCalendarService';
import { FriendAIService } from '@/services/ai/FriendAIService';
import SupabaseEmailService, { supabaseEmailService } from '@/services/email/SupabaseEmailService';
import { getCalendarClient } from '@/lib/google-auth';
import { convertGoogleEventsToCalendarEvents } from '@/utils/typeConverters';
import { createClient } from '@supabase/supabase-js';
import { getUserFriendlyErrorMessage, getErrorSuggestions } from '@/lib/error-messages';
import { checkDuplicateEvent, checkDuplicateEventWithCache, recentEventCache, getDuplicateWarningMessage } from '@/lib/duplicate-detector';
import { generateSmartSuggestions } from '@/lib/smart-suggestions';
import { successResponse, errorResponse, ApiError, ErrorCodes } from '@/lib/api-response';
import { getUserTimezone, getStartOfDay } from '@/lib/timezone';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/middleware/rateLimiter';
import { withAILimit, withEventLock, withDebounce } from '@/lib/concurrency-manager';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { supabase } from '@/lib/db';
import type { CalendarEvent } from '@/types';

const chatService = new ChatCalendarService();

// Using unified supabase client from @/lib/db

// Helper function to calculate end time
function calculateEndTime(date: string, time: string, durationMinutes: number): string {
  const [hour, minute] = time.split(':');
  const startHour = parseInt(hour);
  const startMinute = parseInt(minute);

  let endHour = startHour + Math.floor(durationMinutes / 60);
  let endMinute = startMinute + (durationMinutes % 60);

  if (endMinute >= 60) {
    endHour += 1;
    endMinute -= 60;
  }

  let endDate = date;
  if (endHour >= 24) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    endDate = nextDay.toISOString().split('T')[0];
    endHour = endHour % 24;
  }

  return `${endDate}T${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
}

export async function POST(request: NextRequest) {
  let body: any;
  let locale = 'ko';
  
  try {
    // Rate limiting (AI endpoints are expensive)
    const rateLimitResponse = await checkRateLimit(request, 'ai');
    if (rateLimitResponse) return rateLimitResponse;
    body = await request.json();
    const { message, type = 'text', imageData, mimeType, sessionId, timezone: requestTimezone, lastExtractedEvent } = body;
    locale = body.locale || 'ko';

    logger.info('AI Chat API request received', {
      messageLength: message?.length,
      type,
      hasImage: !!imageData,
      imageDataLength: imageData?.length,
      mimeType,
      sessionId,
      locale,
      timezone: requestTimezone
    });

    // Get auth tokens
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    // Check for Google OAuth tokens with correct cookie names
    const accessToken = cookieStore.get('google_access_token')?.value || cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('google_refresh_token')?.value || cookieStore.get('refresh_token')?.value;

    // Check for auth token in Authorization header or cookies
    let authToken: string | null = null;
    if (authHeader?.startsWith('auth-token ')) {
      authToken = authHeader.substring(11);
    } else {
      authToken = cookieStore.get('auth-token')?.value || null;
    }
    
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
    let calendar: any = null;

    // Check for Google OAuth first (prefer Google OAuth over email auth when both exist)
    if (accessToken) {
      // Google OAuth user with access token
      calendar = getCalendarClient(accessToken, refreshToken);
      logger.info('Google OAuth user detected with calendar access');
    } else if (!isEmailAuth && !emailUser) {
      // No authentication at all
      logger.warn('No access token found in cookies and no email auth');
      throw new ApiError(
        401,
        ErrorCodes.UNAUTHENTICATED,
        getUserFriendlyErrorMessage({ code: 'UNAUTHENTICATED' }, locale)
      );
    } else {
      // Email auth user without Google Calendar access
      logger.info('Email auth user without Google Calendar access');
    }

    // Get user profile for context
    const profilePromise = (async () => {
      try {
        let userId: any = null;
        let userEmail: any = null;
        
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
          const { data: profile } = await supabase
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
        // Start from the beginning of today to include past events
        const startOfToday = getStartOfDay(now);

        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: startOfToday.toISOString(), // Include today's past events
          timeMax: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          maxResults: 100, // Increase to get more events
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
    let userTimezone: string;
    
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

      // Determine user's timezone (priority: request > profile > browser > default)
      userTimezone = requestTimezone || getUserTimezone(userProfile);
    } else {
      // For text processing, we need events context first (but still fetch in parallel)
      const [events, profile] = await Promise.all([eventsPromise, profilePromise]);
      currentEvents = events;
      userProfile = profile;

      // Determine user's timezone (priority: request > profile > browser > default)
      userTimezone = requestTimezone || getUserTimezone(userProfile);

      // Check for friend-related commands first
      const friendService = new FriendAIService(locale);
      const friendAction = await friendService.parseCommand(message);
      if (friendAction) {
        logger.info('Friend command detected', { action: friendAction });

        // Handle friend actions
        let friendResult: any = { success: false };

        try {
          // Get the actual Supabase user ID
          let userId: any = null;

          if (isEmailAuth && emailUser) {
            userId = emailUser.id;
          } else if (userProfile?.userEmail) {
            // For Google OAuth users, look up their Supabase user ID by email
            logger.info('Looking up user by email for friend request', { email: userProfile.userEmail });
            const { data: currentUser } = await supabase
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
              const { data: friendUsers, error: friendUserError } = await supabase
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

                const { data: invitation, error: inviteError } = await supabase
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
                    const invitationUrl = SupabaseEmailService.generateInvitationUrl(invitationCode);

                    const emailSent = await supabaseEmailService.sendFriendInvitation({
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
                const { data: existingFriends, error: existingError } = await supabase
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
                  const { data: friendRequests, error: requestError } = await supabase
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

              // 친구 찾기
              const meetingFriendsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/friends`, {
                headers: {
                  'Authorization': request.headers.get('authorization') || '',
                  'Cookie': request.headers.get('cookie') || ''
                }
              });

              const meetingFriendsData = await meetingFriendsRes.json();
              const friend = meetingFriendsData.friends?.find((f: any) =>
                f.name?.toLowerCase().includes(friendName.toLowerCase()) ||
                f.email?.toLowerCase().includes(friendName.toLowerCase()) ||
                f.nickname?.toLowerCase().includes(friendName.toLowerCase())
              );

              if (!friend) {
                chatResponse = {
                  message: locale === 'ko'
                    ? `${friendName}님을 친구 목록에서 찾을 수 없습니다. 먼저 친구 추가를 해주세요.`
                    : `Could not find ${friendName} in your friends list. Please add them as a friend first.`,
                  suggestions: locale === 'ko'
                    ? ['친구 목록 보기', `${friendName} 친구 추가하기`]
                    : ['Show friends list', `Add ${friendName} as friend`]
                };
                return successResponse(chatResponse);
              }

              // 자동 약속 잡기 API 호출
              const schedulingPayload: any = {
                friendId: friend.friendId || friend.id,
                title: `${friendName}님과의 미팅`,
                duration: 60,
                autoSelect: !meetingDate && !meetingTime, // 시간이 명시되지 않으면 자동 선택
                meetingType: 'coffee'
              };

              // 시간이 명시된 경우
              if (meetingDate && meetingTime) {
                const dateStr = meetingDate === '내일'
                  ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  : meetingDate === '오늘'
                  ? new Date().toISOString().split('T')[0]
                  : meetingDate;

                schedulingPayload.dateTime = `${dateStr}T${meetingTime}:00`;
                schedulingPayload.autoSelect = false;
              }

              const scheduleRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/friends/schedule-meeting`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': request.headers.get('authorization') || '',
                  'Cookie': request.headers.get('cookie') || ''
                },
                body: JSON.stringify(schedulingPayload)
              });

              const scheduleResult = await scheduleRes.json();

              if (scheduleResult.success) {
                chatResponse = {
                  message: locale === 'ko'
                    ? `${friendName}님과의 약속 제안을 전송했습니다.\n📅 일시: ${new Date(scheduleResult.proposal.dateTime).toLocaleString('ko-KR')}\n📍 장소: ${scheduleResult.proposal.location}`
                    : `Meeting proposal sent to ${friendName}.\n📅 Time: ${new Date(scheduleResult.proposal.dateTime).toLocaleString()}\n📍 Location: ${scheduleResult.proposal.location}`,
                  action: {
                    type: 'create',
                    data: {
                      proposalId: scheduleResult.proposal.id,
                      friendName: friendName
                    }
                  },
                  suggestions: locale === 'ko'
                    ? ['일정 확인하기', '다른 시간 제안하기', '친구 목록 보기']
                    : ['Check schedule', 'Suggest another time', 'Show friends']
                };

                // 추천 장소가 있으면 표시
                if (scheduleResult.proposal.suggestedLocations?.length > 0) {
                  chatResponse.message += locale === 'ko'
                    ? `\n\n💡 추천 장소:\n${scheduleResult.proposal.suggestedLocations.map((loc: string) => `• ${loc}`).join('\n')}`
                    : `\n\n💡 Suggested locations:\n${scheduleResult.proposal.suggestedLocations.map((loc: string) => `• ${loc}`).join('\n')}`;
                }
              } else {
                chatResponse = {
                  message: locale === 'ko'
                    ? `${friendName}님과의 약속 잡기에 실패했습니다: ${scheduleResult.error}`
                    : `Failed to schedule meeting with ${friendName}: ${scheduleResult.error}`,
                  suggestions: locale === 'ko'
                    ? ['다른 시간 시도하기', '친구 목록 보기']
                    : ['Try another time', 'Show friends']
                };
              }

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
        chatResponse = await withAILimit(async () => {
          return await chatService.processMessage(message, currentEvents, {
            sessionId: sessionId,
            timezone: userTimezone,
            locale: locale,
            lastExtractedEvent: lastExtractedEvent,
            userProfile: userProfile
          });
        });
      }
    }

    // Execute action if present
    if (chatResponse.action && calendar) {
      // Only execute calendar actions if we have Google Calendar access
      try {
        const { type: actionType, data } = chatResponse.action;
        
        switch (actionType) {
          case 'create_multiple':
            // Handle multiple events creation (from image extraction)
            if (data.events && Array.isArray(data.events)) {
              logger.info('Creating multiple events', { count: data.events.length });
              let createdCount = 0;
              let failedCount = 0;
              const createdEventIds: string[] = [];

              for (const eventData of data.events) {
                if (eventData.title && eventData.date && eventData.time) {
                  try {
                    // Check for duplicates
                    const duplicateCheck = await checkDuplicateEventWithCache(eventData, currentEvents, sessionId);

                    if (duplicateCheck.isDuplicate) {
                      logger.info('Skipping duplicate event', { title: eventData.title });
                      continue;
                    }

                    // Create event using the same logic as single event creation
                    const [hour, minute] = eventData.time.split(':');
                    const startHour = parseInt(hour);
                    const startMinute = parseInt(minute);
                    const durationMinutes = eventData.duration || 60;

                    let endHour = startHour + Math.floor(durationMinutes / 60);
                    let endMinute = startMinute + (durationMinutes % 60);

                    if (endMinute >= 60) {
                      endHour += 1;
                      endMinute -= 60;
                    }

                    let endDate = eventData.date;
                    if (endHour >= 24) {
                      const nextDay = new Date(eventData.date);
                      nextDay.setDate(nextDay.getDate() + 1);
                      endDate = nextDay.toISOString().split('T')[0];
                      endHour = endHour % 24;
                    }

                    const startDateTimeString = `${eventData.date}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00`;
                    const endDateTimeString = `${endDate}T${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;

                    const event = {
                      summary: eventData.title,
                      description: eventData.description || '',
                      location: eventData.location,
                      start: {
                        dateTime: startDateTimeString,
                        timeZone: userTimezone,
                      },
                      end: {
                        dateTime: endDateTimeString,
                        timeZone: userTimezone,
                      }
                    };

                    const result = await calendar.events.insert({
                      calendarId: 'primary',
                      requestBody: event,
                    });

                    logger.info('Event created from multiple', {
                      eventId: result.data.id,
                      title: result.data.summary
                    });

                    if (result.data.id) {
                      createdEventIds.push(result.data.id);
                    }

                    // Add to recent events cache
                    await recentEventCache.addEvent(sessionId, eventData);

                    createdCount++;
                  } catch (error) {
                    logger.error('Failed to create event from multiple', { error, eventData });
                    failedCount++;
                  }
                }
              }

              // Update response message
              if (createdCount > 0) {
                chatResponse.message += locale === 'ko'
                  ? `\n✅ ${createdCount}개의 일정이 캘린더에 등록되었습니다.`
                  : `\n✅ ${createdCount} event(s) have been added to your calendar.`;

                // Store the first created event ID for highlighting
                if (createdEventIds.length > 0) {
                  chatResponse.createdEventId = createdEventIds[0];
                }
              }

              if (failedCount > 0) {
                chatResponse.message += locale === 'ko'
                  ? `\n⚠️ ${failedCount}개의 일정 등록에 실패했습니다.`
                  : `\n⚠️ Failed to create ${failedCount} event(s).`;
              }
            }
            break;

          case 'create':
            logger.debug('Create action data', {
              hasTitle: !!data.title,
              hasDate: !!data.date,
              hasTime: !!data.time,
              data: data
            });
            // Create event with duplicate check
            if (data.title && data.date && data.time) {
              // Check for duplicates including recent cache
              const duplicateCheck = await checkDuplicateEventWithCache(data, currentEvents, sessionId);
              
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
                  timeZone: userTimezone,
                },
                end: {
                  dateTime: endDateTimeString,
                  timeZone: userTimezone,
                },
                attendees: data.attendees?.map((email: string) => ({ email }))
              };
              
              logger.info('Attempting to create calendar event', {
                eventSummary: event.summary,
                timezone: userTimezone,
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
              await recentEventCache.addEvent(sessionId, data);
              
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
                  timeZone: userTimezone,
                };
                updates.end = {
                  dateTime: endDateTimeString,
                  timeZone: userTimezone,
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
            // Delete event(s) - handle both single eventId and multiple eventIds
            const eventIdsToDelete = data.eventIds || (data.eventId ? [data.eventId] : []);

            if (eventIdsToDelete.length > 0) {
              let deletedCount = 0;
              let failedCount = 0;

              for (const eventId of eventIdsToDelete) {
                try {
                  await calendar.events.delete({
                    calendarId: 'primary',
                    eventId: eventId
                  });
                  deletedCount++;
                  logger.info('Event deleted', { eventId });
                } catch (error) {
                  failedCount++;
                  logger.error('Failed to delete event', { eventId, error });
                }
              }

              if (deletedCount > 0) {
                chatResponse.message += locale === 'ko'
                  ? `\n✅ ${deletedCount}개의 일정이 삭제되었습니다.`
                  : `\n✅ ${deletedCount} event(s) deleted successfully.`;
              }

              if (failedCount > 0) {
                chatResponse.message += locale === 'ko'
                  ? `\n⚠️ ${failedCount}개의 일정 삭제에 실패했습니다.`
                  : `\n⚠️ Failed to delete ${failedCount} event(s).`;
              }
            } else {
              logger.warn('No event IDs provided for deletion');
              chatResponse.message += locale === 'ko'
                ? '\n⚠️ 삭제할 일정이 지정되지 않았습니다.'
                : '\n⚠️ No events specified for deletion.';
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

            // Only use text search for non-date queries
            // Skip common date keywords that shouldn't be used for text search
            const dateKeywords = ['오늘', '내일', '어제', '이번주', '다음주', '이번달', '다음달',
                                'today', 'tomorrow', 'yesterday', 'this week', 'next week',
                                'this month', 'next month'];

            if (data.query && !dateKeywords.includes(data.query.toLowerCase().trim())) {
              // Only add text search if it's not a date keyword
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
      // Email auth user - create events using /api/calendar/create endpoint
      if (isEmailAuth && emailUser) {
        try {
          const { type: actionType, data } = chatResponse.action;

          if (actionType === 'create' && data.title && data.date && data.time) {
            // Single event creation for email auth users
            const eventPayload = {
              title: data.title,
              description: data.description || '',
              location: data.location || '',
              startTime: `${data.date}T${data.time}:00`,
              endTime: calculateEndTime(data.date, data.time, data.duration || 60),
              isAllDay: false
            };

            const createResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/calendar/create`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `auth-token ${authToken}`,
                'Cookie': request.headers.get('Cookie') || ''
              },
              body: JSON.stringify(eventPayload)
            });

            const createResult = await createResponse.json();

            if (createResult.success) {
              chatResponse.message += locale === 'ko'
                ? '\n✅ 캘린더에 일정이 등록되었습니다.'
                : '\n✅ Event has been added to your calendar.';

              if (createResult.event?.id) {
                chatResponse.createdEventId = createResult.event.id;
              }
            } else {
              chatResponse.message += locale === 'ko'
                ? '\n⚠️ 일정 등록에 실패했습니다.'
                : '\n⚠️ Failed to create event.';
            }
          } else if (actionType === 'create_multiple' && data.events && Array.isArray(data.events)) {
            // Multiple events creation for email auth users
            let createdCount = 0;
            let failedCount = 0;

            for (const eventData of data.events) {
              if (eventData.title && eventData.date && eventData.time) {
                try {
                  const eventPayload = {
                    title: eventData.title,
                    description: eventData.description || '',
                    location: eventData.location || '',
                    startTime: `${eventData.date}T${eventData.time}:00`,
                    endTime: calculateEndTime(eventData.date, eventData.time, eventData.duration || 60),
                    isAllDay: false
                  };

                  const createResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/calendar/create`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `auth-token ${authToken}`,
                      'Cookie': request.headers.get('Cookie') || ''
                    },
                    body: JSON.stringify(eventPayload)
                  });

                  const createResult = await createResponse.json();

                  if (createResult.success) {
                    createdCount++;
                    if (createdCount === 1 && createResult.event?.id) {
                      chatResponse.createdEventId = createResult.event.id;
                    }
                  } else {
                    failedCount++;
                  }
                } catch (error) {
                  logger.error('Failed to create event for email auth user', { error, eventData });
                  failedCount++;
                }
              }
            }

            if (createdCount > 0) {
              chatResponse.message += locale === 'ko'
                ? `\n✅ ${createdCount}개의 일정이 캘린더에 등록되었습니다.`
                : `\n✅ ${createdCount} event(s) have been added to your calendar.`;
            }

            if (failedCount > 0) {
              chatResponse.message += locale === 'ko'
                ? `\n⚠️ ${failedCount}개의 일정 등록에 실패했습니다.`
                : `\n⚠️ Failed to create ${failedCount} event(s).`;
            }
          } else {
            // Other actions not supported for email auth
            chatResponse.message += locale === 'ko'
              ? '\n⚠️ 이 기능을 사용하려면 Google 계정으로 로그인해주세요.'
              : '\n⚠️ Please sign in with Google to use this feature.';
          }
        } catch (error) {
          logger.error('Failed to execute action for email auth user', { error });
          chatResponse.message += locale === 'ko'
            ? '\n⚠️ 작업 실행 중 오류가 발생했습니다.'
            : '\n⚠️ Error occurred while executing the action.';
        }
      } else {
        // Not authenticated
        chatResponse.message += locale === 'ko'
          ? '\n⚠️ 캘린더 기능을 사용하려면 Google 계정으로 로그인해주세요.'
          : '\n⚠️ Please sign in with Google to use calendar features.';
        chatResponse.suggestions = locale === 'ko'
          ? ['Google로 로그인하기', 'AI 채팅 계속하기', '도움말 보기']
          : ['Sign in with Google', 'Continue AI chat', 'Get help'];
      }
    }

    // Generate smart suggestions if not already provided
    if (!chatResponse.suggestions || chatResponse.suggestions.length === 0) {
      chatResponse.suggestions = generateSmartSuggestions({
        currentTime: new Date(),
        recentEvents: currentEvents,
        lastAction: chatResponse.action?.type,
        locale: locale,
        timezone: userTimezone,
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
