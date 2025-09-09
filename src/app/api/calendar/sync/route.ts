import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getCalendarClient } from '@/lib/google-auth';
import { contextManager } from '@/lib/context-manager';
import { handleApiError, AuthError } from '@/lib/api-errors';
import { convertGoogleEventsToCalendarEvents } from '@/utils/typeConverters';
import { verifyToken } from '@/lib/auth/email-auth';
import { LocalCalendarService, createDemoEvents } from '@/lib/local-calendar';
import { successResponse, errorResponse, ApiError, ErrorCodes } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/middleware/rateLimiter';

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const rateLimitResponse = await checkRateLimit(request, 'general');
        if (rateLimitResponse) return rateLimitResponse;

        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        const authToken = cookieStore.get('auth-token')?.value;

        // Check for email auth first
        if (authToken) {
            try {
                const user = await verifyToken(authToken);
                const { searchParams } = new URL(request.url);
                const sessionId = searchParams.get('sessionId') || 'anonymous';
                
                logger.info('Calendar sync with email auth', { userId: user.id, sessionId });
                
                // Use local calendar for email-auth users
                const localCalendar = new LocalCalendarService(user.id);
                
                // Create demo events for first-time users
                if (localCalendar.getEvents().length === 0) {
                    createDemoEvents(user.id);
                    logger.debug('Created demo events for first-time user', { userId: user.id });
                }
                
                const events = localCalendar.getEvents();
                
                // Update context
                contextManager.updateRecentEvents(sessionId, events);
                contextManager.updatePatterns(sessionId, events);
                
                return successResponse({
                    events,
                    total: events.length,
                    syncTime: new Date().toISOString(),
                    source: 'local'
                });
            } catch (error) {
                logger.error('Email auth token validation failed', error);
            }
        }

        // Fall back to Google OAuth
        if (!accessToken) {
            logger.warn('No access token found for calendar sync');
            throw new ApiError(
                401,
                ErrorCodes.UNAUTHENTICATED,
                'Authentication required to access calendar'
            );
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId') || 'anonymous';
        const maxResults = parseInt(searchParams.get('maxResults') || '50');
        
        logger.info('Calendar sync with Google OAuth', { sessionId, maxResults });

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
        
        logger.info('Calendar events synced', { 
            eventCount: calendarEvents.length,
            sessionId 
        });

        // 컨텍스트 업데이트
        contextManager.updateRecentEvents(sessionId, calendarEvents);
        contextManager.updatePatterns(sessionId, calendarEvents);

        return successResponse({
            events: calendarEvents,
            total: calendarEvents.length,
            syncTime: new Date().toISOString()
        });

    } catch (error) {
        if (error instanceof ApiError) {
            return errorResponse(error);
        }
        
        logger.error('Calendar sync error', error);
        return errorResponse(
            new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to sync calendar')
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Rate limiting
        const rateLimitResponse = await checkRateLimit(request, 'general');
        if (rateLimitResponse) return rateLimitResponse;
        
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        if (!accessToken) {
            throw new ApiError(
                401,
                ErrorCodes.UNAUTHENTICATED,
                'Authentication required to update calendar events'
            );
        }

        const { eventId, updates } = await request.json();
        
        if (!eventId) {
            throw new ApiError(
                400,
                ErrorCodes.MISSING_FIELD,
                'Event ID is required'
            );
        }
        
        logger.info('Updating calendar event', { eventId });
        const calendar = getCalendarClient(accessToken);

        const updatedEvent = await calendar.events.update({
            calendarId: 'primary',
            eventId,
            requestBody: updates
        });

        logger.info('Calendar event updated successfully', { eventId });
        
        return successResponse({
            event: updatedEvent.data
        });

    } catch (error) {
        if (error instanceof ApiError) {
            return errorResponse(error);
        }
        
        logger.error('Calendar update error', error);
        return errorResponse(
            new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to update calendar event')
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Rate limiting
        const rateLimitResponse = await checkRateLimit(request, 'general');
        if (rateLimitResponse) return rateLimitResponse;
        
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;

        if (!accessToken) {
            throw new ApiError(
                401,
                ErrorCodes.UNAUTHENTICATED,
                'Authentication required to delete calendar events'
            );
        }

        const { eventId } = await request.json();
        
        if (!eventId) {
            throw new ApiError(
                400,
                ErrorCodes.MISSING_FIELD,
                'Event ID is required'
            );
        }
        
        logger.info('Deleting calendar event', { eventId });
        const calendar = getCalendarClient(accessToken);

        await calendar.events.delete({
            calendarId: 'primary',
            eventId
        });

        logger.info('Calendar event deleted successfully', { eventId });
        
        return successResponse({
            deleted: eventId
        });

    } catch (error) {
        if (error instanceof ApiError) {
            return errorResponse(error);
        }
        
        logger.error('Calendar delete error', error);
        return errorResponse(
            new ApiError(500, ErrorCodes.INTERNAL_ERROR, 'Failed to delete calendar event')
        );
    }
}