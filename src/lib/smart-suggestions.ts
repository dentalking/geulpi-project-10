import type { CalendarEvent } from '@/types';

interface SuggestionContext {
  currentTime: Date;
  recentEvents: CalendarEvent[];
  lastAction?: string;
  locale: string;
  timezone: string;
  upcomingEvents?: CalendarEvent[];
}

interface TimeContext {
  isWeekend: boolean;
  isMorning: boolean;
  isAfternoon: boolean;
  isEvening: boolean;
  isLate: boolean;
  dayOfWeek: number;
  hour: number;
}

/**
 * 현재 시간 컨텍스트 분석
 */
function getTimeContext(timezone: string): TimeContext {
  const now = new Date();
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const hour = localTime.getHours();
  const dayOfWeek = localTime.getDay();
  
  return {
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isMorning: hour >= 6 && hour < 12,
    isAfternoon: hour >= 12 && hour < 17,
    isEvening: hour >= 17 && hour < 22,
    isLate: hour >= 22 || hour < 6,
    dayOfWeek,
    hour
  };
}

/**
 * 다음 일정까지 남은 시간 계산
 */
function getTimeToNextEvent(upcomingEvents: CalendarEvent[]): number | null {
  if (!upcomingEvents || upcomingEvents.length === 0) return null;
  
  const now = new Date();
  const nextEvent = upcomingEvents[0];
  const eventTime = new Date(nextEvent.start?.dateTime || nextEvent.start?.date || '');
  
  return (eventTime.getTime() - now.getTime()) / (1000 * 60); // 분 단위
}

/**
 * 스마트 제안 생성
 */
export function generateSmartSuggestions(context: SuggestionContext): string[] {
  const timeContext = getTimeContext(context.timezone);
  const timeToNext = getTimeToNextEvent(context.upcomingEvents || []);
  const suggestions: string[] = [];
  
  const messages = {
    ko: {
      // 시간대별 제안
      morning: [
        '오늘 일정 확인하기',
        '오전 회의 추가하기',
        '점심 약속 잡기'
      ],
      afternoon: [
        '오후 일정 확인하기',
        '내일 일정 미리보기',
        '저녁 약속 추가하기'
      ],
      evening: [
        '내일 일정 확인하기',
        '이번 주 정리하기',
        '다음 주 계획 세우기'
      ],
      late: [
        '내일 일정 확인하기',
        '알람 설정하기'
      ],
      
      // 주말 제안
      weekend: [
        '주말 계획 추가하기',
        '다음 주 일정 미리보기',
        '가족 약속 추가하기'
      ],
      
      // 컨텍스트별 제안
      hasUpcoming: [
        '다음 일정 상세보기',
        '일정 알림 설정',
        '장소 확인하기'
      ],
      noEvents: [
        '새 일정 추가하기',
        '반복 일정 만들기',
        '캘린더 동기화하기'
      ],
      afterCreate: [
        '방금 추가한 일정 수정',
        '참석자 추가하기',
        '알림 설정하기'
      ],
      afterDelete: [
        '삭제 취소하기',
        '비슷한 일정 찾기',
        '새 일정 추가하기'
      ]
    },
    en: {
      morning: [
        'Check today\'s schedule',
        'Add morning meeting',
        'Schedule lunch'
      ],
      afternoon: [
        'Check afternoon schedule',
        'Preview tomorrow',
        'Add dinner plans'
      ],
      evening: [
        'Check tomorrow\'s schedule',
        'Review this week',
        'Plan next week'
      ],
      late: [
        'Check tomorrow\'s schedule',
        'Set reminders'
      ],
      weekend: [
        'Add weekend plans',
        'Preview next week',
        'Add family event'
      ],
      hasUpcoming: [
        'View next event details',
        'Set event reminder',
        'Check location'
      ],
      noEvents: [
        'Add new event',
        'Create recurring event',
        'Sync calendar'
      ],
      afterCreate: [
        'Edit recent event',
        'Add attendees',
        'Set reminder'
      ],
      afterDelete: [
        'Undo deletion',
        'Find similar events',
        'Add new event'
      ]
    }
  };
  
  const localMessages = messages[context.locale as keyof typeof messages] || messages.ko;
  
  // 1. 시간대별 제안 추가
  if (timeContext.isMorning) {
    suggestions.push(...localMessages.morning.slice(0, 2));
  } else if (timeContext.isAfternoon) {
    suggestions.push(...localMessages.afternoon.slice(0, 2));
  } else if (timeContext.isEvening) {
    suggestions.push(...localMessages.evening.slice(0, 2));
  } else if (timeContext.isLate) {
    suggestions.push(...localMessages.late);
  }
  
  // 2. 주말 특별 제안
  if (timeContext.isWeekend && suggestions.length < 3) {
    suggestions.push(localMessages.weekend[0]);
  }
  
  // 3. 다음 일정 관련 제안
  if (timeToNext !== null) {
    if (timeToNext < 60) { // 1시간 이내
      suggestions.unshift(context.locale === 'ko' 
        ? `${Math.round(timeToNext)}분 후 일정 확인`
        : `Check event in ${Math.round(timeToNext)} minutes`
      );
    } else if (timeToNext < 1440) { // 24시간 이내
      suggestions.push(localMessages.hasUpcoming[0]);
    }
  } else {
    suggestions.push(localMessages.noEvents[0]);
  }
  
  // 4. 최근 액션 기반 제안
  if (context.lastAction === 'create') {
    suggestions.push(...localMessages.afterCreate.slice(0, 1));
  } else if (context.lastAction === 'delete') {
    suggestions.push(...localMessages.afterDelete.slice(0, 1));
  }
  
  // 중복 제거 및 최대 5개로 제한
  const uniqueSuggestions = Array.from(new Set(suggestions));
  return uniqueSuggestions.slice(0, 5);
}

/**
 * 빠른 액션 제안 (버튼으로 표시할 수 있는 간단한 액션)
 */
export function getQuickActions(context: SuggestionContext): Array<{
  label: string;
  action: string;
  icon?: string;
}> {
  const timeContext = getTimeContext(context.timezone);
  const actions: Array<{ label: string; action: string; icon?: string; }> = [];
  
  const labels = {
    ko: {
      today: '오늘',
      tomorrow: '내일',
      thisWeek: '이번 주',
      nextWeek: '다음 주',
      addEvent: '일정 추가',
      refresh: '새로고침'
    },
    en: {
      today: 'Today',
      tomorrow: 'Tomorrow',
      thisWeek: 'This Week',
      nextWeek: 'Next Week',
      addEvent: 'Add Event',
      refresh: 'Refresh'
    }
  };
  
  const localLabels = labels[context.locale as keyof typeof labels] || labels.ko;
  
  // 시간대별 빠른 액션
  if (timeContext.isMorning || timeContext.isAfternoon) {
    actions.push({
      label: localLabels.today,
      action: 'SHOW_TODAY',
      icon: '📅'
    });
  }
  
  actions.push({
    label: localLabels.tomorrow,
    action: 'SHOW_TOMORROW',
    icon: '📆'
  });
  
  if (timeContext.isWeekend || timeContext.dayOfWeek >= 4) {
    actions.push({
      label: localLabels.nextWeek,
      action: 'SHOW_NEXT_WEEK',
      icon: '📋'
    });
  } else {
    actions.push({
      label: localLabels.thisWeek,
      action: 'SHOW_THIS_WEEK',
      icon: '📋'
    });
  }
  
  actions.push({
    label: localLabels.addEvent,
    action: 'CREATE_EVENT',
    icon: '➕'
  });
  
  return actions;
}