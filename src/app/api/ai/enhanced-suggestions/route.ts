/**
 * Enhanced Quick Actions API
 * Context-Aware Quick Actions Service를 활용한 향상된 제안 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContextAwareQuickActionsService, UserContextBuilder } from '@/services/ai/ContextAwareQuickActionsService';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
    const {
      userId,
      locale = 'ko',
      conversationHistory = [],
      lastAIResponse
    } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error('[EnhancedSuggestions] GEMINI_API_KEY not found');
      return NextResponse.json(
        { error: 'AI service unavailable' },
        { status: 500 }
      );
    }

    logger.info('[EnhancedSuggestions] Generating context-aware suggestions', {
      userId: userId.substring(0, 8) + '...',
      locale,
      hasConversationHistory: conversationHistory.length > 0,
      hasLastAIResponse: !!lastAIResponse
    });

    // 1. 사용자 컨텍스트 구성
    const contextBuilder = new UserContextBuilder();
    const userContext = await contextBuilder.buildUserContext(userId, locale);

    // 대화 히스토리와 AI 응답 추가
    userContext.conversationHistory = conversationHistory;
    userContext.lastAIResponse = lastAIResponse;

    logger.info('[EnhancedSuggestions] User context built', {
      recentEventsCount: userContext.recentEvents.length,
      upcomingEventsCount: userContext.upcomingEvents.length,
      actionHistoryCount: userContext.actionHistory.length,
      mostActiveHours: userContext.userPatterns.mostActiveHours,
      frequentActionsCount: userContext.userPatterns.frequentActions.length
    });

    // 2. Context-Aware 제안 생성
    const service = new ContextAwareQuickActionsService(apiKey);
    const suggestions = await service.generateContextAwareActions(userContext);

    logger.info('[EnhancedSuggestions] Generated enhanced suggestions', {
      count: suggestions.length,
      categories: suggestions.map(s => s.category),
      contextSources: suggestions.map(s => s.contextSource),
      avgConfidence: suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
    });

    // 3. 사용자 액션 로그 기록 (displayed)
    try {
      const supabase = require('@supabase/supabase-js').createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const now = new Date();
      const timeOfDay = getTimeOfDay(now);

      const logEntries = suggestions.map((suggestion, index) => ({
        user_id: userId,
        session_id: `enhanced-${Date.now()}`,
        suggestion_text: suggestion.text,
        suggestion_category: suggestion.category,
        suggestion_position: index + 1,
        time_of_day: timeOfDay,
        day_of_week: now.getDay(),
        event_count: userContext.upcomingEvents.length,
        last_ai_response: lastAIResponse?.substring(0, 200) || null,
        locale,
        action_type: 'displayed',
        confidence: suggestion.confidence,
        context_source: suggestion.contextSource,
        reasoning: suggestion.reasoning
      }));

      await supabase
        .from('user_action_logs')
        .insert(logEntries);

      logger.info('[EnhancedSuggestions] Logged suggestion displays', {
        entriesCount: logEntries.length
      });

    } catch (logError) {
      logger.error('[EnhancedSuggestions] Failed to log suggestions', logError);
      // 로그 실패는 무시하고 계속 진행
    }

    return NextResponse.json({
      success: true,
      data: {
        suggestions: suggestions.map(s => ({
          id: `enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: s.text,
          category: s.category,
          priority: Math.round(s.priority * 10) / 10,
          reasoning: s.reasoning,
          confidence: Math.round(s.confidence * 100),
          contextSource: s.contextSource,
          relatedEventIds: s.relatedEventIds
        })),
        context: {
          totalEvents: userContext.recentEvents.length + userContext.upcomingEvents.length,
          activeHours: userContext.userPatterns.mostActiveHours,
          frequentActions: userContext.userPatterns.frequentActions.slice(0, 3),
          timeOfDay: getTimeOfDay(new Date())
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '2.0-enhanced',
        userId: userId.substring(0, 8) + '...',
        processingTime: Date.now() - new Date().getTime()
      }
    });

  } catch (error) {
    logger.error('[EnhancedSuggestions] Unexpected error', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate enhanced suggestions',
        fallback: getFallbackSuggestions(body?.locale || 'ko')
      },
      { status: 500 }
    );
  }
}

/**
 * 시간대 구분 헬퍼 함수
 */
function getTimeOfDay(date: Date): string {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/**
 * 폴백 제안
 */
function getFallbackSuggestions(locale: 'ko' | 'en') {
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