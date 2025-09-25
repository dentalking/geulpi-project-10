import { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarEvent } from '@/types';

interface SyncOptions {
  interval?: number;  // Polling interval in milliseconds
  enabled?: boolean;
  onSync?: (events: CalendarEvent[]) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: SyncStatus) => void;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

interface SyncState {
  status: SyncStatus;
  lastSyncTime?: Date;
  error?: Error;
  pendingChanges: number;
}

/**
 * 실시간 동기화를 위한 Hook (Polling 방식)
 */
export function useRealtimeSync(
  fetchEvents: () => Promise<CalendarEvent[]>,
  options: SyncOptions = {}
) {
  const {
    interval = 30000, // 기본 30초
    enabled = true,
    onSync,
    onError,
    onStatusChange
  } = options;

  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    pendingChanges: 0
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const isOnlineRef = useRef(navigator.onLine);
  const lastEventHashRef = useRef<string>('');

  // 이벤트 해시 생성 (변경 감지용)
  const generateEventHash = useCallback((events: CalendarEvent[]): string => {
    const sortedEvents = [...events].sort((a, b) =>
      (a.id || '').localeCompare(b.id || '')
    );
    return JSON.stringify(sortedEvents.map(e => ({
      id: e.id,
      summary: e.summary,
      start: e.start,
      end: e.end,
      updated: e.updated
    })));
  }, []);

  // Store callbacks in refs to avoid recreating sync function
  const onSyncRef = useRef(onSync);
  const onErrorRef = useRef(onError);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onSyncRef.current = onSync;
    onErrorRef.current = onError;
    onStatusChangeRef.current = onStatusChange;
  }, [onSync, onError, onStatusChange]);

  // 동기화 실행
  const sync = useCallback(async () => {
    // 오프라인 상태 확인
    if (!navigator.onLine) {
      setSyncState(prev => ({ ...prev, status: 'offline' }));
      onStatusChangeRef.current?.('offline');
      return;
    }

    setSyncState(prev => ({ ...prev, status: 'syncing' }));
    onStatusChangeRef.current?.('syncing');

    try {
      const events = await fetchEvents();
      const currentHash = generateEventHash(events);

      // 변경사항이 있는 경우에만 콜백 호출
      if (currentHash !== lastEventHashRef.current) {
        lastEventHashRef.current = currentHash;
        onSyncRef.current?.(events);
      }

      setSyncState(prev => ({
        ...prev,
        status: 'success',
        lastSyncTime: new Date(),
        error: undefined,
        pendingChanges: 0
      }));
      onStatusChangeRef.current?.('success');
    } catch (error) {
      const err = error as Error;
      setSyncState(prev => ({
        ...prev,
        status: 'error',
        error: err
      }));
      onStatusChangeRef.current?.('error');
      onErrorRef.current?.(err);
    }
  }, [fetchEvents, generateEventHash]);

  // Use ref to track syncing status to avoid dependency issues
  const isSyncingRef = useRef(false);

  // Update ref when sync status changes
  useEffect(() => {
    isSyncingRef.current = syncState.status === 'syncing';
  }, [syncState.status]);

  // 수동 동기화
  const manualSync = useCallback(async () => {
    // 진행 중인 동기화가 있으면 무시
    if (isSyncingRef.current) {
      return;
    }
    return sync();
  }, [sync]);

  // Polling 설정
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // 초기 동기화
    sync();

    // Polling 시작
    intervalRef.current = setInterval(sync, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, sync]);

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      setSyncState(prev => ({ ...prev, status: 'idle' }));
      // 온라인 복귀 시 즉시 동기화
      sync();
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      setSyncState(prev => ({ ...prev, status: 'offline' }));
      onStatusChangeRef.current?.('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sync]);

  // 페이지 포커스 시 동기화
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible' && enabled) {
        sync();
      }
    };

    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [sync, enabled]);

  // 로컬 변경 추적
  const trackLocalChange = useCallback(() => {
    setSyncState(prev => ({
      ...prev,
      pendingChanges: prev.pendingChanges + 1
    }));
  }, []);

  // 변경사항 커밋
  const commitChanges = useCallback(() => {
    setSyncState(prev => ({
      ...prev,
      pendingChanges: 0
    }));
    // 즉시 동기화 시도
    manualSync();
  }, [manualSync]);

  return {
    // State
    status: syncState.status,
    lastSyncTime: syncState.lastSyncTime,
    error: syncState.error,
    pendingChanges: syncState.pendingChanges,
    isOnline: navigator.onLine,

    // Actions
    sync: manualSync,
    trackLocalChange,
    commitChanges,

    // Utilities
    getTimeSinceLastSync: () => {
      if (!syncState.lastSyncTime) return null;
      return Date.now() - syncState.lastSyncTime.getTime();
    }
  };
}

/**
 * 동기화 상태 표시 컴포넌트용 헬퍼
 */
export function getSyncStatusInfo(
  status: SyncStatus,
  locale: 'ko' | 'en' = 'ko'
): {
  text: string;
  color: string;
  icon: string;
  pulse: boolean;
} {
  switch (status) {
    case 'idle':
      return {
        text: locale === 'ko' ? '대기 중' : 'Idle',
        color: 'gray',
        icon: '⏸',
        pulse: false
      };

    case 'syncing':
      return {
        text: locale === 'ko' ? '동기화 중...' : 'Syncing...',
        color: 'blue',
        icon: '🔄',
        pulse: true
      };

    case 'success':
      return {
        text: locale === 'ko' ? '동기화 완료' : 'Synced',
        color: 'green',
        icon: '✅',
        pulse: false
      };

    case 'error':
      return {
        text: locale === 'ko' ? '동기화 실패' : 'Sync Failed',
        color: 'red',
        icon: '❌',
        pulse: false
      };

    case 'offline':
      return {
        text: locale === 'ko' ? '오프라인' : 'Offline',
        color: 'orange',
        icon: '📴',
        pulse: false
      };

    default:
      return {
        text: '',
        color: 'gray',
        icon: '❓',
        pulse: false
      };
  }
}

/**
 * 충돌 해결 전략
 */
export enum ConflictResolution {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  MERGE = 'merge',
  ASK_USER = 'ask_user'
}

/**
 * 이벤트 충돌 감지 및 해결
 */
export function resolveEventConflict(
  localEvent: CalendarEvent,
  serverEvent: CalendarEvent,
  strategy: ConflictResolution = ConflictResolution.SERVER_WINS
): CalendarEvent {
  // 수정 시간 비교
  const localUpdated = new Date(localEvent.updated || 0).getTime();
  const serverUpdated = new Date(serverEvent.updated || 0).getTime();

  switch (strategy) {
    case ConflictResolution.SERVER_WINS:
      return serverEvent;

    case ConflictResolution.CLIENT_WINS:
      return localEvent;

    case ConflictResolution.MERGE:
      // 더 최근 것을 선택
      if (localUpdated > serverUpdated) {
        return localEvent;
      } else if (serverUpdated > localUpdated) {
        return serverEvent;
      }
      // 같은 시간이면 필드별 병합
      return {
        ...serverEvent,
        ...localEvent,
        id: serverEvent.id, // ID는 서버 것 유지
        updated: new Date().toISOString()
      };

    case ConflictResolution.ASK_USER:
      // 사용자에게 선택 요청 (UI에서 처리)
      throw new Error('User intervention required');

    default:
      return serverEvent;
  }
}