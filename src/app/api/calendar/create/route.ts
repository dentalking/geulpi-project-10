import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/email-auth';
import { GoogleCalendarService } from '@/services/google/GoogleCalendarService';
import { handleApiError, AuthError } from '@/lib/api-errors';
import { supabaseAdmin } from '@/lib/supabase';

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

        const supabase = supabaseAdmin;
        let userId: string | null = null;
        let googleEventId: string | null = null;
        let source: 'local' | 'google' = 'local';

        // Check for email auth first
        if (authToken) {
            try {
                const user = await verifyToken(authToken);
                if (user) {
                    userId = user.id;
                }
            } catch (error) {
                console.error('Email auth verification failed:', error);
            }
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
                        timeZone: 'Asia/Seoul'
                    },
                    end: {
                        dateTime: body.endTime,
                        timeZone: 'Asia/Seoul'
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

        // Save event to Supabase database
        const eventData = {
            user_id: userId,
            google_event_id: googleEventId,
            summary: body.title,
            description: body.description || null,
            location: body.location || null,
            start_time: body.startTime,
            end_time: body.endTime,
            attendees: body.attendees ? JSON.stringify(body.attendees.map((email: string) => ({ email }))) : null,
            source: source,
            all_day: false,
            color_id: body.colorId || null,
            reminders: body.reminders ? JSON.stringify(body.reminders) : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: savedEvent, error: saveError } = await supabase
            .from('calendar_events')
            .insert(eventData)
            .select()
            .single();

        if (saveError) {
            console.error('Error saving event to database:', saveError);
            return NextResponse.json({
                success: false,
                error: 'Failed to save event to database'
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