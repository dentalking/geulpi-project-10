import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/email-auth';
import { LocalCalendarService } from '@/lib/local-calendar';
import { getCalendarClient } from '@/lib/google-auth';
import { handleApiError, AuthError } from '@/lib/api-errors';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('access_token')?.value;
        const authToken = cookieStore.get('auth-token')?.value;
        const body = await request.json();
        
        // Validate required fields
        if (!body.title || !body.startTime || !body.endTime) {
            return NextResponse.json({
                success: false,
                error: 'Missing required fields: title, startTime, endTime'
            }, { status: 400 });
        }

        // Check for email auth first
        if (authToken) {
            try {
                const user = await verifyToken(authToken);
                const localCalendar = new LocalCalendarService(user.id);
                
                const newEvent = localCalendar.addEvent({
                    summary: body.title,
                    description: body.description || '',
                    start: {
                        dateTime: body.startTime,
                        timeZone: 'Asia/Seoul'
                    },
                    end: {
                        dateTime: body.endTime,
                        timeZone: 'Asia/Seoul'
                    },
                    location: body.location,
                    attendees: body.attendees?.map((email: string) => ({ email })) || []
                });
                
                return NextResponse.json({
                    success: true,
                    event: newEvent,
                    source: 'local'
                });
            } catch (error) {
                console.error('Email auth failed:', error);
            }
        }

        // Fall back to Google Calendar
        if (!accessToken) {
            return handleApiError(new AuthError());
        }

        const calendar = getCalendarClient(accessToken);
        
        const event = {
            summary: body.title,
            description: body.description,
            location: body.location,
            start: {
                dateTime: body.startTime,
                timeZone: 'Asia/Seoul',
            },
            end: {
                dateTime: body.endTime,
                timeZone: 'Asia/Seoul',
            },
            attendees: body.attendees?.map((email: string) => ({ email })),
        };

        const result = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        });

        return NextResponse.json({
            success: true,
            event: result.data,
            source: 'google'
        });

    } catch (error) {
        return handleApiError(error);
    }
}