/**
 * SimpleSuggestionService
 *
 * 안정적이고 빠른 제안 생성을 위한 단순화된 서비스
 * - 복잡한 AI 처리 없이 컨텍스트 기반 제안
 * - 빠른 응답 시간 보장 (< 100ms)
 * - 예측 가능한 동작
 */

import { CalendarEvent } from '@/types';
import { format, addDays, startOfWeek, endOfWeek, isToday, isTomorrow, differenceInMinutes, isWithinInterval } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

export interface SimpleSuggestionContext {
  locale: 'ko' | 'en';
  currentEvents?: CalendarEvent[];
  selectedDate?: Date;
  lastMessage?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  isFollowUp?: boolean;
}

export interface SimpleSuggestion {
  text: string;
  priority: number;  // 1-10, 높을수록 중요
  category: 'view' | 'create' | 'search' | 'action';
}

export class SimpleSuggestionService {
  private locale: 'ko' | 'en';

  constructor(locale: 'ko' | 'en' = 'ko') {
    this.locale = locale;
  }

  /**
   * 메인 제안 생성 메서드
   */
  public generateSuggestions(context: SimpleSuggestionContext): SimpleSuggestion[] {
    const suggestions: SimpleSuggestion[] = [];
    const now = new Date();
    const timeOfDay = context.timeOfDay || this.getTimeOfDay(now);

    // 1. Follow-up 제안 (이전 대화 기반)
    if (context.isFollowUp && context.lastMessage) {
      suggestions.push(...this.getFollowUpSuggestions(context.lastMessage));
    }

    // 2. 선택된 날짜 기반 제안
    if (context.selectedDate) {
      suggestions.push(...this.getDateBasedSuggestions(context.selectedDate));
    }

    // 3. 이벤트 기반 제안
    if (context.currentEvents && context.currentEvents.length > 0) {
      suggestions.push(...this.getEventBasedSuggestions(context.currentEvents, now));
    }

    // 4. 시간대별 기본 제안
    suggestions.push(...this.getTimeBasedSuggestions(timeOfDay));

    // 5. 항상 유용한 제안
    suggestions.push(...this.getAlwaysUsefulSuggestions());

    // 중복 제거 및 우선순위 정렬
    return this.deduplicateAndSort(suggestions).slice(0, 5);
  }

  /**
   * Follow-up 제안 생성
   */
  private getFollowUpSuggestions(lastMessage: string): SimpleSuggestion[] {
    const suggestions: SimpleSuggestion[] = [];
    const lowerMessage = lastMessage.toLowerCase();

    // AI 응답 의미 분석 - 일정 없음 감지
    const noEventsKeywords = [
      'no events', 'no schedule', 'nothing scheduled', 'empty',
      '일정이 없', '일정 없', '비어', '없습니다', '없네요'
    ];

    const hasNoEvents = noEventsKeywords.some(keyword => lowerMessage.includes(keyword));

    if (this.locale === 'ko') {
      // 일정이 없다고 응답한 경우
      if (hasNoEvents) {
        suggestions.push(
          { text: "오전 회의 추가하기", priority: 9, category: 'create' },
          { text: "오후 일정 만들기", priority: 8, category: 'create' },
          { text: "반복 일정 설정하기", priority: 7, category: 'create' },
          { text: "사진에서 일정 가져오기", priority: 6, category: 'create' }
        );
        return suggestions; // 다른 제안 무시하고 반환
      }

      // 일반적인 일정 관련 응답 (일정이 있는 경우)
      if (lowerMessage.includes('일정') || lowerMessage.includes('이벤트')) {
        // 일정이 있을 때만 편집/수정 제안
        if (!hasNoEvents) {
          suggestions.push(
            { text: "상세 정보 수정하기", priority: 8, category: 'action' },
            { text: "비슷한 일정 추가하기", priority: 7, category: 'create' }
          );
        }
      }

      if (lowerMessage.includes('내일') || lowerMessage.includes('tomorrow')) {
        suggestions.push(
          { text: "내일 일정 자세히 보기", priority: 8, category: 'view' },
          { text: "내일 중요 일정 추가", priority: 7, category: 'create' }
        );
      }

      if (lowerMessage.includes('회의') || lowerMessage.includes('미팅')) {
        suggestions.push(
          { text: "회의 준비사항 추가", priority: 8, category: 'create' },
          { text: "참석자에게 알림 보내기", priority: 7, category: 'action' }
        );
      }
    } else {
      // 일정이 없다고 응답한 경우 (영어)
      if (hasNoEvents) {
        suggestions.push(
          { text: "Add morning meeting", priority: 9, category: 'create' },
          { text: "Schedule afternoon task", priority: 8, category: 'create' },
          { text: "Create recurring event", priority: 7, category: 'create' },
          { text: "Import from calendar photo", priority: 6, category: 'create' }
        );
        return suggestions; // 다른 제안 무시하고 반환
      }

      // 일반적인 일정 관련 응답 (일정이 있는 경우)
      if (lowerMessage.includes('event') || lowerMessage.includes('schedule')) {
        // 일정이 있을 때만 편집/수정 제안
        if (!hasNoEvents) {
          suggestions.push(
            { text: "Edit event details", priority: 8, category: 'action' },
            { text: "Add similar event", priority: 7, category: 'create' }
          );
        }
      }

      if (lowerMessage.includes('tomorrow')) {
        suggestions.push(
          { text: "View tomorrow's details", priority: 8, category: 'view' },
          { text: "Add important task for tomorrow", priority: 7, category: 'create' }
        );
      }

      if (lowerMessage.includes('meeting')) {
        suggestions.push(
          { text: "Add meeting preparation", priority: 8, category: 'create' },
          { text: "Send reminder to attendees", priority: 7, category: 'action' }
        );
      }
    }

    return suggestions;
  }

  /**
   * 날짜 기반 제안
   */
  private getDateBasedSuggestions(selectedDate: Date): SimpleSuggestion[] {
    const suggestions: SimpleSuggestion[] = [];
    const today = new Date();

    if (this.locale === 'ko') {
      if (isToday(selectedDate)) {
        suggestions.push(
          { text: "오늘 남은 일정 확인", priority: 9, category: 'view' },
          { text: "오늘 저녁 일정 추가", priority: 7, category: 'create' }
        );
      } else if (isTomorrow(selectedDate)) {
        suggestions.push(
          { text: "내일 일정 상세보기", priority: 8, category: 'view' },
          { text: "내일 준비사항 체크", priority: 7, category: 'action' }
        );
      } else {
        const dateStr = format(selectedDate, 'M월 d일', { locale: ko });
        suggestions.push(
          { text: `${dateStr} 일정 보기`, priority: 7, category: 'view' },
          { text: `${dateStr}에 일정 추가`, priority: 6, category: 'create' }
        );
      }
    } else {
      if (isToday(selectedDate)) {
        suggestions.push(
          { text: "Check remaining tasks today", priority: 9, category: 'view' },
          { text: "Add evening event", priority: 7, category: 'create' }
        );
      } else if (isTomorrow(selectedDate)) {
        suggestions.push(
          { text: "View tomorrow's details", priority: 8, category: 'view' },
          { text: "Check tomorrow's preparations", priority: 7, category: 'action' }
        );
      } else {
        const dateStr = format(selectedDate, 'MMM d', { locale: enUS });
        suggestions.push(
          { text: `View ${dateStr} schedule`, priority: 7, category: 'view' },
          { text: `Add event on ${dateStr}`, priority: 6, category: 'create' }
        );
      }
    }

    return suggestions;
  }

  /**
   * 이벤트 기반 제안
   */
  private getEventBasedSuggestions(events: CalendarEvent[], now: Date): SimpleSuggestion[] {
    const suggestions: SimpleSuggestion[] = [];

    // 다음 이벤트 찾기
    const upcomingEvents = events
      .filter(e => new Date((e.start?.dateTime || e.start?.date || '')) > now)
      .sort((a, b) => new Date(a.start?.dateTime || a.start?.date || '').getTime() - new Date(b.start?.dateTime || b.start?.date || '').getTime());

    const nextEvent = upcomingEvents[0];

    if (nextEvent) {
      const eventTime = new Date(nextEvent.start?.dateTime || nextEvent.start?.date || '');
      const minutesUntil = differenceInMinutes(eventTime, now);

      if (this.locale === 'ko') {
        if (minutesUntil < 60 && minutesUntil > 0) {
          suggestions.push({
            text: `"${nextEvent.summary}" 곧 시작 (${minutesUntil}분 후)`,
            priority: 10,
            category: 'view'
          });
        } else if (minutesUntil < 24 * 60) {
          suggestions.push({
            text: `다음 일정: ${nextEvent.summary}`,
            priority: 8,
            category: 'view'
          });
        }

        // 세미나 관련 특별 제안 (스크린샷에서 보이는 것처럼)
        if (nextEvent.summary?.toLowerCase().includes('seminar') ||
            nextEvent.summary?.toLowerCase().includes('세미나')) {
          suggestions.push({
            text: `"${nextEvent.summary}" 전에 자료 조사 시간을 90분 정도 잡으면 어떨까요?`,
            priority: 9,
            category: 'create'
          });
        }
      } else {
        if (minutesUntil < 60 && minutesUntil > 0) {
          suggestions.push({
            text: `"${nextEvent.summary}" starting soon (in ${minutesUntil} min)`,
            priority: 10,
            category: 'view'
          });
        } else if (minutesUntil < 24 * 60) {
          suggestions.push({
            text: `Next: ${nextEvent.summary}`,
            priority: 8,
            category: 'view'
          });
        }

        if (nextEvent.summary?.toLowerCase().includes('seminar')) {
          suggestions.push({
            text: `Schedule 90min prep time before "${nextEvent.summary}"?`,
            priority: 9,
            category: 'create'
          });
        }
      }
    }

    // 오늘의 이벤트 수 기반 제안 (개선됨)
    const todayEvents = events.filter(e => isToday(new Date((e.start?.dateTime || e.start?.date || ''))));
    const hour = now.getHours();

    if (this.locale === 'ko') {
      if (todayEvents.length === 0) {
        // 일정이 전혀 없을 때 - 시간대별 구체적 제안
        if (hour < 12) {
          suggestions.push({
            text: "점심 약속 추가하기",
            priority: 8,
            category: 'create'
          });
          suggestions.push({
            text: "오후 업무 일정 만들기",
            priority: 7,
            category: 'create'
          });
        } else if (hour < 18) {
          suggestions.push({
            text: "저녁 운동 시간 추가",
            priority: 8,
            category: 'create'
          });
          suggestions.push({
            text: "내일 할 일 정리하기",
            priority: 7,
            category: 'create'
          });
        } else {
          suggestions.push({
            text: "내일 아침 루틴 설정",
            priority: 7,
            category: 'create'
          });
        }
      } else if (todayEvents.length === 1) {
        // 일정이 하나만 있을 때
        suggestions.push({
          text: "관련 후속 일정 추가",
          priority: 7,
          category: 'create'
        });
      } else if (todayEvents.length > 3) {
        suggestions.push({
          text: "오늘 일정이 많네요. 우선순위 정리해볼까요?",
          priority: 7,
          category: 'action'
        });
      }
    } else {
      if (todayEvents.length === 0) {
        // 일정이 전혀 없을 때 - 시간대별 구체적 제안 (영어)
        if (hour < 12) {
          suggestions.push({
            text: "Add lunch appointment",
            priority: 8,
            category: 'create'
          });
          suggestions.push({
            text: "Schedule afternoon tasks",
            priority: 7,
            category: 'create'
          });
        } else if (hour < 18) {
          suggestions.push({
            text: "Add evening workout",
            priority: 8,
            category: 'create'
          });
          suggestions.push({
            text: "Plan tomorrow's agenda",
            priority: 7,
            category: 'create'
          });
        } else {
          suggestions.push({
            text: "Set morning routine",
            priority: 7,
            category: 'create'
          });
        }
      } else if (todayEvents.length === 1) {
        // 일정이 하나만 있을 때
        suggestions.push({
          text: "Add follow-up event",
          priority: 7,
          category: 'create'
        });
      } else if (todayEvents.length > 3) {
        suggestions.push({
          text: "Busy day ahead. Review priorities?",
          priority: 7,
          category: 'action'
        });
      }
    }

    return suggestions;
  }

  /**
   * 시간대별 기본 제안
   */
  private getTimeBasedSuggestions(timeOfDay: 'morning' | 'afternoon' | 'evening'): SimpleSuggestion[] {
    if (this.locale === 'ko') {
      switch (timeOfDay) {
        case 'morning':
          return [
            { text: "오늘 일정 확인해줘", priority: 8, category: 'view' },
            { text: "오늘 중요한 일 3가지 정리", priority: 7, category: 'action' },
            { text: "아침 루틴 체크리스트", priority: 5, category: 'view' }
          ];
        case 'afternoon':
          return [
            { text: "오후 일정 확인", priority: 7, category: 'view' },
            { text: "내일 준비사항 체크", priority: 6, category: 'action' },
            { text: "이번 주 일정 요약", priority: 5, category: 'view' }
          ];
        case 'evening':
          return [
            { text: "내일 일정 미리보기", priority: 7, category: 'view' },
            { text: "오늘 하루 정리", priority: 6, category: 'action' },
            { text: "이번 주 남은 일정", priority: 5, category: 'view' }
          ];
      }
    } else {
      switch (timeOfDay) {
        case 'morning':
          return [
            { text: "Show today's schedule", priority: 8, category: 'view' },
            { text: "List top 3 priorities", priority: 7, category: 'action' },
            { text: "Morning routine checklist", priority: 5, category: 'view' }
          ];
        case 'afternoon':
          return [
            { text: "Check afternoon agenda", priority: 7, category: 'view' },
            { text: "Prepare for tomorrow", priority: 6, category: 'action' },
            { text: "Week summary", priority: 5, category: 'view' }
          ];
        case 'evening':
          return [
            { text: "Preview tomorrow", priority: 7, category: 'view' },
            { text: "Daily review", priority: 6, category: 'action' },
            { text: "Remaining week events", priority: 5, category: 'view' }
          ];
      }
    }
  }

  /**
   * 항상 유용한 제안
   */
  private getAlwaysUsefulSuggestions(): SimpleSuggestion[] {
    if (this.locale === 'ko') {
      return [
        { text: "사진에서 일정 추출하기", priority: 4, category: 'create' },
        { text: "친구와 미팅 잡기", priority: 3, category: 'action' },
        { text: "이번 달 일정 보기", priority: 3, category: 'view' }
      ];
    } else {
      return [
        { text: "Extract events from photo", priority: 4, category: 'create' },
        { text: "Schedule with friends", priority: 3, category: 'action' },
        { text: "View monthly calendar", priority: 3, category: 'view' }
      ];
    }
  }

  /**
   * 현재 시간대 판단
   */
  private getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * 중복 제거 및 정렬
   */
  private deduplicateAndSort(suggestions: SimpleSuggestion[]): SimpleSuggestion[] {
    // 텍스트 기반 중복 제거
    const uniqueMap = new Map<string, SimpleSuggestion>();

    suggestions.forEach(suggestion => {
      const existing = uniqueMap.get(suggestion.text);
      if (!existing || existing.priority < suggestion.priority) {
        uniqueMap.set(suggestion.text, suggestion);
      }
    });

    // 우선순위 기반 정렬 (높은 순)
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.priority - a.priority);
  }
}