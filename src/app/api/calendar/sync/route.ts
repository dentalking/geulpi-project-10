import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleCalendarService } from '@/services/google/GoogleCalendarService';
import { contextManager } from '@/lib/context-manager';
import { handleApiError, AuthError } from '@/lib/api-errors';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { successResponse, errorResponse, ApiError, ErrorCodes } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/middleware/rateLimiter';
import { supabaseAdmin } from '@/lib/supabase';
import { getCalendarClient } from '@/lib/google-auth';

export async function GET(request: NextRequest) {
    try {
        // Rate limiting
        const rateLimitResponse = await checkRateLimit(request, 'general');
        if (rateLimitResponse) return rateLimitResponse;

        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        const authToken = cookieStore.get('auth-token')?.value;

        logger.info('Calendar sync attempt', { 
            hasAccessToken: !!accessToken, 
            hasAuthToken: !!authToken,
            accessTokenLength: accessToken?.length || 0
        });

        const supabase = supabaseAdmin;
        let userId: string | null = null;
        let isGoogleUser = false;

        // Check for email auth first
        if (authToken) {
            try {
                const user = await verifyToken(authToken);
                if (user) {
                    userId = user.id;
                    logger.info('Calendar sync with email auth', { userId: user.id });
                }
            } catch (error) {
                logger.error('Email auth token validation failed', error);
            }
        }

        // Check for Google OAuth
        if (!userId && accessToken) {
            logger.info('Attempting Google token verification', { accessTokenLength: accessToken.length });
            try {
                // Google 토큰으로 사용자 정보 확인
                const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${accessToken}`);
                if (response.ok) {
                    const googleUser = await response.json();
                    userId = googleUser.id;
                    isGoogleUser = true;
                    logger.info('Calendar sync with Google OAuth', { userId: googleUser.id });
                } else {
                    logger.error('Google token verification failed', { status: response.status });
                }
            } catch (error) {
                logger.error('Google token verification error', error);
            }
        }

        if (!userId) {
            throw new ApiError(
                401,
                ErrorCodes.UNAUTHENTICATED,
                'Authentication required to access calendar'
            );
        }

        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId') || 'anonymous';
        const maxResults = parseInt(searchParams.get('maxResults') || '50');
        const now = new Date();

        // If this is a Google user with tokens, sync from Google Calendar
        if (isGoogleUser && accessToken) {
            const refreshToken = cookieStore.get('refresh_token')?.value;
            
            try {
                const googleCalendar = new GoogleCalendarService(accessToken, refreshToken);
                
                // Fetch events from Google Calendar
                const googleEvents = await googleCalendar.listEvents(
                    'primary',
                    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30일 전부터
                    new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1년 후까지
                    Math.max(maxResults, 250)
                );

                logger.info('[Google Calendar] Events fetched for sync', {
                    googleEventCount: googleEvents.length,
                    userId
                });

                // Sync events to Supabase database
                let syncedCount = 0;
                let updatedCount = 0;
                
                for (const googleEvent of googleEvents) {
                    const eventData: any = {
                        google_user_id: userId, // Store Google user ID in google_user_id field
                        google_event_id: googleEvent.id,
                        summary: googleEvent.summary || 'Untitled Event',
                        description: googleEvent.description || null,
                        location: googleEvent.location || null,
                        start_time: googleEvent.start?.dateTime || googleEvent.start?.date || new Date().toISOString(),
                        end_time: googleEvent.end?.dateTime || googleEvent.end?.date || new Date().toISOString(),
                        attendees: googleEvent.attendees ? JSON.stringify(googleEvent.attendees) : null,
                        source: 'google',
                        is_all_day: !googleEvent.start?.dateTime, // Fixed field name: is_all_day instead of all_day
                        color_id: googleEvent.colorId || null,
                        status: googleEvent.status || 'confirmed',
                        reminders: googleEvent.reminders ? JSON.stringify(googleEvent.reminders) : null,
                        created_at: googleEvent.created || new Date().toISOString(),
                        updated_at: googleEvent.updated || new Date().toISOString()
                    };

                    // Check if event exists in Supabase
                    const { data: existingEvent } = await supabase
                        .from('calendar_events')
                        .select('id, updated_at')
                        .eq('google_event_id', googleEvent.id)
                        .eq('google_user_id', userId) // Use google_user_id for Google users
                        .single();

                    if (existingEvent) {
                        // Update existing event if Google event is newer
                        const googleUpdated = new Date(googleEvent.updated || 0);
                        const supabaseUpdated = new Date(existingEvent.updated_at);
                        
                        if (googleUpdated > supabaseUpdated) {
                            const { error: updateError } = await supabase
                                .from('calendar_events')
                                .update(eventData)
                                .eq('id', existingEvent.id);
                            
                            if (updateError) {
                                logger.error('[Google Calendar] Failed to update event', {
                                    error: updateError,
                                    eventId: googleEvent.id,
                                    eventSummary: googleEvent.summary
                                });
                            } else {
                                updatedCount++;
                            }
                        }
                    } else {
                        // Insert new event
                        const { error: insertError } = await supabase
                            .from('calendar_events')
                            .insert(eventData);
                        
                        if (insertError) {
                            logger.error('[Google Calendar] Failed to insert event', {
                                error: insertError,
                                eventId: googleEvent.id,
                                eventSummary: googleEvent.summary
                            });
                        } else {
                            syncedCount++;
                        }
                    }
                }

                logger.info('[Google Calendar] Sync completed', {
                    userId,
                    totalEvents: googleEvents.length,
                    newEvents: syncedCount,
                    updatedEvents: updatedCount
                });
            } catch (error) {
                logger.error('[Google Calendar] Sync failed', error);
                // Continue to fetch from Supabase even if Google sync fails
            }
        }

        // Fetch events from Supabase database
        let calendarEvents: any[] = [];
        
        // Use different query based on user type
        const query = isGoogleUser 
            ? supabase
                .from('calendar_events')
                .select('*')
                .eq('google_user_id', userId) // Use google_user_id for Google users
                .order('start_time', { ascending: true })
                .limit(maxResults)
            : supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', userId) // Use user_id for email auth users
                .order('start_time', { ascending: true })
                .limit(maxResults);
        
        const { data: events, error } = await query;

        if (error) {
            logger.error('Error fetching events from database:', error);
            throw new ApiError(
                500,
                ErrorCodes.INTERNAL_ERROR,
                'Failed to fetch events from database'
            );
        }

        // Transform Supabase events to calendar format
        calendarEvents = (events || []).map(event => ({
            id: event.id,
            summary: event.summary,
            description: event.description,
            location: event.location,
            start: {
                dateTime: event.start_time,
                timeZone: 'Asia/Seoul'
            },
            end: {
                dateTime: event.end_time,
                timeZone: 'Asia/Seoul'
            },
            attendees: event.attendees ? JSON.parse(event.attendees) : [],
            colorId: event.color_id,
            status: event.status || 'confirmed',
            created: event.created_at,
            updated: event.updated_at,
            source: event.source,
            googleEventId: event.google_event_id
        }));

        logger.info('Calendar events synced', { 
            eventCount: calendarEvents.length,
            sessionId,
            source: isGoogleUser ? 'google+supabase' : 'supabase'
        });

        // Update context
        contextManager.updateRecentEvents(sessionId, calendarEvents);
        contextManager.updatePatterns(sessionId, calendarEvents);

        return successResponse({
            events: calendarEvents,
            total: calendarEvents.length,
            syncTime: new Date().toISOString(),
            source: isGoogleUser ? 'google+supabase' : 'supabase'
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