import { GoogleGenerativeAI, GenerativeModel, ChatSession } from '@google/generative-ai';
import { parseKoreanDateTime } from '@/lib/date-parser';

export interface ChatResponse {
  message: string;  // 사용자에게 보여줄 메시지
  action?: {
    type: 'create' | 'update' | 'delete' | 'search' | 'list' | 'create_multiple' | 'friend_action';
    data?: any;
  };
  events?: any[];  // 조회된 일정들
  suggestions?: string[];  // 추천 질문들
  requiresConfirmation?: boolean;  // 사용자 확인 필요 여부
  pendingAction?: {  // 확인 대기 중인 액션
    type: string;
    data?: any;
  };
  createdEventId?: string;  // 생성된 일정의 ID (하이라이트용)
}

export class ChatCalendarService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private chatSessions: Map<string, ChatSession> = new Map();
  private conversationHistories: Map<string, { role: string; parts: string }[]> = new Map();
  private recentlyCreatedEvents: Map<string, { title: string; date: string; time: string; createdAt: Date }[]> = new Map();

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });
  }

  /**
   * 특정 세션의 대화 컨텍스트 초기화
   */
  clearHistory(sessionId: string) {
    this.chatSessions.delete(sessionId);
    this.conversationHistories.delete(sessionId);
  }

  /**
   * 세션 가져오기 또는 생성
   */
  private getOrCreateSession(sessionId: string): ChatSession {
    if (!this.chatSessions.has(sessionId)) {
      const history = this.conversationHistories.get(sessionId) || [];
      const chat = this.model.startChat({
        history: history.map(h => ({
          role: h.role,
          parts: [{ text: h.parts }]
        })),
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
      });
      this.chatSessions.set(sessionId, chat);
    }
    return this.chatSessions.get(sessionId)!;
  }

  /**
   * 채팅 메시지 처리 (모든 캘린더 작업 통합)
   */
  async processMessage(
    message: string,
    currentEvents: any[] = [],
    userContext?: { sessionId?: string; timezone?: string; locale?: string; lastExtractedEvent?: any; userProfile?: any }
  ): Promise<ChatResponse> {
    const currentDateTime = new Date().toLocaleString('ko-KR', {
      timeZone: userContext?.timezone || 'Asia/Seoul'
    });

    const sessionId = userContext?.sessionId || 'default';
    const chat = this.getOrCreateSession(sessionId);

    // Check if this is a place/location search request
    const isPlaceSearch = /카페|커피|음식점|맛집|식당|레스토랑|장소|추천|근처|주변/i.test(message) ||
                          /cafe|coffee|restaurant|place|recommend|near|around/i.test(message);

    // Handle place search requests
    if (isPlaceSearch) {
      try {
        // Extract location from message (e.g., "강남역", "Gangnam Station")
        const locationMatch = message.match(/([가-힣]+역|[가-힣]+동|[가-힣]+구|[가-힣]+시|[가-힣]+\s*\d+번\s*출구|[a-zA-Z\s]+station|[a-zA-Z\s]+dong)/i);
        const location = locationMatch ? locationMatch[0] : '서울';

        // Extract place type (cafe, restaurant, etc.)
        let placeType = '카페';
        if (/음식점|맛집|식당|레스토랑/i.test(message)) {
          placeType = '음식점';
        } else if (/커피|카페|cafe|coffee/i.test(message)) {
          placeType = '카페';
        }

        // Call Google Places API
        const query = `${location} ${placeType}`;
        const apiUrl = `/api/maps/search?query=${encodeURIComponent(query)}`;

        const placeResponse = await fetch(process.env.NEXTAUTH_URL ?
          `${process.env.NEXTAUTH_URL}${apiUrl}` :
          `http://localhost:3000${apiUrl}`);

        if (placeResponse.ok) {
          const placeData = await placeResponse.json();
          const places = placeData.places || [];

          // Generate response with actual places
          if (places.length > 0) {
            const topPlaces = places.slice(0, 3);
            let responseMessage = `${location} 근처의 추천 ${placeType} ${topPlaces.length}곳을 찾았어요!\n\n`;

            topPlaces.forEach((place: any, index: number) => {
              responseMessage += `${index + 1}. **${place.name}**\n`;
              if (place.address) responseMessage += `   📍 ${place.address}\n`;
              if (place.rating) responseMessage += `   ⭐ 평점: ${place.rating}/5\n`;
              if (place.openNow !== undefined) {
                responseMessage += `   ${place.openNow ? '🟢 영업중' : '🔴 영업종료'}\n`;
              }
              responseMessage += '\n';
            });

            responseMessage += `더 자세한 정보나 다른 지역의 ${placeType}을 찾으시려면 말씀해주세요!`;

            return {
              message: responseMessage,
              suggestions: [
                `${location} 조용한 카페`,
                `${location} 맛집 추천`,
                '다른 지역 검색하기'
              ]
            };
          }
        }
      } catch (error) {
        console.error('Place search error:', error);
      }
    }

    // Check for recent duplicates
    const recentEvents = this.recentlyCreatedEvents.get(sessionId) || [];
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const activeRecentEvents = recentEvents.filter(e => e.createdAt > tenMinutesAgo);
    this.recentlyCreatedEvents.set(sessionId, activeRecentEvents);

    const isEnglish = userContext?.locale === 'en';
    const profile = userContext?.userProfile;
    
    // Build user context from profile
    const profileContext = profile ? `
${isEnglish ? 'User Profile Information:' : '사용자 프로필 정보:'}
${profile.full_name ? `- ${isEnglish ? 'Name' : '이름'}: ${profile.full_name}` : ''}
${profile.occupation ? `- ${isEnglish ? 'Occupation' : '직업'}: ${profile.occupation}` : ''}
${profile.home_address ? `- ${isEnglish ? 'Home' : '집'}: ${profile.home_address}` : ''}
${profile.work_address ? `- ${isEnglish ? 'Work/School' : '직장/학교'}: ${profile.work_address}` : ''}
${profile.work_start_time && profile.work_end_time ? `- ${isEnglish ? 'Work hours' : '근무시간'}: ${profile.work_start_time} - ${profile.work_end_time}` : ''}
${profile.wake_up_time ? `- ${isEnglish ? 'Wake up time' : '기상시간'}: ${profile.wake_up_time}` : ''}
${profile.sleep_time ? `- ${isEnglish ? 'Sleep time' : '취침시간'}: ${profile.sleep_time}` : ''}
${profile.interests?.length > 0 ? `- ${isEnglish ? 'Interests' : '관심사'}: ${profile.interests.join(', ')}` : ''}
${profile.goals?.length > 0 ? `- ${isEnglish ? 'Goals' : '목표'}: ${profile.goals.join(', ')}` : ''}
${profile.allergies?.length > 0 ? `- ${isEnglish ? 'Allergies' : '알레르기'}: ${profile.allergies.join(', ')}` : ''}
${profile.dietary_preferences?.length > 0 ? `- ${isEnglish ? 'Dietary preferences' : '식단 선호'}: ${profile.dietary_preferences.join(', ')}` : ''}
${profile.exercise_routine ? `- ${isEnglish ? 'Exercise routine' : '운동 루틴'}: ${profile.exercise_routine}` : ''}
` : '';
    
    // 세션에 대화 히스토리가 있는지 확인
    const hasHistory = this.conversationHistories.has(sessionId) && 
                       this.conversationHistories.get(sessionId)!.length > 0;
    
    const prompt = `
${isEnglish ? 'You are a friendly and capable calendar assistant.' : '당신은 친절하고 유능한 캘린더 비서입니다.'}
${hasHistory ? (isEnglish ? 'Continue the conversation naturally, remembering previous context.' : '이전 대화 맥락을 기억하며 자연스럽게 대화를 이어가세요.') : ''}
${isEnglish ? 'Current time:' : '현재 시간:'} ${currentDateTime}
${isEnglish ? 'User timezone:' : '사용자 시간대:'} ${userContext?.timezone || 'Asia/Seoul'}
${isEnglish ? 'User language: English' : '사용자 언어: 한국어'}
${profileContext}

${activeRecentEvents.length > 0 ? `
${isEnglish ? 'Recently created events (last 10 minutes):' : '최근 생성된 일정 (10분 이내):'}
${activeRecentEvents.map(e => `- ${e.title} (${e.date} ${e.time})`).join('\n')}
` : ''}

${userContext?.lastExtractedEvent ? `
최근 추출된 일정 정보:
제목: ${userContext.lastExtractedEvent.title}
날짜: ${userContext.lastExtractedEvent.date}
시간: ${userContext.lastExtractedEvent.time}
장소: ${userContext.lastExtractedEvent.location || '미정'}
설명: ${userContext.lastExtractedEvent.description || '없음'}
` : ''}

세션 ID: ${sessionId}

현재 등록된 일정 (${currentEvents.length}개):
${currentEvents.slice(0, 10).map(e => {
  const startDate = new Date(e.start?.dateTime || e.start?.date || '');
  // Use toLocaleDateString with Asia/Seoul timezone
  const dateStr = startDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }); // en-CA gives YYYY-MM-DD format
  const timeStr = e.start?.dateTime 
    ? startDate.toLocaleTimeString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false })
    : '종일';
  return `- [ID: ${e.id}] ${e.summary}: ${dateStr} ${timeStr}`;
}).join('\n')}

사용자 메시지: "${message}"

${hasHistory ? '이전 대화 맥락을 유지하면서' : '위 정보를 바탕으로'} 다음과 같이 응답해주세요:

${profile ? `
중요: 사용자의 프로필 정보를 활용하여 더 개인화된 응답을 제공하세요:
- 집/직장 위치를 언급할 때 실제 주소를 활용
- 근무시간, 기상/취침 시간을 고려한 일정 제안
- 관심사와 목표를 반영한 일정 추천
- 알레르기나 식단 선호를 고려한 식사 일정 제안
- 운동 루틴을 고려한 운동 일정 제안
` : ''}

1. 먼저 사용자의 의도를 파악하세요:
   - CREATE: 새 일정 추가 (예: "내일 3시 회의 추가해줘")
     * "이것을 등록해줘", "register this" 같은 참조 명령은 최근 추출된 일정을 등록하는 것임
     * 단일 일정: {"type":"create","data":{"title":"회의","date":"2024-01-11","time":"15:00"}}
     * 여러 일정: {"type":"create_multiple","data":{"events":[{"title":"회의1","date":"2024-01-11","time":"10:00"},{"title":"회의2","date":"2024-01-12","time":"14:00"}]}}
   - UPDATE: 기존 일정 수정 (예: "회의 시간 4시로 변경", "전주 여행에 맛집 정보 추가")
     * 특정 일정을 수정할 때는 반드시 해당 일정의 eventId를 찾아서 포함시켜야 함
     * "전주 여행 준비사항 추가" 같은 경우 현재 일정 목록에서 "전주 여행"을 찾아 그 eventId로 수정
   - DELETE: 일정 삭제 (예: "오늘 회의 취소해줘", "중복 제거해줘", "오늘 일정 모두 삭제")
     * 개별 삭제: eventId 포함
     * 전체 삭제: eventIds 배열 포함 (예: {"type":"delete","data":{"eventIds":["id1","id2","id3"]}})
   - SEARCH: 일정 검색/조회 (예: "이번 주 일정 보여줘", "오늘 일정 알려줘", "내일 일정 보여줘")
     * 조회 시: {"type":"search","data":{"query":"오늘", "startDate":"2024-01-10", "endDate":"2024-01-10"}}
   - FRIEND: 친구 관련 작업 (예: "email@example.com 친구 추가", "친구 목록 보여줘", "친구 요청 수락")
     * 친구 추가: {"type":"friend_action","data":{"action":"add","email":"friend@example.com"}}
     * 친구 목록: {"type":"friend_action","data":{"action":"list"}}
     * 친구 요청 보기: {"type":"friend_action","data":{"action":"view_requests"}}
     * 친구 요청 수락: {"type":"friend_action","data":{"action":"accept","requestId":"request_id"}}
   - CHAT: 일반 대화 (예: "안녕", "고마워")

2. 응답 형식:
---RESPONSE---
[사용자에게 보낼 친근한 한국어 메시지]
---ACTION---
[수행할 작업이 있다면 JSON 형태로, 없으면 NONE]
---SUGGESTIONS---
[사용자가 할 수 있는 다음 질문 3개, 쉼표로 구분]

예시 응답:

단일 이벤트 생성 예시:
---RESPONSE---
네, 내일 오후 3시에 회의 일정을 추가했습니다. 장소나 참석자 정보도 추가하시겠어요?
---ACTION---
{"type":"create","data":{"title":"회의","date":"2024-01-11","time":"15:00","duration":60}}
---SUGGESTIONS---
회의 장소 추가하기, 참석자 이메일 추가하기, 오늘 일정 확인하기

다중 이벤트 생성 예시 (중요: 여러 일정을 한 번에 생성할 때):
사용자: "1월 20일 오전 10시 팀 미팅, 1월 21일 오후 2시 프로젝트 발표, 1월 22일 오전 11시 고객 미팅 추가해줘"
---RESPONSE---
네, 3개의 일정을 모두 추가했습니다. 1월 20일 팀 미팅, 21일 프로젝트 발표, 22일 고객 미팅이 등록되었어요.
---ACTION---
{"type":"create_multiple","data":{"events":[{"title":"팀 미팅","date":"2025-01-20","time":"10:00","duration":60},{"title":"프로젝트 발표","date":"2025-01-21","time":"14:00","duration":60},{"title":"고객 미팅","date":"2025-01-22","time":"11:00","duration":60}]}}
---SUGGESTIONS---
각 일정에 장소 추가하기, 참석자 추가하기, 1월 일정 확인하기

일정 수정 예시:
---RESPONSE---
네, 전주 여행 일정에 맛집 정보를 추가했습니다. 전주에서 꼭 가봐야 할 맛집들을 설명에 포함시켰어요.
---ACTION---
{"type":"update","data":{"eventId":"abc123xyz","description":"전주 여행\\n추천 맛집: 한옥마을 비빔밥, 막걸리골목, 콩나물국밥 거리"}}
---SUGGESTIONS---
숙소 정보 추가하기, 교통편 확인하기, 전주 관광지 추천받기

중복 삭제 예시:
---RESPONSE---
중복된 "회의" 일정 중 하나를 삭제했습니다.
---ACTION---
{"type":"delete","data":{"eventId":"abc123xyz"}}
---SUGGESTIONS---
남은 일정 확인하기, 다른 중복 일정 찾기, 새 일정 추가하기

오늘 일정 모두 삭제 예시:
---RESPONSE---
오늘 일정을 모두 삭제했습니다. 오늘은 편안하게 휴식을 취하시는 건 어떠세요?
---ACTION---
{"type":"delete","data":{"eventIds":["abc123","def456","ghi789"]}}
---SUGGESTIONS---
내일 일정 확인하기, 새 일정 추가하기, 이번 주 일정 보기

일정 조회 예시:
---RESPONSE---
오늘 등록된 일정을 확인해 드릴게요.
---ACTION---
{"type":"search","data":{"query":"오늘","startDate":"${new Date().toISOString().split('T')[0]}","endDate":"${new Date().toISOString().split('T')[0]}"}}
---SUGGESTIONS---
일정 추가하기, 내일 일정 보기, 이번 주 일정 확인하기

내일 일정 조회 예시:
---RESPONSE---
내일 예정된 일정을 확인해 드릴게요.
---ACTION---
{"type":"search","data":{"query":"내일","startDate":"${new Date(Date.now() + 86400000).toISOString().split('T')[0]}","endDate":"${new Date(Date.now() + 86400000).toISOString().split('T')[0]}"}}
---SUGGESTIONS---
내일 일정 추가하기, 오늘 일정 보기, 이번 주 일정 확인하기

친구 추가 예시:
사용자: "optiroomhr@gmail.com을 친구로 추가해줘"
---RESPONSE---
optiroomhr@gmail.com님에게 친구 요청을 보냈습니다. 상대방이 수락하면 친구가 됩니다!
---ACTION---
{"type":"friend_action","data":{"action":"add","email":"optiroomhr@gmail.com"}}
---SUGGESTIONS---
친구 목록 보기, 친구 요청 확인하기, 새 친구 추가하기

친구 목록 조회 예시:
---RESPONSE---
친구 목록을 확인해 드릴게요.
---ACTION---
{"type":"friend_action","data":{"action":"list"}}
---SUGGESTIONS---
친구 추가하기, 친구와 약속 잡기, 친구 요청 확인하기

${isEnglish ? `
IMPORTANT:
- Respond ONLY in English
- Be conversational and natural
- When creating multiple events (2 or more), ALWAYS use "create_multiple" with events array
- When creating single event, use "create" with single data object
- Check the "Recently created events" list to avoid creating duplicates
- If a similar event was just created, acknowledge it instead of creating a new one
- Acknowledge if an action might already be done when requested multiple times` : `
중요:
- 한국어로만 응답하세요
- 자연스럽고 대화적으로 응답하세요
- 여러 개의 일정(2개 이상)을 생성할 때는 반드시 "create_multiple"과 events 배열을 사용하세요
- 단일 일정을 생성할 때만 "create"와 단일 data 객체를 사용하세요
- "최근 생성된 일정" 목록을 확인하여 중복 생성을 피하세요
- 유사한 일정이 방금 생성되었다면 새로 만들지 말고 이미 생성되었음을 알려주세요
- 같은 작업을 여러 번 요청받으면 이미 완료되었을 수 있음을 알려주세요`}
`;

    try {
      // 대화 히스토리가 있고 일반 대화일 때는 간소화된 프롬프트 사용
      const isGeneralChat = hasHistory &&
        !message.includes('일정') && !message.includes('캘린더') &&
        !message.includes('event') && !message.includes('calendar') &&
        !message.includes('추가') && !message.includes('수정') &&
        !message.includes('삭제') && !message.includes('보여') &&
        !message.includes('add') && !message.includes('update') &&
        !message.includes('delete') && !message.includes('show') &&
        !message.includes('친구') && !message.includes('friend') &&
        !message.includes('@');
      
      const messageToSend = isGeneralChat 
        ? `사용자 메시지: "${message}"
        
이전 대화 맥락을 유지하면서 자연스럽게 응답하세요.

---RESPONSE---
[친근한 응답]
---ACTION---
NONE
---SUGGESTIONS---
[추천 질문 3개, 쉼표로 구분]`
        : prompt;
      
      const result = await chat.sendMessage(messageToSend);
      const response = result.response.text();
      
      // 응답 파싱
      console.log('[ChatCalendarService] Raw Gemini response:', response);
      
      const responseParts = response.split('---');
      let userMessage = isEnglish ? 'Sorry, I didn\'t understand that.' : '죄송합니다, 이해하지 못했습니다.';
      let action: any = undefined;
      let suggestions: string[] = [];

      for (let i = 0; i < responseParts.length; i++) {
        const part = responseParts[i].trim();
        
        if (part === 'RESPONSE' || part.startsWith('RESPONSE')) {
          // Get the next part which contains the actual message
          if (i + 1 < responseParts.length) {
            const messageContent = responseParts[i + 1].trim();
            if (messageContent && !messageContent.startsWith('ACTION')) {
              userMessage = messageContent;
              console.log('[ChatCalendarService] Extracted message:', userMessage);
            }
          }
        } else if (part === 'ACTION' || part.startsWith('ACTION')) {
          let actionText = responseParts[i + 1]?.trim();
          if (actionText && actionText !== 'NONE') {
            try {
              // Remove markdown code block if present
              if (actionText.startsWith('```')) {
                actionText = actionText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
              }
              action = JSON.parse(actionText);
              console.log('[ChatCalendarService] Parsed action:', action);
            } catch (e) {
              console.error('Failed to parse action:', actionText, e);
            }
          }
        } else if (part === 'SUGGESTIONS' || part.startsWith('SUGGESTIONS')) {
          // Get the next part which contains the actual suggestions
          if (i + 1 < responseParts.length) {
            const sugText = responseParts[i + 1].trim();
            if (sugText && !sugText.startsWith('RESPONSE') && !sugText.startsWith('ACTION')) {
              suggestions = sugText.split(',').map(s => s.trim());
              console.log('[ChatCalendarService] Extracted suggestions:', suggestions);
            }
          }
        }
      }
      
      // If parsing failed, try to extract meaningful response
      if (userMessage === (isEnglish ? 'Sorry, I didn\'t understand that.' : '죄송합니다, 이해하지 못했습니다.') && response.length > 0) {
        // Try to use the raw response if parsing failed
        console.warn('[ChatCalendarService] Failed to parse response format, using raw response');
        userMessage = response.substring(0, 500); // Limit length
      }

      // 대화 히스토리 저장 (세션 재생성시 사용)
      const history = await chat.getHistory();
      this.conversationHistories.set(sessionId, history.map(h => ({
        role: h.role,
        parts: h.parts.map(p => 'text' in p ? p.text : '').join('')
      })));

      // Track created events to prevent duplicates
      if (action && action.type === 'create' && action.data) {
        const recentEvents = this.recentlyCreatedEvents.get(sessionId) || [];
        recentEvents.push({
          title: (action.data as any).title || '',
          date: (action.data as any).date || '',
          time: (action.data as any).time || '',
          createdAt: new Date()
        });
        this.recentlyCreatedEvents.set(sessionId, recentEvents);
      }

      const finalResponse = {
        message: userMessage,
        action,
        suggestions
      };
      
      console.log('[ChatCalendarService] Final response:', {
        messageLength: userMessage.length,
        hasAction: !!action,
        suggestionsCount: suggestions.length,
        message: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : '')
      });
      
      return finalResponse;

    } catch (error) {
      console.error('Chat processing error:', error);
      return {
        message: '죄송합니다. 요청을 처리하는 중에 문제가 발생했습니다. 다시 시도해주세요.',
        suggestions: ['다시 시도하기', '도움말 보기', '일정 목록 보기']
      };
    }
  }

  /**
   * 이미지에서 일정 추출 (개선된 버전)
   */
  async extractEventFromImage(imageData: string, mimeType: string, locale: string = 'ko', sessionId: string = 'default'): Promise<ChatResponse> {
    // Extract actual MIME type from data URL if present
    let actualMimeType = mimeType;
    if (imageData.startsWith('data:')) {
      const mimeMatch = imageData.match(/data:([^;]+);/);
      if (mimeMatch) {
        actualMimeType = mimeMatch[1];
      }
    }

    // Ensure imageData is properly formatted
    if (!imageData || imageData === 'image' || imageData.length < 100) {
      console.error('Invalid image data received:', imageData?.substring(0, 50));
      return {
        message: locale === 'ko' 
          ? '이미지 데이터가 올바르지 않습니다. 다시 시도해주세요.'
          : 'Invalid image data. Please try again.',
        suggestions: locale === 'ko'
          ? ['다시 시도하기', '직접 입력하기']
          : ['Try again', 'Enter manually']
      };
    }
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();
    
    const prompt = locale === 'ko' ? `
이미지를 매우 신중하게 분석하여 모든 캘린더 일정 정보를 정확하게 추출해주세요.
오늘 날짜: ${currentYear}년 ${currentMonth}월 ${currentDay}일

이미지에서 찾을 수 있는 모든 일정을 추출하세요:
1. 이벤트 제목 (포스터 제목, 행사명, 회의 이름 등)
2. 날짜와 시간 (년도가 없으면 ${currentYear}년으로 가정)
3. 장소 (온라인/오프라인 구분 포함)
4. 참석자나 주최자
5. 기타 중요 정보

중요:
- 여러 날짜가 있으면 각각을 별도의 일정으로 추출하세요
- 예: "10월 18일, 19일" → 2개의 별도 일정
- 예: "12월 7일 학술대회" → 1개의 일정
- 날짜는 반드시 이미지에 표시된 날짜를 사용하세요
- 시간이 명시되지 않았으면 오전 9시로 설정
- 이미지의 텍스트를 정확히 읽어주세요

응답 형식:
---RESPONSE---
[추출한 정보를 자연스럽게 설명. 예: "10월 25일부터 26일까지 진행되는 AI 컨퍼런스 일정을 발견했습니다."]
---ACTION---
{"type":"create_multiple","data":{"events":[{"title":"실제 이벤트 제목","date":"YYYY-MM-DD","time":"HH:MM","duration":60,"location":"장소","description":"설명"}]}}
---SUGGESTIONS---
일정 등록하기, 시간 수정하기, 세부사항 추가하기
` : `
Carefully analyze this image to extract all calendar event information.
Today's date: ${currentYear}-${currentMonth.toString().padStart(2, '0')}-${currentDay.toString().padStart(2, '0')}

Please find and extract all events:
1. Event title (poster title, event name, meeting name, etc.)
2. Date and time (assume ${currentYear} if year not specified)
3. Location (including online/offline)
4. Attendees or organizers
5. Other important details

IMPORTANT:
- If multiple dates exist, extract each as a separate event
- Example: "October 18, 19" → 2 separate events
- Example: "December 7 Conference" → 1 event
- Use the exact date shown in the image
- If time not specified, use 9:00 AM
- Read the text in the image accurately

Response format:
---RESPONSE---
[Natural description of extracted info. E.g., "Found an AI conference scheduled for October 25-26."]
---ACTION---
{"type":"create_multiple","data":{"events":[{"title":"Actual Event Title","date":"YYYY-MM-DD","time":"HH:MM","duration":60,"location":"Location","description":"Description"}]}}
---SUGGESTIONS---
Register event, Modify time, Add details
`;

    // Clean the image data - remove data URL prefix if present
    let cleanImageData = imageData;
    if (imageData.startsWith('data:')) {
      const base64Index = imageData.indexOf('base64,');
      if (base64Index !== -1) {
        cleanImageData = imageData.substring(base64Index + 7);
      }
    }

    console.log('[ChatCalendarService] Extracting from image:', {
      originalDataLength: imageData.length,
      cleanDataLength: cleanImageData.length,
      mimeType,
      hasDataPrefix: imageData.startsWith('data:'),
      imageDataPreview: cleanImageData.substring(0, 100),
      isBase64: /^[A-Za-z0-9+/]+=*$/.test(cleanImageData.substring(0, 100))
    });

    try {
      const chat = this.getOrCreateSession(sessionId);
      const result = await chat.sendMessage([
        prompt,
        {
          inlineData: {
            data: cleanImageData,
            mimeType: actualMimeType
          }
        }
      ]);

      const response = result.response.text();
      
      // 응답 파싱 (개선된 버전)
      const responseParts = response.split('---');
      let userMessage = locale === 'ko' 
        ? '이미지에서 일정 정보를 찾을 수 없습니다.'
        : 'Could not find event information in the image.';
      let action: any = undefined;
      let suggestions = locale === 'ko'
        ? ['다시 시도하기', '직접 입력하기']
        : ['Try again', 'Enter manually'];

      for (let i = 0; i < responseParts.length; i++) {
        const part = responseParts[i].trim();
        
        if (part.startsWith('RESPONSE')) {
          userMessage = responseParts[i + 1]?.trim() || userMessage;
        } else if (part.startsWith('ACTION')) {
          let actionText = responseParts[i + 1]?.trim();
          if (actionText && actionText !== 'NONE') {
            try {
              // Remove markdown code block if present
              if (actionText.startsWith('```')) {
                actionText = actionText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
              }
              const eventData = JSON.parse(actionText);

              // Handle multiple events format
              if (eventData.type === 'create_multiple' && eventData.data && eventData.data.events) {
                // Process each event
                const processedEvents = eventData.data.events.map((event: any) => {
                  // Validate and fix date format for each event
                  if (event.date) {
                    // If date doesn't have year, add current year
                    if (!event.date.includes('-')) {
                      const currentYear = new Date().getFullYear();
                      event.date = `${currentYear}-${event.date}`;
                    }

                    // Ensure date is in YYYY-MM-DD format
                    const dateParts = event.date.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                    if (dateParts) {
                      event.date = `${dateParts[1]}-${dateParts[2].padStart(2, '0')}-${dateParts[3].padStart(2, '0')}`;
                    }

                    // Ensure time is in HH:MM format
                    if (!event.time || !event.time.includes(':')) {
                      event.time = '09:00';
                    }
                  }
                  return event;
                });

                action = {
                  type: 'create_multiple' as const,
                  data: { events: processedEvents }
                };
              } else {
                // Single event format (backward compatibility)
                if (eventData.data && eventData.data.date) {
                  // If date doesn't have year, add current year
                  if (!eventData.data.date.includes('-')) {
                    const currentYear = new Date().getFullYear();
                    eventData.data.date = `${currentYear}-${eventData.data.date}`;
                  }

                  // Ensure date is in YYYY-MM-DD format
                  const dateParts = eventData.data.date.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                  if (dateParts) {
                    eventData.data.date = `${dateParts[1]}-${dateParts[2].padStart(2, '0')}-${dateParts[3].padStart(2, '0')}`;
                  }

                  // Ensure time is in HH:MM format
                  if (eventData.data.time && !eventData.data.time.includes(':')) {
                    eventData.data.time = '09:00';
                  }
                }

                action = {
                  type: 'create' as const,
                  data: eventData.data || eventData
                };
              }

              console.log('[ChatCalendarService] Parsed event data:', (action as any).data);
            } catch (e) {
              console.error('Failed to parse image event data:', actionText, e);
            }
          }
        } else if (part === 'SUGGESTIONS' || part.startsWith('SUGGESTIONS')) {
          // Get the next part which contains the actual suggestions
          if (i + 1 < responseParts.length) {
            const sugText = responseParts[i + 1].trim();
            if (sugText && !sugText.startsWith('RESPONSE') && !sugText.startsWith('ACTION')) {
              suggestions = sugText.split(',').map(s => s.trim());
              console.log('[ChatCalendarService] Extracted suggestions:', suggestions);
            }
          }
        }
      }

      // 대화 히스토리 저장
      const history = await chat.getHistory();
      this.conversationHistories.set(sessionId, history.map(h => ({
        role: h.role,
        parts: h.parts.map(p => 'text' in p ? p.text : '').join('')
      })));

      // Track created events to prevent duplicates
      if (action && action.type === 'create' && action.data) {
        const recentEvents = this.recentlyCreatedEvents.get(sessionId) || [];
        recentEvents.push({
          title: (action.data as any).title || '',
          date: (action.data as any).date || '',
          time: (action.data as any).time || '',
          createdAt: new Date()
        });
        this.recentlyCreatedEvents.set(sessionId, recentEvents);
      }

      const finalResponse = {
        message: userMessage,
        action,
        suggestions
      };
      
      console.log('[ChatCalendarService] Final response:', {
        messageLength: userMessage.length,
        hasAction: !!action,
        suggestionsCount: suggestions.length,
        message: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : '')
      });
      
      return finalResponse;

    } catch (error) {
      console.error('Image extraction error:', error);
      return {
        message: locale === 'ko'
          ? '이미지를 처리하는 중에 오류가 발생했습니다. 다시 시도해주세요.'
          : 'Error processing image. Please try again.',
        suggestions: locale === 'ko'
          ? ['다시 시도하기', '직접 입력하기', '다른 이미지 시도']
          : ['Try again', 'Enter manually', 'Try another image']
      };
    }
  }
}

export const chatCalendarService = new ChatCalendarService();