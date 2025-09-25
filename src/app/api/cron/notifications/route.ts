import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// This function will be called by Vercel Cron
// It processes scheduled notifications that are due to be sent
export async function GET(req: NextRequest) {
  try {
    // Verify this is a Vercel Cron request
    const authHeader = headers().get('authorization');
    if (authHeader !== `Bearer ${env.get('CRON_SECRET')}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Supabase admin client
    const supabase = createClient(
      env.get('NEXT_PUBLIC_SUPABASE_URL')!,
      env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const now = new Date();

    // 1. Fetch notifications that are scheduled and due
    const { data: dueNotifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .lte('scheduled_for', now.toISOString())
      .eq('read', false)
      .eq('dismissed', false)
      .is('processed_at', null);

    if (fetchError) {
      logger.error('[Cron] Error fetching due notifications:', fetchError);
      return NextResponse.json({
        error: 'Failed to fetch notifications'
      }, { status: 500 });
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      return NextResponse.json({
        message: 'No notifications to process',
        processed: 0
      });
    }

    logger.debug(`[Cron] Processing ${dueNotifications.length} notifications`);

    // 2. Mark notifications as processed
    const notificationIds = dueNotifications.map(n => n.id);
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ processed_at: now.toISOString() })
      .in('id', notificationIds);

    if (updateError) {
      logger.error('[Cron] Error updating notifications:', updateError);
    }

    // 3. For each notification, trigger realtime update
    // The Realtime subscription in the client will handle the actual display
    for (const notification of dueNotifications) {
      // Log for monitoring
      logger.debug(`[Cron] Processing notification ${notification.id} for user ${notification.user_id}`);

      // You can add additional processing here like:
      // - Sending emails
      // - Pushing to external services
      // - Analytics tracking
    }

    // 4. Clean up expired notifications
    const { error: cleanupError } = await supabase
      .from('notifications')
      .delete()
      .lt('expires_at', now.toISOString())
      .not('expires_at', 'is', null);

    if (cleanupError) {
      logger.error('[Cron] Error cleaning up expired notifications:', cleanupError);
    }

    return NextResponse.json({
      message: 'Notifications processed successfully',
      processed: dueNotifications.length
    });
  } catch (error) {
    logger.error('[Cron] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}