import { useCallback, useRef, useEffect } from 'react';
import { useUnifiedEventStore } from '@/store/unifiedEventStore';
import { logger } from '@/lib/logger';

interface TrackingContext {
  eventCount?: number;
  lastAIResponse?: string;
  locale?: string;
}

interface QuickActionTrackingOptions {
  batchMode?: boolean; // 배치 모드로 전송
  batchInterval?: number; // 배치 전송 간격 (ms)
  shouldTrackDisplay?: boolean; // 표시된 제안도 추적할지
}

export function useQuickActionTracking(options: QuickActionTrackingOptions = {}) {
  const {
    batchMode = false,
    batchInterval = 5000,
    shouldTrackDisplay = true
  } = options;

  const events = useUnifiedEventStore(state => state.events);
  const batchQueueRef = useRef<any[]>([]);
  const displayTimeRef = useRef<Map<string, number>>(new Map());
  const batchTimerRef = useRef<NodeJS.Timeout>();

  // 배치 전송 함수
  const flushBatch = useCallback(async () => {
    if (batchQueueRef.current.length === 0) return;

    const logs = [...batchQueueRef.current];
    batchQueueRef.current = [];

    try {
      const response = await fetch('/api/analytics/quick-action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logs })
      });

      if (!response.ok) {
        logger.error('Failed to send batch analytics', {
          status: response.status,
          count: logs.length
        });
      } else {
        logger.debug('Batch analytics sent successfully', {
          count: logs.length
        });
      }
    } catch (error) {
      logger.error('Error sending batch analytics', error);
      // 실패한 로그를 다시 큐에 추가 (선택적)
      // batchQueueRef.current.unshift(...logs);
    }
  }, []);

  // 개별 로그 전송 함수
  const sendLog = useCallback(async (logData: any) => {
    try {
      const response = await fetch('/api/analytics/quick-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logData)
      });

      if (!response.ok) {
        logger.error('Failed to send analytics', {
          status: response.status,
          suggestion: logData.suggestionText
        });
      }
    } catch (error) {
      logger.error('Error sending analytics', error);
    }
  }, []);

  // Quick Action 클릭 추적
  const trackClick = useCallback((
    suggestionText: string,
    category?: string,
    position?: number,
    additionalContext?: TrackingContext
  ) => {
    const displayTime = displayTimeRef.current.get(suggestionText);
    const responseTimeMs = displayTime ? Date.now() - displayTime : undefined;

    const logData = {
      suggestionText,
      suggestionCategory: category,
      suggestionPosition: position,
      actionType: 'clicked' as const,
      responseTimeMs,
      context: {
        eventCount: events.length,
        ...additionalContext
      },
      deviceInfo: {
        deviceType: getDeviceType(),
        browser: getBrowser()
      }
    };

    logger.info('[Quick Action] Click tracked', {
      suggestion: suggestionText,
      responseTime: responseTimeMs
    });

    if (batchMode) {
      batchQueueRef.current.push(logData);

      // 배치 타이머 재설정
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      batchTimerRef.current = setTimeout(flushBatch, batchInterval);
    } else {
      sendLog(logData);
    }

    // 클릭된 제안은 표시 시간 기록에서 제거
    displayTimeRef.current.delete(suggestionText);
  }, [events.length, batchMode, batchInterval, flushBatch, sendLog]);

  // Quick Action 무시 추적 (표시 후 클릭하지 않음)
  const trackIgnore = useCallback((
    suggestionText: string,
    category?: string
  ) => {
    const logData = {
      suggestionText,
      suggestionCategory: category,
      actionType: 'ignored' as const,
      context: {
        eventCount: events.length
      },
      deviceInfo: {
        deviceType: getDeviceType(),
        browser: getBrowser()
      }
    };

    logger.debug('[Quick Action] Ignore tracked', {
      suggestion: suggestionText
    });

    if (batchMode) {
      batchQueueRef.current.push(logData);
    } else {
      sendLog(logData);
    }

    // 표시 시간 기록에서 제거
    displayTimeRef.current.delete(suggestionText);
  }, [events.length, batchMode, sendLog]);

  // Quick Action 표시 추적
  const trackDisplay = useCallback((
    suggestions: Array<{ text: string; category?: string }>
  ) => {
    if (!shouldTrackDisplay) return;

    const now = Date.now();

    suggestions.forEach((suggestion, index) => {
      // 표시 시간 기록 (응답 시간 계산용)
      displayTimeRef.current.set(suggestion.text, now);

      const logData = {
        suggestionText: suggestion.text,
        suggestionCategory: suggestion.category,
        suggestionPosition: index + 1,
        actionType: 'displayed' as const,
        context: {
          eventCount: events.length
        },
        deviceInfo: {
          deviceType: getDeviceType(),
          browser: getBrowser()
        }
      };

      if (batchMode) {
        batchQueueRef.current.push(logData);
      } else {
        sendLog(logData);
      }
    });

    logger.debug('[Quick Action] Display tracked', {
      count: suggestions.length
    });

    // 5초 후 클릭되지 않은 제안은 'ignored'로 처리
    setTimeout(() => {
      suggestions.forEach(suggestion => {
        if (displayTimeRef.current.has(suggestion.text)) {
          trackIgnore(suggestion.text, suggestion.category);
        }
      });
    }, 5000);
  }, [events.length, shouldTrackDisplay, batchMode, sendLog, trackIgnore]);

  // 컴포넌트 언마운트 시 배치 전송
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      if (batchMode && batchQueueRef.current.length > 0) {
        flushBatch();
      }
    };
  }, [batchMode, flushBatch]);

  // 페이지 언로드 시 배치 전송
  useEffect(() => {
    if (!batchMode) return;

    const handleBeforeUnload = () => {
      if (batchQueueRef.current.length > 0) {
        // sendBeacon을 사용하여 페이지 언로드 시에도 전송 보장
        const data = JSON.stringify({ logs: batchQueueRef.current });
        navigator.sendBeacon('/api/analytics/quick-action', data);
        batchQueueRef.current = [];
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [batchMode]);

  return {
    trackClick,
    trackDisplay,
    trackIgnore,
    flushBatch
  };
}

// 디바이스 타입 감지
function getDeviceType(): string {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// 브라우저 감지
function getBrowser(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('chrome')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari')) return 'safari';
  if (userAgent.includes('edge')) return 'edge';
  return 'unknown';
}