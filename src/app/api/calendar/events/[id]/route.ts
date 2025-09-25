import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { supabase } from '@/lib/db';
import { getCalendarClient } from '@/lib/google-auth';
import { getUserTimezone } from '@/lib/timezone';

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

// Helper to get user timezone from profile
async function getUserTimezoneFromProfile(userId: string): Promise<string> {
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('timezone')
    .eq('user_id', userId)
    .single();

  return getUserTimezone(userProfile || undefined);
}

// Helper to check if ID is a Google Calendar ID
function isGoogleCalendarId(id: string): boolean {
  // UUID format: 8-4-4-4-12 hexadecimal digits
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return !uuidRegex.test(id);
}

// DELETE endpoint for deleting an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const eventId = params.id;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if this is a Google Calendar event
    if (isGoogleCalendarId(eventId)) {
      // Get user's auth type
      const { data: userData } = await supabase
        .from('users')
        .select('auth_type')
        .eq('id', userId)
        .single();

      if (userData?.auth_type === 'google_oauth') {
        // Delete from Google Calendar
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('google_access_token')?.value;
        const refreshToken = cookieStore.get('google_refresh_token')?.value;

        if (!accessToken) {
          return NextResponse.json(
            { success: false, error: 'Google authentication required' },
            { status: 401 }
          );
        }

        try {
          const calendar = getCalendarClient(accessToken, refreshToken);
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
          });

          logger.debug('Successfully deleted Google Calendar event:', eventId);

          return NextResponse.json({
            success: true,
            message: 'Event deleted from Google Calendar',
            deletedId: eventId
          });
        } catch (error: any) {
          logger.error('Error deleting from Google Calendar:', error);

          // If event not found or already deleted, return success (it's already gone)
          const errorMessage = error.message?.toLowerCase() || '';
          const statusCode = error.code || error.response?.status;

          if (statusCode === 404 ||
              statusCode === 410 ||
              errorMessage.includes('not found') ||
              errorMessage.includes('resource has been deleted') ||
              errorMessage.includes('deleted')) {
            logger.debug('Event already deleted or not found, treating as success:', eventId);
            return NextResponse.json({
              success: true,
              message: 'Event deleted from Google Calendar',
              deletedId: eventId
            });
          }

          return NextResponse.json(
            { success: false, error: 'Failed to delete event from Google Calendar' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Cannot delete Google Calendar events without Google OAuth' },
          { status: 403 }
        );
      }
    }

    // For local database events
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete this event
    if (existingEvent.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this event' },
        { status: 403 }
      );
    }

    // Delete event from database
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      logger.error('Error deleting event from database:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete event from database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
      deletedId: eventId
    });

  } catch (error) {
    logger.error('Calendar delete error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}

// PUT endpoint for updating an event
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const eventId = params.id;
    const updates = await request.json();

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if this is a Google Calendar event
    if (isGoogleCalendarId(eventId)) {
      // Get user's auth type
      const { data: userData } = await supabase
        .from('users')
        .select('auth_type')
        .eq('id', userId)
        .single();

      if (userData?.auth_type === 'google_oauth') {
        // Update in Google Calendar
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('google_access_token')?.value;
        const refreshToken = cookieStore.get('google_refresh_token')?.value;

        if (!accessToken) {
          return NextResponse.json(
            { success: false, error: 'Google authentication required' },
            { status: 401 }
          );
        }

        try {
          const calendar = getCalendarClient(accessToken, refreshToken);

          // First get the existing event to merge updates
          const { data: existingEvent } = await calendar.events.get({
            calendarId: 'primary',
            eventId: eventId,
          });

          // Prepare update data for Google Calendar
          const eventUpdate: any = {
            summary: updates.title || updates.summary || existingEvent.summary,
            description: updates.description !== undefined ? updates.description : existingEvent.description,
            location: updates.location !== undefined ? updates.location : existingEvent.location,
          };

          // Handle date/time updates
          if (updates.startTime || updates.endTime) {
            const userTimezone = await getUserTimezoneFromProfile(userId);

            eventUpdate.start = updates.startTime ? {
              dateTime: updates.startTime,
              timeZone: userTimezone
            } : existingEvent.start;

            eventUpdate.end = updates.endTime ? {
              dateTime: updates.endTime,
              timeZone: userTimezone
            } : existingEvent.end;
          }

          const { data: updatedEvent } = await calendar.events.update({
            calendarId: 'primary',
            eventId: eventId,
            requestBody: eventUpdate,
          });

          logger.debug('Successfully updated Google Calendar event:', eventId);

          return NextResponse.json({
            success: true,
            event: {
              id: updatedEvent.id,
              summary: updatedEvent.summary,
              description: updatedEvent.description,
              location: updatedEvent.location,
              start_time: updatedEvent.start?.dateTime || updatedEvent.start?.date,
              end_time: updatedEvent.end?.dateTime || updatedEvent.end?.date,
            },
            message: 'Event updated in Google Calendar'
          });
        } catch (error: any) {
          logger.error('Error updating Google Calendar event:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to update event in Google Calendar' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Cannot update Google Calendar events without Google OAuth' },
          { status: 403 }
        );
      }
    }

    // For local database events
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update this event
    if (existingEvent.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to update this event' },
        { status: 403 }
      );
    }

    // Update event in database
    const updateData = {
      summary: updates.title || updates.summary || existingEvent.summary,
      description: updates.description !== undefined ? updates.description : existingEvent.description,
      location: updates.location !== undefined ? updates.location : existingEvent.location,
      start_time: updates.startTime || existingEvent.start_time,
      end_time: updates.endTime || existingEvent.end_time,
      updated_at: new Date().toISOString()
    };

    const { data: updatedEvent, error: updateError } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', eventId)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating event in database:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update event in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: updatedEvent,
      message: 'Event updated successfully'
    });

  } catch (error) {
    logger.error('Calendar update error', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}