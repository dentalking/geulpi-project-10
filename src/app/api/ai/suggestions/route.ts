import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';
import { getCalendarClient } from '@/lib/google-auth';
import { convertGoogleEventsToCalendarEvents } from '@/utils/typeConverters';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { LocalCalendarService } from '@/lib/local-calendar';
import { successResponse, errorResponse, ApiError, ErrorCodes } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/middleware/rateLimiter';
import { CalendarEvent } from '@/types';
import { contextManager } from '@/lib/context-manager';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Extract conversation topic from recent messages
function extractConversationTopic(messages: any[]): string {
  if (!messages || messages.length === 0) return '';
  
  // Get last few messages to understand context
  const recentConversation = messages.slice(-3).map(m => 
    `${m.role}: ${m.content}`
  ).join('\n');
  
  return recentConversation;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'ai');
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const { locale = 'ko', sessionId = 'anonymous', recentMessages = [] } = body;
    
    logger.info('[AI Suggestions] Generating suggestions', { 
      locale, 
      sessionId,
      hasRecentMessages: recentMessages.length > 0 
    });

    // Get user's calendar events
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const accessToken = cookieStore.get('access_token')?.value;
    
    let events: CalendarEvent[] = [];
    let userId: any = null;
    
    // Fetch calendar events
    if (authToken) {
      try {
        const user = await verifyToken(authToken);
        if (!user) {
          logger.warn('AI suggestions API - Email auth token verification returned null');
        } else {
          userId = user.id;
          const localCalendar = new LocalCalendarService(user.id);
          events = localCalendar.getEvents();
        }
      } catch (error) {
        logger.error('Email auth token validation failed', error);
      }
    } else if (accessToken) {
      try {
        const refreshToken = cookieStore.get('refresh_token')?.value;
        const calendar = getCalendarClient(accessToken, refreshToken);
        const now = new Date();
        
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Past week
          timeMax: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Next month
          maxResults: 50,
          singleEvents: true,
          orderBy: 'startTime',
        });
        
        const googleEvents = response.data.items || [];
        events = convertGoogleEventsToCalendarEvents(googleEvents);
      } catch (error) {
        logger.error('Failed to fetch Google Calendar events', error);
      }
    }

    // Get recent chat context
    const recentContext = contextManager.getContext(sessionId);
    const recentEvents = recentContext.recentEvents || [];
    const patterns = recentContext.patterns || {};
    
    // Analyze patterns and context
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();
    const dateLocale = locale === 'ko' ? ko : enUS;
    
    // Build context for Gemini
    const contextData = {
      currentTime: format(now, "yyyy-MM-dd HH:mm", { locale: dateLocale }),
      currentDay: format(now, "EEEE", { locale: dateLocale }),
      timeOfDay: currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening',
      upcomingEvents: events.slice(0, 5).map(e => ({
        title: e.summary,
        date: e.start?.dateTime || e.start?.date,
        location: e.location
      })),
      recentEventsCount: recentEvents.length,
      patterns: {
        mostFrequentTime: patterns.mostFrequentTime,
        mostFrequentLocation: patterns.mostFrequentLocation,
        averageEventDuration: patterns.averageEventDuration
      },
      locale: locale,
      // Add recent conversation context
      lastMessage: recentMessages.length > 0 ? recentMessages[recentMessages.length - 1] : null,
      conversationTopic: recentMessages.length > 0 ? extractConversationTopic(recentMessages) : null
    };

    // Generate suggestions using Gemini
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 500
      }
    });

    // Different prompts based on whether we have conversation context
    const hasConversation = contextData.conversationTopic && contextData.conversationTopic.length > 0;
    
    const prompt = hasConversation ? `
You are a smart assistant. Generate 5 follow-up questions or actions based on the ongoing conversation.

Recent Conversation:
${contextData.conversationTopic}

Current Context:
- Time: ${contextData.currentTime}
- Language: ${locale === 'ko' ? 'Korean' : 'English'}

Based on the conversation above, generate 5 natural follow-up questions or actions the user might want to ask. Focus on:
1. Clarifying questions about the last response
2. Asking for more specific information
3. Related topics or actions
4. Next logical steps
5. Alternative perspectives or options

${locale === 'ko' ? 
`For example, if the conversation is about "글로벌 팁스 모집", suggest:
- "지원 자격 조건이 어떻게 되나요?"
- "신청 마감일이 언제인가요?"
- "필요한 서류는 뭐가 있나요?"
- "선정 절차는 어떻게 진행되나요?"
- "지원 혜택은 무엇인가요?"

Use natural Korean and be conversational.` :
`For example, if the conversation is about a meeting, suggest:
- "What documents do I need to prepare?"
- "Who else will be attending?"
- "Can you add a reminder 30 minutes before?"
- "What's the agenda for the meeting?"
- "Should I book a conference room?"

Use natural English and be conversational.`}

Return ONLY a JSON array of 5 suggestion strings, no other text:
["suggestion1", "suggestion2", "suggestion3", "suggestion4", "suggestion5"]
` : `
You are a smart calendar assistant. Generate 5 contextual suggestions for quick calendar actions based on the user's context.

Current Context:
- Time: ${contextData.currentTime}
- Day: ${contextData.currentDay}
- Time of day: ${contextData.timeOfDay}
- Upcoming events: ${JSON.stringify(contextData.upcomingEvents)}
- User has ${contextData.recentEventsCount} recent events
- Common patterns: ${JSON.stringify(contextData.patterns)}
- Language: ${locale === 'ko' ? 'Korean' : 'English'}

Generate 5 natural language suggestions that the user might want to type. Consider:
1. One suggestion about checking today's or this week's schedule
2. One suggestion about adding a common type of event based on time of day
3. One suggestion based on upcoming events (if any)
4. One suggestion about planning for next week or month
5. One creative/helpful suggestion based on the context

${locale === 'ko' ? 
`Format each suggestion in natural Korean like:
- "오늘 일정 확인해줘"
- "내일 오후 3시 회의 추가"
- "이번주 금요일 저녁 약속"

Use natural Korean expressions and be conversational.` :
`Format each suggestion in natural English like:
- "Show today's schedule"
- "Add meeting tomorrow at 3pm"
- "Dinner plans this Friday"

Use natural English and be conversational.`}

Return ONLY a JSON array of 5 suggestion strings, no other text:
["suggestion1", "suggestion2", "suggestion3", "suggestion4", "suggestion5"]
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse the suggestions from the response
      let suggestions = [];
      try {
        // Try to extract JSON array from the response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        logger.error('[AI Suggestions] Failed to parse Gemini response', parseError);
        // Fallback to default suggestions
        suggestions = getDefaultSuggestions(locale, contextData);
      }
      
      // Validate suggestions
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        suggestions = getDefaultSuggestions(locale, contextData);
      }
      
      // Ensure we have exactly 5 suggestions
      suggestions = suggestions.slice(0, 5);
      while (suggestions.length < 5) {
        suggestions.push(getRandomFallbackSuggestion(locale));
      }
      
      logger.info('[AI Suggestions] Generated suggestions', { 
        count: suggestions.length,
        locale 
      });
      
      return successResponse({
        suggestions,
        context: {
          timeOfDay: contextData.timeOfDay,
          currentDay: contextData.currentDay,
          upcomingEventsCount: contextData.upcomingEvents.length
        }
      });
      
    } catch (geminiError: any) {
      logger.error('[AI Suggestions] Gemini API error', {
        error: geminiError.message,
        stack: geminiError.stack
      });
      
      // Return fallback suggestions
      const suggestions = getDefaultSuggestions(locale, contextData);
      
      return successResponse({
        suggestions,
        fallback: true,
        context: {
          timeOfDay: contextData.timeOfDay,
          currentDay: contextData.currentDay,
          upcomingEventsCount: contextData.upcomingEvents.length
        }
      });
    }
    
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error);
    }
    
    logger.error('[AI Suggestions] Unexpected error', error);
    return errorResponse(
      new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to generate suggestions')
    );
  }
}

function getDefaultSuggestions(locale: string, context: any): string[] {
  const { timeOfDay, currentDay } = context;
  
  if (locale === 'ko') {
    const suggestions = [];
    
    // Time-based suggestion
    if (timeOfDay === 'morning') {
      suggestions.push("오늘 일정 확인해줘");
    } else if (timeOfDay === 'afternoon') {
      suggestions.push("오후 일정 보여줘");
    } else {
      suggestions.push("내일 일정 확인");
    }
    
    // Day-based suggestion
    if (currentDay === '월요일') {
      suggestions.push("이번주 일정 정리해줘");
    } else if (currentDay === '금요일') {
      suggestions.push("주말 계획 추가");
    } else {
      suggestions.push("내일 회의 일정 추가");
    }
    
    // Common suggestions
    suggestions.push("다음주 일정 보여줘");
    suggestions.push("오늘 저녁 7시 약속 추가");
    suggestions.push("이번달 중요 일정 확인");
    
    return suggestions.slice(0, 5);
  } else {
    const suggestions = [];
    
    // Time-based suggestion
    if (timeOfDay === 'morning') {
      suggestions.push("Show today's schedule");
    } else if (timeOfDay === 'afternoon') {
      suggestions.push("Show afternoon events");
    } else {
      suggestions.push("Check tomorrow's schedule");
    }
    
    // Day-based suggestion
    if (currentDay === 'Monday') {
      suggestions.push("Review this week's schedule");
    } else if (currentDay === 'Friday') {
      suggestions.push("Add weekend plans");
    } else {
      suggestions.push("Add meeting tomorrow");
    }
    
    // Common suggestions
    suggestions.push("Show next week");
    suggestions.push("Add dinner at 7pm today");
    suggestions.push("Check important events this month");
    
    return suggestions.slice(0, 5);
  }
}

function getRandomFallbackSuggestion(locale: string): string {
  const fallbacks = locale === 'ko' ? [
    "내일 일정 추가",
    "이번주 회의 일정",
    "다음달 계획 확인",
    "오늘 할 일 정리",
    "주간 일정 요약"
  ] : [
    "Add tomorrow's event",
    "This week's meetings",
    "Check next month's plans",
    "Today's tasks",
    "Weekly summary"
  ];
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}