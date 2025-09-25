import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getCalendarClient } from '@/lib/google-auth';
import { convertGoogleEventsToCalendarEvents } from '@/utils/typeConverters';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { LocalCalendarService } from '@/lib/local-calendar';
import { successResponse, errorResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/middleware/rateLimiter';
import { CalendarEvent } from '@/types';
import { getValidGoogleTokens } from '@/middleware/token-refresh';
import { SimpleSuggestionService } from '@/services/ai/SimpleSuggestionService';
import type { SimpleSuggestionContext } from '@/services/ai/SimpleSuggestionService';
import { ImprovedSuggestionService } from '@/services/ai/ImprovedSuggestionService';
import {
  EnhancedSuggestionContext,
  analyzeEvents,
  ConversationMessage,
  UserProfile,
  UserPreferences
} from '@/services/ai/EnhancedSuggestionContext';
import { getServiceRoleSupabase } from '@/lib/supabase-server';
import { GeminiQuickActionsService, QuickActionsContext } from '@/services/ai/GeminiQuickActionsService';
import { getUserPatternService, UserPatternLearningService } from '@/services/ai/UserPatternLearningService';

// 대화 메시지 타입 정의
interface ConversationMessageInput {
  role?: string;
  isUser?: boolean;
  content?: string;
  message?: string;
  timestamp?: string;
}

// 캐시된 응답 데이터 타입
interface CachedSuggestionData {
  suggestions: string[];
  metadata?: Array<{
    priority: number;
    category: string;
  }>;
  context: {
    timeOfDay: string;
    upcomingEventsCount: number;
    isFollowUp: boolean;
    isImproved?: boolean;
    isGeminiAI?: boolean;
    hasProfile?: boolean;
    hasPreferences?: boolean;
  };
}

// 단순화된 캐시 전략
const suggestionCache = new Map<string, { data: CachedSuggestionData; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15분 캐시

export async function POST(request: NextRequest) {
  let body: any;
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'ai');
    if (rateLimitResponse) return rateLimitResponse;

    body = await request.json();
    const {
      locale = 'ko',
      sessionId = 'anonymous',
      recentMessages = [],
      conversationHistory = [], // 전체 대화 히스토리
      selectedDate,
      selectedEvent,
      lastAIResponse, // AI 응답 후 follow-up 제안을 위한 필드
      sessionStartTime, // 세션 시작 시간
      previousSuggestions = [], // 이전 표시된 제안들
      useImproved = true // 개선된 서비스 사용 여부
    } = body;

    // 간단한 캐시 키 생성
    const now = new Date();
    const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening';
    const cacheKey = `${locale}-${timeOfDay}-${!!lastAIResponse}`;

    // 캐시 확인 (follow-up이 아닌 경우만)
    if (!lastAIResponse) {
      const cached = suggestionCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        logger.info('[Simple Suggestions] Returning cached suggestions', {
          locale,
          cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000) + 's'
        });
        return successResponse(cached.data);
      }
    }

    // 이벤트 데이터 가져오기
    let events: CalendarEvent[] = [];
    let userId: string | null = null;

    try {
      // 인증 확인
      const cookieStore = await cookies();
      const authToken = cookieStore.get('auth-token')?.value;

      if (authToken) {
        const user = await verifyToken(authToken);
        if (user) {
          userId = user.id;
          const localCalendar = new LocalCalendarService(user.id);
          events = localCalendar.getEvents();
        }
      }

      // Google Calendar 연동 시도
      const googleTokens = await getValidGoogleTokens();
      if (googleTokens.isValid && googleTokens.accessToken) {
        try {
          const calendar = getCalendarClient(googleTokens.accessToken, googleTokens.refreshToken);
          const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            timeMax: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            maxResults: 20,
            singleEvents: true,
            orderBy: 'startTime',
          });

          if (response.data.items && response.data.items.length > 0) {
            const googleEvents = convertGoogleEventsToCalendarEvents(response.data.items);
            // Google 이벤트가 있으면 우선 사용
            if (googleEvents.length > 0) {
              events = googleEvents;
            }
          }
        } catch (error) {
          logger.warn('Failed to fetch Google Calendar events', error);
        }
      }
    } catch (error) {
      logger.warn('Failed to fetch events for suggestions', error);
    }

    // 사용자 프로필 조회
    let userProfile: UserProfile | undefined;
    let userPreferences: UserPreferences | undefined;

    if (userId) {
      try {
        const supabase = getServiceRoleSupabase();

        // 프로필 조회
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profile) {
          userProfile = {
            workHours: profile.work_start_time && profile.work_end_time
              ? { start: profile.work_start_time, end: profile.work_end_time }
              : undefined,
            homeAddress: profile.home_address || undefined,
            workAddress: profile.work_address || undefined,
            interests: profile.interests || [],
            goals: profile.goals || [],
            occupation: profile.occupation || undefined
          };
        }

        // 선호도 분석 (클릭 히스토리 기반)
        const { data: actionLogs } = await supabase
          .from('user_action_logs')
          .select('suggestion_text, suggestion_category, action_type')
          .eq('user_id', userId)
          .eq('action_type', 'clicked')
          .order('created_at', { ascending: false })
          .limit(100);

        if (actionLogs && actionLogs.length > 0) {
          const preferredSuggestions = actionLogs
            .map(log => log.suggestion_text)
            .filter((text): text is string => text !== null)
            .filter((text, index, self) => self.indexOf(text) === index)
            .slice(0, 5);

          const clickedCategories = actionLogs
            .map(log => log.suggestion_category)
            .filter(Boolean)
            .filter((cat, index, self) => self.indexOf(cat) === index);

          userPreferences = {
            preferredSuggestions,
            clickedCategories
          };
        }
      } catch (error) {
        logger.warn('Failed to fetch user profile for suggestions', error);
      }
    }

    let suggestions;

    // Gemini AI 기반 제안 사용 (환경변수 확인)
    const useGeminiAI = process.env.GEMINI_API_KEY && useImproved;

    if (useGeminiAI) {
      try {
        logger.info('[Gemini Quick Actions] Starting AI-powered suggestion generation');

        const geminiService = new GeminiQuickActionsService(process.env.GEMINI_API_KEY!);

        // Gemini AI를 위한 컨텍스트 준비
        const aiContext: QuickActionsContext = {
          locale: locale as 'ko' | 'en',
          currentTime: new Date(),
          conversationHistory: (conversationHistory || []).map((msg: ConversationMessageInput) => ({
            role: msg.role || (msg.isUser ? 'user' : 'assistant'),
            content: msg.content || msg.message || '',
            timestamp: msg.timestamp
          })),
          currentEvents: events,
          userProfile,
          clickHistory: previousSuggestions?.map(s => ({
            text: s,
            timestamp: new Date().toISOString()
          })),
          lastAIResponse: typeof lastAIResponse === 'string'
            ? lastAIResponse
            : lastAIResponse?.message || lastAIResponse?.content,
          sessionDuration: sessionStartTime
            ? Math.floor((Date.now() - new Date(sessionStartTime).getTime()) / (1000 * 60))
            : undefined
        };

        const aiSuggestions = await geminiService.generateQuickActions(aiContext);

        suggestions = aiSuggestions.map(s => ({
          text: s.text,
          priority: s.priority,
          category: s.category
        }));

        logger.info('[Gemini Quick Actions] AI suggestions generated successfully', {
          count: suggestions.length,
          locale,
          hasConversation: (conversationHistory || []).length > 0
        });
      } catch (geminiError) {
        logger.error('[Gemini Quick Actions] Failed to generate AI suggestions', geminiError);
        // Fall back to improved service
      }
    }

    // 기존 개선된 서비스 (Gemini 실패 시 폴백)
    if (!suggestions && useImproved) {
      try {
        const improvedService = new ImprovedSuggestionService(locale as 'ko' | 'en');

        // 세션 지속 시간 계산
        const sessionDuration = sessionStartTime
          ? Math.floor((Date.now() - new Date(sessionStartTime).getTime()) / (1000 * 60))
          : 0;

        // 이벤트 분석
        const eventAnalysis = analyzeEvents(events);

        // 대화 히스토리 변환 (빈 배열 처리 포함)
        const messages: ConversationMessage[] = (conversationHistory || []).map((msg: ConversationMessageInput & { action?: any }) => ({
          role: msg.role || (msg.isUser ? 'user' : 'assistant'),
          content: msg.content || msg.message || '',
          timestamp: msg.timestamp,
          action: msg.action
        }));

        const enhancedContext: EnhancedSuggestionContext = {
          locale: locale as 'ko' | 'en',
          currentEvents: events,
          selectedDate: selectedDate ? new Date(selectedDate) : undefined,
          timeOfDay: timeOfDay as 'morning' | 'afternoon' | 'evening',
          conversationHistory: messages,
          eventAnalysis,
          userPreferences,
          userProfile,
          isFollowUp: !!lastAIResponse,
          lastAIResponse: typeof lastAIResponse === 'string'
            ? lastAIResponse
            : lastAIResponse?.message || lastAIResponse?.content || undefined,
          sessionDuration,
          previousSuggestions
        };

        suggestions = improvedService.generateEnhancedSuggestions(enhancedContext);

        logger.info('[Improved Suggestions] Enhanced suggestions generated', {
          conversationLength: messages.length,
          eventCount: events.length,
          hasProfile: !!userProfile,
          hasPreferences: !!userPreferences
        });
      } catch (improvedError) {
        logger.error('[Improved Suggestions] Error generating enhanced suggestions', improvedError);

        // 폴백: Simple Service 사용
        const suggestionService = new SimpleSuggestionService(locale as 'ko' | 'en');
        const context: SimpleSuggestionContext = {
          locale: locale as 'ko' | 'en',
          currentEvents: events,
          selectedDate: selectedDate ? new Date(selectedDate) : undefined,
          lastMessage: lastAIResponse?.message || lastAIResponse?.content || recentMessages[recentMessages.length - 1]?.content,
          timeOfDay: timeOfDay as 'morning' | 'afternoon' | 'evening',
          isFollowUp: !!lastAIResponse
        };
        suggestions = suggestionService.generateSuggestions(context);
        logger.info('[Improved Suggestions] Fallback to simple service after error');
      }
    } else {
      // 기존 Simple Service 폴백
      const suggestionService = new SimpleSuggestionService(locale as 'ko' | 'en');

      const context: SimpleSuggestionContext = {
        locale: locale as 'ko' | 'en',
        currentEvents: events,
        selectedDate: selectedDate ? new Date(selectedDate) : undefined,
        lastMessage: lastAIResponse?.message || lastAIResponse?.content || recentMessages[recentMessages.length - 1]?.content,
        timeOfDay: timeOfDay as 'morning' | 'afternoon' | 'evening',
        isFollowUp: !!lastAIResponse
      };

      suggestions = suggestionService.generateSuggestions(context);
    }

    // 패턴 학습을 통한 제안 개인화 (모든 서비스에 공통 적용)
    if (userId && suggestions) {
      try {
        const patternService = getUserPatternService();
        const personalizedSuggestions = patternService.adjustSuggestionsBasedOnPatterns(
          suggestions.map(s => ({
            text: s.text || s,
            type: (s.category || 'action') as any,
            priority: s.priority || 5,
            category: s.category || 'action',
            confidence: 0.8,
            id: `${userId}-${Date.now()}-${Math.random()}`,
            context: {},
            action: 'requires_input' as const,
            reason: 'Generated from pattern learning'
          })),
          userId
        );

        // 원래 포맷으로 변환
        suggestions = personalizedSuggestions.map(s => ({
          text: s.text,
          priority: s.priority,
          category: 'action' as const // SmartSuggestion doesn't have category, default to 'action'
        }));

        logger.info('[Pattern Learning] Applied user patterns to suggestions', {
          userId,
          originalCount: suggestions.length,
          personalizedCount: personalizedSuggestions.length
        });
      } catch (error) {
        logger.error('[Pattern Learning] Failed to apply patterns', error);
        // 패턴 적용 실패 시에도 기본 제안 반환
      }
    }

    // 응답 데이터 구성
    const responseData = {
      suggestions: suggestions.map(s => s.text),
      metadata: suggestions.map(s => ({
        priority: s.priority,
        category: s.category
      })),
      context: {
        timeOfDay,
        upcomingEventsCount: events.length,
        isFollowUp: !!lastAIResponse,
        isImproved: useImproved && !useGeminiAI, // 개선된 서비스 사용 여부
        isGeminiAI: useGeminiAI && !!suggestions, // Gemini AI 사용 여부
        hasProfile: !!userProfile,
        hasPreferences: !!userPreferences
      }
    };

    // 캐시 저장 (follow-up이 아닌 경우만)
    if (!lastAIResponse) {
      suggestionCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });

      // 오래된 캐시 정리 (최대 20개 유지)
      if (suggestionCache.size > 20) {
        const entries = Array.from(suggestionCache.entries());
        const oldestEntries = entries
          .sort((a, b) => a[1].timestamp - b[1].timestamp)
          .slice(0, 10);
        oldestEntries.forEach(([key]) => suggestionCache.delete(key));
      }
    }

    logger.info('[Suggestions API] Generated suggestions', {
      count: suggestions.length,
      locale,
      isFollowUp: !!lastAIResponse,
      eventsCount: events.length,
      isImproved: useImproved && !useGeminiAI,
      isGeminiAI: useGeminiAI
    });

    return successResponse(responseData);

  } catch (error) {
    logger.error('[Simple Suggestions] Unexpected error', error);

    // 오류 시 기본 제안 반환
    const fallbackSuggestions = getFallbackSuggestions(body.locale || 'ko');

    return successResponse({
      suggestions: fallbackSuggestions,
      metadata: fallbackSuggestions.map(() => ({
        priority: 5,
        category: 'view'
      })),
      context: {
        timeOfDay: 'afternoon',
        upcomingEventsCount: 0,
        isFollowUp: false,
        isSimplified: true,
        isFallback: true
      }
    });
  }
}

/**
 * 최종 fallback 제안
 */
function getFallbackSuggestions(locale: 'ko' | 'en'): string[] {
  if (locale === 'ko') {
    return [
      "오늘 일정 확인해줘",
      "내일 회의 일정 추가",
      "이번 주 일정 정리해줘",
      "사진에서 일정 추출하기",
      "친구와 미팅 잡기"
    ];
  } else {
    return [
      "Show today's schedule",
      "Add meeting tomorrow",
      "Review this week's events",
      "Extract schedule from photo",
      "Schedule meeting with friend"
    ];
  }
}