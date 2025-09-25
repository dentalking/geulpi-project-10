// SmartSuggestionService - Server-side service for generating intelligent suggestions

import { CalendarEvent } from '@/types';
import { format, isToday, isTomorrow, isThisWeek, addDays, startOfDay, endOfDay, isSameDay, endOfWeek, addWeeks } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SuggestionContext {
  currentEvents: CalendarEvent[];
  selectedDate?: Date;
  selectedEvent?: CalendarEvent;
  userProfile?: any;
  recentMessages?: any[];
  lastAction?: string;
  viewMode?: 'day' | 'week' | 'month' | 'list';
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  locale: 'ko' | 'en';
}

export interface SmartSuggestion {
  id: string;
  text: string;
  type: 'create' | 'modify' | 'view' | 'analyze' | 'image' | 'friend';
  priority: number; // 1-10 (높을수록 우선순위)
  context: any;
  action?: 'direct_execute' | 'requires_input' | 'navigation';
  data?: any; // 실행에 필요한 데이터
}

export class SmartSuggestionService {
  private locale: 'ko' | 'en';
  private genAI: GoogleGenerativeAI | null = null;

  constructor(locale: 'ko' | 'en' = 'ko') {
    this.locale = locale;

    // Initialize Gemini AI (optional, fallback to rule-based if not available)
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * 메인 제안 생성 함수 - 심플하고 스마트하게
   */
  async generateSmartSuggestions(context: SuggestionContext): Promise<SmartSuggestion[]> {
    // Gemini가 사용 가능하면 AI 기반 제안을 우선
    if (this.genAI) {
      try {
        const suggestions = await this.generateGeminiContextualSuggestions(context);
        if (suggestions.length > 0) {
          return suggestions;
        }
      } catch (error) {
        console.warn('[SmartSuggestionService] Gemini suggestions failed, using fallback:', error);
      }
    }

    // Fallback: 간단한 규칙 기반 제안
    return this.getSimpleFallbackSuggestions(context);
  }

  /**
   * 규칙 기반 제안 생성 (기존 로직)
   */
  private getRuleBasedSuggestions(context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // 1. 컨텍스트 기반 제안
    suggestions.push(...this.getContextBasedSuggestions(context));

    // 2. 시간 기반 제안
    suggestions.push(...this.getTimeBasedSuggestions(context));

    // 3. 이벤트 기반 제안
    suggestions.push(...this.getEventBasedSuggestions(context));

    // 4. 멀티모달 제안
    suggestions.push(...this.getMultimodalSuggestions(context));

    // 5. 친구/협업 제안
    suggestions.push(...this.getFriendSuggestions(context));

    // 우선순위별 정렬 및 상위 5개 선택
    return suggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);
  }

  /**
   * Gemini AI를 활용한 컨텍스트 기반 제안 생성 - 심플 버전
   */
  private async generateGeminiContextualSuggestions(context: SuggestionContext): Promise<SmartSuggestion[]> {
    if (!this.genAI) {
      return [];
    }

    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 전체 컨텍스트를 자연스럽게 전달
    const prompt = `
    당신은 캘린더 앱의 AI 도우미입니다. 사용자의 일정과 대화 맥락을 바탕으로 유용한 제안을 생성해주세요.

    === 현재 상황 ===
    현재 시간: ${new Date().toLocaleString('ko-KR')}
    언어: ${this.locale === 'ko' ? '한국어' : 'English'}

    === 사용자 일정 (${context.currentEvents?.length || 0}개) ===
    ${this.formatEventsForGemini(context.currentEvents)}

    === 최근 대화 맥락 ===
    ${this.formatMessagesForGemini(context.recentMessages)}

    === 중요 고려사항 ===
    1. 대화 맥락에서 언급된 날짜나 일정과 관련된 제안을 우선시
    2. 사용자가 이미 등록한 미래 일정(특히 11월 등 원거리 일정)과 관련된 제안도 포함
    3. 대화의 흐름을 자연스럽게 이어갈 수 있는 제안
    4. 사용자가 방금 한 질문이나 작업의 연관 작업 제안

    === 사용자가 해야 할 다음 액션 ===
    사용자가 일정을 CRUD하거나 확인하기 위해 필요한 5개의 구체적이고 실행 가능한 제안을 만들어주세요.
    각 제안은 한 문장으로, 구체적이고 액션 지향적이어야 합니다.
    대화 맥락과 저장된 일정을 고려하여 가장 관련성 높은 제안을 만드세요.

    JSON 형식으로 응답:
    [
      {
        "text": "제안 내용",
        "type": "create|modify|view|analyze|image|friend",
        "priority": 1-10,
        "reason": "왜 이 제안이 유용한지"
      }
    ]
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // JSON 파싱
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((item: any, index: number) => ({
          id: `gemini-${Date.now()}-${index}`,
          text: item.text,
          type: item.type || 'view',
          priority: item.priority || 5,
          context: { reason: item.reason },
          action: 'requires_input' as const
        }));
      }
    } catch (error) {
      console.error('Gemini suggestion generation error:', error);
    }

    return [];
  }

  /**
   * 이벤트를 Gemini에게 전달하기 위한 포맷팅
   */
  private formatEventsForGemini(events: CalendarEvent[]): string {
    if (!events || events.length === 0) {
      return '일정이 없습니다.';
    }

    const today = new Date();

    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => {
      const dateA = new Date(a.start?.dateTime || a.start?.date || '');
      const dateB = new Date(b.start?.dateTime || b.start?.date || '');
      return dateA.getTime() - dateB.getTime();
    });

    // Include today's events, upcoming events, and important future events
    const relevantEvents = sortedEvents.filter(e => {
      const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
      return eventDate >= today;
    });

    // Group by month for better context
    const eventsByMonth = new Map<string, CalendarEvent[]>();
    relevantEvents.forEach(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      const monthKey = format(eventDate, 'yyyy년 M월');
      if (!eventsByMonth.has(monthKey)) {
        eventsByMonth.set(monthKey, []);
      }
      eventsByMonth.get(monthKey)!.push(event);
    });

    // Format with month headers
    let result: string[] = [];
    for (const [month, monthEvents] of eventsByMonth.entries()) {
      result.push(`\n[${month}]`);
      monthEvents.slice(0, 5).forEach(event => {
        const dateStr = format(new Date(event.start?.dateTime || event.start?.date || ''), 'M월 d일 HH:mm');
        result.push(`- ${dateStr}: ${event.summary}`);
      });
      if (monthEvents.length > 5) {
        result.push(`  ... 그 외 ${monthEvents.length - 5}개 일정`);
      }
    }

    return result.join('\n') || '일정이 없습니다.';
  }

  /**
   * 메시지를 Gemini에게 전달하기 위한 포맷팅
   */
  private formatMessagesForGemini(messages?: any[]): string {
    if (!messages || messages.length === 0) {
      return '대화 시작 전입니다.';
    }

    return messages.slice(-5).map(msg =>
      `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`
    ).join('\n');
  }

  /**
   * 간단한 fallback 제안 - 개인화된 제안 생성
   */
  private getSimpleFallbackSuggestions(context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const now = new Date();
    const events = context.currentEvents || [];

    // 오늘 일정 분석
    const todayEvents = events.filter(e => {
      const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
      return eventDate.toDateString() === now.toDateString();
    });

    // 미래 일정 분석
    const upcomingEvents = events.filter(e => {
      const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
      return eventDate > now;
    }).sort((a, b) => {
      const dateA = new Date(a.start?.dateTime || a.start?.date || '');
      const dateB = new Date(b.start?.dateTime || b.start?.date || '');
      return dateA.getTime() - dateB.getTime();
    });

    // 월별 일정 분석 (현재 저장된 모든 일정 포함)
    const eventsByMonth = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      const monthKey = format(eventDate, 'yyyy-MM');
      if (!eventsByMonth.has(monthKey)) {
        eventsByMonth.set(monthKey, []);
      }
      eventsByMonth.get(monthKey)!.push(event);
    });

    // 개인화된 제안들 생성
    if (events.length > 0) {
      // 제목이 "미정"인 일정이 있는 경우
      const untitledEvents = events.filter(e => e.summary === '미정' || !e.summary || e.summary === 'Untitled');
      if (untitledEvents.length > 0) {
        suggestions.push({
          id: 'complete-untitled',
          text: this.locale === 'ko' ?
            `미정 일정에 제목과 내용을 추가해 보세요.` :
            `Add titles to unnamed events`,
          type: 'modify',
          priority: 10,
          context: { events: untitledEvents },
          action: 'requires_input'
        });
      }

      // 오늘 일정이 있는 경우
      if (todayEvents.length > 0) {
        const nextEvent = todayEvents.find(e => {
          const eventTime = new Date(e.start?.dateTime || '');
          return eventTime > now;
        });

        if (nextEvent) {
          const eventTime = new Date(nextEvent.start?.dateTime || '');
          const timeDiff = eventTime.getTime() - now.getTime();
          const minutesUntil = Math.floor(timeDiff / (1000 * 60));

          suggestions.push({
            id: 'next-event-prep',
            text: this.locale === 'ko' ?
              `${minutesUntil}분 후 "${nextEvent.summary}" 준비하기` :
              `Prepare for "${nextEvent.summary}" in ${minutesUntil}min`,
            type: 'view',
            priority: 9,
            context: { event: nextEvent },
            action: 'direct_execute'
          });
        }
      } else {
        // 오늘 일정이 없는 경우
        suggestions.push({
          id: 'empty-today',
          text: this.locale === 'ko' ?
            '오늘의 할 일을 추가하고 우선순위를 정해보세요.' :
            'Add today\'s tasks and set priorities',
          type: 'create',
          priority: 8,
          context: {},
          action: 'requires_input'
        });
      }

      // 일정이 많은 날
      const busyDates = new Map<string, number>();
      events.forEach(e => {
        const date = new Date(e.start?.dateTime || e.start?.date || '').toDateString();
        busyDates.set(date, (busyDates.get(date) || 0) + 1);
      });

      const busyDay = Array.from(busyDates.entries()).find(([_, count]) => count >= 3);
      if (busyDay) {
        const busyDateObj = new Date(busyDay[0]);
        const dateStr = busyDateObj.toLocaleDateString(this.locale === 'ko' ? 'ko-KR' : 'en-US', {
          month: 'short',
          day: 'numeric'
        });
        suggestions.push({
          id: 'busy-day-summary',
          text: this.locale === 'ko' ?
            `${dateStr} 일정 (${busyDay[1]}개) 요약하기` :
            `Summarize ${dateStr} (${busyDay[1]} events)`,
          type: 'analyze',
          priority: 7,
          context: { date: busyDay[0], count: busyDay[1] },
          action: 'direct_execute'
        });
      }

      // 월별 일정 제안 (특히 미래 월에 일정이 있는 경우)
      for (const [monthKey, monthEvents] of eventsByMonth.entries()) {
        const [year, month] = monthKey.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1);

        // Skip past months
        if (monthDate < new Date(now.getFullYear(), now.getMonth())) {
          continue;
        }

        // Special suggestion for months with events (especially future months)
        if (monthEvents.length > 0 && monthDate > new Date(now.getFullYear(), now.getMonth() + 1)) {
          const monthName = this.locale === 'ko'
            ? `${parseInt(month)}월`
            : format(monthDate, 'MMMM');

          suggestions.push({
            id: `month-${monthKey}`,
            text: this.locale === 'ko' ?
              `${monthName} 일정 (${monthEvents.length}개) 자세히 보기` :
              `View ${monthName} schedule (${monthEvents.length} events)`,
            type: 'view',
            priority: 8,
            context: { monthKey, events: monthEvents },
            action: 'requires_input'
          });

          // For months with important events, suggest preparation
          const importantEvent = monthEvents.find(e =>
            e.summary?.includes('세미나') ||
            e.summary?.includes('Seminar') ||
            e.summary?.includes('컨퍼런스') ||
            e.summary?.includes('Conference')
          );

          if (importantEvent) {
            suggestions.push({
              id: `prepare-${monthKey}`,
              text: this.locale === 'ko' ?
                `${monthName} "${importantEvent.summary}" 준비 사항 확인` :
                `Check preparation for ${monthName} "${importantEvent.summary}"`,
              type: 'analyze',
              priority: 9,
              context: { event: importantEvent },
              action: 'requires_input'
            });
          }
        }
      }

      // 다음 주 일정 체크
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekEvents = events.filter(e => {
        const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
        return eventDate >= now && eventDate <= nextWeek;
      });

      if (nextWeekEvents.length > 0) {
        suggestions.push({
          id: 'week-overview',
          text: this.locale === 'ko' ?
            `이번 주 ${nextWeekEvents.length}개 일정 주간 보기로 확인` :
            `View ${nextWeekEvents.length} events in week view`,
          type: 'view',
          priority: 6,
          context: { events: nextWeekEvents },
          action: 'direct_execute'
        });
      }
    } else {
      // 일정이 없는 경우 기본 제안
      suggestions.push({
        id: 'add-first-event',
        text: this.locale === 'ko' ? '첫 일정을 추가해보세요' : 'Add your first event',
        type: 'create',
        priority: 10,
        context: {},
        action: 'requires_input'
      });
    }

    // 항상 유용한 제안들
    suggestions.push({
      id: 'photo-schedule',
      text: this.locale === 'ko' ? '📷 사진에서 일정 정보 추출하기' : '📷 Extract events from photo',
      type: 'image',
      priority: 5,
      context: {},
      action: 'requires_input'
    });

    suggestions.push({
      id: 'friend-schedule',
      text: this.locale === 'ko' ? '👥 친구와 미팅 일정 잡기' : '👥 Schedule meeting with friend',
      type: 'friend',
      priority: 4,
      context: {},
      action: 'requires_input'
    });

    suggestions.push({
      id: 'analyze-screenshot',
      text: this.locale === 'ko' ? '📱 회의 초대 스크린샷 분석하기' : '📱 Analyze meeting invitation screenshot',
      type: 'image',
      priority: 3,
      context: {},
      action: 'requires_input'
    });

    return suggestions.slice(0, 5);
  }

  /**
   * Gemini AI를 활용한 스마트 제안 생성 - 기존 복잡한 버전 (deprecated)
   */
  private async generateGeminiPoweredSuggestions(context: SuggestionContext): Promise<SmartSuggestion[]> {
    if (!this.genAI) return [];

    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // 현재 일정 요약
      const eventsContext = context.currentEvents.map(event => {
        const start = new Date(event.start?.dateTime || event.start?.date || '');
        return `- ${event.title} (${format(start, 'M/d HH:mm', { locale: this.locale === 'ko' ? ko : enUS })})`;
      }).join('\n');

      const prompt = this.locale === 'ko' ? `
당신은 캘린더 AI 어시스턴트입니다. 사용자의 현재 상황을 분석해서 도움이 되는 제안 5개를 만들어주세요.

현재 상황:
- 시간대: ${context.timeOfDay} (${context.timeOfDay === 'morning' ? '오전' : context.timeOfDay === 'afternoon' ? '오후' : '저녁'})
- 보기 모드: ${context.viewMode}
- 현재 일정 (${context.currentEvents.length}개):
${eventsContext || '등록된 일정이 없습니다.'}

다음 형식으로 5개의 제안을 만들어주세요. 각 제안은 한 줄로 작성하고, 사용자가 바로 클릭할 수 있는 자연스러운 문장으로 만드세요:

1. [일정 관련 제안]
2. [시간/날짜 관련 제안]
3. [분석/요약 관련 제안]
4. [멀티모달 관련 제안]
5. [편의 기능 관련 제안]

주의사항:
- 구체적이고 실행 가능한 제안만
- 현재 일정과 시간대를 고려
- 짧고 명확한 문장 (15자 내외)
` : `
You are a calendar AI assistant. Analyze the user's current situation and create 5 helpful suggestions.

Current situation:
- Time of day: ${context.timeOfDay}
- View mode: ${context.viewMode}
- Current events (${context.currentEvents.length}):
${eventsContext || 'No events scheduled.'}

Create 5 suggestions in the following format. Each suggestion should be one actionable sentence that users can click on:

1. [Schedule-related suggestion]
2. [Time/date-related suggestion]
3. [Analysis/summary-related suggestion]
4. [Multimodal-related suggestion]
5. [Convenience feature suggestion]

Requirements:
- Specific and actionable suggestions only
- Consider current schedule and time of day
- Short and clear phrases (around 15 characters)
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse AI response into SmartSuggestion objects
      const suggestions = this.parseGeminiSuggestions(response, context);

      console.log('[SmartSuggestionService] Generated Gemini suggestions:', suggestions.length);
      return suggestions;

    } catch (error) {
      console.error('Failed to generate Gemini suggestions:', error);
      return [];
    }
  }

  /**
   * Gemini 응답을 SmartSuggestion 객체로 파싱
   */
  private parseGeminiSuggestions(response: string, context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const lines = response.split('\n').filter(line => line.trim());

    lines.forEach((line, index) => {
      // Remove numbering and extract suggestion text
      const suggestionText = line.replace(/^\d+\.\s*/, '').replace(/^\[.*?\]\s*/, '').trim();

      if (suggestionText && suggestionText.length > 3) {
        suggestions.push({
          id: `gemini-${Date.now()}-${index}`,
          text: suggestionText,
          type: this.inferSuggestionType(suggestionText),
          priority: 8, // High priority for AI-generated suggestions
          context: {
            source: 'gemini',
            aiGenerated: true,
            timeOfDay: context.timeOfDay
          },
          action: 'requires_input'
        });
      }
    });

    return suggestions.slice(0, 5); // Ensure max 5 suggestions
  }

  /**
   * 제안 텍스트로부터 타입 추론
   */
  private inferSuggestionType(text: string): SmartSuggestion['type'] {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('추가') || lowerText.includes('생성') || lowerText.includes('add') || lowerText.includes('create')) {
      return 'create';
    }
    if (lowerText.includes('수정') || lowerText.includes('변경') || lowerText.includes('edit') || lowerText.includes('modify')) {
      return 'modify';
    }
    if (lowerText.includes('분석') || lowerText.includes('요약') || lowerText.includes('analyze') || lowerText.includes('summary')) {
      return 'analyze';
    }
    if (lowerText.includes('사진') || lowerText.includes('이미지') || lowerText.includes('photo') || lowerText.includes('image')) {
      return 'image';
    }
    if (lowerText.includes('친구') || lowerText.includes('friend') || lowerText.includes('협업') || lowerText.includes('collaboration')) {
      return 'friend';
    }

    return 'view'; // Default
  }

  /**
   * AI 응답 후 follow-up 제안 생성 - 심플 버전
   */
  async generateFollowUpSuggestions(
    aiResponse: any,
    context: SuggestionContext
  ): Promise<SmartSuggestion[]> {
    // AI 응답을 context에 추가
    const enhancedContext = {
      ...context,
      recentMessages: [
        ...(context.recentMessages || []),
        { role: 'assistant', content: aiResponse.message || aiResponse.content || '' }
      ]
    };

    // 같은 로직으로 제안 생성 (컨텍스트만 강화됨)
    return this.generateSmartSuggestions(enhancedContext);
  }

  /**
   * AI 응답 후 follow-up 제안 생성 - 기존 복잡한 버전 (deprecated)
   */
  async generateFollowUpSuggestionsOld(
    aiResponse: any,
    context: SuggestionContext
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    console.log('[SmartSuggestionService] generateFollowUpSuggestions called with:', {
      hasAIResponse: !!aiResponse,
      aiResponseKeys: aiResponse ? Object.keys(aiResponse) : [],
      messagePreview: aiResponse?.message?.substring(0, 100)
    });

    // 1. AI 응답 내용 깊은 분석
    const responseText = aiResponse.message || aiResponse.content || '';
    const analysis = await this.analyzeAIResponseDeep(responseText, context);

    // 2. AI가 언급한 날짜/이벤트 기반 제안
    if (analysis.mentionedDates.length > 0) {
      analysis.mentionedDates.forEach((date: Date) => {
        suggestions.push({
          id: 'mentioned-date-action',
          text: this.locale === 'ko'
            ? `📅 ${format(date, 'M월 d일')} 세부 일정 확인`
            : `📅 Check ${format(date, 'MMM d')} schedule`,
          type: 'view',
          priority: 10,
          context: { date },
          action: 'direct_execute',
          data: { date }
        });
      });
    }

    // 3. AI가 언급한 이벤트 기반 제안
    if (analysis.mentionedEvents.length > 0) {
      const firstEvent = analysis.mentionedEvents[0];
      suggestions.push({
        id: 'mentioned-event-modify',
        text: this.locale === 'ko'
          ? `✏️ "${firstEvent.summary}" 수정하기`
          : `✏️ Modify "${firstEvent.summary}"`,
        type: 'modify',
        priority: 9,
        context: { event: firstEvent },
        action: 'requires_input',
        data: { eventId: firstEvent.id }
      });
    }

    // 4. 주제별 맞춤 제안
    if (analysis.mainTopic === 'conflict') {
      suggestions.push({
        id: 'resolve-conflict',
        text: this.locale === 'ko'
          ? '🔄 일정 재조정 옵션 보기'
          : '🔄 View rescheduling options',
        type: 'modify',
        priority: 9,
        context: { topic: 'conflict' },
        action: 'direct_execute'
      });
    } else if (analysis.mainTopic === 'free_time') {
      suggestions.push({
        id: 'utilize-mentioned-free-time',
        text: this.locale === 'ko'
          ? '➕ 추천된 시간에 일정 추가'
          : '➕ Add event at suggested time',
        type: 'create',
        priority: 9,
        context: { topic: 'free_time' },
        action: 'requires_input'
      });
    } else if (analysis.mainTopic === 'busy_period') {
      suggestions.push({
        id: 'optimize-busy-period',
        text: this.locale === 'ko'
          ? '⚡ 바쁜 기간 최적화하기'
          : '⚡ Optimize busy period',
        type: 'analyze',
        priority: 8,
        context: { topic: 'busy_period' },
        action: 'direct_execute'
      });
    }

    // 5. 감정적 컨텍스트 기반 제안
    if (analysis.emotionalContext === 'stressed') {
      suggestions.push({
        id: 'add-break-time',
        text: this.locale === 'ko'
          ? '☕ 휴식 시간 추가하기'
          : '☕ Add break time',
        type: 'create',
        priority: 7,
        context: { emotion: 'stressed' },
        action: 'requires_input'
      });
    }

    // 6. 다음 액션 제안
    if (analysis.suggestedActions.length > 0) {
      analysis.suggestedActions.forEach((action: any, index: number) => {
        if (index < 2) { // 상위 2개만
          suggestions.push({
            id: `suggested-action-${index}`,
            text: action.text,
            type: action.type || 'view',
            priority: 8 - index,
            context: { suggestedAction: action },
            action: action.requiresInput ? 'requires_input' : 'direct_execute'
          });
        }
      });
    }

    // 7. 대화 진행도 기반 제안
    suggestions.push(...this.generateProgressiveSuggestions(analysis, context));

    // 8. 기존 구조화된 데이터 처리
    if (aiResponse.events && aiResponse.events.length > 0) {
      suggestions.push(...this.getEventCreationFollowUps(aiResponse.events, context));
    }

    // 중복 제거 및 우선순위 정렬
    const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
    const finalSuggestions = uniqueSuggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);

    console.log('[SmartSuggestionService] Generated follow-up suggestions:', {
      count: finalSuggestions.length,
      suggestions: finalSuggestions.map(s => s.text),
      analysis: {
        mainTopic: analysis.mainTopic,
        mentionedDates: analysis.mentionedDates.length,
        mentionedEvents: analysis.mentionedEvents.length
      }
    });

    return finalSuggestions;
  }

  /**
   * 컨텍스트 기반 제안 (현재 화면/상태 기반)
   */
  private getContextBasedSuggestions(context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const { selectedDate, selectedEvent, viewMode, currentEvents } = context;

    // 특정 날짜가 선택된 경우
    if (selectedDate) {
      const dateEvents = this.getEventsForDate(currentEvents, selectedDate);

      if (dateEvents.length === 0) {
        // 빈 날짜인 경우
        suggestions.push({
          id: 'empty-day-suggestions',
          text: this.locale === 'ko'
            ? `${format(selectedDate, 'M월 d일')} 일정 추가하기`
            : `Add event on ${format(selectedDate, 'MMM d')}`,
          type: 'create',
          priority: 9,
          context: { selectedDate },
          action: 'requires_input',
          data: { date: selectedDate }
        });
      } else {
        // 일정이 있는 경우
        suggestions.push({
          id: 'busy-day-optimization',
          text: this.locale === 'ko'
            ? `${format(selectedDate, 'M월 d일')} 일정 최적화하기`
            : `Optimize ${format(selectedDate, 'MMM d')} schedule`,
          type: 'analyze',
          priority: 7,
          context: { selectedDate, events: dateEvents },
          action: 'direct_execute'
        });
      }
    }

    // 특정 이벤트가 선택된 경우
    if (selectedEvent) {
      suggestions.push({
        id: 'selected-event-actions',
        text: this.locale === 'ko'
          ? `"${selectedEvent.summary}" 이벤트 수정하기`
          : `Modify "${selectedEvent.summary}" event`,
        type: 'modify',
        priority: 8,
        context: { selectedEvent },
        action: 'requires_input',
        data: { eventId: selectedEvent.id }
      });
    }

    return suggestions;
  }

  /**
   * 시간 기반 제안 (하루 중 시간, 요일 등)
   */
  private getTimeBasedSuggestions(context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const now = new Date();
    const { timeOfDay, currentEvents } = context;

    if (timeOfDay === 'morning') {
      // 아침: 오늘 일정 확인 및 계획
      const todayEvents = this.getEventsForDate(currentEvents, now);
      if (todayEvents.length > 0) {
        suggestions.push({
          id: 'morning-schedule-review',
          text: this.locale === 'ko'
            ? `오늘 일정 ${todayEvents.length}개 리뷰하기`
            : `Review today's ${todayEvents.length} events`,
          type: 'view',
          priority: 8,
          context: { todayEvents },
          action: 'direct_execute'
        });
      }

      // 주간 계획 제안
      suggestions.push({
        id: 'weekly-planning',
        text: this.locale === 'ko' ? '이번주 일정 계획하기' : 'Plan this week',
        type: 'view',
        priority: 6,
        context: { timeRange: 'week' },
        action: 'navigation'
      });
    }

    if (timeOfDay === 'evening') {
      // 저녁: 내일 준비 및 일정 확인
      const tomorrow = addDays(now, 1);
      const tomorrowEvents = this.getEventsForDate(currentEvents, tomorrow);

      suggestions.push({
        id: 'tomorrow-preparation',
        text: this.locale === 'ko'
          ? `내일 일정 ${tomorrowEvents.length}개 준비하기`
          : `Prepare for tomorrow's ${tomorrowEvents.length} events`,
        type: 'view',
        priority: 7,
        context: { tomorrowEvents },
        action: 'direct_execute'
      });
    }

    return suggestions;
  }

  /**
   * 이벤트 기반 제안 (현재 일정 상태 분석)
   */
  private getEventBasedSuggestions(context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const { currentEvents } = context;
    const now = new Date();

    // 다가오는 이벤트 분석
    const upcomingEvents = currentEvents.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      return eventDate > now && eventDate < addDays(now, 7);
    });

    // 연속 회의 감지
    const busyPeriods = this.detectBusyPeriods(currentEvents);
    if (busyPeriods.length > 0) {
      suggestions.push({
        id: 'busy-period-optimization',
        text: this.locale === 'ko'
          ? '연속 회의 사이 휴식 시간 추가하기'
          : 'Add breaks between consecutive meetings',
        type: 'create',
        priority: 8,
        context: { busyPeriods },
        action: 'direct_execute',
        data: { suggestedBreaks: busyPeriods }
      });
    }

    // 빈 시간 활용 제안
    const freeSlots = this.findFreeTimeSlots(currentEvents, now);
    if (freeSlots.length > 0) {
      const nextFreeSlot = freeSlots[0];
      suggestions.push({
        id: 'free-time-utilization',
        text: this.locale === 'ko'
          ? `${format(nextFreeSlot.start, 'HH:mm')} 빈 시간 활용하기`
          : `Use free time at ${format(nextFreeSlot.start, 'HH:mm')}`,
        type: 'create',
        priority: 6,
        context: { freeSlot: nextFreeSlot },
        action: 'requires_input',
        data: { timeSlot: nextFreeSlot }
      });
    }

    return suggestions;
  }

  /**
   * 멀티모달 제안 (이미지 업로드, OCR 등)
   */
  private getMultimodalSuggestions(context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // 이미지 기반 일정 추가 제안
    suggestions.push({
      id: 'image-event-extraction',
      text: this.locale === 'ko'
        ? '📷 사진에서 일정 정보 추출하기'
        : '📷 Extract schedule from photo',
      type: 'image',
      priority: 5,
      context: {},
      action: 'requires_input',
      data: { inputType: 'image' }
    });

    // 스크린샷 일정 분석 제안
    if (context.timeOfDay === 'morning' || context.timeOfDay === 'afternoon') {
      suggestions.push({
        id: 'screenshot-analysis',
        text: this.locale === 'ko'
          ? '📱 회의 초대 스크린샷 분석하기'
          : '📱 Analyze meeting invitation screenshot',
        type: 'image',
        priority: 4,
        context: {},
        action: 'requires_input',
        data: { inputType: 'screenshot', expectedContent: 'meeting_invitation' }
      });
    }

    return suggestions;
  }

  /**
   * 친구/협업 제안
   */
  private getFriendSuggestions(context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // 친구와 미팅 제안
    suggestions.push({
      id: 'friend-meeting',
      text: this.locale === 'ko'
        ? '👥 친구와 미팅 일정 잡기'
        : '👥 Schedule meeting with friend',
      type: 'friend',
      priority: 5,
      context: {},
      action: 'requires_input',
      data: { action: 'schedule_meeting' }
    });

    // 팀 미팅 최적화
    const teamEvents = context.currentEvents.filter(event =>
      event.attendees && event.attendees.length > 2
    );

    if (teamEvents.length > 0) {
      suggestions.push({
        id: 'team-optimization',
        text: this.locale === 'ko'
          ? '🏢 팀 미팅 시간 최적화하기'
          : '🏢 Optimize team meeting times',
        type: 'analyze',
        priority: 6,
        context: { teamEvents },
        action: 'direct_execute'
      });
    }

    return suggestions;
  }

  /**
   * 이벤트 생성 후 follow-up 제안
   */
  private getEventCreationFollowUps(events: CalendarEvent[], context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const latestEvent = events[events.length - 1];

    // 참석자 추가 제안
    suggestions.push({
      id: 'add-attendees',
      text: this.locale === 'ko'
        ? `"${latestEvent.summary}" 참석자 추가하기`
        : `Add attendees to "${latestEvent.summary}"`,
      type: 'modify',
      priority: 8,
      context: { event: latestEvent },
      action: 'requires_input',
      data: { eventId: latestEvent.id, action: 'add_attendees' }
    });

    // 리마인더 설정 제안
    suggestions.push({
      id: 'set-reminder',
      text: this.locale === 'ko'
        ? '⏰ 알림 설정하기'
        : '⏰ Set reminder',
      type: 'modify',
      priority: 7,
      context: { event: latestEvent },
      action: 'requires_input',
      data: { eventId: latestEvent.id, action: 'set_reminder' }
    });

    // 관련 이벤트 제안
    suggestions.push({
      id: 'related-events',
      text: this.locale === 'ko'
        ? '📅 관련 일정 더 만들기'
        : '📅 Create related events',
      type: 'create',
      priority: 6,
      context: { baseEvent: latestEvent },
      action: 'requires_input'
    });

    return suggestions;
  }

  /**
   * 분석 결과 후 follow-up 제안
   */
  private getAnalysisFollowUps(analysis: any, context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // 분석 기반 최적화 제안
    suggestions.push({
      id: 'optimize-based-on-analysis',
      text: this.locale === 'ko'
        ? '🔧 분석 결과로 일정 최적화하기'
        : '🔧 Optimize schedule based on analysis',
      type: 'modify',
      priority: 8,
      context: { analysis },
      action: 'direct_execute'
    });

    // 패턴 기반 제안
    suggestions.push({
      id: 'pattern-suggestions',
      text: this.locale === 'ko'
        ? '🔍 비슷한 패턴 찾아보기'
        : '🔍 Find similar patterns',
      type: 'analyze',
      priority: 6,
      context: { analysis },
      action: 'direct_execute'
    });

    return suggestions;
  }

  /**
   * 친구 액션 후 follow-up 제안
   */
  private getFriendActionFollowUps(friendAction: any, context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    if (friendAction.success) {
      // 성공한 친구 액션 후 제안
      suggestions.push({
        id: 'friend-success-followup',
        text: this.locale === 'ko'
          ? '✅ 더 많은 친구와 일정 공유하기'
          : '✅ Share schedule with more friends',
        type: 'friend',
        priority: 7,
        context: { friendAction },
        action: 'requires_input'
      });
    }

    return suggestions;
  }

  /**
   * AI 응답 깊은 분석 (개선된 버전)
   */
  private async analyzeAIResponseDeep(responseText: string, context: SuggestionContext): Promise<any> {
    // 기본 분석
    const basicAnalysis = this.analyzeAIResponse(responseText, context);

    // 실제 언급된 날짜 추출
    const mentionedDates = this.extractMentionedDates(responseText);

    // 실제 언급된 이벤트 추출
    const mentionedEvents = this.extractMentionedEvents(responseText, context.currentEvents);

    // 주제 분석
    const mainTopic = this.detectMainTopic(responseText);

    // 감정적 컨텍스트
    const emotionalContext = this.detectEmotionalContext(responseText);

    // 다음 액션 추론
    const suggestedActions = this.inferNextActions(responseText, mainTopic);

    return {
      ...basicAnalysis,
      mainTopic,
      mentionedDates,
      mentionedEvents,
      emotionalContext,
      suggestedActions
    };
  }

  /**
   * AI 응답 내용 분석 (Recursive Prompting의 핵심)
   */
  private analyzeAIResponse(responseText: string, context: SuggestionContext): any {
    const analysis = {
      keywords: this.extractKeywords(responseText),
      intent: this.detectIntent(responseText),
      entities: this.extractEntities(responseText),
      actionContext: this.detectActionContext(responseText),
      emotionalTone: this.detectTone(responseText),
      suggestions: this.extractSuggestedActions(responseText)
    };

    return analysis;
  }

  /**
   * 날짜 추출 (개선된 버전)
   */
  private extractMentionedDates(text: string): Date[] {
    const dates: Date[] = [];
    const now = new Date();

    // 특정 날짜 패턴
    const patterns = [
      /(\d{1,2})월\s*(\d{1,2})일/g,
      /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g,
      /(\d{1,2})\/(\d{1,2})/g,
      /(\d{4})-(\d{2})-(\d{2})/g
    ];

    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        try {
          let date: Date;
          if (match[0].includes('년')) {
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          } else if (match[0].includes('월')) {
            date = new Date(now.getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]));
          } else if (match[0].includes('-')) {
            date = new Date(match[0]);
          } else {
            date = new Date(now.getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]));
          }
          if (!isNaN(date.getTime())) {
            dates.push(date);
          }
        } catch (e) {
          // Invalid date, skip
        }
      }
    });

    // 상대적 날짜
    if (text.includes('내일') || text.toLowerCase().includes('tomorrow')) {
      dates.push(addDays(now, 1));
    }
    if (text.includes('모레') || text.toLowerCase().includes('day after tomorrow')) {
      dates.push(addDays(now, 2));
    }
    if (text.includes('다음주') || text.toLowerCase().includes('next week')) {
      dates.push(addDays(now, 7));
    }

    return dates;
  }

  /**
   * 언급된 이벤트 추출
   */
  private extractMentionedEvents(text: string, currentEvents: CalendarEvent[]): CalendarEvent[] {
    const mentionedEvents: CalendarEvent[] = [];

    currentEvents.forEach(event => {
      if (event.summary && text.includes(event.summary)) {
        mentionedEvents.push(event);
      }
    });

    return mentionedEvents;
  }

  /**
   * 주제 감지
   */
  private detectMainTopic(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('겹치') || lowerText.includes('충돌') || lowerText.includes('conflict')) {
      return 'conflict';
    }
    if (lowerText.includes('비어') || lowerText.includes('여유') || lowerText.includes('free')) {
      return 'free_time';
    }
    if (lowerText.includes('바쁘') || lowerText.includes('많이') || lowerText.includes('busy')) {
      return 'busy_period';
    }
    if (lowerText.includes('마감') || lowerText.includes('deadline') || lowerText.includes('due')) {
      return 'deadline';
    }
    if (lowerText.includes('회의') || lowerText.includes('미팅') || lowerText.includes('meeting')) {
      return 'meeting';
    }

    return 'general';
  }

  /**
   * 감정적 컨텍스트 감지
   */
  private detectEmotionalContext(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('힘들') || lowerText.includes('스트레스') || lowerText.includes('stressed')) {
      return 'stressed';
    }
    if (lowerText.includes('좋') || lowerText.includes('완벽') || lowerText.includes('great')) {
      return 'positive';
    }
    if (lowerText.includes('급') || lowerText.includes('urgent') || lowerText.includes('asap')) {
      return 'urgent';
    }

    return 'neutral';
  }

  /**
   * 다음 액션 추론
   */
  private inferNextActions(text: string, mainTopic: string): any[] {
    const actions: any[] = [];

    if (mainTopic === 'conflict') {
      actions.push({
        text: this.locale === 'ko' ? '충돌하는 일정 조정하기' : 'Adjust conflicting events',
        type: 'modify',
        requiresInput: true
      });
    }

    if (mainTopic === 'free_time') {
      actions.push({
        text: this.locale === 'ko' ? '빈 시간에 일정 추가하기' : 'Add event to free slot',
        type: 'create',
        requiresInput: true
      });
    }

    if (mainTopic === 'busy_period') {
      actions.push({
        text: this.locale === 'ko' ? '우선순위 낮은 일정 재조정' : 'Reschedule low priority events',
        type: 'modify',
        requiresInput: false
      });
    }

    return actions;
  }

  /**
   * 키워드 추출 (일정 관련 핵심 키워드)
   */
  private extractKeywords(text: string): string[] {
    const keywords = [];
    const lowerText = text.toLowerCase();

    // 시간 관련 키워드
    const timeKeywords = ['내일', 'tomorrow', '오늘', 'today', '이번주', 'this week', '다음주', 'next week', '오전', 'morning', '오후', 'afternoon', '저녁', 'evening'];
    timeKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) keywords.push(keyword);
    });

    // 일정 관련 키워드
    const scheduleKeywords = ['회의', 'meeting', '일정', 'schedule', '약속', 'appointment', '미팅', '계획', 'plan', '이벤트', 'event'];
    scheduleKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) keywords.push(keyword);
    });

    // 상태 키워드
    const statusKeywords = ['비어있', 'free', '바쁘', 'busy', '겹치', 'conflict', '가능', 'available'];
    statusKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) keywords.push(keyword);
    });

    return keywords;
  }

  /**
   * 의도 감지
   */
  private detectIntent(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('비어있') || lowerText.includes('free') || lowerText.includes('available')) {
      return 'schedule_free_time';
    }
    if (lowerText.includes('겹치') || lowerText.includes('conflict') || lowerText.includes('바쁘')) {
      return 'resolve_conflict';
    }
    if (lowerText.includes('추천') || lowerText.includes('suggest') || lowerText.includes('제안')) {
      return 'get_suggestions';
    }
    if (lowerText.includes('계획') || lowerText.includes('plan') || lowerText.includes('준비')) {
      return 'plan_ahead';
    }
    if (lowerText.includes('정리') || lowerText.includes('organize') || lowerText.includes('관리')) {
      return 'organize_schedule';
    }

    return 'general_inquiry';
  }

  /**
   * 엔티티 추출 (날짜, 시간, 사람 등)
   */
  private extractEntities(text: string): any {
    const entities = {
      dates: [],
      times: [],
      people: [],
      activities: []
    };

    // 날짜 패턴 매칭
    const datePatterns = [
      /내일|tomorrow/gi,
      /오늘|today/gi,
      /\d{1,2}월\s*\d{1,2}일/g,
      /\d{1,2}\/\d{1,2}/g
    ];

    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) entities.dates.push(...matches);
    });

    // 시간 패턴
    const timePatterns = [
      /\d{1,2}:\d{2}/g,
      /오전|오후|morning|afternoon|evening/gi
    ];

    timePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) entities.times.push(...matches);
    });

    return entities;
  }

  /**
   * 액션 컨텍스트 감지
   */
  private detectActionContext(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('추가') || lowerText.includes('add') || lowerText.includes('생성')) {
      return 'create';
    }
    if (lowerText.includes('수정') || lowerText.includes('edit') || lowerText.includes('변경')) {
      return 'update';
    }
    if (lowerText.includes('삭제') || lowerText.includes('delete') || lowerText.includes('취소')) {
      return 'delete';
    }
    if (lowerText.includes('확인') || lowerText.includes('check') || lowerText.includes('보기')) {
      return 'view';
    }

    return 'none';
  }

  /**
   * 감정적 톤 감지
   */
  private detectTone(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('걱정') || lowerText.includes('문제') || lowerText.includes('어려움')) {
      return 'concerned';
    }
    if (lowerText.includes('좋') || lowerText.includes('완벽') || lowerText.includes('great')) {
      return 'positive';
    }
    if (lowerText.includes('바쁘') || lowerText.includes('급') || lowerText.includes('urgent')) {
      return 'urgent';
    }

    return 'neutral';
  }

  /**
   * 제안된 액션 추출
   */
  private extractSuggestedActions(text: string): string[] {
    const actions = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('계획') || lowerText.includes('plan')) {
      actions.push('planning');
    }
    if (lowerText.includes('휴식') || lowerText.includes('rest') || lowerText.includes('개인시간')) {
      actions.push('personal_time');
    }
    if (lowerText.includes('운동') || lowerText.includes('exercise')) {
      actions.push('exercise');
    }
    if (lowerText.includes('친구') || lowerText.includes('friend') || lowerText.includes('사람')) {
      actions.push('social');
    }

    return actions;
  }

  /**
   * 컨텐츠 기반 제안 생성
   */
  private generateContentBasedSuggestions(analysis: any, context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // 자유 시간 관련 응답인 경우
    if (analysis.intent === 'schedule_free_time') {
      suggestions.push({
        id: 'schedule-personal-time',
        text: this.locale === 'ko'
          ? '🧘‍♀️ 개인 시간 블록킹하기'
          : '🧘‍♀️ Block personal time',
        type: 'create',
        priority: 9,
        context: { intent: analysis.intent },
        action: 'requires_input'
      });

      suggestions.push({
        id: 'schedule-exercise',
        text: this.locale === 'ko'
          ? '💪 운동 일정 추가하기'
          : '💪 Add exercise schedule',
        type: 'create',
        priority: 8,
        context: { intent: analysis.intent },
        action: 'requires_input'
      });

      if (analysis.entities.dates.some(d => d.includes('내일') || d.includes('tomorrow'))) {
        suggestions.push({
          id: 'tomorrow-planning',
          text: this.locale === 'ko'
            ? '📝 내일 할 일 목록 작성'
            : '📝 Create tomorrow\'s todo list',
          type: 'create',
          priority: 9,
          context: { date: 'tomorrow' },
          action: 'requires_input'
        });
      }
    }

    // 계획 관련 응답인 경우
    if (analysis.intent === 'plan_ahead') {
      suggestions.push({
        id: 'detailed-planning',
        text: this.locale === 'ko'
          ? '📋 세부 계획 세우기'
          : '📋 Create detailed plan',
        type: 'create',
        priority: 9,
        context: { intent: analysis.intent },
        action: 'requires_input'
      });

      suggestions.push({
        id: 'set-reminders',
        text: this.locale === 'ko'
          ? '⏰ 미리 알림 설정하기'
          : '⏰ Set up reminders',
        type: 'create',
        priority: 8,
        context: { intent: analysis.intent },
        action: 'requires_input'
      });
    }

    return suggestions;
  }

  /**
   * Progressive 제안 생성 (대화 깊이에 따른)
   */
  private generateProgressiveSuggestions(analysis: any, context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // 메시지 히스토리 길이에 따른 progressive suggestions
    const messageCount = context.recentMessages?.length || 0;

    if (messageCount > 2) {
      // 깊은 대화에서는 더 구체적인 액션 제안
      suggestions.push({
        id: 'specific-time-suggestion',
        text: this.locale === 'ko'
          ? '⏱️ 구체적인 시간 정하기'
          : '⏱️ Set specific time',
        type: 'create',
        priority: 8,
        context: { progressive: true, depth: messageCount },
        action: 'requires_input'
      });
    }

    if (messageCount > 4) {
      // 매우 깊은 대화에서는 실행 준비 제안
      suggestions.push({
        id: 'ready-to-schedule',
        text: this.locale === 'ko'
          ? '✅ 지금 일정 확정하기'
          : '✅ Confirm schedule now',
        type: 'create',
        priority: 10,
        context: { progressive: true, depth: messageCount },
        action: 'direct_execute'
      });
    }

    return suggestions;
  }

  /**
   * 액션 지향적 제안 생성
   */
  private generateActionOrientedSuggestions(analysis: any, context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // 키워드 기반 액션 제안
    if (analysis.keywords.includes('친구') || analysis.keywords.includes('friend')) {
      suggestions.push({
        id: 'invite-friends',
        text: this.locale === 'ko'
          ? '👥 친구들과 시간 맞춰보기'
          : '👥 Coordinate with friends',
        type: 'friend',
        priority: 8,
        context: { keyword: 'friend' },
        action: 'requires_input'
      });
    }

    if (analysis.keywords.includes('회의') || analysis.keywords.includes('meeting')) {
      suggestions.push({
        id: 'meeting-prep',
        text: this.locale === 'ko'
          ? '📋 회의 준비 체크리스트'
          : '📋 Meeting preparation checklist',
        type: 'create',
        priority: 8,
        context: { keyword: 'meeting' },
        action: 'requires_input'
      });
    }

    // 감정적 톤에 따른 제안
    if (analysis.emotionalTone === 'urgent') {
      suggestions.push({
        id: 'urgent-scheduling',
        text: this.locale === 'ko'
          ? '🚨 급한 일정 우선 처리'
          : '🚨 Handle urgent items first',
        type: 'modify',
        priority: 10,
        context: { tone: 'urgent' },
        action: 'direct_execute'
      });
    }

    return suggestions;
  }

  /**
   * 일반적인 follow-up 제안
   */
  private getGeneralFollowUps(aiResponse: any, context: SuggestionContext): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // 더 자세한 정보 요청
    suggestions.push({
      id: 'more-details',
      text: this.locale === 'ko'
        ? '💬 더 자세히 설명해줘'
        : '💬 Tell me more details',
      type: 'view',
      priority: 5,
      context: { lastResponse: aiResponse },
      action: 'direct_execute'
    });

    // 다른 옵션 제안
    suggestions.push({
      id: 'alternative-options',
      text: this.locale === 'ko'
        ? '🔄 다른 옵션 보여줘'
        : '🔄 Show other options',
      type: 'view',
      priority: 4,
      context: { lastResponse: aiResponse },
      action: 'direct_execute'
    });

    return suggestions;
  }

  // 유틸리티 메서드들
  private getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
    return events.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      return eventDate.toDateString() === date.toDateString();
    });
  }

  private detectBusyPeriods(events: CalendarEvent[]): any[] {
    // 연속 회의 감지 로직
    const sortedEvents = events
      .filter(e => e.start?.dateTime)
      .sort((a, b) => new Date(a.start!.dateTime!).getTime() - new Date(b.start!.dateTime!).getTime());

    const busyPeriods = [];
    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const current = sortedEvents[i];
      const next = sortedEvents[i + 1];

      const currentEnd = new Date(current.end?.dateTime || '');
      const nextStart = new Date(next.start?.dateTime || '');

      const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

      if (gapMinutes < 15) { // 15분 미만 간격은 바쁜 시간으로 판단
        busyPeriods.push({
          start: new Date(current.start!.dateTime!),
          end: new Date(next.end?.dateTime || ''),
          events: [current, next]
        });
      }
    }

    return busyPeriods;
  }

  private findFreeTimeSlots(events: CalendarEvent[], fromDate: Date): any[] {
    // 빈 시간 슬롯 찾기 로직
    const today = startOfDay(fromDate);
    const endOfToday = endOfDay(fromDate);

    const todayEvents = events.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      return eventDate >= today && eventDate <= endOfToday;
    }).sort((a, b) => new Date(a.start!.dateTime!).getTime() - new Date(b.start!.dateTime!).getTime());

    const freeSlots = [];
    let currentTime = new Date(Math.max(fromDate.getTime(), today.getTime()));

    for (const event of todayEvents) {
      const eventStart = new Date(event.start?.dateTime || '');
      if (eventStart > currentTime) {
        const slotDuration = (eventStart.getTime() - currentTime.getTime()) / (1000 * 60);
        if (slotDuration >= 30) { // 30분 이상의 빈 시간만 제안
          freeSlots.push({
            start: new Date(currentTime),
            end: new Date(eventStart),
            duration: slotDuration
          });
        }
      }
      currentTime = new Date(event.end?.dateTime || eventStart);
    }

    return freeSlots.slice(0, 3); // 최대 3개의 빈 시간 슬롯
  }

  /**
   * 캘린더 이벤트 깊은 분석
   */
  private analyzeCalendarEvents(events: CalendarEvent[]): any {
    const now = new Date();
    const today = startOfDay(now);
    const thisWeek = endOfWeek(now);
    const nextWeek = addWeeks(thisWeek, 1);

    return {
      todayEvents: events.filter(e => {
        const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
        return isSameDay(eventDate, today);
      }),
      thisWeekEvents: events.filter(e => {
        const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
        return eventDate >= today && eventDate <= thisWeek;
      }),
      nextWeekEvents: events.filter(e => {
        const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
        return eventDate > thisWeek && eventDate <= nextWeek;
      }),
      recurringEvents: this.findRecurringPatterns(events),
      busyDays: this.identifyBusyDays(events),
      freeTimeSlots: this.findFreeTimeSlots(events, now),
      upcomingDeadlines: this.findUpcomingDeadlines(events),
      collaborators: this.extractCollaborators(events)
    };
  }

  /**
   * 캘린더 기반 깊은 제안 생성
   */
  private getDeepCalendarSuggestions(context: SuggestionContext, analysis: any): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const { locale } = context;

    // 오늘 일정 기반
    if (analysis.todayEvents.length === 0) {
      suggestions.push({
        id: 'empty-today-schedule',
        text: locale === 'ko'
          ? '📅 오늘은 비어있어요. 개인 프로젝트 시간 추가하기'
          : '📅 Today is free. Add time for personal projects',
        type: 'create',
        priority: 9,
        context: { date: new Date() },
        action: 'requires_input'
      });
    } else if (analysis.todayEvents.length > 5) {
      const nextEvent = analysis.todayEvents.find((e: CalendarEvent) =>
        new Date(e.start?.dateTime || '') > new Date()
      );
      if (nextEvent) {
        suggestions.push({
          id: 'busy-day-next',
          text: locale === 'ko'
            ? `⚡ 다음 일정 "${nextEvent.summary}" 준비하기`
            : `⚡ Prepare for "${nextEvent.summary}"`,
          type: 'view',
          priority: 10,
          context: { event: nextEvent },
          action: 'direct_execute'
        });
      }
    }

    // 이번주 패턴 기반
    if (analysis.busyDays.length >= 3) {
      suggestions.push({
        id: 'busy-week-optimization',
        text: locale === 'ko'
          ? '🔄 이번주 일정이 많아요. 우선순위 재정리하기'
          : '🔄 Busy week ahead. Reorganize priorities',
        type: 'analyze',
        priority: 8,
        context: { weekAnalysis: analysis },
        action: 'direct_execute'
      });
    }

    // 빈 시간 활용
    if (analysis.freeTimeSlots.length > 0) {
      const bestSlot = analysis.freeTimeSlots[0];
      suggestions.push({
        id: 'utilize-free-time',
        text: locale === 'ko'
          ? `⏰ ${format(bestSlot.start, 'HH:mm')} - ${format(bestSlot.end, 'HH:mm')} 빈 시간 활용하기`
          : `⏰ Use free time ${format(bestSlot.start, 'HH:mm')} - ${format(bestSlot.end, 'HH:mm')}`,
        type: 'create',
        priority: 7,
        context: { timeSlot: bestSlot },
        action: 'requires_input',
        data: { start: bestSlot.start, end: bestSlot.end }
      });
    }

    // 반복 패턴 발견
    if (analysis.recurringEvents.length > 0) {
      suggestions.push({
        id: 'recurring-pattern-found',
        text: locale === 'ko'
          ? '🔁 반복 패턴 발견. 정기 일정으로 설정하기'
          : '🔁 Pattern detected. Set as recurring event',
        type: 'modify',
        priority: 6,
        context: { patterns: analysis.recurringEvents },
        action: 'requires_input'
      });
    }

    // 협업자 기반
    if (analysis.collaborators.length > 0) {
      const topCollaborator = analysis.collaborators[0];
      suggestions.push({
        id: 'collaborate-with-frequent',
        text: locale === 'ko'
          ? `👥 ${topCollaborator.name}와 다음 미팅 잡기`
          : `👥 Schedule next meeting with ${topCollaborator.name}`,
        type: 'friend',
        priority: 6,
        context: { collaborator: topCollaborator },
        action: 'requires_input'
      });
    }

    return suggestions;
  }

  /**
   * 중복 제거 함수
   */
  private deduplicateSuggestions(suggestions: SmartSuggestion[]): SmartSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(s => {
      const key = `${s.type}-${s.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * 반복 패턴 찾기
   */
  private findRecurringPatterns(events: CalendarEvent[]): any[] {
    // 제목이 비슷하고 시간이 일정한 패턴 찾기
    const patterns: any[] = [];
    const eventGroups = new Map<string, CalendarEvent[]>();

    events.forEach(event => {
      const key = event.summary?.toLowerCase().replace(/[0-9]/g, '').trim() || '';
      if (!eventGroups.has(key)) {
        eventGroups.set(key, []);
      }
      eventGroups.get(key)?.push(event);
    });

    eventGroups.forEach((group, key) => {
      if (group.length >= 3) {
        patterns.push({
          title: key,
          count: group.length,
          events: group
        });
      }
    });

    return patterns;
  }

  /**
   * 바쁜 날 식별
   */
  private identifyBusyDays(events: CalendarEvent[]): Date[] {
    const dayEventCount = new Map<string, number>();

    events.forEach(event => {
      const date = new Date(event.start?.dateTime || event.start?.date || '');
      const dayKey = format(date, 'yyyy-MM-dd');
      dayEventCount.set(dayKey, (dayEventCount.get(dayKey) || 0) + 1);
    });

    const busyDays: Date[] = [];
    dayEventCount.forEach((count, dayKey) => {
      if (count >= 3) {
        busyDays.push(new Date(dayKey));
      }
    });

    return busyDays;
  }

  /**
   * 다가오는 마감일 찾기
   */
  private findUpcomingDeadlines(events: CalendarEvent[]): CalendarEvent[] {
    const keywords = ['deadline', '마감', 'due', '제출', 'submit', '완료'];
    return events.filter(event => {
      const title = event.summary?.toLowerCase() || '';
      return keywords.some(keyword => title.includes(keyword));
    });
  }

  /**
   * 협업자 추출
   */
  private extractCollaborators(events: CalendarEvent[]): any[] {
    const collaboratorCount = new Map<string, number>();

    events.forEach(event => {
      event.attendees?.forEach(attendee => {
        if (attendee.email) {
          collaboratorCount.set(
            attendee.email,
            (collaboratorCount.get(attendee.email) || 0) + 1
          );
        }
      });
    });

    return Array.from(collaboratorCount.entries())
      .map(([email, count]) => ({ email, count, name: email.split('@')[0] }))
      .sort((a, b) => b.count - a.count);
  }
}

// Default export for compatibility
export default SmartSuggestionService;