/**
 * HTTP 폴링 기반 실시간 동기화 API
 * Vercel Serverless 환경을 위한 WebSocket 대안
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const since = searchParams.get('since');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    logger.debug('[PollChanges] Checking for changes', {
      userId: userId.substring(0, 8) + '...',
      since
    });

    // Supabase 클라이언트 초기화
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 마지막 확인 시점 파싱
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 5 * 60 * 1000); // 기본 5분 전

    logger.debug('[PollChanges] Query parameters', {
      userId: userId.substring(0, 8) + '...',
      sinceDate: sinceDate.toISOString()
    });

    // 1. 생성된 이벤트 확인
    const { data: createdEvents, error: createdError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false });

    if (createdError) {
      logger.error('[PollChanges] Error fetching created events', createdError);
      throw createdError;
    }

    // 2. 수정된 이벤트 확인
    const { data: allUpdatedEvents, error: updatedError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', sinceDate.toISOString())
      .order('updated_at', { ascending: false });

    // 실제로 수정된 이벤트만 필터링 (created_at != updated_at)
    const updatedEvents = allUpdatedEvents?.filter(event =>
      new Date(event.created_at).getTime() !== new Date(event.updated_at).getTime()
    ) || [];

    if (updatedError) {
      logger.error('[PollChanges] Error fetching updated events', updatedError);
      throw updatedError;
    }

    // 3. 변경사항 정리
    const changes: any[] = [];

    // 새로 생성된 이벤트
    if (createdEvents && createdEvents.length > 0) {
      createdEvents.forEach(event => {
        changes.push({
          type: 'created',
          eventId: event.id,
          event: {
            id: event.id,
            title: event.title,
            description: event.description,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            calendar_type: event.calendar_type,
            created_at: event.created_at,
            updated_at: event.updated_at
          },
          timestamp: event.created_at
        });
      });
    }

    // 수정된 이벤트 (중복 제거)
    if (updatedEvents && updatedEvents.length > 0) {
      const createdIds = new Set(createdEvents?.map(e => e.id) || []);

      updatedEvents
        .filter(event => !createdIds.has(event.id))
        .forEach(event => {
          changes.push({
            type: 'updated',
            eventId: event.id,
            event: {
              id: event.id,
              title: event.title,
              description: event.description,
              start_time: event.start_time,
              end_time: event.end_time,
              location: event.location,
              calendar_type: event.calendar_type,
              created_at: event.created_at,
              updated_at: event.updated_at
            },
            timestamp: event.updated_at
          });
        });
    }

    // 4. 최신 타임스탬프 계산
    let lastTimestamp = sinceDate.toISOString();

    if (changes.length > 0) {
      const timestamps = changes.map(c => new Date(c.timestamp));
      lastTimestamp = new Date(Math.max(...timestamps.map(t => t.getTime()))).toISOString();
    }

    logger.info('[PollChanges] Changes detected', {
      userId: userId.substring(0, 8) + '...',
      changesCount: changes.length,
      lastTimestamp
    });

    return NextResponse.json({
      success: true,
      data: {
        changes: changes.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
        lastTimestamp,
        hasChanges: changes.length > 0,
        pollInfo: {
          since: sinceDate.toISOString(),
          until: new Date().toISOString(),
          windowMinutes: Math.round((Date.now() - sinceDate.getTime()) / (1000 * 60))
        }
      }
    });

  } catch (error: any) {
    logger.error('[PollChanges] Unexpected error', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to poll changes',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST method for manual sync trigger
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, forceSync = false } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    logger.info('[PollChanges] Manual sync triggered', {
      userId: userId.substring(0, 8) + '...',
      forceSync
    });

    // 강제 동기화의 경우 모든 최근 이벤트 반환
    if (forceSync) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: allEvents, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', new Date().toISOString()) // 현재 시간 이후 이벤트만
        .order('start_time', { ascending: true })
        .limit(50);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: {
          syncType: 'full',
          events: allEvents || [],
          timestamp: new Date().toISOString()
        }
      });
    }

    // 일반적인 경우 GET 메서드와 동일한 로직
    const url = new URL(request.url);
    url.searchParams.set('userId', userId);

    return GET(new NextRequest(url.toString()));

  } catch (error: any) {
    logger.error('[PollChanges] POST error', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger sync',
        details: error.message
      },
      { status: 500 }
    );
  }
}