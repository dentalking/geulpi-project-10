/**
 * 웹소켓 대신 안정적인 폴링 기반 동기화 Hook
 * 무한 루프 없이 안전하게 데이터 동기화
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { CalendarEvent } from '@/types';

interface SimpleSyncOptions {
  enabled?: boolean;
  interval?: number; // milliseconds
  onEventsUpdate?: (events: CalendarEvent[]) => void;
  onError?: (error: Error) => void;
}

interface SimpleSyncState {
  isActive: boolean;
  lastSync: Date | null;
  errorCount: number;
}

export function useSimpleSync(
  fetchFunction: () => Promise<CalendarEvent[]>,
  options: SimpleSyncOptions = {}
) {
  const {
    enabled = true,
    interval = 30000, // 30초마다 동기화
    onEventsUpdate,
    onError
  } = options;

  const [state, setState] = useState<SimpleSyncState>({
    isActive: false,
    lastSync: null,
    errorCount: 0
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);
  const lastEventsRef = useRef<CalendarEvent[]>([]);

  // 콜백을 ref에 저장하여 dependency 문제 방지
  const callbacksRef = useRef({
    onEventsUpdate,
    onError
  });

  useEffect(() => {
    callbacksRef.current = { onEventsUpdate, onError };
  }, [onEventsUpdate, onError]);

  // 동기화 실행 함수
  const performSync = useCallback(async () => {
    if (!isMountedRef.current || !enabled) {
      return;
    }

    try {
      console.log('[SimpleSync] Performing sync...');
      const freshEvents = await fetchFunction();

      if (!isMountedRef.current) return;

      // 이전 이벤트와 비교하여 변경사항 확인
      const prevEventsJson = JSON.stringify(lastEventsRef.current);
      const newEventsJson = JSON.stringify(freshEvents);

      if (prevEventsJson !== newEventsJson) {
        console.log('[SimpleSync] Events changed, updating...', {
          previousCount: lastEventsRef.current.length,
          newCount: freshEvents.length
        });

        lastEventsRef.current = freshEvents;

        if (callbacksRef.current.onEventsUpdate) {
          callbacksRef.current.onEventsUpdate(freshEvents);
        }
      } else {
        console.log('[SimpleSync] No changes detected');
      }

      setState(prev => ({
        ...prev,
        lastSync: new Date(),
        errorCount: 0,
        isActive: true
      }));

    } catch (error) {
      console.error('[SimpleSync] Sync failed:', error);

      setState(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1,
        isActive: false
      }));

      if (callbacksRef.current.onError) {
        callbacksRef.current.onError(error as Error);
      }
    }
  }, [fetchFunction, enabled]);

  // 동기화 시작/중지
  const startSync = useCallback(() => {
    if (!enabled) return;

    console.log('[SimpleSync] Starting sync with interval:', interval);

    // 즉시 한 번 실행
    performSync();

    // 주기적 실행 설정
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(performSync, interval);

    setState(prev => ({ ...prev, isActive: true }));
  }, [performSync, interval, enabled]);

  const stopSync = useCallback(() => {
    console.log('[SimpleSync] Stopping sync');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }

    setState(prev => ({ ...prev, isActive: false }));
  }, []);

  // Mount/unmount 관리
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled) {
      startSync();
    }

    return () => {
      isMountedRef.current = false;
      stopSync();
    };
  }, [enabled]); // 간단한 dependency로 무한 루프 방지

  // 수동 동기화 트리거
  const triggerSync = useCallback(() => {
    if (enabled && isMountedRef.current) {
      performSync();
    }
  }, [performSync, enabled]);

  return {
    isActive: state.isActive,
    lastSync: state.lastSync,
    errorCount: state.errorCount,
    triggerSync,
    start: startSync,
    stop: stopSync
  };
}