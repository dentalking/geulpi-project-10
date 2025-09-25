/**
 * Enhanced Quick Actions Hook
 * Context-Aware Quick Actions를 사용하는 React Hook
 */

import { useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

export interface EnhancedQuickAction {
  id: string;
  text: string;
  category: 'view' | 'create' | 'search' | 'action' | 'smart';
  priority: number;
  reasoning: string;
  confidence: number;
  contextSource: 'pattern' | 'recent_events' | 'user_preference' | 'ai_insight' | 'fallback';
  relatedEventIds?: string[];
}

export interface QuickActionsContext {
  totalEvents: number;
  activeHours: number[];
  frequentActions: Array<{ action: string; count: number; category: string }>;
  timeOfDay: string;
}

export interface UseEnhancedQuickActionsOptions {
  userId?: string;
  locale?: 'ko' | 'en';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseEnhancedQuickActionsReturn {
  suggestions: EnhancedQuickAction[];
  context: QuickActionsContext | null;
  loading: boolean;
  error: string | null;
  refreshSuggestions: (conversationHistory?: any[], lastAIResponse?: string) => Promise<void>;
  trackClick: (suggestion: EnhancedQuickAction) => Promise<void>;
  getInsights: () => {
    mostConfident: EnhancedQuickAction | null;
    mostRelevant: EnhancedQuickAction | null;
    contextSources: Record<string, number>;
  };
}

export function useEnhancedQuickActions(
  options: UseEnhancedQuickActionsOptions = {}
): UseEnhancedQuickActionsReturn {
  const {
    userId,
    locale = 'ko',
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000 // 5분
  } = options;

  const [suggestions, setSuggestions] = useState<EnhancedQuickAction[]>([]);
  const [context, setContext] = useState<QuickActionsContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 향상된 제안 로드
   */
  const refreshSuggestions = useCallback(async (
    conversationHistory: any[] = [],
    lastAIResponse: string = ''
  ) => {
    if (!userId) {
      logger.warn('[useEnhancedQuickActions] No userId provided');
      setError('사용자 인증이 필요합니다');
      return;
    }

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      logger.info('[useEnhancedQuickActions] Fetching enhanced suggestions', {
        userId: userId.substring(0, 8) + '...',
        locale,
        conversationHistoryLength: conversationHistory.length,
        hasLastAIResponse: !!lastAIResponse
      });

      const response = await fetch('/api/ai/enhanced-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          locale,
          conversationHistory,
          lastAIResponse
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch suggestions');
      }

      setSuggestions(data.data.suggestions || []);
      setContext(data.data.context || null);

      logger.info('[useEnhancedQuickActions] Enhanced suggestions loaded', {
        count: data.data.suggestions?.length || 0,
        contextSources: data.data.suggestions?.map((s: any) => s.contextSource) || [],
        avgConfidence: data.data.suggestions?.length > 0
          ? data.data.suggestions.reduce((sum: number, s: any) => sum + s.confidence, 0) / data.data.suggestions.length
          : 0
      });

      // 자동 새로고침 설정
      if (autoRefresh && refreshInterval > 0) {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }

        refreshTimeoutRef.current = setTimeout(() => {
          refreshSuggestions(conversationHistory, lastAIResponse);
        }, refreshInterval);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        logger.info('[useEnhancedQuickActions] Request aborted');
        return;
      }

      logger.error('[useEnhancedQuickActions] Error fetching suggestions', err);
      setError(err.message || '제안을 불러오는데 실패했습니다');

      // 에러 시 기본 제안 설정
      setSuggestions(getFallbackSuggestions(locale));
      setContext(null);

    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [userId, locale, autoRefresh, refreshInterval]);

  /**
   * 클릭 추적
   */
  const trackClick = useCallback(async (suggestion: EnhancedQuickAction) => {
    if (!userId) return;

    try {
      logger.info('[useEnhancedQuickActions] Tracking suggestion click', {
        suggestionId: suggestion.id,
        text: suggestion.text,
        category: suggestion.category,
        contextSource: suggestion.contextSource
      });

      // 클릭 로그 API 호출
      await fetch('/api/ai/track-suggestion-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          suggestionId: suggestion.id,
          suggestionText: suggestion.text,
          suggestionCategory: suggestion.category,
          contextSource: suggestion.contextSource,
          confidence: suggestion.confidence,
          priority: suggestion.priority,
          timestamp: new Date().toISOString()
        })
      });

      logger.info('[useEnhancedQuickActions] Click tracked successfully');

    } catch (error) {
      logger.error('[useEnhancedQuickActions] Failed to track click', error);
      // 클릭 추적 실패는 무시 (사용자 경험에 영향 없도록)
    }
  }, [userId]);

  /**
   * 인사이트 분석
   */
  const getInsights = useCallback(() => {
    if (suggestions.length === 0) {
      return {
        mostConfident: null,
        mostRelevant: null,
        contextSources: {}
      };
    }

    // 가장 높은 신뢰도
    const mostConfident = suggestions.reduce((prev, current) =>
      current.confidence > prev.confidence ? current : prev
    );

    // 가장 높은 우선순위 (relevance)
    const mostRelevant = suggestions.reduce((prev, current) =>
      current.priority > prev.priority ? current : prev
    );

    // 컨텍스트 소스 분포
    const contextSources = suggestions.reduce((acc, suggestion) => {
      acc[suggestion.contextSource] = (acc[suggestion.contextSource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      mostConfident,
      mostRelevant,
      contextSources
    };
  }, [suggestions]);

  return {
    suggestions,
    context,
    loading,
    error,
    refreshSuggestions,
    trackClick,
    getInsights
  };
}

/**
 * 폴백 제안
 */
function getFallbackSuggestions(locale: 'ko' | 'en'): EnhancedQuickAction[] {
  const isKorean = locale === 'ko';

  return [
    {
      id: 'fallback-1',
      text: isKorean ? '오늘 일정 확인하기' : 'Check today\'s schedule',
      category: 'view',
      priority: 8,
      reasoning: isKorean ? '기본 제안' : 'Default suggestion',
      confidence: 60,
      contextSource: 'fallback'
    },
    {
      id: 'fallback-2',
      text: isKorean ? '새 일정 추가하기' : 'Add new event',
      category: 'create',
      priority: 7,
      reasoning: isKorean ? '기본 제안' : 'Default suggestion',
      confidence: 60,
      contextSource: 'fallback'
    },
    {
      id: 'fallback-3',
      text: isKorean ? '내일 미리 보기' : 'Preview tomorrow',
      category: 'view',
      priority: 6,
      reasoning: isKorean ? '기본 제안' : 'Default suggestion',
      confidence: 60,
      contextSource: 'fallback'
    }
  ];
}

/**
 * 디버깅을 위한 Hook
 */
export function useQuickActionsDebug(suggestions: EnhancedQuickAction[]) {
  const debugInfo = {
    totalSuggestions: suggestions.length,
    averageConfidence: suggestions.length > 0
      ? Math.round(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length)
      : 0,
    categories: suggestions.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    contextSources: suggestions.reduce((acc, s) => {
      acc[s.contextSource] = (acc[s.contextSource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    priorityRange: suggestions.length > 0 ? {
      min: Math.min(...suggestions.map(s => s.priority)),
      max: Math.max(...suggestions.map(s => s.priority))
    } : { min: 0, max: 0 }
  };

  return debugInfo;
}