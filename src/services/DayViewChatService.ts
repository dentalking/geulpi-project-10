import { CalendarEvent } from '@/types';
import { addHours, addMinutes, setHours, setMinutes, parse, format } from 'date-fns';

export interface ChatCommand {
  type: 'move' | 'create' | 'edit' | 'delete' | 'style';
  action: string;
  params?: any;
}

export class DayViewChatService {
  private static instance: DayViewChatService;

  private constructor() {}

  static getInstance(): DayViewChatService {
    if (!DayViewChatService.instance) {
      DayViewChatService.instance = new DayViewChatService();
    }
    return DayViewChatService.instance;
  }

  /**
   * Parse natural language command into structured action
   */
  parseCommand(input: string, context?: { selectedEvent?: CalendarEvent; date?: Date }): ChatCommand | null {
    const normalizedInput = input.toLowerCase().trim();

    // Time movement patterns
    const movePatterns = [
      { regex: /(.+?)을?\s*(\d+)시로\s*옮겨/i, type: 'move' as const },
      { regex: /(.+?)을?\s*(\d+)시간\s*(뒤로|앞으로|연장|단축)/i, type: 'move' as const },
      { regex: /오전\s*일정\s*모두\s*(\d+)시간\s*(뒤로|미뤄)/i, type: 'move' as const },
      { regex: /오후\s*일정\s*모두\s*(\d+)시간\s*(앞으로|당겨)/i, type: 'move' as const },
    ];

    // Creation patterns
    const createPatterns = [
      { regex: /(\d+)시에\s*(.+?)\s*추가/i, type: 'create' as const },
      { regex: /(.+?)\s*일정\s*(\d+)시에\s*만들어/i, type: 'create' as const },
      { regex: /내일\s*같은\s*시간에\s*(.+)/i, type: 'create' as const },
    ];

    // Edit patterns
    const editPatterns = [
      { regex: /제목을?\s*['"](.+?)['"]\s*(으로|로)?\s*변경/i, type: 'edit' as const },
      { regex: /장소를?\s*(.+?)\s*(으로|로)?\s*수정/i, type: 'edit' as const },
      { regex: /(.+?)\s*설명\s*추가/i, type: 'edit' as const },
    ];

    // Style patterns
    const stylePatterns = [
      { regex: /(중요|급한?)\s*일정\s*(빨간색|파란색|초록색)/i, type: 'style' as const },
      { regex: /반복\s*일정\s*투명도\s*(높여|낮춰)/i, type: 'style' as const },
    ];

    // Check move patterns
    for (const pattern of movePatterns) {
      const match = normalizedInput.match(pattern.regex);
      if (match) {
        return {
          type: 'move',
          action: normalizedInput,
          params: this.extractMoveParams(match, normalizedInput)
        };
      }
    }

    // Check create patterns
    for (const pattern of createPatterns) {
      const match = normalizedInput.match(pattern.regex);
      if (match) {
        return {
          type: 'create',
          action: normalizedInput,
          params: this.extractCreateParams(match, normalizedInput)
        };
      }
    }

    // Check edit patterns
    for (const pattern of editPatterns) {
      const match = normalizedInput.match(pattern.regex);
      if (match) {
        return {
          type: 'edit',
          action: normalizedInput,
          params: this.extractEditParams(match, normalizedInput, context?.selectedEvent)
        };
      }
    }

    // Check style patterns
    for (const pattern of stylePatterns) {
      const match = normalizedInput.match(pattern.regex);
      if (match) {
        return {
          type: 'style',
          action: normalizedInput,
          params: this.extractStyleParams(match)
        };
      }
    }

    return null;
  }

  /**
   * Execute parsed command
   */
  async executeCommand(
    command: ChatCommand,
    events: CalendarEvent[],
    context?: { selectedEvent?: CalendarEvent; date?: Date }
  ): Promise<{
    success: boolean;
    updatedEvents?: CalendarEvent[];
    message: string;
    preview?: boolean;
  }> {
    switch (command.type) {
      case 'move':
        return this.executeMoveCommand(command, events, context);

      case 'create':
        return this.executeCreateCommand(command, events, context);

      case 'edit':
        return this.executeEditCommand(command, events, context);

      case 'delete':
        return this.executeDeleteCommand(command, events, context);

      case 'style':
        return this.executeStyleCommand(command, events, context);

      default:
        return {
          success: false,
          message: '알 수 없는 명령입니다.'
        };
    }
  }

  private extractMoveParams(match: RegExpMatchArray, input: string): any {
    const targetHour = parseInt(match[2] || match[1]);
    const direction = match[3];

    return {
      targetHour,
      direction,
      isAbsolute: input.includes('으로') || input.includes('로'),
      isRelative: input.includes('시간'),
      affectsAll: input.includes('모두')
    };
  }

  private extractCreateParams(match: RegExpMatchArray, input: string): any {
    const hour = parseInt(match[1]);
    const title = match[2] || match[1];

    return {
      hour,
      title: title.trim(),
      duration: 60, // Default 1 hour
      tomorrow: input.includes('내일')
    };
  }

  private extractEditParams(match: RegExpMatchArray, input: string, selectedEvent?: CalendarEvent): any {
    if (input.includes('제목')) {
      return {
        field: 'summary',
        value: match[1]
      };
    }

    if (input.includes('장소')) {
      return {
        field: 'location',
        value: match[1]
      };
    }

    if (input.includes('설명')) {
      return {
        field: 'description',
        value: match[1]
      };
    }

    return null;
  }

  private extractStyleParams(match: RegExpMatchArray): any {
    const importance = match[1];
    const color = match[2];

    return {
      importance,
      color: this.mapColorName(color),
      transparency: match[0].includes('투명도')
    };
  }

  private mapColorName(colorName: string): string {
    const colorMap: { [key: string]: string } = {
      '빨간색': '#ef4444',
      '파란색': '#3b82f6',
      '초록색': '#10b981',
      '노란색': '#eab308',
      '보라색': '#8b5cf6'
    };

    return colorMap[colorName] || '#3b82f6';
  }

  private async executeMoveCommand(
    command: ChatCommand,
    events: CalendarEvent[],
    context?: { selectedEvent?: CalendarEvent; date?: Date }
  ): Promise<{ success: boolean; updatedEvents?: CalendarEvent[]; message: string }> {
    const params = command.params;

    if (params.isAbsolute && context?.selectedEvent) {
      // Move specific event to absolute time
      const updatedEvent = { ...context.selectedEvent };
      if (updatedEvent.start) {
        const startDate = new Date(updatedEvent.start.dateTime || updatedEvent.start.date || '');
        const newStart = setHours(startDate, params.targetHour);
        updatedEvent.start = {
          ...updatedEvent.start,
          dateTime: newStart.toISOString()
        };

        if (updatedEvent.end) {
          const endDate = new Date(updatedEvent.end.dateTime || updatedEvent.end.date || '');
          const duration = endDate.getTime() - startDate.getTime();
          const newEnd = new Date(newStart.getTime() + duration);
          updatedEvent.end = {
            ...updatedEvent.end,
            dateTime: newEnd.toISOString()
          };
        }
      }

      const updatedEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);

      return {
        success: true,
        updatedEvents,
        message: `"${updatedEvent.summary}"을(를) ${params.targetHour}시로 이동했습니다.`
      };
    }

    if (params.isRelative && params.affectsAll) {
      // Move all morning/afternoon events
      const updatedEvents = events.map(event => {
        if (!event.start) return event;

        const startDate = new Date(event.start.dateTime || event.start.date || '');
        const hour = startDate.getHours();

        if ((command.action.includes('오전') && hour < 12) ||
            (command.action.includes('오후') && hour >= 12)) {
          const newEvent = { ...event };
          const hours = params.targetHour;
          const direction = params.direction?.includes('뒤') || params.direction?.includes('미뤄') ? 1 : -1;

          const newStart = addHours(startDate, hours * direction);
          newEvent.start = {
            ...newEvent.start,
            dateTime: newStart.toISOString()
          };

          if (newEvent.end) {
            const endDate = new Date(newEvent.end.dateTime || newEvent.end.date || '');
            const newEnd = addHours(endDate, hours * direction);
            newEvent.end = {
              ...newEvent.end,
              dateTime: newEnd.toISOString()
            };
          }

          return newEvent;
        }

        return event;
      });

      return {
        success: true,
        updatedEvents,
        message: `${command.action.includes('오전') ? '오전' : '오후'} 일정을 ${params.targetHour}시간 ${params.direction || '이동'}했습니다.`
      };
    }

    return {
      success: false,
      message: '일정을 이동할 수 없습니다.'
    };
  }

  private async executeCreateCommand(
    command: ChatCommand,
    events: CalendarEvent[],
    context?: { selectedEvent?: CalendarEvent; date?: Date }
  ): Promise<{ success: boolean; updatedEvents?: CalendarEvent[]; message: string }> {
    const params = command.params;
    const baseDate = params.tomorrow ? addHours(context?.date || new Date(), 24) : (context?.date || new Date());

    const startTime = setHours(setMinutes(baseDate, 0), params.hour);
    const endTime = addMinutes(startTime, params.duration);

    const newEvent: CalendarEvent = {
      id: `temp-${Date.now()}`,
      summary: params.title,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      status: 'confirmed'
    };

    const updatedEvents = [...events, newEvent];

    return {
      success: true,
      updatedEvents,
      message: `"${params.title}" 일정을 ${params.hour}시에 추가했습니다.`
      // preview property removed as it's not in the return type
    };
  }

  private async executeEditCommand(
    command: ChatCommand,
    events: CalendarEvent[],
    context?: { selectedEvent?: CalendarEvent; date?: Date }
  ): Promise<{ success: boolean; updatedEvents?: CalendarEvent[]; message: string }> {
    if (!context?.selectedEvent) {
      return {
        success: false,
        message: '편집할 일정을 먼저 선택해주세요.'
      };
    }

    const params = command.params;
    const updatedEvent = { ...context.selectedEvent };

    if (params.field === 'summary') {
      updatedEvent.summary = params.value;
    } else if (params.field === 'location') {
      updatedEvent.location = params.value;
    } else if (params.field === 'description') {
      updatedEvent.description = params.value;
    }

    const updatedEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);

    return {
      success: true,
      updatedEvents,
      message: `${params.field === 'summary' ? '제목' : params.field === 'location' ? '장소' : '설명'}을(를) "${params.value}"(으)로 변경했습니다.`
    };
  }

  private async executeDeleteCommand(
    command: ChatCommand,
    events: CalendarEvent[],
    context?: { selectedEvent?: CalendarEvent; date?: Date }
  ): Promise<{ success: boolean; updatedEvents?: CalendarEvent[]; message: string }> {
    if (!context?.selectedEvent) {
      return {
        success: false,
        message: '삭제할 일정을 먼저 선택해주세요.'
      };
    }

    const updatedEvents = events.filter(e => e.id !== context.selectedEvent?.id);

    return {
      success: true,
      updatedEvents,
      message: `"${context.selectedEvent.summary}" 일정을 삭제했습니다.`
    };
  }

  private async executeStyleCommand(
    command: ChatCommand,
    events: CalendarEvent[],
    context?: { selectedEvent?: CalendarEvent; date?: Date }
  ): Promise<{ success: boolean; updatedEvents?: CalendarEvent[]; message: string }> {
    const params = command.params;

    // Add color metadata to events
    const updatedEvents = events.map(event => {
      if (params.importance && event.summary?.toLowerCase().includes(params.importance)) {
        return {
          ...event,
          colorId: params.color,
          transparency: params.transparency ? 'transparent' : 'opaque'
        };
      }
      return event;
    });

    return {
      success: true,
      updatedEvents,
      message: `${params.importance || '선택된'} 일정의 스타일을 변경했습니다.`
    };
  }

  /**
   * Generate smart suggestions based on current context
   */
  generateSuggestions(events: CalendarEvent[], date: Date): string[] {
    const suggestions: string[] = [];

    // Time-based suggestions
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour < 12) {
      suggestions.push('오전 일정 모두 30분 뒤로');
    } else {
      suggestions.push('오후 일정 정리하기');
    }

    // Event count based suggestions
    if (events.length > 5) {
      suggestions.push('중요한 일정만 표시');
    }

    if (events.length === 0) {
      suggestions.push('9시에 업무 시작 추가');
      suggestions.push('12시에 점심 시간 추가');
    }

    // Gap detection
    const gaps = this.findTimeGaps(events);
    if (gaps.length > 0 && gaps[0].duration >= 120) {
      suggestions.push(`${gaps[0].start}시에 휴식 시간 추가`);
    }

    return suggestions;
  }

  private findTimeGaps(events: CalendarEvent[]): Array<{ start: number; duration: number }> {
    const sortedEvents = [...events].sort((a, b) => {
      const aStart = new Date(a.start?.dateTime || a.start?.date || '').getTime();
      const bStart = new Date(b.start?.dateTime || b.start?.date || '').getTime();
      return aStart - bStart;
    });

    const gaps: Array<{ start: number; duration: number }> = [];

    for (let i = 0; i < sortedEvents.length - 1; i++) {
      const currentEnd = new Date(sortedEvents[i].end?.dateTime || sortedEvents[i].end?.date || '');
      const nextStart = new Date(sortedEvents[i + 1].start?.dateTime || sortedEvents[i + 1].start?.date || '');

      const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

      if (gapMinutes >= 60) {
        gaps.push({
          start: currentEnd.getHours(),
          duration: gapMinutes
        });
      }
    }

    return gaps;
  }
}