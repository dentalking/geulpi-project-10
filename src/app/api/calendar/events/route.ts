import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCalendarClient } from '@/lib/google-auth';
import { handleApiError, AuthError } from '@/lib/api-errors';
import { 
  withRetry, 
  createErrorResponse, 
  validateRequired, 
  validateDateRange,
  calendarApiBreaker,
  AppError,
  ErrorCode,
  logError
} from '@/lib/error-handler';

// GET: 이벤트 목록 조회
export async function GET(request: Request) {
  const accessToken = cookies().get('access_token')?.value;
  
  if (!accessToken) {
    return handleApiError(new AuthError());
  }

  try {
    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults') || '10');
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = searchParams.get('timeMax') || undefined;
    
    const calendar = getCalendarClient(accessToken);
    
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return NextResponse.json({
      success: true,
      events: events.data.items || [],
      total: events.data.items?.length || 0
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: 새 이벤트 생성
export async function POST(request: Request) {
  const accessToken = cookies().get('access_token')?.value;
  
  if (!accessToken) {
    return createErrorResponse(
      new AppError(ErrorCode.UNAUTHORIZED, '로그인이 필요합니다.', 401)
    );
  }

  try {
    const body = await request.json();
    const { 
      summary, 
      description, 
      location,
      startDateTime,
      endDateTime,
      attendees = [],
      reminders = { useDefault: true }
    } = body;

    // 필수 필드 검증
    const missingFields = validateRequired(body, ['summary', 'startDateTime', 'endDateTime']);
    if (missingFields.length > 0) {
      return createErrorResponse(
        new AppError(
          ErrorCode.VALIDATION_ERROR,
          `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`,
          400,
          { missingFields }
        )
      );
    }

    // 날짜 유효성 검증
    if (!validateDateRange(startDateTime, endDateTime)) {
      return createErrorResponse(
        new AppError(
          ErrorCode.VALIDATION_ERROR,
          '시작 시간이 종료 시간보다 늦을 수 없습니다.',
          400
        )
      );
    }

    const calendar = getCalendarClient(accessToken);
    
    // 이벤트 생성 요청 구성
    const event = {
      summary,
      description,
      location,
      start: {
        dateTime: startDateTime,
        timeZone: 'Asia/Seoul'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Asia/Seoul'
      },
      attendees: attendees.map((email: string) => ({ email })),
      reminders
    };

    // Circuit Breaker와 재시도 로직 적용
    const response = await calendarApiBreaker.execute(
      () => withRetry(
        () => calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
          sendUpdates: 'all'
        }),
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            logError(error, { 
              operation: 'event_create', 
              attempt,
              eventSummary: summary 
            });
          }
        }
      )
    );

    return NextResponse.json({
      success: true,
      event: response.data,
      message: `이벤트 "${summary}"가 생성되었습니다.`
    });
  } catch (error: any) {
    logError(error, { 
      operation: 'event_create',
      body: request.body
    });
    return createErrorResponse(error);
  }
}

// PUT: 이벤트 업데이트
export async function PUT(request: Request) {
  const accessToken = cookies().get('access_token')?.value;
  
  if (!accessToken) {
    return handleApiError(new AuthError());
  }

  try {
    const { eventId, updates } = await request.json();
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' }, 
        { status: 400 }
      );
    }

    const calendar = getCalendarClient(accessToken);
    
    // 기존 이벤트 가져오기
    const existing = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });

    // 업데이트 데이터 병합
    const updatedEvent = {
      ...existing.data,
      ...updates,
      // 시간 정보가 있으면 타임존 추가
      ...(updates.startDateTime && {
        start: {
          dateTime: updates.startDateTime,
          timeZone: 'Asia/Seoul'
        }
      }),
      ...(updates.endDateTime && {
        end: {
          dateTime: updates.endDateTime,
          timeZone: 'Asia/Seoul'
        }
      })
    };

    // 업데이트 필드에서 커스텀 필드 제거
    delete updatedEvent.startDateTime;
    delete updatedEvent.endDateTime;

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: updatedEvent,
      sendUpdates: 'all'
    });

    return NextResponse.json({
      success: true,
      event: response.data,
      message: '이벤트가 업데이트되었습니다.'
    });
  } catch (error: any) {
    console.error('Failed to update event:', error);
    return handleApiError(error);
  }
}

// DELETE: 이벤트 삭제
export async function DELETE(request: Request) {
  const accessToken = cookies().get('access_token')?.value;
  
  if (!accessToken) {
    return handleApiError(new AuthError());
  }

  try {
    const { eventId } = await request.json();
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' }, 
        { status: 400 }
      );
    }

    const calendar = getCalendarClient(accessToken);
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'all' // 참석자에게 취소 알림 발송
    });

    return NextResponse.json({ 
      success: true,
      message: '이벤트가 삭제되었습니다.',
      deletedEventId: eventId
    });
  } catch (error: any) {
    console.error('Failed to delete event:', error);
    return handleApiError(error);
  }
}
