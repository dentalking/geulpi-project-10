/**
 * Context-Aware Quick Actions Service
 * 사용자의 실제 일정, 행동 패턴, 선호도를 활용한 개인화된 Quick Actions 생성
 *
 * 주요 기능:
 * 1. 사용자 일정 패턴 분석
 * 2. 행동 로그 기반 선호도 학습
 * 3. Gemini API 컨텍스트 강화
 * 4. 동적 우선순위 조정
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CalendarEvent } from '@/types';
import { logger } from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';

export interface ContextAwareQuickAction {
  text: string;
  priority: number;
  category: 'view' | 'create' | 'search' | 'action' | 'smart';
  reasoning: string;
  confidence: number;
  contextSource: 'pattern' | 'recent_events' | 'user_preference' | 'ai_insight';
  relatedEventIds?: string[];
}

export interface UserContext {
  userId: string;
  locale: 'ko' | 'en';
  currentTime: Date;
  recentEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  userPatterns: UserPattern;
  actionHistory: UserActionLog[];
  conversationHistory?: Array<{ role: string; content: string; timestamp?: string }>;
  lastAIResponse?: string;
}

export interface UserPattern {
  mostActiveHours: number[];
  preferredEventTypes: string[];
  commonLocations: string[];
  averageEventDuration: number;
  frequentActions: { action: string; count: number; category: string }[];
  timeOfDayPreferences: {
    morning: number;   // 활동 지수 0-1
    afternoon: number;
    evening: number;
    night: number;
  };
}

export interface UserActionLog {
  suggestion_text: string;
  suggestion_category: string;
  time_of_day: string;
  event_count: number;
  last_ai_response: string | null;
  action_type: 'clicked' | 'ignored' | 'displayed';
  action_timestamp: string;
}

export class ContextAwareQuickActionsService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private supabase: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.4, // 개인화를 위해 약간 높임
        topK: 40,
        topP: 0.85,
        maxOutputTokens: 1200, // 더 풍부한 컨텍스트를 위해 증가
      }
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * 메인 함수: 컨텍스트 기반 Quick Actions 생성
   */
  async generateContextAwareActions(context: UserContext): Promise<ContextAwareQuickAction[]> {
    try {
      // 1. 사용자 컨텍스트 분석 및 강화
      const enhancedContext = await this.analyzeUserContext(context);

      // 2. Gemini API로 AI 기반 제안 생성
      const aiSuggestions = await this.generateAISuggestions(enhancedContext);

      // 3. 패턴 기반 제안 생성
      const patternSuggestions = this.generatePatternBasedSuggestions(enhancedContext);

      // 4. 모든 제안 결합 및 우선순위 조정
      const allSuggestions = [...aiSuggestions, ...patternSuggestions];
      const prioritizedSuggestions = this.prioritizeSuggestions(allSuggestions, enhancedContext);

      // 5. 최종 제안 선택 (상위 5개)
      return prioritizedSuggestions.slice(0, 5);

    } catch (error) {
      logger.error('[ContextAware] Error generating suggestions', error);
      return this.getFallbackSuggestions(context);
    }
  }

  /**
   * 사용자 컨텍스트 분석 및 강화
   */
  private async analyzeUserContext(context: UserContext): Promise<UserContext & {
    insights: string[];
    contextSummary: string;
    smartInsights: {
      upcomingConflicts: string[];
      suggestedPreparations: string[];
      patternInsights: string[];
    }
  }> {
    const insights: string[] = [];
    const upcomingConflicts: string[] = [];
    const suggestedPreparations: string[] = [];
    const patternInsights: string[] = [];

    // 다가오는 일정 분석
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayEvents = context.upcomingEvents.filter(e =>
      new Date(e.start_time).toDateString() === today.toDateString()
    );

    const tomorrowEvents = context.upcomingEvents.filter(e =>
      new Date(e.start_time).toDateString() === tomorrow.toDateString()
    );

    // 시간 충돌 검사
    for (let i = 0; i < todayEvents.length - 1; i++) {
      const current = todayEvents[i];
      const next = todayEvents[i + 1];
      const currentEnd = new Date(current.end_time);
      const nextStart = new Date(next.start_time);

      if (currentEnd > nextStart) {
        upcomingConflicts.push(`${current.summary}와 ${next.summary} 시간 겹침`);
      }
    }

    // 준비 시간 제안
    if (tomorrowEvents.length > 0) {
      const firstTomorrowEvent = tomorrowEvents[0];
      if (firstTomorrowEvent.summary.includes('회의') || firstTomorrowEvent.summary.includes('미팅')) {
        suggestedPreparations.push(`${firstTomorrowEvent.summary} 준비시간 30분 전 추가`);
      }
    }

    // 패턴 인사이트
    const currentHour = context.currentTime.getHours();
    const isActiveTime = context.userPatterns.mostActiveHours.includes(currentHour);
    if (isActiveTime) {
      patternInsights.push('주로 활발한 시간대입니다');
    }

    // 최근 액션 패턴 분석
    const recentActions = context.actionHistory.slice(0, 5);
    const frequentCategory = this.getMostFrequentCategory(recentActions);
    if (frequentCategory) {
      patternInsights.push(`${frequentCategory} 액션을 자주 사용하십니다`);
    }

    return {
      ...context,
      insights,
      contextSummary: this.buildContextSummary(context, todayEvents, tomorrowEvents),
      smartInsights: {
        upcomingConflicts,
        suggestedPreparations,
        patternInsights
      }
    };
  }

  /**
   * 컨텍스트 요약 생성
   */
  private buildContextSummary(
    context: UserContext,
    todayEvents: CalendarEvent[],
    tomorrowEvents: CalendarEvent[]
  ): string {
    const parts: string[] = [];

    parts.push(`현재: ${context.currentTime.getHours()}시`);
    parts.push(`오늘 일정: ${todayEvents.length}개`);
    parts.push(`내일 일정: ${tomorrowEvents.length}개`);

    if (todayEvents.length > 0) {
      const nextEvent = todayEvents.find(e => new Date(e.start_time) > context.currentTime);
      if (nextEvent) {
        const eventHour = new Date(nextEvent.start_time).getHours();
        parts.push(`다음 일정: ${eventHour}시 ${nextEvent.summary}`);
      }
    }

    if (context.userPatterns.frequentActions.length > 0) {
      const topAction = context.userPatterns.frequentActions[0];
      parts.push(`자주 사용: ${topAction.action}`);
    }

    return parts.join(', ');
  }

  /**
   * AI 기반 제안 생성 (강화된 컨텍스트 활용)
   */
  private async generateAISuggestions(
    context: UserContext & { insights: string[]; contextSummary: string; smartInsights: any }
  ): Promise<ContextAwareQuickAction[]> {
    const isKorean = context.locale === 'ko';

    const prompt = isKorean ? `
당신은 개인화된 캘린더 AI 어시스턴트입니다. 사용자의 실제 일정과 행동 패턴을 분석하여 가장 유용한 Quick Actions 5개를 제안하세요.

## 사용자 컨텍스트
${context.contextSummary}

## 최근 일정들
${context.recentEvents.slice(0, 3).map(e =>
  `- ${new Date(e.start_time).toLocaleDateString()}: ${e.summary}${e.location ? ` @${e.location}` : ''}`
).join('\n')}

## 다가오는 일정들
${context.upcomingEvents.slice(0, 3).map(e =>
  `- ${new Date(e.start_time).toLocaleDateString()}: ${e.summary}${e.location ? ` @${e.location}` : ''}`
).join('\n')}

## 사용자 행동 패턴
- 활발한 시간: ${context.userPatterns.mostActiveHours.join('시, ')}시
- 자주 사용하는 액션: ${context.userPatterns.frequentActions.map(a => a.action).slice(0, 3).join(', ')}

## 스마트 인사이트
- 충돌: ${context.smartInsights.upcomingConflicts.join(', ') || '없음'}
- 준비사항: ${context.smartInsights.suggestedPreparations.join(', ') || '없음'}
- 패턴: ${context.smartInsights.patternInsights.join(', ') || '없음'}

## 예시 출력
[
  {
    "text": "내일 9시 회의 30분 전 준비시간 추가",
    "priority": 9,
    "category": "create",
    "reasoning": "내일 첫 일정인 회의 준비를 위해",
    "confidence": 0.85,
    "contextSource": "ai_insight"
  }
]

사용자의 실제 일정과 패턴을 고려하여 구체적이고 실행 가능한 제안을 JSON 배열로만 반환하세요:` : `
You are a personalized calendar AI assistant. Analyze the user's actual schedule and behavior patterns to suggest 5 most useful Quick Actions.

## User Context
${context.contextSummary}

## Recent Events
${context.recentEvents.slice(0, 3).map(e =>
  `- ${new Date(e.start_time).toLocaleDateString()}: ${e.summary}${e.location ? ` @${e.location}` : ''}`
).join('\n')}

## Upcoming Events
${context.upcomingEvents.slice(0, 3).map(e =>
  `- ${new Date(e.start_time).toLocaleDateString()}: ${e.summary}${e.location ? ` @${e.location}` : ''}`
).join('\n')}

## User Patterns
- Active hours: ${context.userPatterns.mostActiveHours.join(', ')}
- Frequent actions: ${context.userPatterns.frequentActions.map(a => a.action).slice(0, 3).join(', ')}

## Smart Insights
- Conflicts: ${context.smartInsights.upcomingConflicts.join(', ') || 'None'}
- Preparations: ${context.smartInsights.suggestedPreparations.join(', ') || 'None'}
- Patterns: ${context.smartInsights.patternInsights.join(', ') || 'None'}

Return specific, actionable suggestions as JSON array only:`;

    const result = await this.model.generateContent(prompt);
    const response = result.response.text();

    return this.parseAISuggestions(response, context.locale);
  }

  /**
   * 패턴 기반 제안 생성
   */
  private generatePatternBasedSuggestions(
    context: UserContext & { insights: string[] }
  ): ContextAwareQuickAction[] {
    const suggestions: ContextAwareQuickAction[] = [];
    const isKorean = context.locale === 'ko';

    // 자주 사용하는 액션 기반 제안
    context.userPatterns.frequentActions.forEach((action, index) => {
      if (index < 2) { // 상위 2개만
        suggestions.push({
          text: action.action,
          priority: 8 - index,
          category: action.category as any,
          reasoning: isKorean ? '자주 사용하시는 기능입니다' : 'Frequently used action',
          confidence: 0.9,
          contextSource: 'user_preference'
        });
      }
    });

    // 시간대 기반 제안
    const currentHour = context.currentTime.getHours();
    if (context.userPatterns.mostActiveHours.includes(currentHour)) {
      suggestions.push({
        text: isKorean ? '새 일정 빠른 추가' : 'Quick add new event',
        priority: 7,
        category: 'create',
        reasoning: isKorean ? '활발한 시간대입니다' : 'Active time period',
        confidence: 0.75,
        contextSource: 'pattern'
      });
    }

    return suggestions;
  }

  /**
   * 제안 우선순위 조정
   */
  private prioritizeSuggestions(
    suggestions: ContextAwareQuickAction[],
    context: UserContext
  ): ContextAwareQuickAction[] {
    return suggestions
      .map(suggestion => {
        // 신뢰도 기반 우선순위 조정
        suggestion.priority *= suggestion.confidence;

        // 사용자 선호도 기반 조정
        const userPreference = context.userPatterns.frequentActions
          .find(a => a.action.includes(suggestion.text.substring(0, 10)));
        if (userPreference) {
          suggestion.priority *= 1.3;
        }

        return suggestion;
      })
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * AI 응답 파싱
   */
  private parseAISuggestions(response: string, locale: 'ko' | 'en'): ContextAwareQuickAction[] {
    try {
      const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed.map(s => ({
        text: s.text || (locale === 'ko' ? '일정 확인' : 'Check schedule'),
        priority: Math.min(10, Math.max(1, s.priority || 5)),
        category: s.category || 'action',
        reasoning: s.reasoning || '',
        confidence: Math.min(1, Math.max(0, s.confidence || 0.5)),
        contextSource: s.contextSource || 'ai_insight'
      }));
    } catch (error) {
      logger.error('[ContextAware] Failed to parse AI response', { error, response });
      return [];
    }
  }

  /**
   * 사용자 행동 로그에서 가장 자주 사용된 카테고리 추출
   */
  private getMostFrequentCategory(actionHistory: UserActionLog[]): string | null {
    const categories = actionHistory
      .filter(log => log.suggestion_category)
      .map(log => log.suggestion_category);

    if (categories.length === 0) return null;

    const categoryCount = categories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
  }

  /**
   * Fallback 제안
   */
  private getFallbackSuggestions(context: UserContext): ContextAwareQuickAction[] {
    const isKorean = context.locale === 'ko';
    const hour = context.currentTime.getHours();

    const fallbackSuggestions = [
      {
        text: isKorean ? '오늘 일정 확인' : 'Check today schedule',
        priority: 8,
        category: 'view' as const,
        reasoning: isKorean ? '기본 제안' : 'Default suggestion',
        confidence: 0.6,
        contextSource: 'pattern' as const
      },
      {
        text: isKorean ? '내일 미리 보기' : 'Preview tomorrow',
        priority: 7,
        category: 'view' as const,
        reasoning: isKorean ? '다음 날 준비' : 'Prepare for tomorrow',
        confidence: 0.6,
        contextSource: 'pattern' as const
      }
    ];

    // 시간대별 추가 제안
    if (hour >= 18) {
      fallbackSuggestions.push({
        text: isKorean ? '저녁 일정 추가' : 'Add evening event',
        priority: 6,
        category: 'create' as const,
        reasoning: isKorean ? '저녁 시간대' : 'Evening time',
        confidence: 0.5,
        contextSource: 'pattern' as const
      });
    }

    return fallbackSuggestions;
  }
}

/**
 * 사용자 데이터 수집 헬퍼 함수들
 */
export class UserContextBuilder {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * 사용자 컨텍스트 구성
   */
  async buildUserContext(userId: string, locale: 'ko' | 'en' = 'ko'): Promise<UserContext> {
    try {
      const [recentEvents, upcomingEvents, actionHistory] = await Promise.all([
        this.getRecentEvents(userId),
        this.getUpcomingEvents(userId),
        this.getUserActionHistory(userId)
      ]);

      const userPatterns = this.analyzeUserPatterns(recentEvents, upcomingEvents, actionHistory);

      return {
        userId,
        locale,
        currentTime: new Date(),
        recentEvents: recentEvents || [],
        upcomingEvents: upcomingEvents || [],
        userPatterns,
        actionHistory: actionHistory || []
      };
    } catch (error) {
      logger.error('[ContextBuilder] Error building user context', error);

      // 오류 시 최소 컨텍스트 반환
      return {
        userId,
        locale,
        currentTime: new Date(),
        recentEvents: [],
        upcomingEvents: [],
        userPatterns: this.getDefaultUserPatterns(),
        actionHistory: []
      };
    }
  }

  /**
   * 최근 일정 조회 (지난 7일)
   */
  private async getRecentEvents(userId: string): Promise<CalendarEvent[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await this.supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', sevenDaysAgo.toISOString())
      .lt('start_time', new Date().toISOString())
      .order('start_time', { ascending: false })
      .limit(10);

    if (error) {
      logger.error('[ContextBuilder] Error fetching recent events', error);
      return [];
    }

    return data || [];
  }

  /**
   * 다가오는 일정 조회 (다음 7일)
   */
  private async getUpcomingEvents(userId: string): Promise<CalendarEvent[]> {
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const { data, error } = await this.supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', new Date().toISOString())
      .lt('start_time', sevenDaysLater.toISOString())
      .order('start_time', { ascending: true })
      .limit(10);

    if (error) {
      logger.error('[ContextBuilder] Error fetching upcoming events', error);
      return [];
    }

    return data || [];
  }

  /**
   * 사용자 액션 히스토리 조회 (최근 30일)
   */
  private async getUserActionHistory(userId: string): Promise<UserActionLog[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await this.supabase
      .from('user_action_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('action_timestamp', thirtyDaysAgo.toISOString())
      .order('action_timestamp', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('[ContextBuilder] Error fetching action history', error);
      return [];
    }

    return data || [];
  }

  /**
   * 사용자 패턴 분석
   */
  private analyzeUserPatterns(
    recentEvents: CalendarEvent[],
    upcomingEvents: CalendarEvent[],
    actionHistory: UserActionLog[]
  ): UserPattern {
    // 활발한 시간대 분석
    const eventHours = [...recentEvents, ...upcomingEvents]
      .map(e => new Date(e.start_time).getHours());

    const hourCount = eventHours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const mostActiveHours = Object.entries(hourCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // 선호하는 이벤트 타입 분석
    const eventSummaries = [...recentEvents, ...upcomingEvents]
      .map(e => e.summary.toLowerCase());

    const eventTypes = this.extractEventTypes(eventSummaries);

    // 자주 사용하는 액션 분석
    const actionCount = actionHistory
      .filter(log => log.action_type === 'clicked')
      .reduce((acc, log) => {
        const key = log.suggestion_text;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const frequentActions = Object.entries(actionCount)
      .map(([action, count]) => {
        const log = actionHistory.find(l => l.suggestion_text === action);
        return {
          action,
          count,
          category: log?.suggestion_category || 'action'
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 시간대별 선호도 계산
    const timeOfDayCount = actionHistory.reduce((acc, log) => {
      acc[log.time_of_day] = (acc[log.time_of_day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalActions = actionHistory.length || 1;
    const timeOfDayPreferences = {
      morning: (timeOfDayCount.morning || 0) / totalActions,
      afternoon: (timeOfDayCount.afternoon || 0) / totalActions,
      evening: (timeOfDayCount.evening || 0) / totalActions,
      night: (timeOfDayCount.night || 0) / totalActions,
    };

    return {
      mostActiveHours,
      preferredEventTypes: eventTypes,
      commonLocations: this.extractCommonLocations([...recentEvents, ...upcomingEvents]),
      averageEventDuration: this.calculateAverageEventDuration([...recentEvents, ...upcomingEvents]),
      frequentActions,
      timeOfDayPreferences
    };
  }

  private extractEventTypes(summaries: string[]): string[] {
    const keywords = ['회의', '미팅', '커피', '식사', '운동', '공부', '프로젝트', 'meeting', 'coffee', 'workout'];
    const typeCount: Record<string, number> = {};

    summaries.forEach(summary => {
      keywords.forEach(keyword => {
        if (summary.includes(keyword)) {
          typeCount[keyword] = (typeCount[keyword] || 0) + 1;
        }
      });
    });

    return Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
  }

  private extractCommonLocations(events: CalendarEvent[]): string[] {
    const locations = events
      .map(e => e.location)
      .filter(Boolean) as string[];

    const locationCount = locations.reduce((acc, location) => {
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(locationCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([location]) => location);
  }

  private calculateAverageEventDuration(events: CalendarEvent[]): number {
    if (events.length === 0) return 60;

    const durations = events.map(e => {
      const start = new Date(e.start_time);
      const end = new Date(e.end_time);
      return (end.getTime() - start.getTime()) / (1000 * 60); // 분 단위
    });

    return Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
  }

  private getDefaultUserPatterns(): UserPattern {
    return {
      mostActiveHours: [9, 14, 19],
      preferredEventTypes: [],
      commonLocations: [],
      averageEventDuration: 60,
      frequentActions: [],
      timeOfDayPreferences: {
        morning: 0.25,
        afternoon: 0.25,
        evening: 0.3,
        night: 0.2
      }
    };
  }
}