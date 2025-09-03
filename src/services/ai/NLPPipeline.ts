import { GeminiService } from './GeminiService';
import { GoogleCalendarService } from '../google/GoogleCalendarService';
import { SmartScheduler } from '../calendar/SmartScheduler';
import { PatternLearner } from './PatternLearner';
import type { CalendarEvent, AIResponse, UserContext } from '@/types';

export interface NLPIntent {
  type: 'create' | 'update' | 'delete' | 'query' | 'reschedule' | 'analyze' | 'unknown';
  confidence: number;
  entities: {
    eventTitle?: string;
    dateTime?: Date;
    duration?: number;
    location?: string;
    attendees?: string[];
    recurrence?: string;
  };
  originalText: string;
}

export class NLPPipeline {
  private geminiService: GeminiService;
  private calendarService: GoogleCalendarService | null = null;
  private smartScheduler: SmartScheduler;
  private patternLearner: PatternLearner;
  
  constructor(
    geminiService: GeminiService,
    accessToken?: string,
    refreshToken?: string
  ) {
    this.geminiService = geminiService;
    if (accessToken) {
      this.calendarService = new GoogleCalendarService(accessToken, refreshToken);
    }
    this.smartScheduler = new SmartScheduler();
    this.patternLearner = new PatternLearner();
  }

  /**
   * 자연어 입력 처리 메인 파이프라인
   */
  async processInput(
    input: string,
    userContext: UserContext
  ): Promise<{
    response: string;
    action?: any;
    suggestions?: any[];
  }> {
    try {
      // 1. 의도 파악
      const intent = await this.detectIntent(input);
      console.log('Detected intent:', intent);

      // 2. 사용자 패턴 분석
      const patterns = await this.analyzeUserPatterns(userContext.userId);

      // 3. 의도에 따른 처리
      let result;
      switch (intent.type) {
        case 'create':
          result = await this.handleCreateIntent(intent, userContext, patterns);
          break;
        case 'update':
          result = await this.handleUpdateIntent(intent, userContext);
          break;
        case 'delete':
          result = await this.handleDeleteIntent(intent, userContext);
          break;
        case 'query':
          result = await this.handleQueryIntent(intent, userContext);
          break;
        case 'reschedule':
          result = await this.handleRescheduleIntent(intent, userContext);
          break;
        case 'analyze':
          result = await this.handleAnalyzeIntent(intent, userContext);
          break;
        default:
          result = await this.handleGeneralConversation(input, userContext);
      }

      return result;
    } catch (error) {
      console.error('NLP Pipeline error:', error);
      return {
        response: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.',
        action: null
      };
    }
  }

  /**
   * 의도 파악
   */
  private async detectIntent(input: string): Promise<NLPIntent> {
    const lowerInput = input.toLowerCase();
    
    // 규칙 기반 의도 파악 (빠른 처리)
    if (this.containsKeywords(lowerInput, ['추가', '생성', '만들', '잡아', '예약'])) {
      return {
        type: 'create',
        confidence: 0.9,
        entities: await this.extractEntities(input),
        originalText: input
      };
    }
    
    if (this.containsKeywords(lowerInput, ['수정', '변경', '바꿔', '옮겨'])) {
      return {
        type: 'update',
        confidence: 0.9,
        entities: await this.extractEntities(input),
        originalText: input
      };
    }
    
    if (this.containsKeywords(lowerInput, ['삭제', '취소', '제거', '없애'])) {
      return {
        type: 'delete',
        confidence: 0.9,
        entities: await this.extractEntities(input),
        originalText: input
      };
    }
    
    if (this.containsKeywords(lowerInput, ['언제', '뭐', '있', '일정', '확인'])) {
      return {
        type: 'query',
        confidence: 0.8,
        entities: await this.extractEntities(input),
        originalText: input
      };
    }
    
    if (this.containsKeywords(lowerInput, ['다시', '재조정', '리스케줄'])) {
      return {
        type: 'reschedule',
        confidence: 0.8,
        entities: await this.extractEntities(input),
        originalText: input
      };
    }
    
    if (this.containsKeywords(lowerInput, ['분석', '패턴', '통계', '요약'])) {
      return {
        type: 'analyze',
        confidence: 0.8,
        entities: {},
        originalText: input
      };
    }

    // AI 기반 의도 파악 (복잡한 경우)
    const aiResponse = await this.geminiService.processNaturalLanguage(input);
    return {
      type: this.mapAIIntent(aiResponse.intent),
      confidence: aiResponse.confidence || 0.5,
      entities: await this.extractEntities(input),
      originalText: input
    };
  }

  /**
   * 일정 생성 처리
   */
  private async handleCreateIntent(
    intent: NLPIntent,
    userContext: UserContext,
    patterns: any
  ): Promise<any> {
    try {
      // Gemini를 통해 이벤트 정보 추출
      const eventData = await this.geminiService.generateEventFromText(
        intent.originalText
      );

      // 패턴 기반 최적화
      if (patterns && patterns.commonMeetingTimes) {
        const suggestedTime = await this.patternLearner.suggestOptimalTime(
          userContext.userId,
          eventData.title || 'meeting',
          60
        );
        if (suggestedTime.length > 0) {
          const suggestedDate = new Date(suggestedTime[0]);
          eventData.date = suggestedDate.toISOString().split('T')[0];
          eventData.time = suggestedDate.toTimeString().split(' ')[0].substring(0, 5);
        }
      }

      // 충돌 검사
      if (this.calendarService) {
        const existingEvents = await this.calendarService.listEvents(
          'primary',
          new Date(),
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일
        );

        // EventData를 CalendarEvent 형식으로 변환
        const calendarEvent: CalendarEvent = {
          summary: eventData.title,
          description: eventData.description,
          location: eventData.location,
          start: {
            dateTime: `${eventData.date}T${eventData.time}:00`,
            timeZone: 'Asia/Seoul'
          },
          end: {
            dateTime: new Date(new Date(`${eventData.date}T${eventData.time}:00`).getTime() + eventData.duration * 60000).toISOString(),
            timeZone: 'Asia/Seoul'
          }
        };
        
        const conflicts = this.smartScheduler.detectConflicts(
          calendarEvent,
          existingEvents
        );

        if (conflicts.length > 0) {
          // 충돌 해결 제안
          const alternatives = await this.smartScheduler.suggestReschedule(
            conflicts[0],
            { duration: 60 },
            existingEvents,
            userContext
          );

          return {
            response: `일정 충돌이 발생했습니다. 다음 시간을 추천드립니다:\n${
              alternatives.slice(0, 3).map((alt, i) => 
                `${i + 1}. ${new Date(alt.slot.startTime).toLocaleString('ko-KR')}`
              ).join('\n')
            }`,
            action: { type: 'suggest_alternatives', alternatives },
            suggestions: alternatives
          };
        }

        // 실제 캘린더에 추가
        const createdEvent = await this.calendarService.createEvent(calendarEvent);
        
        return {
          response: `"${createdEvent.summary}" 일정이 ${
            new Date(createdEvent.start?.dateTime || '').toLocaleString('ko-KR')
          }에 추가되었습니다.`,
          action: { type: 'event_created', event: createdEvent }
        };
      }

      // 캘린더 서비스 없이 로컬 처리
      return {
        response: `"${eventData.title}" 일정을 ${
          new Date(`${eventData.date}T${eventData.time}:00`).toLocaleString('ko-KR')
        }에 추가할 준비가 되었습니다.`,
        action: { type: 'event_draft', event: eventData }
      };
    } catch (error) {
      console.error('Error handling create intent:', error);
      throw error;
    }
  }

  /**
   * 일정 수정 처리
   */
  private async handleUpdateIntent(
    intent: NLPIntent,
    userContext: UserContext
  ): Promise<any> {
    if (!this.calendarService) {
      return {
        response: '캘린더 연결이 필요합니다. 먼저 로그인해주세요.',
        action: { type: 'auth_required' }
      };
    }

    // 수정할 일정 찾기
    const events = await this.calendarService.listEvents();
    const targetEvent = this.findBestMatchingEvent(events, intent.entities.eventTitle || '');

    if (!targetEvent) {
      return {
        response: '수정할 일정을 찾을 수 없습니다. 일정 제목을 다시 확인해주세요.',
        action: null
      };
    }

    // 수정 사항 적용
    const updates: Partial<CalendarEvent> = {};
    if (intent.entities.dateTime) {
      updates.start = { dateTime: intent.entities.dateTime.toISOString() };
      updates.end = { 
        dateTime: new Date(
          intent.entities.dateTime.getTime() + (intent.entities.duration || 60) * 60000
        ).toISOString() 
      };
    }
    if (intent.entities.location) {
      updates.location = intent.entities.location;
    }

    if (!targetEvent.id) {
      throw new Error('이벤트 ID가 없습니다.');
    }
    
    const updatedEvent = await this.calendarService.updateEvent(
      targetEvent.id,
      updates
    );

    return {
      response: `"${updatedEvent.summary}" 일정이 수정되었습니다.`,
      action: { type: 'event_updated', event: updatedEvent }
    };
  }

  /**
   * 일정 삭제 처리
   */
  private async handleDeleteIntent(
    intent: NLPIntent,
    userContext: UserContext
  ): Promise<any> {
    if (!this.calendarService) {
      return {
        response: '캘린더 연결이 필요합니다. 먼저 로그인해주세요.',
        action: { type: 'auth_required' }
      };
    }

    const events = await this.calendarService.listEvents();
    const targetEvent = this.findBestMatchingEvent(events, intent.entities.eventTitle || '');

    if (!targetEvent) {
      return {
        response: '삭제할 일정을 찾을 수 없습니다.',
        action: null
      };
    }

    if (!targetEvent.id) {
      throw new Error('이벤트 ID가 없습니다.');
    }
    
    await this.calendarService.deleteEvent(targetEvent.id);

    return {
      response: `"${targetEvent.summary}" 일정이 삭제되었습니다.`,
      action: { type: 'event_deleted', eventId: targetEvent.id }
    };
  }

  /**
   * 일정 조회 처리
   */
  private async handleQueryIntent(
    intent: NLPIntent,
    userContext: UserContext
  ): Promise<any> {
    if (!this.calendarService) {
      return {
        response: '캘린더 연결이 필요합니다. 먼저 로그인해주세요.',
        action: { type: 'auth_required' }
      };
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1주일
    const events = await this.calendarService.listEvents('primary', now, endDate);

    if (events.length === 0) {
      return {
        response: '다음 1주일 동안 일정이 없습니다.',
        action: { type: 'events_list', events: [] }
      };
    }

    const eventList = events.slice(0, 5).map((event, i) => 
      `${i + 1}. ${event.summary} - ${
        new Date(event.start?.dateTime || '').toLocaleString('ko-KR')
      }${event.location ? ` (${event.location})` : ''}`
    ).join('\n');

    return {
      response: `다음 일정들이 있습니다:\n${eventList}`,
      action: { type: 'events_list', events }
    };
  }

  /**
   * 일정 재조정 처리
   */
  private async handleRescheduleIntent(
    intent: NLPIntent,
    userContext: UserContext
  ): Promise<any> {
    if (!this.calendarService) {
      return {
        response: '캘린더 연결이 필요합니다. 먼저 로그인해주세요.',
        action: { type: 'auth_required' }
      };
    }

    const events = await this.calendarService.listEvents();
    const targetEvent = this.findBestMatchingEvent(events, intent.entities.eventTitle || '');

    if (!targetEvent) {
      return {
        response: '재조정할 일정을 찾을 수 없습니다.',
        action: null
      };
    }

    // 최적 시간 찾기
    const suggestions = await this.smartScheduler.findOptimalTime(
      {
        duration: 60,
        preferredTimeRanges: [{
          start: new Date(),
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }]
      },
      events,
      userContext
    );

    const topSuggestions = suggestions.slice(0, 3).map((s, i) => 
      `${i + 1}. ${new Date(s.slot.startTime).toLocaleString('ko-KR')} - ${s.reasoning}`
    ).join('\n');

    return {
      response: `"${targetEvent.summary}" 재조정 추천 시간:\n${topSuggestions}`,
      action: { type: 'reschedule_suggestions', event: targetEvent, suggestions }
    };
  }

  /**
   * 일정 분석 처리
   */
  private async handleAnalyzeIntent(
    intent: NLPIntent,
    userContext: UserContext
  ): Promise<any> {
    if (!this.calendarService) {
      return {
        response: '캘린더 연결이 필요합니다. 먼저 로그인해주세요.',
        action: { type: 'auth_required' }
      };
    }

    const events = await this.calendarService.listEvents(
      'primary',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30일 전
      new Date()
    );

    const insights = await this.patternLearner.analyzeUserBehavior(
      userContext.userId,
      events
    );

    const insightsSummary = insights.map(i => 
      `• ${i.pattern} (신뢰도: ${Math.round(i.confidence * 100)}%)`
    ).join('\n');

    return {
      response: `📊 일정 분석 결과:\n\n${insightsSummary || '패턴을 분석 중입니다. 더 많은 데이터가 필요합니다.'}`,
      action: { type: 'analysis', insights }
    };
  }

  /**
   * 일반 대화 처리
   */
  private async handleGeneralConversation(
    input: string,
    userContext: UserContext
  ): Promise<any> {
    const response = await this.geminiService.processNaturalLanguage(input);

    return {
      response: response.response,
      action: response.action
    };
  }

  /**
   * 엔티티 추출
   */
  private async extractEntities(text: string): Promise<any> {
    // 간단한 패턴 매칭으로 엔티티 추출
    const entities: any = {};

    // 시간 추출
    const timePatterns = [
      /(\d{1,2})시/,
      /(\d{1,2}):(\d{2})/,
      /오전\s*(\d{1,2})/,
      /오후\s*(\d{1,2})/
    ];

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        // 시간 파싱 로직
        break;
      }
    }

    // 장소 추출
    const locationPattern = /(에서|장소는?|위치는?)\s*([가-힣\w\s]+)/;
    const locationMatch = text.match(locationPattern);
    if (locationMatch) {
      entities.location = locationMatch[2].trim();
    }

    return entities;
  }

  /**
   * 사용자 패턴 분석
   */
  private async analyzeUserPatterns(userId: string): Promise<any> {
    if (!this.calendarService) return null;

    const events = await this.calendarService.listEvents(
      'primary',
      new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60일
      new Date()
    );

    return await this.patternLearner.analyzeUserBehavior(userId, events);
  }

  /**
   * 키워드 포함 여부 확인
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * AI 의도를 내부 의도로 매핑
   */
  private mapAIIntent(aiIntent: string): NLPIntent['type'] {
    const intentMap: Record<string, NLPIntent['type']> = {
      'create_event': 'create',
      'update_event': 'update',
      'delete_event': 'delete',
      'query': 'query',
      'reschedule': 'reschedule',
      'analyze': 'analyze'
    };

    return intentMap[aiIntent] || 'unknown';
  }

  /**
   * 가장 일치하는 이벤트 찾기
   */
  private findBestMatchingEvent(
    events: CalendarEvent[],
    searchTerm: string
  ): CalendarEvent | null {
    if (!searchTerm) return events[0] || null;

    const lowerSearch = searchTerm.toLowerCase();
    
    // 정확한 일치
    const exactMatch = events.find(e => 
      e.summary?.toLowerCase() === lowerSearch
    );
    if (exactMatch) return exactMatch;

    // 부분 일치
    const partialMatch = events.find(e => 
      e.summary?.toLowerCase().includes(lowerSearch)
    );
    if (partialMatch) return partialMatch;

    // 가장 최근 이벤트
    return events[0] || null;
  }
}