/**
 * Intelligent Suggestion Service - Gemini API 기반 컨텍스트 인식 제안 시스템
 * Calendar context를 분석하여 개인화된 actionable suggestions 생성
 */

import { CalendarEvent } from '@/types';
import { format, isToday, isTomorrow, addDays, parseISO, isWithinInterval } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

export interface IntelligentSuggestionContext {
  currentEvents: CalendarEvent[];
  selectedDate?: Date;
  selectedEvent?: CalendarEvent;
  userId?: string;
  recentMessages?: any[];
  locale: 'ko' | 'en';
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  userEmail?: string;
}

export interface ActionableSuggestion {
  id: string;
  text: string;
  type: 'create_prep' | 'create_followup' | 'create_routine' | 'schedule_break' | 'optimize_schedule';
  priority: number;
  reasoning: string;
  suggestedTime?: {
    start: string;
    duration: number; // minutes
  };
  relatedEventId?: string;
  actionable: boolean;
}

export class IntelligentSuggestionService {
  private locale: 'ko' | 'en';

  constructor(locale: 'ko' | 'en' = 'ko') {
    this.locale = locale;
  }

  /**
   * 메인 intelligent suggestions 생성
   */
  async generateIntelligentSuggestions(context: IntelligentSuggestionContext): Promise<ActionableSuggestion[]> {
    const analysis = this.analyzeCalendarContext(context);

    console.log('📊 [IntelligentSuggestions] Calendar Analysis:', analysis);
    console.log('💬 [IntelligentSuggestions] Recent Messages:', context.recentMessages?.slice(-2));

    const suggestions: ActionableSuggestion[] = [];

    // 0. Conversation Context Suggestions (highest priority)
    // Check if AI just responded about scheduling something specific
    if (context.recentMessages && context.recentMessages.length > 0) {
      const conversationSuggestions = this.generateConversationContextSuggestions(context, analysis);
      if (conversationSuggestions.length > 0) {
        suggestions.push(...conversationSuggestions);
      }
    }

    // 1. Empty Schedule Intelligence
    if (analysis.todayEventCount === 0) {
      suggestions.push(...this.generateEmptyScheduleSuggestions(context, analysis));
    }

    // 2. Upcoming Event Preparation
    suggestions.push(...this.generatePreparationSuggestions(context, analysis));

    // 3. Follow-up Suggestions
    suggestions.push(...this.generateFollowupSuggestions(context, analysis));

    // 4. Schedule Optimization
    suggestions.push(...this.generateOptimizationSuggestions(context, analysis));

    // 5. Routine & Wellbeing
    suggestions.push(...this.generateRoutineSuggestions(context, analysis));

    // Sort by priority and take top 5
    const finalSuggestions = suggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);

    console.log('🎯 [IntelligentSuggestions] Generated suggestions:', finalSuggestions.map(s => ({
      text: s.text,
      priority: s.priority,
      type: s.type,
      reasoning: s.reasoning
    })));

    return finalSuggestions;
  }

  /**
   * Calendar context 분석
   */
  private analyzeCalendarContext(context: IntelligentSuggestionContext) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = addDays(today, 1);
    const nextWeek = addDays(today, 7);

    // Today's events
    const todayEvents = context.currentEvents.filter(event => {
      const eventDate = this.getEventStartDate(event);
      return eventDate && isToday(eventDate);
    });

    // Tomorrow's events
    const tomorrowEvents = context.currentEvents.filter(event => {
      const eventDate = this.getEventStartDate(event);
      return eventDate && isTomorrow(eventDate);
    });

    // Upcoming important events (next 7 days)
    const upcomingEvents = context.currentEvents.filter(event => {
      const eventDate = this.getEventStartDate(event);
      return eventDate && eventDate > now && eventDate <= nextWeek;
    }).sort((a, b) => {
      const dateA = this.getEventStartDate(a);
      const dateB = this.getEventStartDate(b);
      return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
    });

    // Pattern analysis
    const eventKeywords = this.extractEventKeywords(context.currentEvents);
    const timeSlots = this.analyzeTimeSlots(context.currentEvents);

    return {
      todayEventCount: todayEvents.length,
      tomorrowEventCount: tomorrowEvents.length,
      upcomingEventsCount: upcomingEvents.length,
      todayEvents,
      tomorrowEvents,
      upcomingEvents: upcomingEvents.slice(0, 5), // Top 5 upcoming
      eventKeywords,
      timeSlots,
      hasFreeMorning: !todayEvents.some(e => this.isEventInMorning(e)),
      hasFreeAfternoon: !todayEvents.some(e => this.isEventInAfternoon(e)),
      hasFreeEvening: !todayEvents.some(e => this.isEventInEvening(e))
    };
  }

  /**
   * Conversation context를 기반으로 한 suggestions
   * 대화 맥락을 파악하여 더 적절한 제안 생성
   */
  private generateConversationContextSuggestions(
    context: IntelligentSuggestionContext,
    analysis: any
  ): ActionableSuggestion[] {
    const suggestions: ActionableSuggestion[] = [];

    // 최근 메시지 분석
    const recentMessages = context.recentMessages || [];
    const lastAiMessage = recentMessages
      .filter(m => m.role === 'assistant')
      .pop()?.content?.toLowerCase() || '';
    const lastUserMessage = recentMessages
      .filter(m => m.role === 'user')
      .pop()?.content?.toLowerCase() || '';

    console.log('🔍 [IntelligentSuggestions] Analyzing conversation context:', {
      lastAiMessage: lastAiMessage.substring(0, 100),
      lastUserMessage: lastUserMessage.substring(0, 100)
    });

    // AI가 운동과 독서 시간 예약을 제안한 경우
    if (lastAiMessage.includes('exercise') || lastAiMessage.includes('reading') ||
        lastAiMessage.includes('운동') || lastAiMessage.includes('독서') ||
        lastAiMessage.includes('optimal times')) {

      // 구체적인 시간대 제안
      suggestions.push({
        id: `context-time-${Date.now()}`,
        text: this.locale === 'ko'
          ? '오전 7시 30분에 운동 1시간 예약하기'
          : 'Schedule 1 hour of exercise at 7:30 AM',
        type: 'create_routine',
        priority: 15, // 매우 높은 우선순위
        reasoning: 'Following up on AI suggestion for exercise',
        suggestedTime: { start: '07:30', duration: 60 },
        actionable: true
      });

      suggestions.push({
        id: `context-reading-${Date.now()}`,
        text: this.locale === 'ko'
          ? '저녁 8시에 독서 시간 30분 추가하기'
          : 'Add 30 minutes of reading time at 8 PM',
        type: 'create_routine',
        priority: 14,
        reasoning: 'Following up on AI suggestion for reading',
        suggestedTime: { start: '20:00', duration: 30 },
        actionable: true
      });

      suggestions.push({
        id: `context-both-${Date.now()}`,
        text: this.locale === 'ko'
          ? '오전 운동 30분, 저녁 독서 30분 한번에 예약'
          : 'Schedule both: 30min morning exercise & 30min evening reading',
        type: 'create_routine',
        priority: 13,
        reasoning: 'Combined schedule for exercise and reading',
        suggestedTime: { start: '07:00', duration: 30 },
        actionable: true
      });
    }

    // AI가 시간을 물어본 경우
    else if (lastAiMessage.includes('what time') || lastAiMessage.includes('when') ||
        lastAiMessage.includes('몇 시') || lastAiMessage.includes('언제')) {

      suggestions.push({
        id: `context-morning-${Date.now()}`,
        text: this.locale === 'ko'
          ? '아침 6시 30분 - 활력있는 하루 시작하기'
          : '6:30 AM - Start the day with energy',
        type: 'create_routine',
        priority: 12,
        reasoning: 'Morning time suggestion',
        suggestedTime: { start: '06:30', duration: 45 },
        actionable: true
      });

      suggestions.push({
        id: `context-afternoon-${Date.now()}`,
        text: this.locale === 'ko'
          ? '오후 2시 - 집중력이 좋은 시간대 활용'
          : '2 PM - Use your peak focus time',
        type: 'schedule_break',
        priority: 11,
        reasoning: 'Afternoon productive time',
        suggestedTime: { start: '14:00', duration: 90 },
        actionable: true
      });
    }

    // 대화가 진행 중일 때 기본 CRUD 기능 활용 제안
    else if (recentMessages.length > 2) {
      suggestions.push({
        id: `context-crud-${Date.now()}`,
        text: this.locale === 'ko'
          ? '내일 오전 10시 회의 추가하기'
          : 'Add a meeting at 10 AM tomorrow',
        type: 'create_followup',
        priority: 10,
        reasoning: 'Demonstrating CRUD capabilities',
        actionable: true
      });
    }

    return suggestions;
  }

  /**
   * Empty schedule에 대한 intelligent suggestions
   */
  private generateEmptyScheduleSuggestions(
    context: IntelligentSuggestionContext,
    analysis: any
  ): ActionableSuggestion[] {
    const suggestions: ActionableSuggestion[] = [];

    // Tomorrow preparation
    if (analysis.tomorrowEventCount > 0) {
      const tomorrowEvent = analysis.tomorrowEvents[0];
      const preparationTime = this.suggestPreparationTime(context, tomorrowEvent);

      suggestions.push({
        id: `prep-tomorrow-${Date.now()}`,
        text: this.locale === 'ko'
          ? `내일 "${tomorrowEvent.summary}" 준비를 위해 ${preparationTime.suggestion}은 어떠세요?`
          : `How about ${preparationTime.suggestion} to prepare for tomorrow's "${tomorrowEvent.summary}"?`,
        type: 'create_prep',
        priority: 9,
        reasoning: `Tomorrow has important event: ${tomorrowEvent.summary}`,
        suggestedTime: preparationTime.timeSlot,
        relatedEventId: tomorrowEvent.id,
        actionable: true
      });
    }

    // Upcoming event preparation
    if (analysis.upcomingEventsCount > 0) {
      const upcomingEvent = analysis.upcomingEvents[0];
      const eventDate = this.getEventStartDate(upcomingEvent);
      const daysUntil = eventDate ? Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

      if (daysUntil > 1 && daysUntil <= 7) {
        suggestions.push({
          id: `prep-upcoming-${Date.now()}`,
          text: this.locale === 'ko'
            ? `${daysUntil}일 후 "${upcomingEvent.summary}"이 있습니다. 오늘 준비 시간을 잡아볼까요?`
            : `You have "${upcomingEvent.summary}" in ${daysUntil} days. Shall we schedule some preparation time today?`,
          type: 'create_prep',
          priority: 8,
          reasoning: `Upcoming important event needs preparation: ${upcomingEvent.summary}`,
          suggestedTime: {
            start: context.timeOfDay === 'morning' ? '14:00' : '16:00',
            duration: 60
          },
          relatedEventId: upcomingEvent.id,
          actionable: true
        });
      }
    }

    // Free day wellness
    suggestions.push({
      id: `wellness-${Date.now()}`,
      text: this.locale === 'ko'
        ? '오늘은 비교적 여유로우시네요! 운동이나 독서 시간을 만들어보시겠어요?'
        : 'Today looks relatively free! Would you like to schedule some exercise or reading time?',
      type: 'create_routine',
      priority: 6,
      reasoning: 'Empty schedule allows for self-care activities',
      suggestedTime: {
        start: context.timeOfDay === 'evening' ? '19:00' : '15:00',
        duration: 90
      },
      actionable: true
    });

    return suggestions;
  }

  /**
   * Upcoming events 기반 preparation suggestions
   */
  private generatePreparationSuggestions(
    context: IntelligentSuggestionContext,
    analysis: any
  ): ActionableSuggestion[] {
    const suggestions: ActionableSuggestion[] = [];

    // 키워드 기반 preparation suggestions
    analysis.upcomingEvents.forEach((event: CalendarEvent, index: number) => {
      const eventKeywords = this.extractEventKeywords([event]);
      const preparationType = this.determinePreparationType(eventKeywords);

      if (preparationType && index < 3) { // Top 3 events only
        const eventDate = this.getEventStartDate(event);
        const daysUntil = eventDate ? Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

        suggestions.push({
          id: `prep-specific-${event.id}-${Date.now()}`,
          text: this.generatePreparationText(event, preparationType, daysUntil),
          type: 'create_prep',
          priority: 10 - index, // First event gets highest priority
          reasoning: `Specific preparation needed for ${event.summary}`,
          suggestedTime: this.suggestOptimalTime(context, preparationType.duration),
          relatedEventId: event.id,
          actionable: true
        });
      }
    });

    return suggestions;
  }

  /**
   * Follow-up suggestions for recent events
   */
  private generateFollowupSuggestions(
    context: IntelligentSuggestionContext,
    analysis: any
  ): ActionableSuggestion[] {
    const suggestions: ActionableSuggestion[] = [];

    // Find recent completed events (last 2 days)
    const recentEvents = context.currentEvents.filter(event => {
      const eventDate = this.getEventStartDate(event);
      if (!eventDate) return false;
      const daysSince = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 0 && daysSince <= 2;
    });

    recentEvents.slice(0, 2).forEach(event => {
      const followupType = this.determineFollowupType(event);
      if (followupType) {
        suggestions.push({
          id: `followup-${event.id}-${Date.now()}`,
          text: this.generateFollowupText(event, followupType),
          type: 'create_followup',
          priority: 7,
          reasoning: `Follow-up needed after ${event.summary}`,
          suggestedTime: this.suggestOptimalTime(context, 30),
          relatedEventId: event.id,
          actionable: true
        });
      }
    });

    return suggestions;
  }

  /**
   * Schedule optimization suggestions
   */
  private generateOptimizationSuggestions(
    context: IntelligentSuggestionContext,
    analysis: any
  ): ActionableSuggestion[] {
    const suggestions: ActionableSuggestion[] = [];

    // Suggest breaks between busy periods
    if (analysis.todayEventCount >= 3) {
      suggestions.push({
        id: `break-${Date.now()}`,
        text: this.locale === 'ko'
          ? '오늘 일정이 많으시네요. 짧은 휴식 시간을 추가해볼까요?'
          : 'You have a busy day today. Would you like to add a short break?',
        type: 'schedule_break',
        priority: 5,
        reasoning: 'Busy schedule needs break time',
        suggestedTime: {
          start: '15:30',
          duration: 15
        },
        actionable: true
      });
    }

    return suggestions;
  }

  /**
   * Routine & wellbeing suggestions
   */
  private generateRoutineSuggestions(
    context: IntelligentSuggestionContext,
    analysis: any
  ): ActionableSuggestion[] {
    const suggestions: ActionableSuggestion[] = [];

    // Morning routine (if free morning)
    if (analysis.hasFreeMorning && context.timeOfDay === 'morning') {
      suggestions.push({
        id: `morning-routine-${Date.now()}`,
        text: this.locale === 'ko'
          ? '아침 시간을 활용해 명상이나 스트레칭 시간을 가져보세요'
          : 'Use your free morning for meditation or stretching',
        type: 'create_routine',
        priority: 4,
        reasoning: 'Free morning time available',
        suggestedTime: {
          start: '08:30',
          duration: 30
        },
        actionable: true
      });
    }

    return suggestions;
  }

  // Helper methods
  private getEventStartDate(event: CalendarEvent): Date | null {
    if (event.start?.dateTime) {
      return parseISO(event.start.dateTime);
    } else if (event.start?.date) {
      return parseISO(event.start.date);
    }
    return null;
  }

  private extractEventKeywords(events: CalendarEvent[]): string[] {
    const keywords = new Set<string>();
    events.forEach(event => {
      const text = `${event.summary} ${event.description || ''}`.toLowerCase();

      // Common keywords for categorization
      if (text.includes('meeting') || text.includes('미팅') || text.includes('회의')) keywords.add('meeting');
      if (text.includes('seminar') || text.includes('세미나') || text.includes('conference')) keywords.add('seminar');
      if (text.includes('doctor') || text.includes('의사') || text.includes('치과')) keywords.add('medical');
      if (text.includes('trip') || text.includes('travel') || text.includes('여행')) keywords.add('travel');
      if (text.includes('study') || text.includes('공부') || text.includes('학습')) keywords.add('study');
    });

    return Array.from(keywords);
  }

  private determinePreparationType(keywords: string[]) {
    if (keywords.includes('seminar')) {
      return { type: 'research', duration: 90, activity: this.locale === 'ko' ? '자료 조사' : 'research' };
    }
    if (keywords.includes('meeting')) {
      return { type: 'agenda', duration: 30, activity: this.locale === 'ko' ? '안건 정리' : 'agenda preparation' };
    }
    if (keywords.includes('travel')) {
      return { type: 'packing', duration: 60, activity: this.locale === 'ko' ? '짐 정리' : 'packing' };
    }
    if (keywords.includes('medical')) {
      return { type: 'documents', duration: 15, activity: this.locale === 'ko' ? '서류 준비' : 'document preparation' };
    }
    return null;
  }

  private generatePreparationText(event: CalendarEvent, prepType: any, daysUntil: number): string {
    if (this.locale === 'ko') {
      return `${daysUntil}일 후 "${event.summary}" 전에 ${prepType.activity} 시간을 ${prepType.duration}분 정도 잡으면 어떨까요?`;
    } else {
      return `How about ${prepType.duration} minutes for ${prepType.activity} before "${event.summary}" in ${daysUntil} days?`;
    }
  }

  private suggestPreparationTime(context: IntelligentSuggestionContext, event: CalendarEvent) {
    const timeSlot = context.timeOfDay === 'morning' ?
      { start: '14:00', duration: 60 } :
      { start: '16:00', duration: 60 };

    const suggestion = this.locale === 'ko' ?
      `오후 ${timeSlot.start.split(':')[0]}시부터 ${timeSlot.duration}분간` :
      `${timeSlot.duration} minutes from ${timeSlot.start}`;

    return { timeSlot, suggestion };
  }

  private suggestOptimalTime(context: IntelligentSuggestionContext, duration: number) {
    // Simple time suggestion based on current time
    const hour = context.timeOfDay === 'morning' ? 10 :
                 context.timeOfDay === 'afternoon' ? 15 : 19;

    return {
      start: `${hour.toString().padStart(2, '0')}:00`,
      duration
    };
  }

  private determineFollowupType(event: CalendarEvent) {
    const summary = event.summary?.toLowerCase() || '';

    if (summary.includes('meeting') || summary.includes('미팅')) {
      return { type: 'notes', activity: this.locale === 'ko' ? '회의록 정리' : 'meeting notes' };
    }
    if (summary.includes('seminar') || summary.includes('세미나')) {
      return { type: 'review', activity: this.locale === 'ko' ? '내용 정리' : 'content review' };
    }

    return null;
  }

  private generateFollowupText(event: CalendarEvent, followupType: any): string {
    if (this.locale === 'ko') {
      return `"${event.summary}" 후 ${followupType.activity} 시간을 가져보시겠어요?`;
    } else {
      return `Would you like to schedule ${followupType.activity} time after "${event.summary}"?`;
    }
  }

  private analyzeTimeSlots(events: CalendarEvent[]) {
    // Simple time slot analysis
    return {
      morningEvents: events.filter(e => this.isEventInMorning(e)).length,
      afternoonEvents: events.filter(e => this.isEventInAfternoon(e)).length,
      eveningEvents: events.filter(e => this.isEventInEvening(e)).length
    };
  }

  private isEventInMorning(event: CalendarEvent): boolean {
    const startDate = this.getEventStartDate(event);
    return startDate ? startDate.getHours() < 12 : false;
  }

  private isEventInAfternoon(event: CalendarEvent): boolean {
    const startDate = this.getEventStartDate(event);
    return startDate ? startDate.getHours() >= 12 && startDate.getHours() < 18 : false;
  }

  private isEventInEvening(event: CalendarEvent): boolean {
    const startDate = this.getEventStartDate(event);
    return startDate ? startDate.getHours() >= 18 : false;
  }
}

export default IntelligentSuggestionService;