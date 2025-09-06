import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { contextManager } from '@/services/ai';
import { aiRouter } from '@/lib/ai-router';  // 수정된 ai-router 사용
import { suggestionEngine } from '@/lib/suggestion-engine';
import { handleApiError, AuthError } from '@/lib/api-errors';
import { getCalendarClient } from '@/lib/google-auth';
import { convertGoogleEventsToCalendarEvents } from '@/utils/typeConverters';

export async function POST(request: Request) {
    const accessToken = cookies().get('access_token')?.value;

    console.log('[AI Chat] Request received, accessToken exists:', !!accessToken);

    if (!accessToken) {
        console.log('[AI Chat] No access token found - user needs to login');
        return NextResponse.json({
            type: 'error',
            message: 'Please login to use the calendar assistant. 로그인이 필요합니다.'
        });
    }

    try {
        const { message, sessionId, selectedEventId, pendingEventData } = await request.json();

        console.log('[AI Chat] Processing message:', message);
        console.log('[AI Chat] SessionId:', sessionId, 'SelectedEventId:', selectedEventId);

        // 임시 테스트 응답
        if (message.includes('테스트')) {
            return NextResponse.json({
                type: 'text',
                message: '연결이 정상적으로 작동합니다!',
                suggestions: []
            });
        }

        const userId = sessionId || 'anonymous';
        const context = contextManager.getContext(userId);

        // Get refresh token as well
        const refreshToken = cookies().get('refresh_token')?.value;
        
        // Calendar 연결 테스트
        try {
            const calendar = getCalendarClient(accessToken, refreshToken);
            const testResponse = await calendar.events.list({
                calendarId: 'primary',
                maxResults: 1
            });
            console.log('[AI Chat] Calendar connection OK');
        } catch (calError: any) {
            console.error('[AI Chat] Calendar connection failed:', calError);
            
            // If token expired, try to refresh
            if (calError?.code === 401 && refreshToken) {
                console.log('[AI Chat] Attempting to refresh token...');
                try {
                    const { refreshAccessToken } = await import('@/lib/google-auth');
                    const newTokens = await refreshAccessToken(refreshToken);
                    
                    // Update cookies with new token
                    cookies().set('access_token', newTokens.access_token || '', {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: 'lax',
                        maxAge: 60 * 60 * 24 * 7
                    });
                    
                    // Continue with new token
                    // Note: we should update the accessToken variable here
                    // but for now, return error to user
                    return NextResponse.json({
                        type: 'error',
                        message: 'Session expired. Please refresh the page and try again.'
                    });
                } catch (refreshError) {
                    console.error('[AI Chat] Token refresh failed:', refreshError);
                }
            }
            
            return NextResponse.json({
                type: 'error',
                message: 'Calendar connection failed. Please login again. 캘린더 연결에 실패했습니다. 다시 로그인해주세요.'
            });
        }

        // 최근 이벤트 업데이트
        const calendar = getCalendarClient(accessToken);
        const now = new Date();

        try {
            const recentEvents = await calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
                timeMax: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                maxResults: 50,
                singleEvents: true,
                orderBy: 'startTime',
            });

            const calendarEvents = convertGoogleEventsToCalendarEvents(recentEvents.data.items);
            contextManager.updateRecentEvents(userId, calendarEvents);
            contextManager.updatePatterns(userId, calendarEvents);
        } catch (eventError) {
            console.error('Failed to fetch events:', eventError);
        }

        // AI 라우터로 메시지 처리 (선택된 일정 ID와 대기 중인 이벤트 데이터 포함)
        const response = await aiRouter.processMessage(message, context, accessToken, selectedEventId, pendingEventData);

        // 스마트 제안 생성
        let suggestions: any[] = [];
        try {
            suggestions = await suggestionEngine.generateSuggestions(context);
        } catch (suggestionError) {
            console.error('Failed to generate suggestions:', suggestionError);
        }

        return NextResponse.json({
            ...response,
            suggestions: suggestions.slice(0, 3),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('AI Chat error:', error);
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        return NextResponse.json({
            type: 'error',
            message: `서버 오류가 발생했습니다: ${errorMessage}`
        });
    }
}