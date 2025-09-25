import { NextRequest } from 'next/server';
import { getServiceRoleSupabase, requireAuth } from '@/lib/supabase-server';
import { apiSuccess, ApiErrors, validateBody, withErrorHandling } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

// GET /api/notifications - Fetch user notifications
export const GET = withErrorHandling(async (req: NextRequest) => {
  // Authenticate user
  const user = await requireAuth();
  const supabase = getServiceRoleSupabase();

  // Parse query parameters
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const priority = url.searchParams.get('priority');
  const type = url.searchParams.get('type');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  logger.debug('Fetching notifications', {
    userId: user.id,
    filters: { unreadOnly, priority, type, limit }
  });

  // Build query
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  // Apply filters
  if (unreadOnly) {
    query = query.eq('read', false);
  }
  if (priority) {
    query = query.eq('priority', priority);
  }
  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Notifications fetch error', error, 'API');
    return ApiErrors.databaseError('Failed to fetch notifications');
  }

  logger.info(`Fetched ${data?.length || 0} notifications for user ${user.id}`);
  return apiSuccess({ notifications: data }, 'Notifications fetched successfully');
});

// POST /api/notifications - Create a new notification
export const POST = withErrorHandling(async (req: NextRequest) => {
  // Authenticate user
  const user = await requireAuth();
  const supabase = getServiceRoleSupabase();

  const body = await req.json();
  const {
    type,
    priority = 'medium',
    title,
    message,
    actions = [],
    metadata = {},
    event_id,
    scheduled_for,
    expires_at
  } = body;

  // Validate required fields
  const validation = validateBody(body, ['type', 'title', 'message']);
  if (!validation.valid) {
    return ApiErrors.validationError(validation.errors);
  }

  logger.debug('Creating notification', { userId: user.id, type, priority });

  // Create notification
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      type,
      priority,
      title,
      message,
      actions,
      metadata,
      event_id,
      scheduled_for,
      expires_at
    })
    .select()
    .single();

  if (error) {
    logger.error('Notification creation error', error, 'API');
    return ApiErrors.databaseError('Failed to create notification');
  }

  logger.info(`Created notification ${data.id} for user ${user.id}`);
  return apiSuccess({ notification: data }, 'Notification created successfully', { status: 201 });
});

// PATCH /api/notifications - Mark notification as read or dismissed
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  // Authenticate user
  const user = await requireAuth();
  const supabase = getServiceRoleSupabase();

  const body = await req.json();
  const { notificationId, action } = body;

  // Validate required fields
  const validation = validateBody(body, ['notificationId', 'action']);
  if (!validation.valid) {
    return ApiErrors.validationError(validation.errors);
  }

  logger.debug('Updating notification', { notificationId, action, userId: user.id });

  let updateData: any = {};

  switch (action) {
    case 'read':
      updateData = { read: true, read_at: new Date().toISOString() };
      break;
    case 'unread':
      updateData = { read: false, read_at: null };
      break;
    case 'dismiss':
      updateData = { dismissed: true, dismissed_at: new Date().toISOString() };
      break;
    case 'undismiss':
      updateData = { dismissed: false, dismissed_at: null };
      break;
    default:
      return ApiErrors.validationError(['Invalid action']);
  }

  const { data, error } = await supabase
    .from('notifications')
    .update(updateData)
    .eq('id', notificationId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return ApiErrors.notFound('Notification');
    }
    logger.error('Notification update error', error, 'API');
    return ApiErrors.databaseError('Failed to update notification');
  }

  logger.info(`Updated notification ${notificationId} with action ${action}`);
  return apiSuccess({ notification: data }, 'Notification updated successfully');
});

// DELETE /api/notifications/{id} - Delete a notification
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  // Authenticate user
  const user = await requireAuth();
  const supabase = getServiceRoleSupabase();

  // Get notification ID from URL
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const notificationId = pathParts[pathParts.length - 1];

  if (!notificationId || notificationId === 'notifications') {
    return ApiErrors.validationError(['Notification ID required']);
  }

  logger.debug('Deleting notification', { notificationId, userId: user.id });

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) {
    logger.error('Notification deletion error', error, 'API');
    return ApiErrors.databaseError('Failed to delete notification');
  }

  logger.info(`Deleted notification ${notificationId} for user ${user.id}`);
  return apiSuccess({ success: true }, 'Notification deleted successfully');
});