import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';
import { GeminiService } from '@/services/ai/GeminiService';
import { getCalendarClient } from '@/lib/google-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.debug('Request body:', { 
      hasImage: !!body.image, 
      imageLength: body.image?.length,
      mimeType: body.mimeType,
      sessionId: body.sessionId,
      autoCreate: body.autoCreate 
    });
    
    const { image, mimeType, sessionId, autoCreate = false } = body;

    if (!image || !mimeType) {
      logger.debug('Missing required fields', { value: { image: !!image, mimeType: !!mimeType } });
      return NextResponse.json(
        { success: false, error: 'Image and mimeType are required' },
        { status: 400 }
      );
    }

    logger.debug('Creating GeminiService instance...');
    // Initialize Gemini service
    const geminiService = new GeminiService();
    logger.debug('GeminiService instance created successfully');

    // Process image to extract event data
    const eventData = await geminiService.parseEventFromImage(image, mimeType);
    logger.debug('Extracted event data', { value: eventData });

    // If autoCreate is true, create the event in Google Calendar
    let createdEvent: any = null;
    if (autoCreate) {
      const cookieStore = cookies();
      const accessToken = cookieStore.get('access_token')?.value;
      
      if (accessToken) {
        try {
          const calendar = getCalendarClient(accessToken);
          
          // Convert extracted data to calendar event format
          const startDateTime = new Date(`${eventData.date}T${eventData.time}:00`);
          const endDateTime = new Date(startDateTime.getTime() + eventData.duration * 60000);
          
          const event = {
            summary: eventData.title,
            description: eventData.description || '이미지에서 추출된 일정',
            location: eventData.location,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: 'Asia/Seoul',
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'Asia/Seoul',
            }
          };
          
          logger.debug('Creating calendar event', { value: event });
          const result = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
          });
          
          createdEvent = result.data;
          logger.debug('Event created successfully', { value: createdEvent.id });
        } catch (calendarError) {
          logger.error('Failed to create calendar event:', calendarError);
          // Don't fail the entire request if calendar creation fails
        }
      }
    }

    // Return extracted event data with creation status
    return NextResponse.json({
      success: true,
      eventData,
      createdEvent,
      sessionId
    });

  } catch (error) {
    logger.error('Image processing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process image' 
      },
      { status: 500 }
    );
  }
}