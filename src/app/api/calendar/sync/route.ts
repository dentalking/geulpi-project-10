import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { supabase } from '@/lib/db';
import { getCalendarClient } from '@/lib/google-auth';
import { getUserTimezone, DEFAULT_TIMEZONE } from '@/lib/timezone';
import { getValidGoogleTokens } from '@/middleware/token-refresh';
import { withCalendarSync, withGoogleAPILimit } from '@/lib/concurrency-manager';

// Helper to get user ID from request
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token')?.value;

  if (!authToken) {
    return null;
  }

  try {
    const user = await verifyToken(authToken);
    return user?.id || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Wrap the entire sync operation with concurrency control
    return await withCalendarSync(userId, async () => {
      return await performCalendarSync(request, userId);
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function performCalendarSync(request: NextRequest, userId: string) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || 'anonymous';
    const maxResults = parseInt(searchParams.get('maxResults') || '50');

    // Get user's auth type and profile from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('auth_type')
      .eq('id', userId)
      .single();

    // Get user profile for timezone
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('user_id', userId)
      .single();

    // Determine user's timezone
    const userTimezone = getUserTimezone(userProfile || undefined);

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    let calendarEvents: any[] = [];
    let source = 'local';

    // Dual-track syncing based on auth_type
    if (userData?.auth_type === 'google_oauth') {
      // Google OAuth users: Fetch from Google Calendar API
      console.log('Fetching events from Google Calendar for OAuth user:', userId);

      // Use centralized token management
      const tokenResult = await getValidGoogleTokens();

      if (!tokenResult.isValid || !tokenResult.accessToken) {
        console.error('Google authentication failed:', tokenResult.error);
        return NextResponse.json(
          { success: false, error: tokenResult.error || 'Google authentication required' },
          { status: 401 }
        );
      }

      const { accessToken, refreshToken } = tokenResult;

      try {
        const calendar = getCalendarClient(accessToken, refreshToken);

        // Calculate time range (e.g., events from 1 month ago to 1 year from now)
        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 1);
        const timeMax = new Date();
        timeMax.setFullYear(timeMax.getFullYear() + 1);

        const response = await withGoogleAPILimit(async () => {
          return await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: maxResults,
            singleEvents: true,
            orderBy: 'startTime',
          });
        });

        if (response.data.items) {
          calendarEvents = response.data.items.map(event => ({
            id: event.id || '',
            summary: event.summary || 'Untitled Event',
            description: event.description || '',
            location: event.location || '',
            start: {
              dateTime: event.start?.dateTime || event.start?.date || '',
              timeZone: event.start?.timeZone || userTimezone
            },
            end: {
              dateTime: event.end?.dateTime || event.end?.date || '',
              timeZone: event.end?.timeZone || userTimezone
            },
            attendees: event.attendees?.map(a => ({
              email: a.email,
              displayName: a.displayName,
              responseStatus: a.responseStatus
            })) || [],
            colorId: event.colorId || '1',
            status: event.status || 'confirmed',
            created: event.created || new Date().toISOString(),
            updated: event.updated || new Date().toISOString(),
            source: 'google'
          }));
        }

        source = 'google';
        console.log('Successfully fetched Google Calendar events:', calendarEvents.length);

      } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch Google Calendar events' },
          { status: 500 }
        );
      }

    } else {
      // Standard email auth users: Fetch from Supabase database
      console.log('Fetching events from database for standard user:', userId);

      const { data: events, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true })
        .limit(maxResults);

      if (error) {
        console.error('Error fetching events from database:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch events from database' },
          { status: 500 }
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
          timeZone: userTimezone
        },
        end: {
          dateTime: event.end_time,
          timeZone: userTimezone
        },
        attendees: event.attendees ? (() => {
          try {
            return JSON.parse(event.attendees);
          } catch (error) {
            console.warn('Invalid attendees JSON for event', event.id, event.attendees);
            return [];
          }
        })() : [],
        colorId: event.color_id,
        status: event.status || 'confirmed',
        created: event.created_at,
        updated: event.updated_at,
        source: event.source || 'local'
      }));

      source = 'supabase';
    }

    console.log('Calendar events synced', {
      eventCount: calendarEvents.length,
      sessionId,
      userId,
      authType: userData?.auth_type,
      source
    });

    return NextResponse.json({
      success: true,
      data: {
        events: calendarEvents,
        total: calendarEvents.length,
        syncTime: new Date().toISOString(),
        source: source
      }
    });

  } catch (error) {
    console.error('Calendar sync error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync calendar' },
      { status: 500 }
    );
  }
}