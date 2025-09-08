import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ChatCalendarService, type ChatResponse } from '@/services/ai/ChatCalendarService';
import { getCalendarClient } from '@/lib/google-auth';
import { convertGoogleEventsToCalendarEvents } from '@/utils/typeConverters';
import { getUserFriendlyErrorMessage, getErrorSuggestions } from '@/lib/error-messages';
import { checkDuplicateEvent, recentEventCache, getDuplicateWarningMessage } from '@/lib/duplicate-detector';
import { generateSmartSuggestions } from '@/lib/smart-suggestions';
import type { CalendarEvent } from '@/types';

const chatService = new ChatCalendarService();

export async function POST(request: NextRequest) {
  let body: any;
  let locale = 'ko';
  
  try {
    body = await request.json();
    const { message, type = 'text', imageData, mimeType, sessionId, timezone = 'Asia/Seoul', lastExtractedEvent } = body;
    locale = body.locale || 'ko';

    console.log('[AI Chat API] Request:', { 
      messageLength: message?.length, 
      type, 
      hasImage: !!imageData,
      imageDataLength: imageData?.length,
      imageDataPreview: imageData?.substring(0, 50),
      mimeType,
      sessionId,
      locale,
      timezone
    });

    // Get auth token
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    
    if (!accessToken) {
      const error = { code: 'UNAUTHENTICATED' };
      return NextResponse.json({
        success: false,
        message: getUserFriendlyErrorMessage(error, locale),
        suggestions: getErrorSuggestions(error, locale)
      });
    }

    const calendar = getCalendarClient(accessToken);

    // Start fetching events in parallel with processing
    const eventsPromise = (async () => {
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
        console.error('Failed to fetch events:', error);
        return [];
      }
    })();

    let chatResponse: ChatResponse;
    let currentEvents: CalendarEvent[] = [];
    
    // Process based on type - start processing immediately
    if (type === 'image' && imageData) {
      // Process image in parallel with events fetching
      const [imageResponse, events] = await Promise.all([
        chatService.extractEventFromImage(imageData, mimeType || 'image/png', locale, sessionId),
        eventsPromise
      ]);
      chatResponse = imageResponse;
      currentEvents = events;
    } else {
      // For text processing, we need events context first (but still fetch in parallel)
      currentEvents = await eventsPromise;
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
        // Process text message normally
        chatResponse = await chatService.processMessage(message, currentEvents, {
          sessionId: sessionId,
          timezone: timezone,
          locale: locale,
          lastExtractedEvent: lastExtractedEvent
        });
      }
    }

    // Execute action if present
    if (chatResponse.action) {
      try {
        const { type: actionType, data } = chatResponse.action;
        
        switch (actionType) {
          case 'create':
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
              
              const startDateTime = new Date(`${data.date}T${data.time}:00`);
              const endDateTime = new Date(startDateTime.getTime() + (data.duration || 60) * 60000);
              
              const event = {
                summary: data.title,
                description: data.description || '',
                location: data.location,
                start: {
                  dateTime: startDateTime.toISOString(),
                  timeZone: timezone,
                },
                end: {
                  dateTime: endDateTime.toISOString(),
                  timeZone: timezone,
                },
                attendees: data.attendees?.map((email: string) => ({ email }))
              };
              
              const result = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
              });
              
              console.log('[AI Chat API] Event created:', result.data.id);
              
              // Add to recent events cache
              recentEventCache.addEvent(sessionId, data);
              
              chatResponse.message += locale === 'ko' 
                ? '\n✅ 캘린더에 일정이 등록되었습니다.'
                : '\n✅ Event has been added to your calendar.';
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
                const startDateTime = new Date(`${data.date}T${data.time}:00`);
                const endDateTime = new Date(startDateTime.getTime() + (data.duration || 60) * 60000);
                updates.start = {
                  dateTime: startDateTime.toISOString(),
                  timeZone: timezone,
                };
                updates.end = {
                  dateTime: endDateTime.toISOString(),
                  timeZone: timezone,
                };
              }
              
              await calendar.events.patch({
                calendarId: 'primary',
                eventId: data.eventId,
                requestBody: updates
              });
              
              console.log('[AI Chat API] Event updated:', data.eventId);
              chatResponse.message += '\n✅ 일정이 수정되었습니다.';
            }
            break;

          case 'delete':
            // Delete event
            if (data.eventId) {
              await calendar.events.delete({
                calendarId: 'primary',
                eventId: data.eventId
              });
              
              console.log('[AI Chat API] Event deleted:', data.eventId);
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
      } catch (actionError) {
        console.error('[AI Chat API] Action execution failed:', actionError);
        const errorMessage = getUserFriendlyErrorMessage(actionError, locale);
        chatResponse.message += `\n⚠️ ${errorMessage}`;
        chatResponse.suggestions = getErrorSuggestions(actionError, locale);
      }
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
    
    return NextResponse.json({
      success: true,
      ...chatResponse,
      sessionId
    });

  } catch (error) {
    console.error('[AI Chat API] Error:', error);
    const locale = body?.locale || 'ko';
    return NextResponse.json(
      { 
        success: false,
        message: getUserFriendlyErrorMessage(error, locale),
        suggestions: getErrorSuggestions(error, locale),
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    );
  }
}