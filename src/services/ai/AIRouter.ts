import GeminiService from './GeminiService';
import { contextManager } from './ContextManager';
import { getCalendarClient } from '@/lib/google-auth';
import type { 
    AIIntent, 
    UserContext, 
    CalendarEvent, 
    AIResponse,
    EventData 
} from '@/types';

/**
 * AI 요청 라우터
 * 사용자 의도를 분석하고 적절한 핸들러로 라우팅
 */
export class AIRouter {
    private readonly INTENT_CONFIDENCE_THRESHOLD = 0.7;
    private geminiService: GeminiService;

    constructor() {
        this.geminiService = new GeminiService();
    }

    /**
     * AI 응답에서 디버그 메시지 제거
     */
    private cleanAIResponse(text: string): string {
        // 디버그 메시지 패턴들
        const debugPatterns = [
            /let'?s\s+think\s+step\s+by\s+step/gi,
            /thinking\s+out\s+loud/gi,
            /let\s+me\s+think/gi,
            /^\s*\[.*?\]\s*/gm,  // [DEBUG], [INFO] 등
            /^\s*DEBUG:.*$/gm,
            /^\s*TODO:.*$/gm,
            /^\s*NOTE:.*$/gm,
            /```\s*thinking[\s\S]*?```/gi,  // thinking 코드 블록
            /\n\n\n+/g  // 과도한 줄바꿈
        ];

        let cleaned = text;
        debugPatterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
        });

        // 앞뒤 공백 제거 및 과도한 줄바꿈 정리
        cleaned = cleaned.trim().replace(/\n\n+/g, '\n\n');
        
        return cleaned;
    }

    /**
     * 메시지 처리 및 라우팅
     */
    async processMessage(
        message: string, 
        userId: string,
        accessToken: string
    ): Promise<AIResponse> {
        const context = contextManager.getContext(userId);
        
        // 컨텍스트 향상된 프롬프트 생성
        const enhancedMessage = contextManager.enhancePromptWithContext(userId, message);
        
        // 대화 히스토리에 추가
        contextManager.addToHistory(userId, 'user', message);

        try {
            // 1. 의도 분류
            const intent = await this.classifyIntent(enhancedMessage, context);

            // 2. 신뢰도 체크
            if (intent.confidence < this.INTENT_CONFIDENCE_THRESHOLD) {
                return this.handleLowConfidenceIntent(message, context);
            }

            // 3. 적절한 핸들러로 라우팅
            let response: AIResponse;
            
            switch (intent.type) {
                case 'CREATE_EVENT':
                    response = await this.handleEventCreation(intent, context, message, accessToken);
                    break;
                case 'SEARCH_EVENTS':
                    response = await this.handleEventSearch(intent, context, accessToken);
                    break;
                case 'GET_BRIEFING':
                    response = await this.handleBriefing(intent, context, accessToken);
                    break;
                case 'UPDATE_EVENT':
                    response = await this.handleEventUpdate(intent, context, accessToken);
                    break;
                case 'DELETE_EVENT':
                    response = await this.handleEventDeletion(intent, context, accessToken);
                    break;
                case 'BATCH_OPERATION':
                    response = await this.handleBatchOperation(intent, context, accessToken);
                    break;
                default:
                    response = await this.handleConversation(message, context);
            }

            // 4. 응답 메시지 필터링
            if (response.message) {
                response.message = this.cleanAIResponse(response.message);
            }
            
            // 5. 응답을 히스토리에 추가
            contextManager.addToHistory(userId, 'assistant', response.message);
            
            return response;
        } catch (error) {
            console.error('Message processing error:', error);
            return {
                type: 'error',
                message: '처리 중 오류가 발생했습니다. 다시 시도해주세요.',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * 의도 분류
     */
    private async classifyIntent(message: string, context: UserContext): Promise<AIIntent> {
        const prompt = `
사용자 메시지를 분석하여 의도를 분류해주세요.
현재 시간: ${context.currentTime.toLocaleString('ko-KR')}
최근 일정: ${context.recentEvents.slice(0, 3).map(e => e.summary).join(', ')}

메시지: "${message}"

다음 JSON 형식으로 응답:
{
  "type": "CREATE_EVENT|SEARCH_EVENTS|GET_BRIEFING|UPDATE_EVENT|DELETE_EVENT|BATCH_OPERATION|CONVERSATION",
  "confidence": 0.0-1.0,
  "parameters": {},
  "entities": []
}

의도 분류 기준:
- CREATE_EVENT: 새 일정 생성 (예: "내일 2시 미팅")
- SEARCH_EVENTS: 일정 검색 (예: "이번 주 일정 보여줘")
- GET_BRIEFING: 브리핑 요청 (예: "오늘 일정 요약")
- UPDATE_EVENT: 일정 수정 (예: "미팅 시간 변경")
- DELETE_EVENT: 일정 삭제 (예: "내일 미팅 취소")
- BATCH_OPERATION: 여러 일정 처리 (예: "중복 일정 정리")
- CONVERSATION: 일반 대화
`;

        try {
            const result = await this.geminiService.model.generateContent(prompt);
            const response = result.response.text();
            const cleaned = response.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            const match = cleaned.match(/\{[\s\S]*\}/);
            
            if (match) {
                return JSON.parse(match[0]) as AIIntent;
            }
            
            throw new Error('Failed to parse intent');
        } catch (error) {
            console.error('Intent classification error:', error);
            return { 
                type: 'CONVERSATION', 
                confidence: 0.5, 
                parameters: {},
                entities: []
            };
        }
    }

    /**
     * 낮은 신뢰도 의도 처리
     */
    private async handleLowConfidenceIntent(
        message: string, 
        context: UserContext
    ): Promise<AIResponse> {
        return {
            type: 'clarification',
            message: '죄송합니다. 요청을 정확히 이해하지 못했습니다. 다시 말씀해주시거나 다음 중 하나를 선택해주세요:',
            suggestions: [
                { id: '1', title: '일정 추가', action: '새 일정을 추가하고 싶어요' },
                { id: '2', title: '일정 조회', action: '일정을 확인하고 싶어요' },
                { id: '3', title: '일정 수정', action: '기존 일정을 변경하고 싶어요' },
                { id: '4', title: '오늘 브리핑', action: '오늘의 일정을 요약해주세요' }
            ]
        };
    }

    /**
     * 일정 생성 처리
     */
    private async handleEventCreation(
        intent: AIIntent, 
        context: UserContext, 
        originalMessage: string, 
        accessToken: string
    ): Promise<AIResponse> {
        try {
            const eventData = await this.geminiService.parseEventFromText(originalMessage);
            const calendar = getCalendarClient(accessToken);

            // 자연어 시간 표현 해석 시도
            let startDateTime: Date;
            const timeResolved = contextManager.resolveTimeExpression(originalMessage, context.userId);
            
            if (timeResolved) {
                startDateTime = timeResolved;
            } else {
                startDateTime = new Date(`${eventData.date}T${eventData.time}:00`);
            }
            
            const endDateTime = new Date(startDateTime);
            endDateTime.setMinutes(endDateTime.getMinutes() + (eventData.duration || 60));
            
            // 현재 일정들 가져오기
            const existingEvents = await calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                singleEvents: true,
                orderBy: 'startTime'
            });
            
            // 충돌 검사
            const conflicts = contextManager.detectConflicts(
                { start: startDateTime, end: endDateTime },
                existingEvents.data.items as CalendarEvent[]
            );
            
            if (conflicts.length > 0) {
                // 최적 시간 제안
                const suggestions = contextManager.suggestOptimalTime(
                    eventData.duration || 60,
                    existingEvents.data.items as CalendarEvent[],
                    context.userId
                );
                
                return {
                    type: 'clarification',
                    message: `⚠️ 해당 시간에 "${conflicts[0].summary}" 일정이 이미 있습니다. 다른 시간을 추천드립니다:`,
                    suggestions: suggestions.map((time, idx) => ({
                        id: String(idx + 1),
                        title: time.toLocaleString('ko-KR', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit',
                            weekday: 'short'
                        }),
                        action: `${time.toLocaleDateString('ko-KR')} ${time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}에 일정 추가`
                    }))
                };
            }

            const event = {
                summary: eventData.title,
                location: eventData.location,
                description: eventData.description,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: context.timeZone,
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: context.timeZone,
                },
                attendees: eventData.attendees?.map((email: string) => ({ email })),
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: context.preferences.reminderMinutes || 15 }
                    ]
                }
            };

            const response = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
            });
            
            // 생성된 이벤트를 컨텍스트에 즉시 추가
            const createdEvent = response.data as CalendarEvent;
            contextManager.updateConversationContext(context.userId, {
                lastEventCreated: createdEvent
            });
            
            // 최근 이벤트 목록에도 추가
            const updatedEvents = [...context.recentEvents, createdEvent]
                .sort((a, b) => {
                    const aTime = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
                    const bTime = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
                    return aTime - bTime;
                });
            contextManager.updateRecentEvents(context.userId, updatedEvents);
            
            // 스마트 제안 생성
            const smartSuggestions = contextManager.generateSmartSuggestions(
                context.userId,
                existingEvents.data.items as CalendarEvent[]
            );

            return {
                type: 'action',
                action: 'event_created',
                message: `✅ "${eventData.title}" 일정이 ${startDateTime.toLocaleString('ko-KR')}에 추가되었습니다.`,
                data: response.data,
                suggestions: smartSuggestions.slice(0, 3).map((suggestion, idx) => ({
                    id: String(idx + 1),
                    title: suggestion,
                    action: suggestion
                }))
            };
        } catch (error) {
            console.error('Event creation error:', error);
            return {
                type: 'error',
                message: `일정 생성 중 오류가 발생했습니다.`,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * 일정 검색 처리
     */
    private async handleEventSearch(
        intent: AIIntent, 
        context: UserContext, 
        accessToken: string
    ): Promise<AIResponse> {
        try {
            const calendar = getCalendarClient(accessToken);
            const now = new Date();
            
            // 검색 범위 결정 (기본 2주)
            const timeMin = intent.parameters?.timeMin || now.toISOString();
            const timeMax = intent.parameters?.timeMax || 
                new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

            const events = await calendar.events.list({
                calendarId: 'primary',
                timeMin,
                timeMax,
                maxResults: 20,
                singleEvents: true,
                orderBy: 'startTime',
            });

            const eventItems = events.data.items || [];
            
            // 컨텍스트 즉시 업데이트
            contextManager.updateRecentEvents(context.userId, eventItems as CalendarEvent[]);

            if (eventItems.length === 0) {
                return {
                    type: 'data',
                    action: 'events_found',
                    message: '검색 기간 내에 일정이 없습니다.',
                    data: { events: [] }
                };
            }

            return {
                type: 'data',
                action: 'events_found',
                message: `${eventItems.length}개의 일정을 찾았습니다.`,
                data: { events: eventItems },
                suggestions: [
                    { id: '1', title: '오늘 일정만', action: '오늘 일정 보여줘' },
                    { id: '2', title: '이번 주 일정', action: '이번 주 일정 보여줘' },
                    { id: '3', title: '다음 주 일정', action: '다음 주 일정 보여줘' }
                ]
            };
        } catch (error) {
            console.error('Event search error:', error);
            return {
                type: 'error',
                message: '일정 검색 중 오류가 발생했습니다.',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * 브리핑 생성 처리
     */
    private async handleBriefing(
        intent: AIIntent, 
        context: UserContext, 
        accessToken: string
    ): Promise<AIResponse> {
        try {
            const calendar = getCalendarClient(accessToken);
            const now = new Date();
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // 최신 데이터를 가져오기 위해 캐시 무효화
            const events = await calendar.events.list({
                calendarId: 'primary',
                timeMin: today.toISOString(),
                timeMax: tomorrow.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });

            const eventItems = events.data.items || [];
            
            // 컨텍스트 업데이트
            contextManager.updateRecentEvents(context.userId, eventItems as CalendarEvent[]);

            if (eventItems.length === 0) {
                return {
                    type: 'text',
                    message: '🌟 오늘은 예정된 일정이 없습니다. 여유로운 하루를 보내세요!'
                };
            }

            const briefingPrompt = `
다음은 오늘의 일정입니다. 간결하고 실용적인 브리핑을 작성해주세요.

일정 목록:
${eventItems.map((event: any, i: number) => `
${i + 1}. ${event.summary}
- 시간: ${new Date(event.start?.dateTime || event.start?.date).toLocaleString('ko-KR')}
- 장소: ${event.location || '미정'}
- 참석자: ${event.attendees?.length || 0}명
`).join('\n')}

다음 형식으로 작성:
📋 오늘의 핵심: (한 문장 요약)
⏰ 주요 일정: (시간순으로 간단히)
💡 준비사항: (필요한 것들)
🎯 우선순위: (가장 중요한 일정)
`;

            const briefing = await this.geminiService.model.generateContent(briefingPrompt);
            let briefingText = briefing.response.text();
            
            // 응답 필터링
            briefingText = this.cleanAIResponse(briefingText);

            return {
                type: 'text',
                message: briefingText,
                data: { events: eventItems },
                suggestions: [
                    { id: '1', title: '첫 번째 일정 상세', action: '첫 번째 일정 자세히' },
                    { id: '2', title: '내일 브리핑', action: '내일 일정 브리핑' },
                    { id: '3', title: '이번 주 요약', action: '이번 주 전체 요약' }
                ]
            };
        } catch (error) {
            console.error('Briefing error:', error);
            return {
                type: 'error',
                message: '브리핑 생성 중 오류가 발생했습니다.',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * 일정 수정 처리
     */
    private async handleEventUpdate(
        intent: AIIntent, 
        context: UserContext, 
        accessToken: string
    ): Promise<AIResponse> {
        try {
            const calendar = getCalendarClient(accessToken);
            
            // 최근 이벤트에서 수정할 이벤트 찾기
            const eventToUpdate = context.recentEvents.find(event => 
                intent.parameters?.eventId === event.id ||
                intent.parameters?.eventTitle?.includes(event.summary)
            );

            if (!eventToUpdate || !eventToUpdate.id) {
                // 수정할 이벤트를 명확히 하기 위해 목록 제공
                const upcomingEvents = context.recentEvents
                    .filter(e => new Date(e.start?.dateTime || e.start?.date || '') > new Date())
                    .slice(0, 5);

                return {
                    type: 'clarification',
                    message: '어떤 일정을 수정하시겠습니까?',
                    suggestions: upcomingEvents.map((event, idx) => ({
                        id: String(idx + 1),
                        title: `${event.summary} (${new Date(event.start?.dateTime || '').toLocaleString('ko-KR')})`,
                        action: `"${event.summary}" 일정 수정`
                    }))
                };
            }

            // 업데이트할 필드 구성
            const updates: any = {};
            if (intent.parameters?.newTime) {
                const newStartTime = contextManager.resolveTimeExpression(
                    intent.parameters.newTime, 
                    context.userId
                ) || new Date(intent.parameters.newTime);
                
                const duration = eventToUpdate.end && eventToUpdate.start
                    ? new Date(eventToUpdate.end.dateTime || '').getTime() - 
                      new Date(eventToUpdate.start.dateTime || '').getTime()
                    : 60 * 60 * 1000; // 기본 1시간

                updates.start = {
                    dateTime: newStartTime.toISOString(),
                    timeZone: context.timeZone
                };
                updates.end = {
                    dateTime: new Date(newStartTime.getTime() + duration).toISOString(),
                    timeZone: context.timeZone
                };
            }
            
            if (intent.parameters?.newLocation) {
                updates.location = intent.parameters.newLocation;
            }
            
            if (intent.parameters?.newTitle) {
                updates.summary = intent.parameters.newTitle;
            }

            // 이벤트 업데이트
            const response = await calendar.events.update({
                calendarId: 'primary',
                eventId: eventToUpdate.id,
                requestBody: { ...eventToUpdate, ...updates },
                sendUpdates: 'all'
            });

            // 컨텍스트 업데이트
            const updatedEvents = context.recentEvents.map(e => 
                e.id === eventToUpdate.id ? response.data : e
            );
            contextManager.updateRecentEvents(context.userId, updatedEvents as CalendarEvent[]);

            return {
                type: 'action',
                action: 'event_updated',
                message: `✅ "${eventToUpdate.summary}" 일정이 수정되었습니다.`,
                data: response.data,
                suggestions: [
                    { id: '1', title: '수정된 일정 확인', action: '오늘 일정 보여줘' },
                    { id: '2', title: '추가 수정', action: '다른 일정 수정' },
                    { id: '3', title: '새 일정 추가', action: '새 일정 추가' }
                ]
            };
        } catch (error) {
            console.error('Event update error:', error);
            return {
                type: 'error',
                message: '일정 수정 중 오류가 발생했습니다.',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * 일정 삭제 처리
     */
    private async handleEventDeletion(
        intent: AIIntent, 
        context: UserContext, 
        accessToken: string
    ): Promise<AIResponse> {
        try {
            const calendar = getCalendarClient(accessToken);
            
            // 삭제할 이벤트 찾기
            const eventToDelete = context.recentEvents.find(event => 
                intent.parameters?.eventId === event.id ||
                intent.parameters?.eventTitle?.includes(event.summary)
            );

            if (!eventToDelete || !eventToDelete.id) {
                // 삭제할 이벤트를 명확히 하기 위해 목록 제공
                const upcomingEvents = context.recentEvents
                    .filter(e => new Date(e.start?.dateTime || e.start?.date || '') > new Date())
                    .slice(0, 5);

                if (upcomingEvents.length === 0) {
                    return {
                        type: 'text',
                        message: '삭제할 수 있는 예정된 일정이 없습니다.'
                    };
                }

                return {
                    type: 'clarification',
                    message: '어떤 일정을 삭제하시겠습니까?',
                    suggestions: upcomingEvents.map((event, idx) => ({
                        id: String(idx + 1),
                        title: `${event.summary} (${new Date(event.start?.dateTime || '').toLocaleString('ko-KR')})`,
                        action: `"${event.summary}" 일정 삭제`
                    }))
                };
            }

            // 삭제 확인
            if (!intent.parameters?.confirmed) {
                return {
                    type: 'confirmation',
                    message: `정말로 "${eventToDelete.summary}" 일정을 삭제하시겠습니까?\n시간: ${new Date(eventToDelete.start?.dateTime || '').toLocaleString('ko-KR')}`,
                    suggestions: [
                        { id: '1', title: '예, 삭제합니다', action: `확실히 "${eventToDelete.summary}" 삭제` },
                        { id: '2', title: '아니오, 취소', action: '취소' }
                    ]
                };
            }

            // 이벤트 삭제 실행
            await calendar.events.delete({
                calendarId: 'primary',
                eventId: eventToDelete.id,
                sendUpdates: 'all' // 참석자에게 취소 알림 발송
            });

            // 컨텍스트에서 삭제된 이벤트 제거
            const updatedEvents = context.recentEvents.filter(e => e.id !== eventToDelete.id);
            contextManager.updateRecentEvents(context.userId, updatedEvents);

            return {
                type: 'action',
                action: 'event_deleted',
                message: `✅ "${eventToDelete.summary}" 일정이 삭제되었습니다.`,
                data: { deletedEventId: eventToDelete.id },
                suggestions: [
                    { id: '1', title: '삭제 취소', action: `"${eventToDelete.summary}" 다시 추가` },
                    { id: '2', title: '오늘 일정 확인', action: '오늘 일정 보여줘' },
                    { id: '3', title: '새 일정 추가', action: '새 일정 추가' }
                ]
            };
        } catch (error) {
            console.error('Event deletion error:', error);
            return {
                type: 'error',
                message: '일정 삭제 중 오류가 발생했습니다.',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * 배치 작업 처리
     */
    private async handleBatchOperation(
        intent: AIIntent, 
        context: UserContext, 
        accessToken: string
    ): Promise<AIResponse> {
        // TODO: 구현 예정
        return {
            type: 'text',
            message: '배치 작업 기능은 곧 추가될 예정입니다. 어떤 작업을 수행하고 싶으신가요?'
        };
    }

    /**
     * 일반 대화 처리
     */
    private async handleConversation(
        message: string, 
        context: UserContext
    ): Promise<AIResponse> {
        try {
            // 자연어 시간 표현 감지 및 해석
            const timeExpression = contextManager.resolveTimeExpression(message, context.userId);
            let timeContext = '';
            
            if (timeExpression) {
                timeContext = `\n참고: 사용자가 언급한 시간은 ${timeExpression.toLocaleString('ko-KR')}입니다.`;
            }
            
            const prompt = `
당신은 친근하고 도움이 되는 AI 캘린더 비서입니다.
사용자의 메시지에 자연스럽게 응답하되, 필요한 경우 캘린더 관련 기능을 제안하세요.

현재 시간: ${context.currentTime.toLocaleString('ko-KR')}
최근 일정: ${context.recentEvents.slice(0, 3).map(e => e.summary).join(', ') || '없음'}
${timeContext}
사용자 메시지: "${message}"

자연스럽고 간결하게 응답해주세요.
`;

            const result = await this.geminiService.model.generateContent(prompt);
            let response = result.response.text();
            
            // 응답 필터링
            response = this.cleanAIResponse(response);
            
            // 컨텍스트 기반 스마트 제안
            const smartSuggestions = contextManager.generateSmartSuggestions(
                context.userId,
                context.recentEvents
            );

            return {
                type: 'text',
                message: response,
                suggestions: smartSuggestions.slice(0, 3).map((suggestion, idx) => ({
                    id: String(idx + 1),
                    title: suggestion,
                    action: suggestion
                }))
            };
        } catch (error) {
            console.error('Conversation error:', error);
            return {
                type: 'text',
                message: '죄송합니다. 다시 말씀해 주시겠어요?'
            };
        }
    }
}

// 싱글톤 인스턴스
export const aiRouter = new AIRouter();