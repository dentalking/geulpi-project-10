import { geminiService } from './gemini-service';
import { getCalendarClient } from './google-auth';
import { contextManager } from './context-manager';
import type { AIIntent, UserContext, CalendarEvent } from '@/types';

class AIRouter {
    async processMessage(message: string, context: UserContext, accessToken: string, selectedEventId?: string, pendingEventData?: any) {
        // 1. 의도 분류
        const intent = await this.classifyIntent(message, context, selectedEventId);

        // 2. 적절한 핸들러로 라우팅
        switch (intent.type) {
            case 'CREATE_EVENT':
                return this.handleEventCreation(intent, context, message, accessToken, pendingEventData);
            case 'SEARCH_EVENTS':
                return this.handleEventSearch(intent, context, accessToken);
            case 'GET_BRIEFING':
                return this.handleBriefing(intent, context, accessToken);
            case 'UPDATE_EVENT':
                return this.handleEventUpdate(intent, context, message, accessToken, selectedEventId);
            case 'DELETE_EVENT':
                return this.handleEventDeletion(intent, context, message, accessToken, selectedEventId);
            case 'BATCH_OPERATION':
                return this.handleBatchOperation(intent, context, accessToken);
            default:
                return this.handleConversation(message, context);
        }
    }

    private async classifyIntent(message: string, context: UserContext, selectedEventId?: string): Promise<AIIntent> {
        const prompt = `
사용자 메시지를 분석하여 의도를 분류해주세요.
현재 시간: ${context.currentTime.toLocaleString('ko-KR')}
최근 일정: ${context.recentEvents.slice(0, 3).map(e => e.summary).join(', ')}
${selectedEventId ? '선택된 일정이 있음 (수정/삭제 의도일 가능성 높음)' : ''}

메시지: "${message}"

다음 JSON 형식으로 응답:
{
  "type": "CREATE_EVENT|SEARCH_EVENTS|GET_BRIEFING|UPDATE_EVENT|DELETE_EVENT|BATCH_OPERATION|CONVERSATION",
  "confidence": 0.0-1.0,
  "parameters": {}
}

예시:
- "내일 2시 미팅" → CREATE_EVENT
- "이번 주 일정 보여줘" → SEARCH_EVENTS  
- "오늘 브리핑" → GET_BRIEFING
- "미팅 시간 변경" → UPDATE_EVENT
- "중복 일정 정리" → BATCH_OPERATION
`;

        try {
            const result = await geminiService.model.generateContent(prompt);
            const response = await result.response.text();
            const cleaned = response.replace(/```json\n?/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (error) {
            console.error('Intent classification error:', error);
            return { type: 'CONVERSATION', confidence: 0.5, parameters: {} };
        }
    }

    private async handleEventCreation(intent: AIIntent, context: UserContext, originalMessage: string, accessToken: string, pendingEventData?: any) {
        try {
            // Use pending event data if available, otherwise parse from text
            const eventData = pendingEventData || await geminiService.parseEventFromText(originalMessage);
            
            console.log('Creating event with data:', eventData);
            const calendar = getCalendarClient(accessToken);

            const startDateTime = new Date(`${eventData.date}T${eventData.time}:00`);
            const endDateTime = new Date(startDateTime);
            endDateTime.setMinutes(endDateTime.getMinutes() + (eventData.duration || 60));

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
            };

            const response = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
            });

            return {
                type: 'action',
                action: 'event_created',
                message: `"${eventData.title}" 일정이 ${startDateTime.toLocaleString('ko-KR')}에 추가되었습니다.`,
                data: response.data
            };
        } catch (error) {
            console.error('Event creation error:', error);
            return {
                type: 'error',
                message: `일정 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            };
        }
    }

    private async handleEventSearch(intent: AIIntent, context: UserContext, accessToken: string) {
        try {
            const calendar = getCalendarClient(accessToken);
            const now = new Date();

            // 기본적으로 앞으로 2주간의 일정 조회
            const events = await calendar.events.list({
                calendarId: 'primary',
                timeMin: now.toISOString(),
                timeMax: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                maxResults: 20,
                singleEvents: true,
                orderBy: 'startTime',
            });

            const eventItems = events.data.items || [];

            return {
                type: 'data',
                action: 'events_found',
                message: `${eventItems.length}개의 일정을 찾았습니다.`,
                data: { events: eventItems }
            };
        } catch (error) {
            console.error('Event search error:', error);
            return {
                type: 'error',
                message: `일정 검색 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            };
        }
    }

    private async handleBriefing(intent: AIIntent, context: UserContext, accessToken: string) {
        try {
            const calendar = getCalendarClient(accessToken);
            const now = new Date();
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const events = await calendar.events.list({
                calendarId: 'primary',
                timeMin: today.toISOString(),
                timeMax: tomorrow.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });

            const eventItems = events.data.items || [];

            if (eventItems.length === 0) {
                return {
                    type: 'text',
                    message: '오늘은 예정된 일정이 없습니다. 여유로운 하루를 보내세요!'
                };
            }

            const briefingPrompt = `
다음은 오늘의 일정입니다. 간결하고 실용적인 브리핑을 작성해주세요.

일정 목록:
${eventItems.map((event: any, i: number) => `
${i + 1}. ${event.summary}
- 시간: ${new Date(event.start?.dateTime || event.start?.date).toLocaleString('ko-KR')}
- 장소: ${event.location || '미정'}
`).join('\n')}

다음 형식으로 작성:
📋 오늘의 핵심: (한 문장 요약)
⏰ 주요 일정: (시간순으로 간단히)
💡 준비사항: (필요한 것들)
`;

            const result = await geminiService.model.generateContent(briefingPrompt);
            const briefing = await result.response.text();

            return {
                type: 'text',
                message: briefing,
                data: { events: eventItems }
            };
        } catch (error) {
            console.error('Briefing error:', error);
            return {
                type: 'error',
                message: `브리핑 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            };
        }
    }

    private async handleEventUpdate(intent: AIIntent, context: UserContext, message: string, accessToken: string, selectedEventId?: string) {
        if (!selectedEventId) {
            return {
                type: 'text',
                message: '수정할 일정을 먼저 선택해주세요. 캘린더에서 일정을 클릭하거나 일정 이름을 말씀해주세요.'
            };
        }

        try {
            const calendar = getCalendarClient(accessToken);
            
            // 기존 일정 가져오기
            const existingEvent = await calendar.events.get({
                calendarId: 'primary',
                eventId: selectedEventId
            });

            // 메시지에서 업데이트할 내용 파싱
            const updatePrompt = `
사용자가 일정을 수정하려고 합니다.
현재 일정: ${existingEvent.data.summary}
시작: ${existingEvent.data.start?.dateTime || existingEvent.data.start?.date}
장소: ${existingEvent.data.location || '없음'}

사용자 메시지: "${message}"

다음 JSON 형식으로 변경사항만 추출해주세요:
{
  "summary": "새 제목 (변경시)",
  "newDate": "YYYY-MM-DD (날짜 변경시)",
  "newTime": "HH:MM (시간 변경시)",
  "location": "새 장소 (장소 변경시)",
  "description": "새 설명 (설명 변경시)"
}
변경하지 않는 필드는 포함하지 마세요.
`;

            const result = await geminiService.model.generateContent(updatePrompt);
            const response = await result.response.text();
            const updates = JSON.parse(response.replace(/```json\n?/g, '').replace(/```/g, '').trim());

            // 업데이트할 이벤트 객체 생성
            const updatedEvent: any = { ...existingEvent.data };
            
            if (updates.summary) {
                updatedEvent.summary = updates.summary;
            }
            
            if (updates.newDate || updates.newTime) {
                const currentStart = new Date(existingEvent.data.start?.dateTime || existingEvent.data.start?.date || '');
                const currentEnd = new Date(existingEvent.data.end?.dateTime || existingEvent.data.end?.date || '');
                const duration = currentEnd.getTime() - currentStart.getTime();
                
                if (updates.newDate) {
                    const [year, month, day] = updates.newDate.split('-').map(Number);
                    currentStart.setFullYear(year, month - 1, day);
                }
                
                if (updates.newTime) {
                    const [hour, minute] = updates.newTime.split(':').map(Number);
                    currentStart.setHours(hour, minute, 0, 0);
                }
                
                const newEnd = new Date(currentStart.getTime() + duration);
                
                updatedEvent.start = {
                    dateTime: currentStart.toISOString(),
                    timeZone: context.timeZone
                };
                updatedEvent.end = {
                    dateTime: newEnd.toISOString(),
                    timeZone: context.timeZone
                };
            }
            
            if (updates.location) {
                updatedEvent.location = updates.location;
            }
            
            if (updates.description) {
                updatedEvent.description = updates.description;
            }

            // Google Calendar API로 업데이트
            const updateResponse = await calendar.events.update({
                calendarId: 'primary',
                eventId: selectedEventId,
                requestBody: updatedEvent
            });

            return {
                type: 'action',
                action: 'event_updated',
                message: `"${updatedEvent.summary}" 일정이 성공적으로 수정되었습니다.`,
                eventSummary: updatedEvent.summary,
                data: updateResponse.data
            };
        } catch (error) {
            console.error('Event update error:', error);
            return {
                type: 'error',
                message: `일정 수정 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            };
        }
    }

    private async handleEventDeletion(intent: AIIntent, context: UserContext, message: string, accessToken: string, selectedEventId?: string) {
        if (!selectedEventId) {
            return {
                type: 'text',
                message: '삭제할 일정을 먼저 선택해주세요. 캘린더에서 일정을 클릭해주세요.'
            };
        }

        try {
            const calendar = getCalendarClient(accessToken);
            
            // 기존 일정 정보 가져오기 (삭제 전 확인용)
            const existingEvent = await calendar.events.get({
                calendarId: 'primary',
                eventId: selectedEventId
            });

            const eventTitle = existingEvent.data.summary || '제목 없음';

            // 삭제 확인 메시지에 "삭제"라는 단어가 포함되어 있는지 확인
            if (!message.includes('삭제') && !message.includes('지워') && !message.includes('취소')) {
                return {
                    type: 'text',
                    message: `"${eventTitle}" 일정을 삭제하시겠습니까? 삭제하려면 "삭제해주세요"라고 말씀해주세요.`
                };
            }

            // Google Calendar API로 삭제
            await calendar.events.delete({
                calendarId: 'primary',
                eventId: selectedEventId
            });

            return {
                type: 'action',
                action: 'event_deleted',
                message: `"${eventTitle}" 일정이 삭제되었습니다.`,
                eventSummary: eventTitle
            };
        } catch (error) {
            console.error('Event deletion error:', error);
            return {
                type: 'error',
                message: `일정 삭제 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
            };
        }
    }

    private async handleBatchOperation(intent: AIIntent, context: UserContext, accessToken: string) {
        return {
            type: 'text',
            message: '배치 작업 기능은 곧 추가될 예정입니다.'
        };
    }

    private async handleConversation(message: string, context: UserContext) {
        try {
            const prompt = `
당신은 친근하고 도움이 되는 AI 캘린더 비서입니다.
사용자의 메시지에 자연스럽게 응답하되, 필요한 경우 캘린더 관련 기능을 제안하세요.

현재 시간: ${context.currentTime.toLocaleString('ko-KR')}
사용자 메시지: "${message}"

자연스럽고 간결하게 응답해주세요.
`;

            const result = await geminiService.model.generateContent(prompt);
            const response = await result.response.text();

            return {
                type: 'text',
                message: response
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

export const aiRouter = new AIRouter();