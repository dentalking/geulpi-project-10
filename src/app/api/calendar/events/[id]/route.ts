import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/email-auth';
import { GoogleCalendarService } from '@/services/google/GoogleCalendarService';
import { successResponse, errorResponse, ApiError, ErrorCodes } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE endpoint for deleting an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const accessToken = cookieStore.get('access_token')?.value;

    logger.info('DELETE request received', {
      hasAuthToken: !!authToken,
      hasAccessToken: !!accessToken,
      eventId: params.id
    });

    if (!authToken && !accessToken) {
      logger.error('No authentication tokens found');
      throw new ApiError(
        401,
        ErrorCodes.UNAUTHENTICATED,
        'Authentication required to delete events'
      );
    }

    const eventId = params.id;
    
    if (!eventId) {
      throw new ApiError(
        400,
        ErrorCodes.MISSING_FIELD,
        'Event ID is required'
      );
    }

    logger.info('Deleting calendar event', { eventId });

    const supabase = supabaseAdmin;
    const refreshToken = cookieStore.get('refresh_token')?.value;
    let userId: string | null = null;

    // Check for email auth first
    if (authToken) {
      try {
        const user = await verifyToken(authToken);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        logger.error('Email auth verification failed', error);
      }
    }

    // Get user ID from Supabase session if not from email auth
    if (!userId && accessToken) {
      // For Google OAuth users, extract user ID from the access token
      // The access token from Google contains the Google user ID
      logger.info('Attempting to get user ID from access token');

      // Try to get user info from Google OAuth
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (response.ok) {
          const googleUser = await response.json();
          userId = googleUser.id; // This will be the Google user ID
          logger.info('Got Google user ID', { userId });
        } else {
          logger.error('Failed to get Google user info', { status: response.status });
        }
      } catch (error) {
        logger.error('Failed to get user from access token', error);
      }
    }

    if (!userId) {
      throw new ApiError(
        401,
        ErrorCodes.UNAUTHENTICATED,
        'Authentication required to delete events'
      );
    }

    // Get the existing event from Supabase
    // For Google OAuth users, we need to handle the case where user_id might be null
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !existingEvent) {
      throw new ApiError(
        404,
        ErrorCodes.NOT_FOUND,
        'Event not found'
      );
    }

    // Check if user has permission to delete/update this event
    // Since user_id is now TEXT, we can directly compare Google OAuth IDs
    // Allow if user_id is null (legacy events) or matches the request user ID
    logger.info('Event ownership check', {
      eventUserId: existingEvent.user_id,
      requestUserId: userId,
      isNull: existingEvent.user_id === null,
      isOwner: existingEvent.user_id === userId || existingEvent.user_id === null
    });

    // Verify ownership
    if (existingEvent.user_id !== null && existingEvent.user_id !== userId) {
      throw new ApiError(
        403,
        ErrorCodes.UNAUTHORIZED,
        'You do not have permission to delete this event'
      );
    }

    // If this is a Google Calendar event, delete it from Google Calendar first
    if (existingEvent.google_event_id && accessToken && refreshToken) {
      try {
        const googleCalendar = new GoogleCalendarService(accessToken, refreshToken);
        await googleCalendar.deleteEvent(existingEvent.google_event_id);
        logger.info('Event deleted from Google Calendar', { googleEventId: existingEvent.google_event_id });
      } catch (error) {
        logger.error('Google Calendar delete failed:', error);
        // Continue with Supabase deletion even if Google fails
      }
    }

    // Delete event from Supabase database
    // Since we've already verified ownership, we can delete by ID only
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      logger.error('Error deleting event from database:', deleteError);
      throw new ApiError(
        500,
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete event from database'
      );
    }

    logger.info('Event deleted successfully', { userId, eventId });
    
    return successResponse({
      deleted: eventId,
      message: 'Event deleted successfully'
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

// PUT endpoint for updating an event
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const accessToken = cookieStore.get('access_token')?.value;

    if (!authToken && !accessToken) {
      throw new ApiError(
        401,
        ErrorCodes.UNAUTHENTICATED,
        'Authentication required to update events'
      );
    }

    const eventId = params.id;
    const updates = await request.json();
    
    if (!eventId) {
      throw new ApiError(
        400,
        ErrorCodes.MISSING_FIELD,
        'Event ID is required'
      );
    }

    logger.info('Updating calendar event', { eventId });

    const supabase = supabaseAdmin;
    const refreshToken = cookieStore.get('refresh_token')?.value;
    let userId: string | null = null;

    // Check for email auth first
    if (authToken) {
      try {
        const user = await verifyToken(authToken);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        logger.error('Email auth verification failed', error);
      }
    }

    // Get user ID from Supabase session if not from email auth
    if (!userId && accessToken) {
      // For Google OAuth users, extract user ID from the access token
      // The access token from Google contains the Google user ID
      logger.info('Attempting to get user ID from access token');

      // Try to get user info from Google OAuth
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (response.ok) {
          const googleUser = await response.json();
          userId = googleUser.id; // This will be the Google user ID
          logger.info('Got Google user ID', { userId });
        } else {
          logger.error('Failed to get Google user info', { status: response.status });
        }
      } catch (error) {
        logger.error('Failed to get user from access token', error);
      }
    }

    if (!userId) {
      throw new ApiError(
        401,
        ErrorCodes.UNAUTHENTICATED,
        'Authentication required to update events'
      );
    }

    // Get the existing event from Supabase
    // For Google OAuth users, we need to handle the case where user_id might be null
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (fetchError || !existingEvent) {
      throw new ApiError(
        404,
        ErrorCodes.NOT_FOUND,
        'Event not found'
      );
    }

    // Check if user has permission to delete/update this event
    // Since user_id is now TEXT, we can directly compare Google OAuth IDs
    // Allow if user_id is null (legacy events) or matches the request user ID
    logger.info('Event ownership check', {
      eventUserId: existingEvent.user_id,
      requestUserId: userId,
      isNull: existingEvent.user_id === null,
      isOwner: existingEvent.user_id === userId || existingEvent.user_id === null
    });

    // Verify ownership
    if (existingEvent.user_id !== null && existingEvent.user_id !== userId) {
      throw new ApiError(
        403,
        ErrorCodes.UNAUTHORIZED,
        'You do not have permission to update this event'
      );
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
          if ((googleUpdates as any)[key] === undefined) {
            delete (googleUpdates as any)[key];
          }
        });

        await googleCalendar.updateEvent(
          existingEvent.google_event_id,
          googleUpdates
        );
        logger.info('Event updated in Google Calendar', { googleEventId: existingEvent.google_event_id });
      } catch (error) {
        logger.error('Google Calendar update failed:', error);
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
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating event in database:', updateError);
      throw new ApiError(
        500,
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update event in database'
      );
    }

    logger.info('Event updated successfully', { userId, eventId });
    
    return successResponse({
      event: updatedEvent,
      message: 'Event updated successfully'
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