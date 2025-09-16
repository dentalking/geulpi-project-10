import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { GoogleCalendarService } from '@/services/google/GoogleCalendarService';
import { handleApiError, AuthError } from '@/lib/api-errors';
import { supabase } from '@/lib/db';
import { getUserTimezone } from '@/lib/timezone';
import { setRLSContext } from '@/lib/auth/set-rls-context';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        const refreshToken = cookieStore.get('refresh_token')?.value;
        const authToken = cookieStore.get('auth-token')?.value;
        const body = await request.json();
        
        // Validate required fields
        if (!body.title || !body.startTime || !body.endTime) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: title, startTime, endTime'
            }, { status: 400 });
        }

        let userId: string | null = null;
        let googleEventId: string | null = null;
        let source: 'local' | 'google' = 'local';
        let userTimezone: string = 'Asia/Seoul'; // Default fallback

        // Check for email auth first
        if (authToken) {
            try {
                const user = await verifyToken(authToken);
                if (user) {
                    userId = user.id;
                    // Set user timezone for email auth users
                    userTimezone = await getUserTimezoneByUserId(userId);
                }
            } catch (error) {
                console.error('Email auth verification failed:', error);
            }
        }

        // Get user timezone for calendar events
        async function getUserTimezoneByUserId(userId: string): Promise<string> {
            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('timezone')
                .eq('user_id', userId)
                .single();

            return getUserTimezone(userProfile || undefined);
        }

        // If Google tokens are available, use Google Calendar
        if (accessToken && refreshToken) {
            try {
                const googleCalendar = new GoogleCalendarService(accessToken, refreshToken);
                
                const googleEvent = await googleCalendar.createEvent({
                    summary: body.title,
                    description: body.description || '',
                    location: body.location,
                    start: {
                        dateTime: body.startTime,
                        timeZone: userTimezone
                    },
                    end: {
                        dateTime: body.endTime,
                        timeZone: userTimezone
                    },
                    attendees: body.attendees?.map((email: string) => ({ email })) || []
                });

                googleEventId = googleEvent.id || null;
                source = 'google';

                // Get user ID from Supabase session if not from email auth
                if (!userId) {
                    try {
                        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`
                            }
                        });

                        if (response.ok) {
                            const googleUser = await response.json();
                            userId = googleUser.id; // This will be the Google user ID

                            // Set user timezone
                            if (userId) {
                                userTimezone = await getUserTimezoneByUserId(userId);
                            }
                        }
                    } catch (error) {
                        console.error('Failed to get user from access token', error);
                    }
                }
            } catch (error) {
                console.error('Google Calendar API error:', error);
                // Continue with local storage if Google fails
            }
        }

        // If no user ID found, return error
        if (!userId) {
            return handleApiError(new AuthError());
        }

        // Set RLS context for the current user
        await setRLSContext(userId);

        // Save event to Supabase database
        const eventData = {
            user_id: userId,
            google_event_id: googleEventId,
            summary: body.title,
            description: body.description || null,
            location: body.location || null,
            start_time: body.startTime,
            end_time: body.endTime,
            attendees: body.attendees ? body.attendees.map((email: string) => ({ email })) : null,
            source: source,
            is_all_day: false,  // 수정: all_day -> is_all_day
            color_id: body.colorId || null,
            reminders: body.reminders || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: savedEvent, error: saveError } = await supabase
            .from('calendar_events')
            .insert(eventData)
            .select()
            .single();

        if (saveError) {
            console.error('Error saving event to database:', JSON.stringify(saveError, null, 2));
            console.error('Event data:', JSON.stringify(eventData, null, 2));
            console.error('RLS context userId:', userId);
            return NextResponse.json({
                success: false,
                error: 'Failed to save event to database',
                details: saveError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            event: savedEvent,
            source: source
        });

    } catch (error) {
        return handleApiError(error);
    }
}