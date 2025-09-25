/**
 * Supabase Realtime + SSE를 결합한 통합 실시간 동기화 Hook
 * 가장 안정적인 연결을 자동으로 선택하여 사용
 */

import { useCallback, useEffect, useState } from 'react';
import { useSupabaseRealtime } from './useSupabaseRealtime';
import { useServerSentEvents } from './useServerSentEvents';
import { useUnifiedEventStore } from '@/store/unifiedEventStore';
import { CalendarEvent } from '@/types';
import { logger } from '@/lib/logger';

interface UnifiedSyncOptions {
  userId?: string;
  authToken?: string;
  enabled?: boolean;
  preferredMethod?: 'supabase' | 'sse' | 'auto';
  onError?: (error: Error) => void;
}

interface SyncStatus {
  method: 'supabase' | 'sse' | 'none';
  connected: boolean;
  lastActivity: Date | null;
  errors: number;
}

export function useUnifiedSync(options: UnifiedSyncOptions = {}) {
  const {
    userId,
    authToken,
    enabled = true,
    preferredMethod = 'auto',
    onError
  } = options;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    method: 'none',
    connected: false,
    lastActivity: null,
    errors: 0
  });

  // Store actions
  const {
    addEvent,
    updateEvent,
    deleteEvent,
    setSyncStatus: setStoreSyncStatus,
    broadcast
  } = useUnifiedEventStore();

  // 이벤트 핸들러들
  const handleEventCreated = useCallback((event: CalendarEvent) => {
    logger.info('[UnifiedSync] Event created:', event);
    addEvent(event);
    broadcast([event]);
    setSyncStatus(prev => ({ ...prev, lastActivity: new Date() }));
  }, [addEvent, broadcast]);

  const handleEventUpdated = useCallback((event: CalendarEvent) => {
    logger.info('[UnifiedSync] Event updated:', event);
    if (event.id) {
      updateEvent(event.id, event);
      broadcast([event]);
    }
    setSyncStatus(prev => ({ ...prev, lastActivity: new Date() }));
  }, [updateEvent, broadcast]);

  const handleEventDeleted = useCallback((eventId: string) => {
    logger.info('[UnifiedSync] Event deleted:', eventId);
    deleteEvent(eventId);
    setSyncStatus(prev => ({ ...prev, lastActivity: new Date() }));
  }, [deleteEvent]);

  const handleSyncRequired = useCallback(() => {
    logger.info('[UnifiedSync] Manual sync required');
    setStoreSyncStatus('syncing');
    // 전체 동기화 트리거 (부모 컴포넌트에서 처리)
    window.dispatchEvent(new CustomEvent('sync-required'));
  }, [setStoreSyncStatus]);

  const handleError = useCallback((error: Error) => {
    logger.error('[UnifiedSync] Error:', error);
    setSyncStatus(prev => ({
      ...prev,
      errors: prev.errors + 1,
      connected: false
    }));
    onError?.(error);
  }, [onError]);

  // Supabase Realtime - temporarily disabled until authentication issue is resolved
  const supabaseSync = useSupabaseRealtime({
    userId,
    enabled: false, // Temporarily disabled - was: enabled && (preferredMethod === 'supabase' || preferredMethod === 'auto'),
    onEventCreated: handleEventCreated,
    onEventUpdated: handleEventUpdated,
    onEventDeleted: handleEventDeleted,
    onSyncRequired: handleSyncRequired,
    onError: handleError
  });

  // Server-Sent Events
  const sseSync = useServerSentEvents({
    authToken,
    enabled: enabled && (preferredMethod === 'sse' || preferredMethod === 'auto'),
    onEventCreated: handleEventCreated,
    onEventUpdated: handleEventUpdated,
    onEventDeleted: handleEventDeleted,
    onSyncRequired: handleSyncRequired,
    onError: handleError,
    onConnectionChange: (connected) => {
      if (syncStatus.method === 'sse') {
        setSyncStatus(prev => ({ ...prev, connected }));
      }
    }
  });

  // 연결 방법 선택 로직
  useEffect(() => {
    let selectedMethod: 'supabase' | 'sse' | 'none' = 'none';
    let isConnected = false;

    if (preferredMethod === 'auto') {
      // 자동 선택: 둘 다 연결된 경우 Supabase 우선
      if (supabaseSync.isConnected) {
        selectedMethod = 'supabase';
        isConnected = true;
      } else if (sseSync.connected) {
        selectedMethod = 'sse';
        isConnected = true;
      }
    } else if (preferredMethod === 'supabase') {
      selectedMethod = 'supabase';
      isConnected = supabaseSync.isConnected;
    } else if (preferredMethod === 'sse') {
      selectedMethod = 'sse';
      isConnected = sseSync.connected;
    }

    setSyncStatus(prev => {
      // 방법이 변경되었을 때만 로그
      if (prev.method !== selectedMethod) {
        logger.info(`[UnifiedSync] Method changed: ${prev.method} -> ${selectedMethod}`);
      }

      return {
        ...prev,
        method: selectedMethod,
        connected: isConnected,
        lastActivity: isConnected ? (prev.lastActivity || new Date()) : prev.lastActivity
      };
    });

    // Store에 동기화 상태 업데이트
    setStoreSyncStatus(isConnected ? 'success' : 'error');

  }, [
    preferredMethod,
    supabaseSync.isConnected,
    sseSync.connected,
    setStoreSyncStatus
  ]);

  // 수동 재연결
  const reconnect = useCallback(() => {
    logger.info('[UnifiedSync] Manual reconnect triggered');

    if (syncStatus.method === 'supabase' || preferredMethod === 'auto') {
      supabaseSync.reconnect();
    }

    if (syncStatus.method === 'sse' || preferredMethod === 'auto') {
      sseSync.reconnect();
    }
  }, [syncStatus.method, preferredMethod, supabaseSync.reconnect, sseSync.reconnect]);

  // 연결 해제
  const disconnect = useCallback(() => {
    logger.info('[UnifiedSync] Disconnecting all');
    supabaseSync.disconnect();
    sseSync.disconnect();
    setSyncStatus(prev => ({ ...prev, connected: false, method: 'none' }));
  }, [supabaseSync.disconnect, sseSync.disconnect]);

  // 강제 동기화 트리거
  const triggerSync = useCallback(() => {
    if (syncStatus.method === 'supabase') {
      supabaseSync.triggerSync();
    } else {
      handleSyncRequired();
    }
  }, [syncStatus.method, supabaseSync.triggerSync, handleSyncRequired]);

  // 연결 품질 모니터링
  const getConnectionQuality = useCallback(() => {
    if (!syncStatus.connected) return 'disconnected';

    const now = new Date();
    const lastActivity = syncStatus.lastActivity;

    if (!lastActivity) return 'unknown';

    const timeSinceActivity = now.getTime() - lastActivity.getTime();

    if (timeSinceActivity < 30000) return 'excellent'; // 30초 이내
    if (timeSinceActivity < 60000) return 'good';      // 1분 이내
    if (timeSinceActivity < 180000) return 'fair';     // 3분 이내
    return 'poor';
  }, [syncStatus.connected, syncStatus.lastActivity]);

  // 연결 통계
  const getConnectionStats = useCallback(() => {
    return {
      method: syncStatus.method,
      connected: syncStatus.connected,
      lastActivity: syncStatus.lastActivity,
      errors: syncStatus.errors,
      quality: getConnectionQuality(),
      supabase: {
        connected: supabaseSync.isConnected,
        errors: supabaseSync.connectionErrors,
        lastActivity: supabaseSync.lastActivity
      },
      sse: {
        connected: sseSync.connected,
        reconnects: sseSync.reconnectCount,
        lastMessage: sseSync.lastMessage,
        error: sseSync.error
      }
    };
  }, [
    syncStatus,
    getConnectionQuality,
    supabaseSync,
    sseSync
  ]);

  return {
    // 현재 상태
    connected: syncStatus.connected,
    method: syncStatus.method,
    lastActivity: syncStatus.lastActivity,
    errors: syncStatus.errors,
    quality: getConnectionQuality(),

    // 액션
    reconnect,
    disconnect,
    triggerSync,

    // 통계
    getStats: getConnectionStats,

    // 개별 연결 상태
    supabase: {
      connected: supabaseSync.isConnected,
      errors: supabaseSync.connectionErrors
    },
    sse: {
      connected: sseSync.connected,
      reconnects: sseSync.reconnectCount
    }
  };
}

// 연결 상태 표시용 통합 헬퍼
export function getUnifiedSyncStatusInfo(
  method: 'supabase' | 'sse' | 'none',
  connected: boolean,
  quality: string,
  locale: 'ko' | 'en' = 'ko'
) {
  if (!connected) {
    return {
      text: locale === 'ko' ? '연결 끊김' : 'Disconnected',
      color: 'red',
      icon: '🔴',
      pulse: false,
      detail: method === 'none' ? 'No connection' : `${method} disconnected`
    };
  }

  const methodName = method === 'supabase' ? 'Realtime' : method === 'sse' ? 'SSE' : 'Unknown';

  switch (quality) {
    case 'excellent':
      return {
        text: locale === 'ko' ? '실시간 연결' : 'Live',
        color: 'green',
        icon: '🟢',
        pulse: false,
        detail: `${methodName} - Excellent`
      };

    case 'good':
      return {
        text: locale === 'ko' ? '실시간 연결' : 'Live',
        color: 'green',
        icon: '🟢',
        pulse: false,
        detail: `${methodName} - Good`
      };

    case 'fair':
      return {
        text: locale === 'ko' ? '연결됨' : 'Connected',
        color: 'orange',
        icon: '🟡',
        pulse: false,
        detail: `${methodName} - Fair`
      };

    case 'poor':
      return {
        text: locale === 'ko' ? '불안정' : 'Unstable',
        color: 'orange',
        icon: '🟡',
        pulse: true,
        detail: `${methodName} - Poor`
      };

    default:
      return {
        text: locale === 'ko' ? '연결됨' : 'Connected',
        color: 'blue',
        icon: '🔵',
        pulse: false,
        detail: `${methodName} - Unknown`
      };
  }
}