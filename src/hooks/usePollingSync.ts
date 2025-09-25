/**
 * HTTP Polling 기반 실시간 동기화
 * Vercel Serverless 환경에 최적화된 WebSocket 대안
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarEvent } from '@/types';
import { logger } from '@/lib/logger';

interface PollingOptions {
  userId?: string;
  enabled?: boolean;
  interval?: number; // 폴링 간격 (ms)
  onEventCreated?: (event: CalendarEvent) => void;
  onEventUpdated?: (event: CalendarEvent) => void;
  onEventDeleted?: (eventId: string) => void;
  onSyncRequired?: () => void;
  onError?: (error: Error) => void;
}

interface SyncState {
  isActive: boolean;
  lastSync: Date | null;
  errorCount: number;
  totalPolls: number;
}

export function usePollingSync(options: PollingOptions = {}) {
  const {
    userId,
    enabled = true,
    interval = 30000, // 30초마다 폴링
    onEventCreated,
    onEventUpdated,
    onEventDeleted,
    onSyncRequired,
    onError
  } = options;

  const [state, setState] = useState<SyncState>({
    isActive: false,
    lastSync: null,
    errorCount: 0,
    totalPolls: 0
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const lastEventTimestamp = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController>();

  /**
   * 이벤트 변경사항 폴링
   */
  const pollChanges = useCallback(async () => {
    if (!enabled || !userId) return;

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const params = new URLSearchParams({
        userId,
        since: lastEventTimestamp.current || new Date(Date.now() - 5 * 60 * 1000).toISOString()
      });

      logger.debug('[PollingSync] Polling for changes', {
        userId: userId.substring(0, 8) + '...',
        since: lastEventTimestamp.current
      });

      const response = await fetch(`/api/sync/poll-changes?${params}`, {
        method: 'GET',
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const { changes, lastTimestamp } = data;

      // 타임스탬프 업데이트
      if (lastTimestamp) {
        lastEventTimestamp.current = lastTimestamp;
      }

      // 변경사항 처리
      if (changes && changes.length > 0) {
        logger.info('[PollingSync] Processing changes', {
          count: changes.length
        });

        changes.forEach((change: any) => {
          switch (change.type) {
            case 'created':
              onEventCreated?.(change.event);
              break;
            case 'updated':
              onEventUpdated?.(change.event);
              break;
            case 'deleted':
              onEventDeleted?.(change.eventId);
              break;
          }
        });
      }

      // 상태 업데이트
      setState(prev => ({
        ...prev,
        isActive: true,
        lastSync: new Date(),
        errorCount: 0,
        totalPolls: prev.totalPolls + 1
      }));

    } catch (error: any) {
      if (error.name === 'AbortError') return;

      logger.error('[PollingSync] Poll failed', error);

      setState(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }));

      onError?.(error);

      // 에러 발생 시 동기화 요청
      if (state.errorCount > 2) {
        onSyncRequired?.();
      }
    }
  }, [enabled, userId, onEventCreated, onEventUpdated, onEventDeleted, onSyncRequired, onError, state.errorCount]);

  /**
   * 폴링 시작
   */
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 즉시 한 번 실행
    pollChanges();

    // 주기적 실행
    intervalRef.current = setInterval(pollChanges, interval);

    setState(prev => ({
      ...prev,
      isActive: true
    }));

    logger.info('[PollingSync] Started polling', {
      userId: userId?.substring(0, 8) + '...' || 'anonymous',
      interval: interval / 1000 + 's'
    });
  }, [pollChanges, interval, userId]);

  /**
   * 폴링 중지
   */
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      isActive: false
    }));

    logger.info('[PollingSync] Stopped polling');
  }, []);

  /**
   * 수동 동기화
   */
  const triggerSync = useCallback(() => {
    pollChanges();
  }, [pollChanges]);

  // 자동 시작/중지
  useEffect(() => {
    if (enabled && userId) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [enabled, userId, startPolling, stopPolling]);

  // 페이지 가시성 변경 시 처리
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && userId) {
        // 페이지가 다시 보이면 즉시 동기화
        triggerSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, userId, triggerSync]);

  return {
    isActive: state.isActive,
    lastSync: state.lastSync,
    errorCount: state.errorCount,
    totalPolls: state.totalPolls,
    startPolling,
    stopPolling,
    triggerSync
  };
}