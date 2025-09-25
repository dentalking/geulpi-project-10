/**
 * 통합 이벤트 상태 관리 Provider
 * 앱 전체에서 일관된 상태 관리 제공
 */

'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useUnifiedEventStore } from '@/store/unifiedEventStore';
import { useUnifiedSync } from '@/hooks/useUnifiedSync';
import { logger } from '@/lib/logger';

interface UnifiedEventContextValue {
  // 실시간 동기화 상태
  syncConnected: boolean;
  syncMethod: 'supabase' | 'sse' | 'none';
  syncQuality: string;
  lastActivity: Date | null;

  // 수동 액션
  triggerSync: () => void;
  reconnectSync: () => void;
  disconnectSync: () => void;

  // 통계
  getSyncStats: () => any;
}

const UnifiedEventContext = createContext<UnifiedEventContextValue | null>(null);

interface UnifiedEventProviderProps {
  children: ReactNode;
  userId?: string;
  authToken?: string;
  enabled?: boolean;
}

export function UnifiedEventProvider({
  children,
  userId,
  authToken,
  enabled = true
}: UnifiedEventProviderProps) {
  // 통합 동기화
  const unifiedSync = useUnifiedSync({
    userId,
    authToken,
    enabled,
    preferredMethod: 'auto',
    onError: (error) => {
      logger.error('[UnifiedEventProvider] Sync error:', error);
    }
  });

  // 스토어에 동기화 상태 반영
  const { setSyncStatus, setSyncError } = useUnifiedEventStore();

  useEffect(() => {
    if (unifiedSync.connected) {
      setSyncStatus('success');
      setSyncError(null);
    } else if (unifiedSync.errors > 0) {
      setSyncStatus('error');
      setSyncError('Connection failed');
    } else {
      setSyncStatus('syncing');
    }
  }, [unifiedSync.connected, unifiedSync.errors, setSyncStatus, setSyncError]);

  // 전역 동기화 이벤트 리스너
  useEffect(() => {
    const handleSyncRequired = () => {
      logger.info('[UnifiedEventProvider] Global sync required');
      unifiedSync.triggerSync();
    };

    const handlePageVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        // 페이지가 다시 보이면 상태 확인
        if (!unifiedSync.connected) {
          logger.info('[UnifiedEventProvider] Page visible, reconnecting...');
          unifiedSync.reconnect();
        }
      }
    };

    // 글로벌 이벤트 리스너
    window.addEventListener('sync-required', handleSyncRequired);
    document.addEventListener('visibilitychange', handlePageVisibility);

    return () => {
      window.removeEventListener('sync-required', handleSyncRequired);
      document.removeEventListener('visibilitychange', handlePageVisibility);
    };
  }, [unifiedSync, enabled]);

  // 주기적 연결 품질 확인 (5분마다)
  useEffect(() => {
    if (!enabled) return;

    const qualityCheckInterval = setInterval(() => {
      const stats = unifiedSync.getStats();
      logger.debug('[UnifiedEventProvider] Connection quality check:', {
        connected: stats.connected,
        method: stats.method,
        quality: stats.quality,
        errors: stats.errors
      });

      // 연결 품질이 나쁘면 재연결 시도
      if (stats.quality === 'poor' && stats.connected) {
        logger.warn('[UnifiedEventProvider] Poor connection quality, attempting reconnect');
        unifiedSync.reconnect();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(qualityCheckInterval);
  }, [unifiedSync, enabled]);

  const contextValue: UnifiedEventContextValue = {
    // 상태
    syncConnected: unifiedSync.connected,
    syncMethod: unifiedSync.method,
    syncQuality: unifiedSync.quality,
    lastActivity: unifiedSync.lastActivity,

    // 액션
    triggerSync: unifiedSync.triggerSync,
    reconnectSync: unifiedSync.reconnect,
    disconnectSync: unifiedSync.disconnect,

    // 통계
    getSyncStats: unifiedSync.getStats
  };

  return (
    <UnifiedEventContext.Provider value={contextValue}>
      {children}
    </UnifiedEventContext.Provider>
  );
}

export function useUnifiedEventContext() {
  const context = useContext(UnifiedEventContext);
  if (!context) {
    throw new Error('useUnifiedEventContext must be used within UnifiedEventProvider');
  }
  return context;
}

// 편의 Hook들
export function useSyncConnection() {
  const { syncConnected, syncMethod, syncQuality, lastActivity } = useUnifiedEventContext();
  return { connected: syncConnected, method: syncMethod, quality: syncQuality, lastActivity };
}

export function useSyncActions() {
  const { triggerSync, reconnectSync, disconnectSync } = useUnifiedEventContext();
  return { trigger: triggerSync, reconnect: reconnectSync, disconnect: disconnectSync };
}

export function useSyncStats() {
  const { getSyncStats } = useUnifiedEventContext();
  return getSyncStats();
}