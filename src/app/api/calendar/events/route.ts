import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { handleApiError, AuthError } from '@/lib/api-errors';
import { supabase } from '@/lib/db';
import { getCalendarClient } from '@/lib/google-auth';
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
  try {
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    // 1. JWT 이메일 인증 트랙 확인
    let authToken: string | null = null;
    if (authHeader?.startsWith('auth-token ')) {
      authToken = authHeader.substring(11);
    } else {
      authToken = cookieStore.get('auth-token')?.value || null;
    }

    if (authToken) {
      try {
        const user = await verifyToken(authToken);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        console.error('JWT auth verification failed:', error);
      }
    }

    // 2. Google OAuth 트랙 확인 (기존 시스템 보존)
    let accessToken: string | null = null;
    let isGoogleUser = false;

    if (!userId) {
      accessToken = cookieStore.get('access_token')?.value || cookieStore.get('google_access_token')?.value || null;
      const refreshToken = cookieStore.get('refresh_token')?.value || cookieStore.get('google_refresh_token')?.value || null;

      if (accessToken) {
        try {
          const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (response.ok) {
            const googleUser = await response.json();
            userId = googleUser.id; // Google numeric ID
            isGoogleUser = true;
          }
        } catch (error) {
          console.error('Google OAuth verification failed:', error);
        }
      }
    }

    if (!userId) {
      return handleApiError(new AuthError());
    }

    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults') || '50');
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');

    // Google OAuth 사용자는 Google Calendar API에서 직접 가져오기
    if (isGoogleUser && accessToken) {
      try {
        const calendar = getCalendarClient(accessToken);

        // Google Calendar API 호출
        const calendarResponse = await calendar.events.list({
          calendarId: 'primary',
          maxResults: maxResults,
          singleEvents: true,
          orderBy: 'startTime',
          timeMin: timeMin || new Date().toISOString(),
          timeMax: timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90일
        });

        const events = calendarResponse.data.items || [];

        // Google Calendar 이벤트 형식 그대로 반환
        const transformedEvents = events.map((event: any) => ({
          id: event.id,
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          attendees: event.attendees || [],
          colorId: event.colorId,
          status: event.status || 'confirmed',
          created: event.created,
          updated: event.updated,
          source: 'google',
          googleEventId: event.id
        }));

        console.log(`[Google Calendar] Fetched ${transformedEvents.length} events for user ${userId}`);

        return NextResponse.json({
          success: true,
          events: transformedEvents,
          total: transformedEvents.length
        });
      } catch (error) {
        console.error('Failed to fetch from Google Calendar:', error);
        // Google Calendar 실패 시 DB로 폴백
      }
    }

    // 이메일 인증 사용자는 Supabase DB에서 조회
    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })
      .limit(maxResults);

    // Add time filters if provided
    if (timeMin) {
      query = query.gte('start_time', timeMin);
    }
    if (timeMax) {
      query = query.lte('end_time', timeMax);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching events from database:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch events'
      }, { status: 500 });
    }

    // Transform Supabase events to match Google Calendar format
    const transformedEvents = (events || []).map(event => ({
      id: event.id,
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.start_time,
        timeZone: 'Asia/Seoul'
      },
      end: {
        dateTime: event.end_time,
        timeZone: 'Asia/Seoul'
      },
      attendees: event.attendees || [],
      colorId: event.color_id,
      status: event.status || 'confirmed',
      created: event.created_at,
      updated: event.updated_at,
      source: event.source,
      googleEventId: event.google_event_id
    }));

    return NextResponse.json({
      success: true,
      events: transformedEvents,
      total: transformedEvents.length
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: 새 이벤트 생성
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authHeader = request.headers.get('authorization');
  let userId: string | null = null;
  let isGoogleUser = false;

  // 1. JWT 이메일 인증 트랙 확인
  let authToken: string | null = null;
  if (authHeader?.startsWith('auth-token ')) {
    authToken = authHeader.substring(11);
  } else {
    authToken = cookieStore.get('auth-token')?.value || null;
  }

  if (authToken) {
    try {
      const user = await verifyToken(authToken);
      if (user) {
        userId = user.id;
      }
    } catch (error) {
      console.error('JWT auth verification failed:', error);
    }
  }

  // 2. Google OAuth 트랙 확인
  let accessToken: string | null = null;
  if (!userId) {
    accessToken = cookieStore.get('access_token')?.value || null;
    if (accessToken) {
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (response.ok) {
          const googleUser = await response.json();
          userId = googleUser.id;
          isGoogleUser = true;
        }
      } catch (error) {
        console.error('Google OAuth verification failed:', error);
      }
    }
  }

  if (!userId) {
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

    // Email auth users store events in database
    if (!isGoogleUser) {
      const { data: newEvent, error: dbError } = await supabase
        .from('calendar_events')
        .insert({
          user_id: userId,
          summary,
          description,
          location,
          start_time: startDateTime,
          end_time: endDateTime,
          attendees: attendees, // JSONB column - pass array directly
          source: 'local',
          status: 'confirmed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error creating event in database:', {
          error: dbError,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
          data: {
            userId,
            summary,
            attendees,
            startDateTime,
            endDateTime
          }
        });
        return createErrorResponse(
          new AppError(ErrorCode.INTERNAL_ERROR, '이벤트 생성에 실패했습니다.', 500)
        );
      }

      return NextResponse.json({
        success: true,
        event: {
          id: newEvent.id,
          summary: newEvent.summary,
          description: newEvent.description,
          location: newEvent.location,
          start: {
            dateTime: newEvent.start_time,
            timeZone: 'Asia/Seoul'
          },
          end: {
            dateTime: newEvent.end_time,
            timeZone: 'Asia/Seoul'
          },
          attendees: newEvent.attendees || [],
          status: newEvent.status,
          source: newEvent.source
        },
        message: `이벤트 "${summary}"가 생성되었습니다.`
      });
    }

    // Google OAuth users use Google Calendar API
    const calendar = getCalendarClient(accessToken!);

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
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

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
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

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
