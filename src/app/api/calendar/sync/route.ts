import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCalendarClient } from '@/lib/google-auth';
import { contextManager } from '@/lib/context-manager';
import { handleApiError, AuthError } from '@/lib/api-errors';
import { convertGoogleEventsToCalendarEvents } from '@/utils/typeConverters';
import { verifyToken } from '@/lib/auth/email-auth';
import { LocalCalendarService, createDemoEvents } from '@/lib/local-calendar';

export async function GET(request: Request) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const authToken = cookieStore.get('auth-token')?.value;

    // Check for email auth first
    if (authToken) {
        try {
            const user = await verifyToken(authToken);
            const { searchParams } = new URL(request.url);
            const sessionId = searchParams.get('sessionId') || 'anonymous';
            
            // Use local calendar for email-auth users
            const localCalendar = new LocalCalendarService(user.id);
            
            // Create demo events for first-time users
            if (localCalendar.getEvents().length === 0) {
                createDemoEvents(user.id);
            }
            
            const events = localCalendar.getEvents();
            
            // Update context
            contextManager.updateRecentEvents(sessionId, events);
            contextManager.updatePatterns(sessionId, events);
            
            return NextResponse.json({
                success: true,
                events,
                total: events.length,
                syncTime: new Date().toISOString(),
                source: 'local'
            });
        } catch (error) {
            console.error('Email auth token validation failed:', error);
        }
    }

    // Fall back to Google OAuth
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
            timeMin: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 전부터
            timeMax: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1년 후까지
            maxResults: Math.max(maxResults, 250), // Increase max results to get more events
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