/**
 * Improved Suggestion Service
 *
 * SimpleSuggestionService의 개선 버전
 * - 전체 대화 컨텍스트 활용
 * - 일정 심층 분석
 * - 사용자 프로필 기반 개인화
 * - 스마트 스코어링 시스템
 */

import { SimpleSuggestionService, SimpleSuggestion } from './SimpleSuggestionService';
import {
  EnhancedSuggestionContext,
  SuggestionScore,
  analyzeConversationHistory,
  analyzeEvents
} from './EnhancedSuggestionContext';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

export class ImprovedSuggestionService extends SimpleSuggestionService {
  /**
   * 개선된 제안 생성 - 전체 컨텍스트 활용
   */
  public generateEnhancedSuggestions(context: EnhancedSuggestionContext): SimpleSuggestion[] {
    const scoredSuggestions: SuggestionScore[] = [];

    // 1. 대화 히스토리 분석
    const conversationAnalysis = this.analyzeConversation(context);

    // 2. 일정 심층 분석
    const eventInsights = this.analyzeEventPatterns(context);

    // 3. 컨텍스트 기반 제안 생성
    scoredSuggestions.push(...this.generateContextualSuggestions(
      context,
      conversationAnalysis,
      eventInsights
    ));

    // 4. 개인화 제안 추가
    if (context.userProfile || context.userPreferences) {
      scoredSuggestions.push(...this.generatePersonalizedSuggestions(context));
    }

    // 5. 스마트 제안 (패턴 기반)
    scoredSuggestions.push(...this.generateSmartSuggestions(context, eventInsights));

    // 스코어 기준 정렬 및 변환
    const sortedSuggestions = scoredSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Filter out 'smart' category and convert to SimpleSuggestion
    return sortedSuggestions
      .filter(s => s.category !== 'smart')
      .map(s => ({
        text: s.text,
        priority: Math.min(10, Math.max(1, Math.round(s.score / 10))),
        category: s.category as 'view' | 'create' | 'search' | 'action'
      }));
  }

  /**
   * 대화 히스토리 분석
   */
  private analyzeConversation(context: EnhancedSuggestionContext) {
    const messages = context.conversationHistory || [];

    // 최근 3개 메시지의 주제 파악
    const recentTopics: string[] = [];
    const recentIntents: string[] = [];

    messages.slice(-3).forEach(msg => {
      if (msg.role === 'user') {
        const content = msg.content.toLowerCase();

        // 주제 추출
        if (content.includes('회의') || content.includes('미팅')) {
          recentTopics.push('meeting');
        }
        if (content.includes('일정') || content.includes('스케줄')) {
          recentTopics.push('schedule');
        }
        if (content.includes('친구') || content.includes('약속')) {
          recentTopics.push('social');
        }

        // 의도 파악
        if (content.includes('추가') || content.includes('만들')) {
          recentIntents.push('create');
        }
        if (content.includes('확인') || content.includes('보여')) {
          recentIntents.push('view');
        }
      }
    });

    return {
      topics: recentTopics,
      intents: recentIntents,
      conversationLength: messages.length,
      lastUserMessage: messages.filter(m => m.role === 'user').pop()?.content
    };
  }

  /**
   * 이벤트 패턴 분석
   */
  private analyzeEventPatterns(context: EnhancedSuggestionContext) {
    const analysis = context.eventAnalysis;
    const patterns: any = {
      isBusy: analysis.todayCount >= 3,
      hasUpcoming: analysis.upcomingCount > 0,
      preferredCategories: analysis.categories,
      frequentContacts: analysis.frequentAttendees
    };

    // 시간 패턴 분석
    const now = new Date();
    const currentHour = now.getHours();
    patterns.isInBusyHour = analysis.busyHours.includes(currentHour);

    // 일정 밀도 분석
    patterns.density = analysis.totalCount > 20 ? 'high' :
                      analysis.totalCount > 10 ? 'medium' : 'low';

    return patterns;
  }

  /**
   * 컨텍스트 기반 제안 생성
   */
  private generateContextualSuggestions(
    context: EnhancedSuggestionContext,
    conversationAnalysis: any,
    eventInsights: any
  ): SuggestionScore[] {
    const suggestions: SuggestionScore[] = [];
    const isKorean = context.locale === 'ko';

    // 대화 흐름 기반 제안
    if (conversationAnalysis.topics.includes('meeting')) {
      suggestions.push({
        text: isKorean ? "다음 회의 준비사항 정리" : "Prepare for next meeting",
        score: 85,
        reasons: ['recent_topic:meeting', 'contextual'],
        category: 'action'
      });

      if (eventInsights.frequentContacts.length > 0) {
        suggestions.push({
          text: isKorean
            ? `${eventInsights.frequentContacts[0]}님과 회의 일정 잡기`
            : `Schedule meeting with ${eventInsights.frequentContacts[0]}`,
          score: 80,
          reasons: ['frequent_contact', 'meeting_context'],
          category: 'create'
        });
      }
    }

    // 바쁜 시간대 감지
    if (eventInsights.isBusy) {
      suggestions.push({
        text: isKorean ? "오늘 일정 우선순위 조정" : "Prioritize today's schedule",
        score: 90,
        reasons: ['busy_day', 'time_management'],
        category: 'smart'
      });

      suggestions.push({
        text: isKorean ? "휴식 시간 추가하기" : "Add a break time",
        score: 75,
        reasons: ['wellness', 'busy_schedule'],
        category: 'create'
      });
    }

    // Follow-up 제안 개선
    if (context.isFollowUp && context.lastAIResponse) {
      const lastResponse = context.lastAIResponse.toLowerCase();

      if (lastResponse.includes('생성') || lastResponse.includes('추가')) {
        suggestions.push({
          text: isKorean ? "비슷한 일정 더 추가하기" : "Add similar events",
          score: 85,
          reasons: ['follow_up', 'creation_success'],
          category: 'create'
        });
      }

      if (lastResponse.includes('삭제') || lastResponse.includes('취소')) {
        suggestions.push({
          text: isKorean ? "대체 일정 만들기" : "Create replacement event",
          score: 80,
          reasons: ['follow_up', 'deletion_success'],
          category: 'create'
        });
      }
    }

    // 세션 기간 기반 제안
    if (context.sessionDuration > 5) {
      suggestions.push({
        text: isKorean ? "오늘 작업 요약 보기" : "View today's summary",
        score: 70,
        reasons: ['long_session', 'summary'],
        category: 'view'
      });
    }

    return suggestions;
  }

  /**
   * 개인화된 제안 생성
   */
  private generatePersonalizedSuggestions(
    context: EnhancedSuggestionContext
  ): SuggestionScore[] {
    const suggestions: SuggestionScore[] = [];
    const isKorean = context.locale === 'ko';
    const profile = context.userProfile;
    const preferences = context.userPreferences;

    // 프로필 기반 제안
    if (profile?.workHours) {
      const now = new Date();
      const currentHour = now.getHours();
      const workStart = parseInt(profile.workHours.start.split(':')[0]);
      const workEnd = parseInt(profile.workHours.end.split(':')[0]);

      if (currentHour >= workEnd - 1) {
        suggestions.push({
          text: isKorean ? "퇴근 후 일정 계획하기" : "Plan after-work activities",
          score: 85,
          reasons: ['work_hours', 'personalized'],
          category: 'create'
        });
      }
    }

    // 관심사 기반
    if (profile?.interests && profile.interests.length > 0) {
      const interest = profile.interests[0];
      suggestions.push({
        text: isKorean
          ? `${interest} 관련 일정 추가`
          : `Add ${interest} related event`,
        score: 75,
        reasons: ['interest_based', 'personalized'],
        category: 'create'
      });
    }

    // 선호도 기반
    if (preferences?.preferredSuggestions && preferences.preferredSuggestions.length > 0) {
      // 자주 클릭한 제안 유형 추천
      preferences.preferredSuggestions.forEach(pref => {
        suggestions.push({
          text: pref,
          score: 90,
          reasons: ['frequently_used', 'preference'],
          category: 'smart'
        });
      });
    }

    // 장소 기반
    if (context.eventAnalysis.frequentLocations.length > 0) {
      const topLocation = context.eventAnalysis.frequentLocations[0];
      suggestions.push({
        text: isKorean
          ? `${topLocation}에서 일정 추가`
          : `Add event at ${topLocation}`,
        score: 70,
        reasons: ['location_based', 'frequent'],
        category: 'create'
      });
    }

    return suggestions;
  }

  /**
   * 스마트 제안 (AI 패턴 인식)
   */
  private generateSmartSuggestions(
    context: EnhancedSuggestionContext,
    eventInsights: any
  ): SuggestionScore[] {
    const suggestions: SuggestionScore[] = [];
    const isKorean = context.locale === 'ko';

    // 패턴 감지: 정기 회의 누락
    const today = new Date().getDay();
    if (today === 1 && !eventInsights.hasUpcoming) { // 월요일
      suggestions.push({
        text: isKorean ? "주간 회의 일정 추가" : "Add weekly meeting",
        score: 88,
        reasons: ['pattern:weekly_meeting', 'monday'],
        category: 'smart'
      });
    }

    // 패턴 감지: 점심 시간
    const currentHour = new Date().getHours();
    if (currentHour === 11 && context.eventAnalysis.todayCount > 0) {
      const hasLunch = context.currentEvents.some(e => {
        const title = e.summary.toLowerCase();
        return title.includes('점심') || title.includes('lunch');
      });

      if (!hasLunch) {
        suggestions.push({
          text: isKorean ? "점심 시간 예약하기" : "Reserve lunch time",
          score: 85,
          reasons: ['pattern:lunch_time', 'missing'],
          category: 'smart'
        });
      }
    }

    // 일정 충돌 감지
    const conflicts = this.detectConflicts(context.currentEvents);
    if (conflicts.length > 0) {
      suggestions.push({
        text: isKorean ? "일정 충돌 해결하기" : "Resolve schedule conflicts",
        score: 95,
        reasons: ['conflict_detected', 'urgent'],
        category: 'smart'
      });
    }

    // 준비 시간 제안
    const upcomingInHour = context.currentEvents.filter(e => {
      const eventTime = new Date((e.start?.dateTime || e.start?.date || ''));
      const now = new Date();
      const diff = eventTime.getTime() - now.getTime();
      return diff > 0 && diff < 60 * 60 * 1000;
    });

    if (upcomingInHour.length > 0) {
      suggestions.push({
        text: isKorean
          ? `${upcomingInHour[0].summary} 준비하기`
          : `Prepare for ${upcomingInHour[0].summary}`,
        score: 92,
        reasons: ['upcoming_soon', 'preparation'],
        category: 'smart'
      });
    }

    return suggestions;
  }

  /**
   * 일정 충돌 감지
   */
  private detectConflicts(events: any[]): any[] {
    const conflicts: any[] = [];

    if (!events || !Array.isArray(events)) {
      return conflicts;
    }

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (!events[i]?.start_time || !events[j]?.start_time) {
          continue;
        }

        const e1Start = new Date(events[i].start?.dateTime || events[i].start?.date || '').getTime();
        const e1End = new Date(events[i].start?.dateTime || events[i].start?.date || '').getTime();
        const e2Start = new Date(events[i].start?.dateTime || events[i].start?.date || '').getTime();
        const e2End = new Date(events[i].start?.dateTime || events[i].start?.date || '').getTime();

        if (isNaN(e1Start) || isNaN(e1End) || isNaN(e2Start) || isNaN(e2End)) {
          continue;
        }

        if ((e1Start < e2End && e1End > e2Start)) {
          conflicts.push({ event1: events[i], event2: events[j] });
        }
      }
    }

    return conflicts;
  }
}