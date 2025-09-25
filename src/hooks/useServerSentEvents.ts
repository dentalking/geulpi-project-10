/**
 * Server-Sent Events 클라이언트 Hook
 * Vercel 환경에서 안정적인 실시간 통신
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface SSEOptions {
  enabled?: boolean;
  authToken?: string;
  onEventCreated?: (data: any) => void;
  onEventUpdated?: (data: any) => void;
  onEventDeleted?: (data: any) => void;
  onSyncRequired?: () => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface SSEState {
  connected: boolean;
  lastMessage: Date | null;
  reconnectCount: number;
  error: string | null;
}

export function useServerSentEvents(options: SSEOptions = {}) {
  const {
    enabled = true,
    authToken,
    onEventCreated,
    onEventUpdated,
    onEventDeleted,
    onSyncRequired,
    onError,
    onConnectionChange
  } = options;

  const [state, setState] = useState<SSEState>({
    connected: false,
    lastMessage: null,
    reconnectCount: 0,
    error: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const callbacksRef = useRef(options);

  // Update callbacks ref
  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  // 연결 설정
  const connect = useCallback(() => {
    if (!enabled || !authToken) {
      logger.info('[SSE] Disabled or no auth token');
      return;
    }

    // 기존 연결 정리
    disconnect();

    try {
      // EventSource는 GET 요청만 지원하므로 URL에 토큰 포함 또는 쿠키 사용
      const url = `/api/events/stream`;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // 연결 이벤트 리스너
      eventSource.onopen = () => {
        logger.info('[SSE] Connection opened');
        setState(prev => ({
          ...prev,
          connected: true,
          error: null,
          reconnectCount: 0
        }));
        callbacksRef.current.onConnectionChange?.(true);
      };

      // 메시지 이벤트 리스너
      eventSource.onmessage = (event) => {
        logger.debug('[SSE] Default message received:', event.data);
        setState(prev => ({ ...prev, lastMessage: new Date() }));
      };

      // 연결 확인 이벤트
      eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        logger.info('[SSE] Connected:', data);
        setState(prev => ({ ...prev, lastMessage: new Date() }));
      });

      // Ping 이벤트 (연결 유지)
      eventSource.addEventListener('ping', (event) => {
        const data = JSON.parse(event.data);
        logger.debug('[SSE] Ping received:', data);
        setState(prev => ({ ...prev, lastMessage: new Date() }));
      });

      // 이벤트 생성
      eventSource.addEventListener('event-created', (event) => {
        const data = JSON.parse(event.data);
        logger.info('[SSE] Event created:', data);
        setState(prev => ({ ...prev, lastMessage: new Date() }));
        callbacksRef.current.onEventCreated?.(data);
      });

      // 이벤트 수정
      eventSource.addEventListener('event-updated', (event) => {
        const data = JSON.parse(event.data);
        logger.info('[SSE] Event updated:', data);
        setState(prev => ({ ...prev, lastMessage: new Date() }));
        callbacksRef.current.onEventUpdated?.(data);
      });

      // 이벤트 삭제
      eventSource.addEventListener('event-deleted', (event) => {
        const data = JSON.parse(event.data);
        logger.info('[SSE] Event deleted:', data);
        setState(prev => ({ ...prev, lastMessage: new Date() }));
        callbacksRef.current.onEventDeleted?.(data);
      });

      // 동기화 요청
      eventSource.addEventListener('sync-required', (event) => {
        const data = JSON.parse(event.data);
        logger.info('[SSE] Sync required:', data);
        setState(prev => ({ ...prev, lastMessage: new Date() }));
        callbacksRef.current.onSyncRequired?.();
      });

      // 오류 처리
      eventSource.onerror = (event) => {
        logger.error('[SSE] Connection error:', event);

        setState(prev => ({
          ...prev,
          connected: false,
          error: 'Connection failed',
          reconnectCount: prev.reconnectCount + 1
        }));

        callbacksRef.current.onConnectionChange?.(false);
        callbacksRef.current.onError?.(new Error('SSE connection failed'));

        // 자동 재연결
        scheduleReconnect();
      };

    } catch (error) {
      logger.error('[SSE] Failed to create connection:', error);
      setState(prev => ({
        ...prev,
        connected: false,
        error: (error as Error).message,
        reconnectCount: prev.reconnectCount + 1
      }));
      callbacksRef.current.onError?.(error as Error);
      scheduleReconnect();
    }
  }, [enabled, authToken]);

  // 연결 해제
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState(prev => ({
      ...prev,
      connected: false
    }));

    callbacksRef.current.onConnectionChange?.(false);
  }, []);

  // 재연결 스케줄링
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      return; // 이미 스케줄됨
    }

    const delay = Math.min(1000 * Math.pow(2, state.reconnectCount), 30000); // 최대 30초
    logger.info(`[SSE] Scheduling reconnect in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = undefined;
      connect();
    }, delay);
  }, [connect, state.reconnectCount]);

  // 수동 재연결
  const reconnect = useCallback(() => {
    logger.info('[SSE] Manual reconnect triggered');
    disconnect();
    connect();
  }, [connect, disconnect]);

  // 초기 연결
  useEffect(() => {
    if (enabled && authToken) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, authToken]);

  // 페이지 가시성 변경 시 재연결
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (enabled && authToken && !state.connected) {
          logger.info('[SSE] Page visible, reconnecting...');
          reconnect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, authToken, state.connected, reconnect]);

  // 연결 상태 모니터링 (3분 이상 메시지 없으면 재연결)
  useEffect(() => {
    if (!state.connected || !state.lastMessage) return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const timeSinceLastMessage = now.getTime() - state.lastMessage!.getTime();

      if (timeSinceLastMessage > 3 * 60 * 1000) { // 3분
        logger.warn('[SSE] No messages for 3 minutes, reconnecting...');
        reconnect();
      }
    }, 60000); // 1분마다 체크

    return () => clearInterval(checkInterval);
  }, [state.connected, state.lastMessage, reconnect]);

  return {
    connected: state.connected,
    lastMessage: state.lastMessage,
    reconnectCount: state.reconnectCount,
    error: state.error,
    reconnect,
    disconnect
  };
}

// 연결 상태 표시용 헬퍼
export function getSSEStatusInfo(
  connected: boolean,
  reconnectCount: number,
  error: string | null,
  locale: 'ko' | 'en' = 'ko'
) {
  if (connected) {
    return {
      text: locale === 'ko' ? '실시간 연결됨' : 'Live Connected',
      color: 'green',
      icon: '🟢',
      pulse: false
    };
  } else if (reconnectCount > 0) {
    return {
      text: locale === 'ko' ? '연결 재시도 중' : 'Reconnecting',
      color: 'orange',
      icon: '🟡',
      pulse: true
    };
  } else if (error) {
    return {
      text: locale === 'ko' ? '연결 실패' : 'Connection Failed',
      color: 'red',
      icon: '🔴',
      pulse: false
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