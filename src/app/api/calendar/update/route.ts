import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/email-auth';
import { GoogleCalendarService } from '@/services/google/GoogleCalendarService';
import { handleApiError, AuthError } from '@/lib/api-errors';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(request: Request) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        const refreshToken = cookieStore.get('refresh_token')?.value;
        const authToken = cookieStore.get('auth-token')?.value;
        const { eventId, updates } = await request.json();
        
        if (!eventId) {
            return NextResponse.json({
                success: false,
                error: 'Event ID is required'
            }, { status: 400 });
        }

        const supabase = supabaseAdmin;
        let userId: string | null = null;

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

        // Get user ID from Supabase session if not from email auth
        if (!userId && accessToken) {
            // For Google OAuth users, extract user ID from the access token
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

        if (!userId) {
            return handleApiError(new AuthError());
        }

        // Get the existing event from Supabase
        const { data: existingEvent, error: fetchError } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('id', eventId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !existingEvent) {
            return NextResponse.json({
                success: false,
                error: 'Event not found or access denied'
            }, { status: 404 });
        }

        // If this is a Google Calendar event, update it in Google Calendar first
        if (existingEvent.google_event_id && accessToken && refreshToken) {
            try {
                const googleCalendar = new GoogleCalendarService(accessToken, refreshToken);
                
                const googleUpdates = {
                    summary: updates.title || updates.summary,
                    description: updates.description,
                    location: updates.location,
                    start: updates.startTime ? {
                        dateTime: updates.startTime,
                        timeZone: 'Asia/Seoul'
                    } : undefined,
                    end: updates.endTime ? {
                        dateTime: updates.endTime,
                        timeZone: 'Asia/Seoul'
                    } : undefined,
                    attendees: updates.attendees?.map((email: string) => ({ email }))
                };

                // Remove undefined fields
                Object.keys(googleUpdates).forEach(key => {
                    if (googleUpdates[key] === undefined) {
                        delete googleUpdates[key];
                    }
                });

                await googleCalendar.updateEvent(
                    existingEvent.google_event_id,
                    googleUpdates
                );
            } catch (error) {
                console.error('Google Calendar update failed:', error);
                // Continue with Supabase update even if Google fails
            }
        }

        // Update event in Supabase database
        const updateData = {
            summary: updates.title || updates.summary || existingEvent.summary,
            description: updates.description !== undefined ? updates.description : existingEvent.description,
            location: updates.location !== undefined ? updates.location : existingEvent.location,
            start_time: updates.startTime || existingEvent.start_time,
            end_time: updates.endTime || existingEvent.end_time,
            attendees: updates.attendees ? JSON.stringify(updates.attendees.map((email: string) => ({ email }))) : existingEvent.attendees,
            color_id: updates.colorId !== undefined ? updates.colorId : existingEvent.color_id,
            reminders: updates.reminders ? JSON.stringify(updates.reminders) : existingEvent.reminders,
            updated_at: new Date().toISOString()
        };

        const { data: updatedEvent, error: updateError } = await supabase
            .from('calendar_events')
            .update(updateData)
            .eq('id', eventId)
            .eq('user_id', userId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating event in database:', updateError);
            return NextResponse.json({
                success: false,
                error: 'Failed to update event in database'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            event: updatedEvent
        });

    } catch (error) {
        return handleApiError(error);
    }
}
