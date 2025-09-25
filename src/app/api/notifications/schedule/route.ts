import { NextRequest } from 'next/server';
import { getServiceRoleSupabase, requireAuth } from '@/lib/supabase-server';
import { apiSuccess, ApiErrors, validateBody, withErrorHandling } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { addMinutes, addHours, isBefore, isAfter } from 'date-fns';

// POST /api/notifications/schedule - Schedule notifications for an event
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Authenticate user - handle different auth methods
  let user;
  try {
    user = await requireAuth();
  } catch (error) {
    logger.error('Authentication failed in notifications/schedule', error);
    return ApiErrors.unauthorized('Authentication required');
  }

  const supabase = getServiceRoleSupabase();

  const body = await req.json();
  const { event } = body;

  if (!event || !event.id || !event.start) {
    return ApiErrors.validationError(['Invalid event data: event, event.id, and event.start are required']);
  }

  logger.debug('Scheduling notifications for event', { eventId: event.id, userId: user.id });

  // Get user preferences
  const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

  // Use defaults if no preferences exist
  const prefs = preferences || {
      reminder_enabled: true,
      reminder_minutes: 15,
      travel_enabled: true,
      travel_buffer_minutes: 30,
      preparation_enabled: true,
      preparation_minutes: 60,
      briefing_enabled: true,
      conflict_enabled: true
    };

  const eventTime = new Date(event.start.dateTime || event.start.date);
  const now = new Date();
  const notifications: any[] = [];

  // Only schedule future notifications
  if (isAfter(eventTime, now)) {
    // 1. Reminder notification
    if (prefs.reminder_enabled) {
        const reminderTime = addMinutes(eventTime, -prefs.reminder_minutes);
        if (isAfter(reminderTime, now)) {
          notifications.push({
            user_id: user.id,
            event_id: event.id,
            type: 'reminder',
            priority: 'high',
            title: 'Event Reminder',
            message: `${event.summary} starts in ${prefs.reminder_minutes} minutes`,
            scheduled_for: reminderTime.toISOString(),
            expires_at: eventTime.toISOString(),
            actions: [
              {
                id: 'view',
                label: 'View Event',
                action: `view-event:${event.id}`,
                style: 'primary'
              },
              {
                id: 'dismiss',
                label: 'Dismiss',
                action: 'dismiss',
                style: 'secondary'
              }
            ]
          });
        }
      }

    // 2. Travel notification (if location exists)
    if (prefs.travel_enabled && event.location) {
        const travelTime = addMinutes(eventTime, -prefs.travel_buffer_minutes);
        if (isAfter(travelTime, now)) {
          notifications.push({
            user_id: user.id,
            event_id: event.id,
            type: 'alert',
            priority: 'urgent',
            title: 'Time to Leave',
            message: `Leave for ${event.summary} at ${event.location}`,
            scheduled_for: travelTime.toISOString(),
            expires_at: eventTime.toISOString(),
            metadata: { location: event.location },
            actions: [
              {
                id: 'navigate',
                label: 'Get Directions',
                action: `navigate:${event.location}`,
                style: 'primary'
              },
              {
                id: 'snooze',
                label: 'Snooze 10min',
                action: 'snooze:10',
                style: 'secondary'
              }
            ]
          });
        }
      }

    // 3. Preparation notification (for meetings)
    const isMeeting = event.summary?.toLowerCase().includes('meeting') ||
                       event.summary?.toLowerCase().includes('call') ||
                       event.attendees?.length > 1;

    if (prefs.preparation_enabled && isMeeting) {
        const prepTime = addMinutes(eventTime, -prefs.preparation_minutes);
        if (isAfter(prepTime, now)) {
          notifications.push({
            user_id: user.id,
            event_id: event.id,
            type: 'suggestion',
            priority: 'medium',
            title: 'Meeting Preparation',
            message: `Prepare for ${event.summary}`,
            scheduled_for: prepTime.toISOString(),
            expires_at: eventTime.toISOString(),
            metadata: {
              tasks: [
                'Review agenda',
                'Prepare materials',
                'Test video/audio',
                'Join meeting link'
              ]
            },
            actions: [
              {
                id: 'prepare',
                label: 'Start Preparing',
                action: `prepare-meeting:${event.id}`,
                style: 'primary'
              }
            ]
          });
        }
      }
    }

  // Insert all notifications
  if (notifications.length > 0) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      logger.error('Schedule notifications error', error, 'API');
      return ApiErrors.databaseError('Failed to schedule notifications');
    }

    logger.info(`Scheduled ${data?.length || 0} notifications for event ${event.id}`);
    return apiSuccess(
      {
        scheduled: data?.length || 0,
        notifications: data
      },
      'Notifications scheduled successfully'
    );
  }

  logger.info(`No notifications to schedule for event ${event.id}`);
  return apiSuccess(
    {
      scheduled: 0,
      message: 'No notifications to schedule'
    },
    'No notifications needed'
  );
})

// GET /api/notifications/schedule - Get scheduled notifications
export const GET = withErrorHandling(async (req: NextRequest) => {
  // Authenticate user
  const user = await requireAuth();
  const supabase = getServiceRoleSupabase();

  logger.debug('Fetching scheduled notifications', { userId: user.id });

  // Get upcoming scheduled notifications
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .gte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true });

  if (error) {
    logger.error('Get scheduled notifications error', error, 'API');
    return ApiErrors.databaseError('Failed to fetch scheduled notifications');
  }

  logger.info(`Fetched ${data?.length || 0} scheduled notifications for user ${user.id}`);
  return apiSuccess(
    {
      scheduled: data?.length || 0,
      notifications: data || []
    },
    'Scheduled notifications fetched successfully'
  );
})