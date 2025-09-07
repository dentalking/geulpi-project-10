import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ChatCalendarService } from '@/services/ai/ChatCalendarService';
import { getCalendarClient } from '@/lib/google-auth';
import { convertGoogleEventsToCalendarEvents } from '@/utils/typeConverters';
import type { CalendarEvent } from '@/types';

const chatService = new ChatCalendarService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, type = 'text', imageData, mimeType, sessionId, locale = 'ko', lastExtractedEvent } = body;

    console.log('[Chat Calendar API] Request:', { 
      messageLength: message?.length, 
      type, 
      hasImage: !!imageData,
      imageDataLength: imageData?.length,
      imageDataPreview: imageData?.substring(0, 50),
      mimeType,
      sessionId,
      locale
    });

    // Get auth token
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        message: '로그인이 필요합니다. Google 계정으로 로그인해주세요.',
        suggestions: ['로그인하기']
      });
    }

    const calendar = getCalendarClient(accessToken);

    // Get current events for context
    let currentEvents: CalendarEvent[] = [];
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
      
      currentEvents = convertGoogleEventsToCalendarEvents(response.data.items);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }

    let chatResponse;
    
    // Process based on type
    if (type === 'image' && imageData) {
      // Process image
      chatResponse = await chatService.extractEventFromImage(imageData, mimeType || 'image/png', locale, sessionId);
    } else {
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
          timezone: 'Asia/Seoul',
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
            // Create event
            if (data.title && data.date && data.time) {
              const startDateTime = new Date(`${data.date}T${data.time}:00`);
              const endDateTime = new Date(startDateTime.getTime() + (data.duration || 60) * 60000);
              
              const event = {
                summary: data.title,
                description: data.description || '',
                location: data.location,
                start: {
                  dateTime: startDateTime.toISOString(),
                  timeZone: 'Asia/Seoul',
                },
                end: {
                  dateTime: endDateTime.toISOString(),
                  timeZone: 'Asia/Seoul',
                },
                attendees: data.attendees?.map((email: string) => ({ email }))
              };
              
              const result = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
              });
              
              console.log('[Chat Calendar API] Event created:', result.data.id);
              chatResponse.message += '\n✅ 캘린더에 일정이 등록되었습니다.';
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
                  timeZone: 'Asia/Seoul',
                };
                updates.end = {
                  dateTime: endDateTime.toISOString(),
                  timeZone: 'Asia/Seoul',
                };
              }
              
              await calendar.events.patch({
                calendarId: 'primary',
                eventId: data.eventId,
                requestBody: updates
              });
              
              console.log('[Chat Calendar API] Event updated:', data.eventId);
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
              
              console.log('[Chat Calendar API] Event deleted:', data.eventId);
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
        console.error('[Chat Calendar API] Action execution failed:', actionError);
        chatResponse.message += '\n⚠️ 작업을 수행하는 중에 오류가 발생했습니다.';
      }
    }

    return NextResponse.json({
      success: true,
      ...chatResponse,
      sessionId
    });

  } catch (error) {
    console.error('[Chat Calendar API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: '요청을 처리하는 중에 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}