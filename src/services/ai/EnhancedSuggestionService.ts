// Enhanced Suggestion Service with Database-driven Context Templates
// 데이터베이스 기반 컨텍스트 템플릿을 활용한 개선된 제안 서비스

import { CalendarEvent } from '@/types';
import { format, isToday, isTomorrow, isWeekend, getHours, startOfDay, endOfDay } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

export interface EnhancedSuggestionContext {
  currentEvents: CalendarEvent[];
  selectedDate?: Date;
  selectedEvent?: CalendarEvent;
  userId?: string;
  recentMessages?: any[];
  lastAction?: string;
  viewMode?: 'day' | 'week' | 'month' | 'list';
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  locale: 'ko' | 'en';
  conversationContext?: any;
}

export interface SmartSuggestion {
  id: string;
  text: string;
  type: 'create' | 'modify' | 'view' | 'analyze' | 'image' | 'friend';
  priority: number;
  context: any;
  action?: 'direct_execute' | 'requires_input' | 'navigation';
  data?: any;
  reason?: string; // 왜 이 제안이 나왔는지
  template_source?: string; // 어떤 템플릿에서 나왔는지
}

interface ContextTemplate {
  id: string;
  template_name: string;
  condition_rules: any;
  suggested_actions: any[];
  priority_weight: number;
  locale: string;
}

interface UserBehaviorPattern {
  action_type: string;
  context_data: any;
  frequency: number;
  last_action_at: string;
}

export class EnhancedSuggestionService {
  private locale: 'ko' | 'en';
  private supabase: any;

  constructor(locale: 'ko' | 'en' = 'ko') {
    this.locale = locale;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * 메인 제안 생성 함수 - 데이터베이스 기반 컨텍스트 분석
   */
  async generateEnhancedSuggestions(context: EnhancedSuggestionContext): Promise<SmartSuggestion[]> {
    try {
      // 1. 현재 상황 분석
      const situationAnalysis = this.analyzeSituation(context);

      // 2. 사용자 패턴 로드 (if user is logged in)
      const userPatterns = context.userId ?
        await this.loadUserPatterns(context.userId) : null;

      // 3. 적용 가능한 템플릿 찾기
      const matchingTemplates = await this.findMatchingTemplates(
        situationAnalysis,
        context.locale
      );

      // 4. 템플릿 기반 제안 생성
      const templateSuggestions = this.generateFromTemplates(
        matchingTemplates,
        context,
        situationAnalysis
      );

      // 5. 사용자 패턴 기반 개인화
      const personalizedSuggestions = userPatterns ?
        this.personalizeWithPatterns(templateSuggestions, userPatterns) :
        templateSuggestions;

      // 6. 대화 맥락 기반 조정
      const contextualSuggestions = this.adjustForConversation(
        personalizedSuggestions,
        context
      );

      // 7. 최종 순위 조정 및 선택
      const finalSuggestions = contextualSuggestions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);

      // 8. 사용자 행동 패턴 기록 (if user is logged in)
      if (context.userId) {
        await this.recordSuggestionGeneration(context.userId, {
          situation: situationAnalysis,
          templates_used: matchingTemplates.map(t => t.template_name),
          suggestions_count: finalSuggestions.length
        });
      }

      return finalSuggestions;

    } catch (error) {
      console.error('[EnhancedSuggestionService] Error generating suggestions:', error);

      // Fallback to simple suggestions
      return this.getFallbackSuggestions(context);
    }
  }

  /**
   * 현재 상황 분석
   */
  private analyzeSituation(context: EnhancedSuggestionContext) {
    const now = new Date();
    const currentHour = getHours(now);

    return {
      events_today: this.countTodayEvents(context.currentEvents),
      events_this_week: this.countThisWeekEvents(context.currentEvents),
      event_density: this.calculateEventDensity(context.currentEvents),
      time_of_day: context.timeOfDay,
      day_type: isWeekend(now) ? 'weekend' : 'weekday',
      current_hour: currentHour,
      has_selected_date: !!context.selectedDate,
      has_selected_event: !!context.selectedEvent,
      last_action: context.lastAction,
      view_mode: context.viewMode,
      recent_conversation: context.recentMessages?.length > 0,
      upcoming_important: this.findUpcomingImportant(context.currentEvents)
    };
  }

  /**
   * 사용자 행동 패턴 로드
   */
  private async loadUserPatterns(userId: string): Promise<UserBehaviorPattern[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_behavior_patterns')
        .select('*')
        .eq('user_id', userId)
        .order('frequency', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading user patterns:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in loadUserPatterns:', error);
      return [];
    }
  }

  /**
   * 상황에 맞는 템플릿 찾기
   */
  private async findMatchingTemplates(
    situation: any,
    locale: string
  ): Promise<ContextTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from('context_templates')
        .select('*')
        .eq('locale', locale)
        .eq('is_active', true)
        .order('priority_weight', { ascending: false });

      if (error) {
        console.error('Error loading templates:', error);
        return [];
      }

      // 조건 매칭 로직
      const matchingTemplates = (data || []).filter(template =>
        this.evaluateConditions(template.condition_rules, situation)
      );

      return matchingTemplates;
    } catch (error) {
      console.error('Error in findMatchingTemplates:', error);
      return [];
    }
  }

  /**
   * 조건 평가 함수
   */
  private evaluateConditions(rules: any, situation: any): boolean {
    for (const [key, condition] of Object.entries(rules)) {
      const situationValue = situation[key];

      if (typeof condition === 'object' && condition !== null) {
        // 복합 조건 처리 (>=, <=, >, < 등)
        for (const [operator, value] of Object.entries(condition)) {
          switch (operator) {
            case '>=':
              if (!(situationValue >= value)) return false;
              break;
            case '<=':
              if (!(situationValue <= value)) return false;
              break;
            case '>':
              if (!(situationValue > value)) return false;
              break;
            case '<':
              if (!(situationValue < value)) return false;
              break;
            default:
              if (situationValue !== value) return false;
          }
        }
      } else if (Array.isArray(condition)) {
        // 배열 조건 처리
        if (!condition.includes(situationValue)) return false;
      } else {
        // 단순 값 비교
        if (situationValue !== condition) return false;
      }
    }

    return true;
  }

  /**
   * 템플릿에서 제안 생성
   */
  private generateFromTemplates(
    templates: ContextTemplate[],
    context: EnhancedSuggestionContext,
    situation: any
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    templates.forEach(template => {
      template.suggested_actions.forEach((action, index) => {
        // 템플릿 변수 치환
        const text = this.substituteTemplateVariables(action.text, context, situation);

        suggestions.push({
          id: `template-${template.id}-${index}`,
          text,
          type: action.type,
          priority: action.priority + template.priority_weight,
          context: action.action_data || {},
          action: action.action || 'requires_input',
          data: action.action_data,
          reason: `Based on ${template.template_name} template`,
          template_source: template.template_name
        });
      });
    });

    return suggestions;
  }

  /**
   * 템플릿 변수 치환
   */
  private substituteTemplateVariables(
    text: string,
    context: EnhancedSuggestionContext,
    situation: any
  ): string {
    let result = text;

    // 날짜 관련 변수 치환
    if (context.selectedDate) {
      const dateStr = format(context.selectedDate, 'M월 d일');
      result = result.replace(/\{\{searched_date\}\}/g, dateStr);
    }

    // 이벤트 수 관련 변수 치환
    result = result.replace(/\{\{events_today\}\}/g, situation.events_today.toString());
    result = result.replace(/\{\{events_this_week\}\}/g, situation.events_this_week.toString());

    return result;
  }

  /**
   * 사용자 패턴 기반 개인화
   */
  private personalizeWithPatterns(
    suggestions: SmartSuggestion[],
    patterns: UserBehaviorPattern[]
  ): SmartSuggestion[] {
    // 사용자가 자주 하는 액션 타입에 가산점
    const actionFrequency = new Map<string, number>();
    patterns.forEach(pattern => {
      actionFrequency.set(pattern.action_type, pattern.frequency);
    });

    return suggestions.map(suggestion => {
      const frequency = actionFrequency.get(suggestion.type) || 0;
      const personalBonus = Math.min(frequency * 0.5, 3); // 최대 3점 가산

      return {
        ...suggestion,
        priority: suggestion.priority + personalBonus,
        reason: suggestion.reason + (personalBonus > 0 ? ' (Personalized)' : '')
      };
    });
  }

  /**
   * 대화 맥락 기반 조정
   */
  private adjustForConversation(
    suggestions: SmartSuggestion[],
    context: EnhancedSuggestionContext
  ): SmartSuggestion[] {
    // 최근 메시지에서 키워드 추출하여 관련성 높은 제안에 가산점
    const recentContent = context.recentMessages?.slice(-2)
      .map(m => m.content?.toLowerCase())
      .join(' ') || '';

    return suggestions.map(suggestion => {
      let contextBonus = 0;

      // 키워드 기반 가산점
      if (recentContent.includes('오늘') && suggestion.text.includes('오늘')) {
        contextBonus += 2;
      }

      if (recentContent.includes('일정') && suggestion.type === 'create') {
        contextBonus += 1;
      }

      if (recentContent.includes('정리') && suggestion.type === 'analyze') {
        contextBonus += 2;
      }

      return {
        ...suggestion,
        priority: suggestion.priority + contextBonus,
        reason: suggestion.reason + (contextBonus > 0 ? ' (Contextual)' : '')
      };
    });
  }

  /**
   * 사용자 행동 기록
   */
  private async recordSuggestionGeneration(userId: string, metadata: any) {
    try {
      await this.supabase
        .from('user_behavior_patterns')
        .upsert({
          user_id: userId,
          action_type: 'suggestion_generation',
          context_data: metadata,
          frequency: 1
        }, {
          onConflict: 'user_id,action_type',
          ignoreDuplicates: false
        });
    } catch (error) {
      console.error('Error recording user behavior:', error);
    }
  }

  // === 유틸리티 함수들 ===

  private countTodayEvents(events: CalendarEvent[]): number {
    const today = startOfDay(new Date());
    const tomorrow = endOfDay(new Date());

    return events.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      return eventDate >= today && eventDate <= tomorrow;
    }).length;
  }

  private countThisWeekEvents(events: CalendarEvent[]): number {
    const now = new Date();
    const weekStart = startOfDay(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return events.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      return eventDate >= weekStart && eventDate <= weekEnd;
    }).length;
  }

  private calculateEventDensity(events: CalendarEvent[]): 'low' | 'medium' | 'high' {
    const todayCount = this.countTodayEvents(events);
    if (todayCount <= 2) return 'low';
    if (todayCount <= 5) return 'medium';
    return 'high';
  }

  private findUpcomingImportant(events: CalendarEvent[]): CalendarEvent[] {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    return events
      .filter(event => {
        const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
        return eventDate >= now && eventDate <= nextWeek;
      })
      .slice(0, 3);
  }

  /**
   * 폴백 제안 (오류 시)
   */
  private getFallbackSuggestions(context: EnhancedSuggestionContext): SmartSuggestion[] {
    const suggestions = this.locale === 'ko' ? [
      "오늘 일정 확인해줘",
      "새 일정 추가하기",
      "이번주 일정 정리해줘",
      "📷 사진에서 일정 추출하기",
      "👥 친구와 미팅 잡기"
    ] : [
      "Show today's schedule",
      "Add new event",
      "Review this week's events",
      "📷 Extract schedule from photo",
      "👥 Schedule meeting with friend"
    ];

    return suggestions.map((text, index) => ({
      id: `fallback-${index}`,
      text,
      type: index === 1 ? 'create' : index === 2 ? 'analyze' : 'view' as const,
      priority: 5,
      context: {},
      action: 'requires_input' as const,
      reason: 'Fallback suggestion'
    }));
  }
}

export default EnhancedSuggestionService;