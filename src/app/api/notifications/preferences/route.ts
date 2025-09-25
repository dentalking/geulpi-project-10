import { NextRequest } from 'next/server';
import { getServiceRoleSupabase, requireAuth } from '@/lib/supabase-server';
import { apiSuccess, ApiErrors, withErrorHandling } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// GET /api/notifications/preferences - Fetch user notification preferences
export const GET = withErrorHandling(async (req: NextRequest) => {
  // Authenticate user
  const user = await requireAuth();
  const supabase = getServiceRoleSupabase();

  logger.debug('Fetching notification preferences', { userId: user.id });

  // Fetch user preferences
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // Not a "no rows" error
    logger.error('Preferences fetch error', error, { context: 'API' });
    return ApiErrors.databaseError('Failed to fetch preferences');
  }

  // Return preferences or defaults
  const preferences = data || {
    reminder_enabled: true,
    reminder_minutes: 15,
    travel_enabled: true,
    travel_buffer_minutes: 30,
    preparation_enabled: true,
    preparation_minutes: 60,
    briefing_enabled: true,
    briefing_time: '09:00',
    conflict_enabled: true
  };

  logger.info(`Fetched preferences for user ${user.id}`);
  return apiSuccess({ preferences }, 'Preferences fetched successfully');
})

// POST /api/notifications/preferences - Save user notification preferences
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Authenticate user
  const user = await requireAuth();
  const supabase = getServiceRoleSupabase();

  const body = await req.json();

  logger.debug('Saving notification preferences', { userId: user.id });

  // Prepare preferences data
  const preferences = {
    user_id: user.id,
    reminder_enabled: body.reminder_enabled ?? true,
    reminder_minutes: body.reminder_minutes ?? 15,
    travel_enabled: body.travel_enabled ?? true,
    travel_buffer_minutes: body.travel_buffer_minutes ?? 30,
    preparation_enabled: body.preparation_enabled ?? true,
    preparation_minutes: body.preparation_minutes ?? 60,
    briefing_enabled: body.briefing_enabled ?? true,
    briefing_time: body.briefing_time ?? '09:00',
    conflict_enabled: body.conflict_enabled ?? true,
    updated_at: new Date().toISOString()
  };

  // Upsert preferences (insert or update)
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(preferences, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (error) {
    logger.error('Preferences save error', error, { context: 'API' });
    return ApiErrors.databaseError('Failed to save preferences');
  }

  logger.info(`Saved preferences for user ${user.id}`);
  return apiSuccess(
    { preferences: data },
    'Preferences saved successfully'
  );
})

// DELETE /api/notifications/preferences - Reset to default preferences
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  // Authenticate user
  const user = await requireAuth();
  const supabase = getServiceRoleSupabase();

  logger.debug('Resetting notification preferences', { userId: user.id });

  // Delete user preferences (will revert to defaults)
  const { error } = await supabase
    .from('notification_preferences')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    logger.error('Preferences delete error', error, { context: 'API' });
    return ApiErrors.databaseError('Failed to reset preferences');
  }

  logger.info(`Reset preferences for user ${user.id}`);
  return apiSuccess(
    { success: true },
    'Preferences reset to defaults successfully'
  );
})