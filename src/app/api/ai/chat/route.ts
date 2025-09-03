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

    if (!accessToken) {
        return NextResponse.json({
            type: 'error',
            message: '로그인이 필요합니다.'
        });
    }

    try {
        const { message, sessionId, selectedEventId } = await request.json();

        console.log('Received message:', message, 'SessionId:', sessionId, 'SelectedEventId:', selectedEventId);

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

        // Calendar 연결 테스트
        try {
            const calendar = getCalendarClient(accessToken);
            const testResponse = await calendar.events.list({
                calendarId: 'primary',
                maxResults: 1
            });
            console.log('Calendar connection OK');
        } catch (calError) {
            console.error('Calendar connection failed:', calError);
            return NextResponse.json({
                type: 'error',
                message: '캘린더 연결에 실패했습니다. 다시 로그인해주세요.'
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

        // AI 라우터로 메시지 처리 (선택된 일정 ID 포함)
        const response = await aiRouter.processMessage(message, context, accessToken, selectedEventId);

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