/**
 * Supabase Realtime을 활용한 실시간 동기화 Hook
 * Vercel 환경에서 안정적으로 작동하도록 설계
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { CalendarEvent } from '@/types';
import { logger } from '@/lib/logger';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface RealtimeOptions {
  userId?: string;
  enabled?: boolean;
  onEventCreated?: (event: CalendarEvent) => void;
  onEventUpdated?: (event: CalendarEvent) => void;
  onEventDeleted?: (eventId: string) => void;
  onSyncRequired?: () => void;
  onError?: (error: Error) => void;
}

interface RealtimeState {
  isConnected: boolean;
  lastActivity: Date | null;
  connectionErrors: number;
  channel: RealtimeChannel | null;
}

export function useSupabaseRealtime(options: RealtimeOptions = {}) {
  const {
    userId,
    enabled = true,
    onEventCreated,
    onEventUpdated,
    onEventDeleted,
    onSyncRequired,
    onError
  } = options;

  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    lastActivity: null,
    connectionErrors: 0,
    channel: null
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const stateRef = useRef(state);

  // Store callbacks in refs to avoid recreating subscriptions
  const callbacksRef = useRef({
    onEventCreated,
    onEventUpdated,
    onEventDeleted,
    onSyncRequired,
    onError
  });

  useEffect(() => {
    callbacksRef.current = {
      onEventCreated,
      onEventUpdated,
      onEventDeleted,
      onSyncRequired,
      onError
    };
  }, [onEventCreated, onEventUpdated, onEventDeleted, onSyncRequired, onError]);

  // Update stateRef when state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Functions stored in refs to avoid circular dependencies
  const setupConnectionRef = useRef<() => Promise<void>>();

  // 하트비트 (연결 상태 확인)
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      const now = new Date();
      const currentState = stateRef.current;

      // 5분 이상 활동이 없으면 재연결
      if (currentState.lastActivity && (now.getTime() - currentState.lastActivity.getTime()) > 5 * 60 * 1000) {
        logger.warn('[Realtime] No activity for 5 minutes, reconnecting...');
        if (setupConnectionRef.current) {
          setupConnectionRef.current();
        }
      }

      // 연결 상태가 false이고 오류가 많으면 동기화 요청
      if (!currentState.isConnected && currentState.connectionErrors > 3) {
        if (callbacksRef.current.onSyncRequired) {
          callbacksRef.current.onSyncRequired();
        }
      }
    }, 60000); // 1분마다 체크
  }, []);

  // 재연결 스케줄링
  const scheduleReconnect = useCallback(() => {
    // Check max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      logger.warn(`[Realtime] Max reconnection attempts (${maxReconnectAttempts}) reached. Stopping.`);
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionErrors: prev.connectionErrors
      }));
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff, max 30s
    logger.info(`[Realtime] Scheduling reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (setupConnectionRef.current) {
        setupConnectionRef.current();
      }
    }, delay);
  }, []);

  // 연결 설정 - 안정성 개선
  const setupConnection = useCallback(async () => {
    if (!enabled || !userId) {
      logger.info('[Realtime] Disabled or no userId provided');
      setState(prev => ({ ...prev, isConnected: false }));
      return;
    }

    logger.info(`[Realtime] Setting up connection for user: ${userId}`);

    try {
      // 기존 채널 정리 - 더 안전한 방식
      if (channelRef.current) {
        const oldChannel = channelRef.current;
        channelRef.current = null; // 먼저 참조 제거

        try {
          logger.debug('[Realtime] Cleaning up existing channel');
          await oldChannel.unsubscribe();
          await supabaseClient.removeChannel(oldChannel);
        } catch (cleanupError) {
          logger.debug('[Realtime] Channel cleanup error (ignored):', cleanupError);
        }
      }

      // 타임스탬프를 포함한 고유 채널명으로 충돌 방지
      const timestamp = Date.now();
      const channelName = `calendar_events_${userId}_${timestamp}`;

      logger.debug(`[Realtime] Creating new channel: ${channelName}`);

      const channel = supabaseClient
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'calendar_events',
            filter: `user_id=eq.${userId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            logger.info('[Realtime] Event created:', payload.new?.id);
            setState(prev => ({ ...prev, lastActivity: new Date() }));

            if (payload.new && callbacksRef.current.onEventCreated) {
              try {
                const event = transformSupabaseEvent(payload.new);
                callbacksRef.current.onEventCreated(event);
              } catch (transformError) {
                logger.error('[Realtime] Error transforming created event:', transformError);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'calendar_events',
            filter: `user_id=eq.${userId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            logger.info('[Realtime] Event updated:', payload.new?.id);
            setState(prev => ({ ...prev, lastActivity: new Date() }));

            if (payload.new && callbacksRef.current.onEventUpdated) {
              try {
                const event = transformSupabaseEvent(payload.new);
                callbacksRef.current.onEventUpdated(event);
              } catch (transformError) {
                logger.error('[Realtime] Error transforming updated event:', transformError);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'calendar_events',
            filter: `user_id=eq.${userId}`
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const oldRecord = payload.old as any;
            logger.info('[Realtime] Event deleted:', oldRecord?.id);
            setState(prev => ({ ...prev, lastActivity: new Date() }));

            if (oldRecord?.id && callbacksRef.current.onEventDeleted) {
              callbacksRef.current.onEventDeleted(oldRecord.id);
            }
          }
        );

      // 채널 참조를 먼저 설정
      channelRef.current = channel;

      // 채널 구독 - 타임아웃 추가
      const subscribePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Subscription timeout after 10 seconds'));
        }, 10000);

        channel.subscribe((status, err) => {
          logger.info(`[Realtime] Subscription status: ${status}`);

          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            // Reset reconnection attempts on successful connection
            reconnectAttemptsRef.current = 0;
            setState(prev => ({
              ...prev,
              isConnected: true,
              connectionErrors: 0,
              channel: channel,
              lastActivity: new Date()
            }));
            logger.info('[Realtime] Successfully subscribed to channel');
            resolve(status);

            // 하트비트 시작
            startHeartbeat();

          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            clearTimeout(timeout);
            setState(prev => ({
              ...prev,
              isConnected: false,
              connectionErrors: prev.connectionErrors + 1
            }));

            const errorMessage = err?.message || `Realtime subscription failed with status: ${status}`;
            logger.warn('[Realtime] Subscription error', { error: errorMessage });

            if (callbacksRef.current.onError) {
              callbacksRef.current.onError(new Error(errorMessage));
            }

            reject(new Error(errorMessage));
          }
        });
      });

      await subscribePromise;

    } catch (error) {
      logger.error('[Realtime] Setup failed:', error);

      // 실패한 채널 정리
      if (channelRef.current) {
        try {
          await channelRef.current.unsubscribe();
          await supabaseClient.removeChannel(channelRef.current);
        } catch (cleanupError) {
          logger.debug('[Realtime] Failed channel cleanup error (ignored):', cleanupError);
        }
        channelRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionErrors: prev.connectionErrors + 1,
        channel: null
      }));

      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(error as Error);
      }

      // 자동 재연결 시도
      scheduleReconnect();
    }
  }, [enabled, userId]);

  // Store setupConnection in ref
  useEffect(() => {
    setupConnectionRef.current = setupConnection;
  }, [setupConnection]);

  // 연결 해제
  const disconnect = useCallback(async () => {
    // Clear all timers
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }

    // Clean up channel
    if (channelRef.current) {
      try {
        await channelRef.current.unsubscribe();
        await supabaseClient.removeChannel(channelRef.current);
      } catch (error) {
        // Ignore cleanup errors
        logger.debug('[Realtime] Channel cleanup error during disconnect (ignored):', error);
      }
      channelRef.current = null;
    }

    // Reset state
    reconnectAttemptsRef.current = 0;
    setState(prev => ({
      ...prev,
      isConnected: false,
      channel: null
    }));
  }, []);

  // 수동 동기화 트리거
  const triggerSync = useCallback(() => {
    if (callbacksRef.current.onSyncRequired) {
      callbacksRef.current.onSyncRequired();
    }
  }, []);

  // 초기 연결 및 정리
  useEffect(() => {
    if (enabled && userId) {
      if (setupConnectionRef.current) {
        setupConnectionRef.current();
      }
    }

    return () => {
      disconnect();
    };
  }, [enabled, userId]);

  // 페이지 가시성 변경 시 재연결
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && userId) {
        // 페이지가 다시 보이면 연결 상태 확인 후 필요시 재연결
        if (!stateRef.current.isConnected && setupConnectionRef.current) {
          logger.info('[Realtime] Page visible, reconnecting...');
          setupConnectionRef.current();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, userId]);

  return {
    isConnected: state.isConnected,
    lastActivity: state.lastActivity,
    connectionErrors: state.connectionErrors,
    disconnect,
    reconnect: setupConnection,
    triggerSync
  };
}

// Supabase 이벤트를 CalendarEvent로 변환
function transformSupabaseEvent(dbEvent: any): CalendarEvent {
  return {
    id: dbEvent.id,
    summary: dbEvent.summary,
    description: dbEvent.description,
    location: dbEvent.location,
    start: {
      dateTime: dbEvent.start_time,
      timeZone: dbEvent.timezone || 'Asia/Seoul'
    },
    end: {
      dateTime: dbEvent.end_time,
      timeZone: dbEvent.timezone || 'Asia/Seoul'
    },
    created: dbEvent.created_at,
    updated: dbEvent.updated_at,
    status: dbEvent.status || 'confirmed',
    organizer: dbEvent.organizer || null,
    attendees: dbEvent.attendees || [],
    recurrence: dbEvent.recurrence ? [dbEvent.recurrence] : undefined,
    // source: {
    //   url: `supabase://calendar_events/${dbEvent.id}`,
    //   title: 'Geulpi Calendar'
    // }
  };
}

// 연결 상태 표시용 헬퍼
export function getRealtimeStatusInfo(
  isConnected: boolean,
  connectionErrors: number,
  locale: 'ko' | 'en' = 'ko'
) {
  if (isConnected) {
    return {
      text: locale === 'ko' ? '실시간 연결됨' : 'Live Connected',
      color: 'green',
      icon: '🟢',
      pulse: false
    };
  } else if (connectionErrors > 0) {
    return {
      text: locale === 'ko' ? '연결 재시도 중' : 'Reconnecting',
      color: 'orange',
      icon: '🟡',
      pulse: true
    };
  } else {
    return {
      text: locale === 'ko' ? '연결 대기 중' : 'Connecting',
      color: 'blue',
      icon: '🔵',
      pulse: true
    };
  }
}