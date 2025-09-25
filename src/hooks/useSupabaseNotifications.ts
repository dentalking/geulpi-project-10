'use client';

import { useEffect, useRef } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { useNotificationStore } from '@/store/notificationStore';
import { ProactiveNotification } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';
import { retry } from '@/utils/retry';
import { logger } from '@/lib/logger';

export function useSupabaseNotifications(userId?: string) {
  const supabase = supabaseClient;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { addNotification, removeNotification, updateNotification } = useNotificationStore();

  useEffect(() => {
    if (!userId) return;

    // Re-enable realtime notifications with proper error handling

    // Set up realtime subscription for notifications
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          logger.debug('[Realtime] New notification:', payload);
          const notification = convertToProactiveNotification(payload.new);
          addNotification(notification);

          // Show browser notification if enabled
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/icon-192x192.png',
              badge: '/badge-72x72.png',
              tag: notification.id
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          logger.debug('[Realtime] Updated notification:', payload);
          const notification = convertToProactiveNotification(payload.new);
          updateNotification(notification.id, notification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          logger.debug('[Realtime] Deleted notification:', payload);
          removeNotification(payload.old.id);
        }
      )
      .subscribe((status) => {
        logger.debug('[Realtime] Subscription status:', { status });
      });

    channelRef.current = channel;

    // Initial fetch of existing notifications
    fetchNotifications(userId);

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId]);

  const fetchNotifications = async (userId: string) => {
    try {
      // Retry logic for fetching notifications
      const { data, error } = await retry(
        async () => {
          const result = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .eq('read', false)
            .eq('dismissed', false)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false });

          if (result.error) {
            throw result.error;
          }
          return result;
        },
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            logger.warn(`[Notifications] Retrying fetch (attempt ${attempt}):`, error.message);
          }
        }
      );

      if (error) {
        logger.error('[Notifications] Fetch error after retries:', error);
        return;
      }

      if (data) {
        // Clear existing and add fresh notifications
        useNotificationStore.getState().clearNotifications();
        data.forEach((dbNotification) => {
          const notification = convertToProactiveNotification(dbNotification);
          addNotification(notification);
        });
      }
    } catch (error) {
      logger.error('[Notifications] Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        logger.error('[Notifications] Mark as read error:', error);
      }
    } catch (error) {
      logger.error('[Notifications] Error marking as read:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        logger.error('[Notifications] Dismiss error:', error);
      }
    } catch (error) {
      logger.error('[Notifications] Error dismissing notification:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        logger.error('[Notifications] Mark all as read error:', error);
      }
    } catch (error) {
      logger.error('[Notifications] Error marking all as read:', error);
    }
  };

  const getUnreadCount = async (): Promise<number> => {
    if (!userId) return 0;

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
        .eq('dismissed', false);

      if (error) {
        logger.error('[Notifications] Get unread count error:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error('[Notifications] Error getting unread count:', error);
      return 0;
    }
  };

  return {
    markAsRead,
    dismissNotification,
    markAllAsRead,
    getUnreadCount,
    refetch: () => userId && fetchNotifications(userId)
  };
}

// Helper function to convert Supabase notification to ProactiveNotification
function convertToProactiveNotification(dbNotification: any): ProactiveNotification {
  return {
    id: dbNotification.id,
    type: dbNotification.type,
    priority: dbNotification.priority,
    title: dbNotification.title,
    message: dbNotification.message,
    actions: dbNotification.actions || [],
    actionRequired: dbNotification.priority === 'urgent',
    metadata: {
      ...dbNotification.metadata,
      eventId: dbNotification.event_id,
      read: dbNotification.read,
      readAt: dbNotification.read_at,
      dismissed: dbNotification.dismissed,
      dismissedAt: dbNotification.dismissed_at
    },
    scheduledFor: dbNotification.scheduled_for ? new Date(dbNotification.scheduled_for) : undefined,
    expiresAt: dbNotification.expires_at ? new Date(dbNotification.expires_at) : undefined
  };
}