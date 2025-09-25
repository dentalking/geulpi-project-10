import { CalendarEvent } from '@/types';
import { addHours, addDays, addMinutes, setHours, setMinutes, format } from 'date-fns';
import { ko } from 'date-fns/locale';

export type ViewType = 'day' | 'week' | 'month' | 'line' | 'week-line' | 'flow';
export type CommandType = 'navigate' | 'create' | 'edit' | 'delete' | 'view' | 'search' | 'analyze';

export interface ChatContext {
  currentView: ViewType;
  selectedEvent?: CalendarEvent | null;
  selectedDate?: Date;
  events: CalendarEvent[];
}

export interface ChatCommand {
  type: CommandType;
  action: string;
  params: Record<string, any>;
  confidence: number;
}

export interface ChatResult {
  success: boolean;
  message: string;
  data?: any;
  updatedEvents?: CalendarEvent[];
  navigation?: {
    view?: ViewType;
    date?: Date;
  };
  animation?: {
    type: 'zoom' | 'slide' | 'fade';
    duration: number;
  };
}

export class UnifiedChatService {
  private static instance: UnifiedChatService;

  private patterns = {
    // 네비게이션 명령
    navigate: [
      /^(오늘|today)/i,
      /^(내일|tomorrow)/i,
      /^(다음|next)\s*(주|week)/i,
      /^(이전|prev|previous)\s*(주|week)/i,
      /^(\d+)월\s*(\d+)일/,
      /^(\d+)월로/,
    ],

    // 뷰 변경 명령
    view: [
      /^(일간|day|일간뷰|day view)/i,
      /^(주간|week|주간뷰|week view)/i,
      /^(월간|month|월간뷰|month view)/i,
      /^(라인|line|라인뷰|line view)/i,
      /^(플로우|flow|플로우뷰|flow view)/i,
    ],

    // 일정 생성 명령
    create: [
      /^"([^"]+)"\s*(오늘|내일|today|tomorrow)?(?:\s*(\d+)시)?(?:에)?\s*(?:추가|생성|만들기)/,
      /^(\d+)시에\s*"([^"]+)"\s*(?:추가|생성)/,
      /^새\s*일정\s*"([^"]+)"/,
    ],

    // 일정 편집 명령
    edit: [
      /^"([^"]+)"\s*(\d+)분\s*(?:연장|늘리기)/,
      /^"([^"]+)"\s*(\d+)시간\s*(?:연장|늘리기)/,
      /^"([^"]+)"\s*(\d+)(?:분|시간)?\s*(?:뒤로|미루기|연기)/,
      /^"([^"]+)"\s*(\d+)(?:분|시간)?\s*(?:앞으로|당기기)/,
      /^"([^"]+)"\s*(?:를|을)?\s*"([^"]+)"(?:로|으로)?\s*(?:변경|수정|바꾸기)/,
      /^선택된?\s*일정\s*(\d+)분\s*연장/,
    ],

    // 삭제 명령
    delete: [
      /^"([^"]+)"\s*(?:삭제|제거|지우기)/,
      /^선택된?\s*일정\s*(?:삭제|제거)/,
      /^오늘\s*일정\s*(?:모두|전부)?\s*(?:삭제|제거)/,
    ],

    // 검색 명령
    search: [
      /^"([^"]+)"\s*(?:검색|찾기|찾아)/,
      /^([^"]+)\s*관련\s*일정/,
      /^다음\s*([^"]+)/,
    ],

    // 분석 명령
    analyze: [
      /^오늘\s*(?:요약|정리|분석)/,
      /^이번\s*주\s*(?:요약|정리|분석)/,
      /^(?:빈|비어있는|free)\s*시간/,
      /^얼마나\s*(?:바쁜|일정|일)/,
    ],
  };

  private constructor() {}

  public static getInstance(): UnifiedChatService {
    if (!UnifiedChatService.instance) {
      UnifiedChatService.instance = new UnifiedChatService();
    }
    return UnifiedChatService.instance;
  }

  public async processCommand(input: string, context: ChatContext): Promise<ChatResult> {
    const command = this.parseCommand(input, context);

    if (!command) {
      return {
        success: false,
        message: '명령을 이해할 수 없습니다. 다시 시도해주세요.',
      };
    }

    return this.executeCommand(command, context);
  }

  private parseCommand(input: string, context: ChatContext): ChatCommand | null {
    const trimmed = input.trim();

    // 네비게이션 명령 처리
    for (const pattern of this.patterns.navigate) {
      const match = trimmed.match(pattern);
      if (match) {
        return this.createNavigationCommand(match, trimmed);
      }
    }

    // 뷰 변경 명령 처리
    for (const pattern of this.patterns.view) {
      const match = trimmed.match(pattern);
      if (match) {
        return this.createViewCommand(match, trimmed);
      }
    }

    // 일정 생성 명령 처리
    for (const pattern of this.patterns.create) {
      const match = trimmed.match(pattern);
      if (match) {
        return this.createEventCommand(match, trimmed, context);
      }
    }

    // 일정 편집 명령 처리
    for (const pattern of this.patterns.edit) {
      const match = trimmed.match(pattern);
      if (match) {
        return this.createEditCommand(match, trimmed, context);
      }
    }

    // 삭제 명령 처리
    for (const pattern of this.patterns.delete) {
      const match = trimmed.match(pattern);
      if (match) {
        return this.createDeleteCommand(match, trimmed, context);
      }
    }

    // 검색 명령 처리
    for (const pattern of this.patterns.search) {
      const match = trimmed.match(pattern);
      if (match) {
        return this.createSearchCommand(match, trimmed);
      }
    }

    // 분석 명령 처리
    for (const pattern of this.patterns.analyze) {
      const match = trimmed.match(pattern);
      if (match) {
        return this.createAnalyzeCommand(match, trimmed, context);
      }
    }

    return null;
  }

  private createNavigationCommand(match: RegExpMatchArray, input: string): ChatCommand {
    const command = input.toLowerCase();

    if (command.includes('오늘') || command.includes('today')) {
      return {
        type: 'navigate',
        action: 'go_to_today',
        params: { date: new Date() },
        confidence: 1.0,
      };
    }

    if (command.includes('내일') || command.includes('tomorrow')) {
      return {
        type: 'navigate',
        action: 'go_to_tomorrow',
        params: { date: addDays(new Date(), 1) },
        confidence: 1.0,
      };
    }

    if (command.includes('다음') && command.includes('주')) {
      return {
        type: 'navigate',
        action: 'next_week',
        params: { date: addDays(new Date(), 7) },
        confidence: 0.9,
      };
    }

    // 특정 날짜로 이동
    if (match[1] && match[2]) {
      const month = parseInt(match[1]);
      const day = parseInt(match[2]);
      const targetDate = new Date();
      targetDate.setMonth(month - 1);
      targetDate.setDate(day);

      return {
        type: 'navigate',
        action: 'go_to_date',
        params: { date: targetDate },
        confidence: 0.95,
      };
    }

    return {
      type: 'navigate',
      action: 'unknown',
      params: {},
      confidence: 0.3,
    };
  }

  private createViewCommand(match: RegExpMatchArray, input: string): ChatCommand {
    const command = input.toLowerCase();

    let viewType: ViewType = 'day';

    if (command.includes('주간') || command.includes('week')) {
      viewType = command.includes('라인') ? 'week-line' : 'week';
    } else if (command.includes('월간') || command.includes('month')) {
      viewType = 'month';
    } else if (command.includes('라인') || command.includes('line')) {
      viewType = 'line';
    } else if (command.includes('플로우') || command.includes('flow')) {
      viewType = 'flow';
    }

    return {
      type: 'view',
      action: 'change_view',
      params: { view: viewType },
      confidence: 0.95,
    };
  }

  private createEventCommand(match: RegExpMatchArray, input: string, context: ChatContext): ChatCommand {
    const title = match[1] || match[2];
    const timeStr = match[2] || match[3];
    const dateStr = match[2];

    let startTime = new Date();

    if (dateStr?.includes('내일')) {
      startTime = addDays(startTime, 1);
    }

    if (timeStr && /\d+/.test(timeStr)) {
      const hour = parseInt(timeStr);
      startTime = setHours(startTime, hour);
      startTime = setMinutes(startTime, 0);
    }

    return {
      type: 'create',
      action: 'create_event',
      params: {
        title,
        startTime,
        endTime: addHours(startTime, 1),
      },
      confidence: 0.9,
    };
  }

  private createEditCommand(match: RegExpMatchArray, input: string, context: ChatContext): ChatCommand {
    const eventTitle = match[1];
    const amount = parseInt(match[2]);
    const unit = input.includes('시간') ? 'hours' : 'minutes';

    let action = 'extend';
    if (input.includes('뒤로') || input.includes('미루기') || input.includes('연기')) {
      action = 'postpone';
    } else if (input.includes('앞으로') || input.includes('당기기')) {
      action = 'prepone';
    } else if (input.includes('변경') || input.includes('수정')) {
      action = 'rename';
    }

    // 선택된 일정 처리
    if (input.includes('선택') && context.selectedEvent) {
      return {
        type: 'edit',
        action,
        params: {
          eventId: context.selectedEvent.id,
          amount,
          unit,
        },
        confidence: 0.95,
      };
    }

    return {
      type: 'edit',
      action,
      params: {
        eventTitle,
        amount,
        unit,
        newTitle: match[2], // For rename action
      },
      confidence: 0.85,
    };
  }

  private createDeleteCommand(match: RegExpMatchArray, input: string, context: ChatContext): ChatCommand {
    const eventTitle = match[1];

    if (input.includes('선택') && context.selectedEvent) {
      return {
        type: 'delete',
        action: 'delete_selected',
        params: { eventId: context.selectedEvent.id },
        confidence: 0.95,
      };
    }

    if (input.includes('오늘') && input.includes('모두')) {
      return {
        type: 'delete',
        action: 'delete_all_today',
        params: { date: new Date() },
        confidence: 0.9,
      };
    }

    return {
      type: 'delete',
      action: 'delete_by_title',
      params: { title: eventTitle },
      confidence: 0.85,
    };
  }

  private createSearchCommand(match: RegExpMatchArray, input: string): ChatCommand {
    const query = match[1];

    return {
      type: 'search',
      action: 'search_events',
      params: { query },
      confidence: 0.9,
    };
  }

  private createAnalyzeCommand(match: RegExpMatchArray, input: string, context: ChatContext): ChatCommand {
    let action = 'summary';
    let period = 'today';

    if (input.includes('주')) {
      period = 'week';
    } else if (input.includes('월')) {
      period = 'month';
    }

    if (input.includes('빈') || input.includes('free')) {
      action = 'free_time';
    } else if (input.includes('바쁜')) {
      action = 'busy_analysis';
    }

    return {
      type: 'analyze',
      action,
      params: { period },
      confidence: 0.85,
    };
  }

  private async executeCommand(command: ChatCommand, context: ChatContext): Promise<ChatResult> {
    switch (command.type) {
      case 'navigate':
        return this.executeNavigate(command, context);

      case 'view':
        return this.executeViewChange(command, context);

      case 'create':
        return this.executeCreate(command, context);

      case 'edit':
        return this.executeEdit(command, context);

      case 'delete':
        return this.executeDelete(command, context);

      case 'search':
        return this.executeSearch(command, context);

      case 'analyze':
        return this.executeAnalyze(command, context);

      default:
        return {
          success: false,
          message: '알 수 없는 명령입니다.',
        };
    }
  }

  private executeNavigate(command: ChatCommand, context: ChatContext): ChatResult {
    const { date } = command.params;

    return {
      success: true,
      message: `${format(date, 'MM월 dd일')}로 이동합니다.`,
      navigation: { date },
      animation: { type: 'slide', duration: 500 },
    };
  }

  private executeViewChange(command: ChatCommand, context: ChatContext): ChatResult {
    const { view } = command.params;
    const viewNames: Record<ViewType, string> = {
      day: '일간뷰',
      week: '주간뷰',
      month: '월간뷰',
      line: '원라인 일간뷰',
      'week-line': '원라인 주간뷰',
      flow: '타임플로우뷰',
    };

    return {
      success: true,
      message: `${viewNames[view as ViewType]}로 전환합니다.`,
      navigation: { view: view as ViewType },
      animation: { type: 'fade', duration: 300 },
    };
  }

  private executeCreate(command: ChatCommand, context: ChatContext): ChatResult {
    const { title, startTime, endTime } = command.params;

    const newEvent: CalendarEvent = {
      id: `created-${Date.now()}`,
      summary: title,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      status: 'confirmed',
    };

    const updatedEvents = [...context.events, newEvent];

    return {
      success: true,
      message: `"${title}" 일정이 ${format(startTime, 'HH:mm')}에 추가되었습니다.`,
      updatedEvents,
      data: newEvent,
      animation: { type: 'zoom', duration: 400 },
    };
  }

  private executeEdit(command: ChatCommand, context: ChatContext): ChatResult {
    const { eventId, eventTitle, amount, unit, newTitle } = command.params;

    let targetEvent: CalendarEvent | undefined;

    if (eventId) {
      targetEvent = context.events.find(e => e.id === eventId);
    } else if (eventTitle) {
      targetEvent = context.events.find(e =>
        e.summary?.toLowerCase().includes(eventTitle.toLowerCase())
      );
    }

    if (!targetEvent) {
      return {
        success: false,
        message: '수정할 일정을 찾을 수 없습니다.',
      };
    }

    const updatedEvent = { ...targetEvent };

    if (command.action === 'extend' && targetEvent.end) {
      const endTime = new Date(targetEvent.end.dateTime || targetEvent.end.date || '');
      const newEndTime = unit === 'hours'
        ? addHours(endTime, amount)
        : addMinutes(endTime, amount);
      updatedEvent.end = { dateTime: newEndTime.toISOString() };
    } else if (command.action === 'postpone' && targetEvent.start) {
      const startTime = new Date(targetEvent.start.dateTime || targetEvent.start.date || '');
      const newStartTime = unit === 'hours'
        ? addHours(startTime, amount)
        : addMinutes(startTime, amount);
      updatedEvent.start = { dateTime: newStartTime.toISOString() };

      if (targetEvent.end) {
        const endTime = new Date(targetEvent.end.dateTime || targetEvent.end.date || '');
        const newEndTime = unit === 'hours'
          ? addHours(endTime, amount)
          : addMinutes(endTime, amount);
        updatedEvent.end = { dateTime: newEndTime.toISOString() };
      }
    } else if (command.action === 'rename' && newTitle) {
      updatedEvent.summary = newTitle;
    }

    const updatedEvents = context.events.map(e =>
      e.id === updatedEvent.id ? updatedEvent : e
    );

    return {
      success: true,
      message: `"${targetEvent.summary}" 일정이 수정되었습니다.`,
      updatedEvents,
      data: updatedEvent,
    };
  }

  private executeDelete(command: ChatCommand, context: ChatContext): ChatResult {
    const { eventId, title, date } = command.params;

    let updatedEvents = [...context.events];
    let deletedCount = 0;

    if (eventId) {
      updatedEvents = updatedEvents.filter(e => e.id !== eventId);
      deletedCount = context.events.length - updatedEvents.length;
    } else if (title) {
      const before = updatedEvents.length;
      updatedEvents = updatedEvents.filter(e =>
        !e.summary?.toLowerCase().includes(title.toLowerCase())
      );
      deletedCount = before - updatedEvents.length;
    } else if (date && command.action === 'delete_all_today') {
      const targetDate = date as Date;
      const before = updatedEvents.length;
      updatedEvents = updatedEvents.filter(e => {
        const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
        return eventDate.toDateString() !== targetDate.toDateString();
      });
      deletedCount = before - updatedEvents.length;
    }

    if (deletedCount === 0) {
      return {
        success: false,
        message: '삭제할 일정을 찾을 수 없습니다.',
      };
    }

    return {
      success: true,
      message: `${deletedCount}개의 일정이 삭제되었습니다.`,
      updatedEvents,
    };
  }

  private executeSearch(command: ChatCommand, context: ChatContext): ChatResult {
    const { query } = command.params;

    const results = context.events.filter(e =>
      e.summary?.toLowerCase().includes(query.toLowerCase()) ||
      e.description?.toLowerCase().includes(query.toLowerCase()) ||
      e.location?.toLowerCase().includes(query.toLowerCase())
    );

    return {
      success: true,
      message: `"${query}" 검색 결과: ${results.length}개의 일정을 찾았습니다.`,
      data: results,
    };
  }

  private executeAnalyze(command: ChatCommand, context: ChatContext): ChatResult {
    const { period } = command.params;
    const now = new Date();
    let relevantEvents: CalendarEvent[] = [];

    if (period === 'today') {
      relevantEvents = context.events.filter(e => {
        const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
        return eventDate.toDateString() === now.toDateString();
      });
    } else if (period === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = addDays(weekStart, 7);

      relevantEvents = context.events.filter(e => {
        const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
        return eventDate >= weekStart && eventDate < weekEnd;
      });
    }

    if (command.action === 'free_time') {
      // Calculate free time slots
      const busySlots = relevantEvents.map(e => ({
        start: new Date(e.start?.dateTime || e.start?.date || ''),
        end: new Date(e.end?.dateTime || e.end?.date || ''),
      })).sort((a, b) => a.start.getTime() - b.start.getTime());

      const freeSlots: { start: Date; end: Date }[] = [];
      let lastEnd = setHours(setMinutes(now, 0), 9); // Start from 9 AM

      busySlots.forEach(slot => {
        if (slot.start > lastEnd) {
          freeSlots.push({ start: lastEnd, end: slot.start });
        }
        lastEnd = slot.end > lastEnd ? slot.end : lastEnd;
      });

      const workEnd = setHours(setMinutes(now, 0), 18); // Until 6 PM
      if (lastEnd < workEnd) {
        freeSlots.push({ start: lastEnd, end: workEnd });
      }

      return {
        success: true,
        message: `${freeSlots.length}개의 빈 시간대를 찾았습니다.`,
        data: freeSlots,
      };
    }

    const totalEvents = relevantEvents.length;
    const totalHours = relevantEvents.reduce((acc, e) => {
      if (e.start && e.end) {
        const start = new Date(e.start.dateTime || e.start.date || '');
        const end = new Date(e.end.dateTime || e.end.date || '');
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }
      return acc;
    }, 0);

    return {
      success: true,
      message: `${period === 'today' ? '오늘' : '이번 주'}: ${totalEvents}개 일정, 총 ${totalHours.toFixed(1)}시간`,
      data: {
        eventCount: totalEvents,
        totalHours,
        events: relevantEvents,
      },
    };
  }

  // Smart suggestions based on context
  public getSuggestions(context: ChatContext): string[] {
    const suggestions: string[] = [];
    const now = new Date();
    const hour = now.getHours();

    // Time-based suggestions
    if (hour < 9) {
      suggestions.push('오늘 일정 보여줘');
      suggestions.push('첫 회의 시간 확인');
    } else if (hour < 12) {
      suggestions.push('점심 시간 비어있나?');
      suggestions.push('오후 일정 확인');
    } else if (hour < 18) {
      suggestions.push('남은 일정 확인');
      suggestions.push('내일 일정 미리보기');
    } else {
      suggestions.push('내일 준비할 것');
      suggestions.push('이번 주 요약');
    }

    // Context-based suggestions
    if (context.selectedEvent) {
      suggestions.push(`"${context.selectedEvent.summary}" 30분 연장`);
      suggestions.push(`"${context.selectedEvent.summary}" 1시간 뒤로`);
    }

    if (context.currentView === 'day' || context.currentView === 'line') {
      suggestions.push('주간뷰로 전환');
      suggestions.push('다음 빈 시간 찾기');
    } else if (context.currentView === 'week' || context.currentView === 'week-line') {
      suggestions.push('오늘로 이동');
      suggestions.push('가장 바쁜 날은?');
    }

    // Always available
    suggestions.push('새 일정 추가');

    return suggestions.slice(0, 4); // Return top 4 suggestions
  }
}