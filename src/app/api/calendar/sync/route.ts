import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCalendarClient } from '@/lib/google-auth';
import { contextManager } from '@/lib/context-manager';
import { handleApiError, AuthError } from '@/lib/api-errors';
import { convertGoogleEventsToCalendarEvents } from '@/utils/typeConverters';

export async function GET(request: Request) {
    const accessToken = cookies().get('access_token')?.value;

    if (!accessToken) {
        return handleApiError(new AuthError());
    }

    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId') || 'anonymous';
        const maxResults = parseInt(searchParams.get('maxResults') || '50');

        const calendar = getCalendarClient(accessToken);
        const now = new Date();

        const events = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 지난 주부터
            timeMax: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 한달 후까지
            maxResults,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const googleEvents = events.data.items || [];
        const calendarEvents = convertGoogleEventsToCalendarEvents(googleEvents);

        // 컨텍스트 업데이트
        contextManager.updateRecentEvents(sessionId, calendarEvents);
        contextManager.updatePatterns(sessionId, calendarEvents);

        return NextResponse.json({
            success: true,
            events: calendarEvents,
            total: calendarEvents.length,
            syncTime: new Date().toISOString()
        });

    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(request: Request) {
    const accessToken = cookies().get('access_token')?.value;

    if (!accessToken) {
        return handleApiError(new AuthError());
    }

    try {
        const { eventId, updates } = await request.json();
        const calendar = getCalendarClient(accessToken);

        const updatedEvent = await calendar.events.update({
            calendarId: 'primary',
            eventId,
            requestBody: updates
        });

        return NextResponse.json({
            success: true,
            event: updatedEvent.data
        });

    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(request: Request) {
    const accessToken = cookies().get('access_token')?.value;

    if (!accessToken) {
        return handleApiError(new AuthError());
    }

    try {
        const { eventId } = await request.json();
        const calendar = getCalendarClient(accessToken);

        await calendar.events.delete({
            calendarId: 'primary',
            eventId
        });

        return NextResponse.json({
            success: true,
            deleted: eventId
        });

    } catch (error) {
        return handleApiError(error);
    }
}