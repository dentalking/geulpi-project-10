'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellDot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SimpleNotificationWidget from './SimpleNotificationWidget';
import type { CalendarEvent } from '@/types';

interface NotificationIconButtonProps {
  userId?: string;
  events?: CalendarEvent[];
  locale?: string;
  className?: string;
}

export function NotificationIconButton({
  userId,
  events = [],
  locale = 'ko',
  className = ''
}: NotificationIconButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check for notifications on mount
  useEffect(() => {
    const checkForNotifications = () => {
      // Check if there are today's events
      const todayEvents = events.filter(event => {
        const eventDate = event.start?.dateTime || event.start?.date;
        if (!eventDate) return false;
        const eventDay = new Date(eventDate).toDateString();
        const today = new Date().toDateString();
        return eventDay === today;
      });

      // Check for conflicts
      const hasConflicts = checkForEventConflicts(todayEvents);

      // Set notification state - always show for debugging
      const hasContent = todayEvents.length > 0 || hasConflicts || true; // Always true for debugging
      setHasNotifications(hasContent);
      setUnreadCount(Math.max(todayEvents.length, 1)); // At least 1 for visibility
    };

    checkForNotifications();
  }, [events]);

  const checkForEventConflicts = (todayEvents: CalendarEvent[]) => {
    for (let i = 0; i < todayEvents.length - 1; i++) {
      const current = todayEvents[i];
      const next = todayEvents[i + 1];

      if (!current.end?.dateTime || !next.start?.dateTime) continue;

      const currentEnd = new Date(current.end.dateTime);
      const nextStart = new Date(next.start.dateTime);

      if (currentEnd > nextStart) return true;
    }
    return false;
  };

  const toggleNotifications = () => {
    setIsOpen(!isOpen);

    // Mark as read when opened
    if (!isOpen && hasNotifications) {
      setTimeout(() => {
        setHasNotifications(false);
      }, 500);
    }
  };

  return (
    <>
      {/* Notification Icon Button */}
      <button
        onClick={toggleNotifications}
        className={`relative p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
        style={{ color: 'var(--text-tertiary)' }}
        aria-label={locale === 'ko' ? '알림' : 'Notifications'}
      >
        <motion.div
          animate={{ rotate: isOpen ? [0, -10, 10, -10, 0] : 0 }}
          transition={{ duration: 0.5 }}
        >
          {hasNotifications ? (
            <BellDot className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </motion.div>

        {/* Notification Badge */}
        {hasNotifications && unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}

        {/* Pulse Animation for New Notifications */}
        {hasNotifications && (
          <span className="absolute inset-0 rounded-lg">
            <span className="animate-ping absolute inset-0 rounded-lg bg-blue-400 opacity-20" />
          </span>
        )}
      </button>

      {/* Notification Widget Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-16 right-4 z-50"
          >
            <SimpleNotificationWidget
              userId={userId}
              events={events}
              locale={locale}
              className="relative top-0 right-0 shadow-xl"
              onClose={() => setIsOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop for mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
        />
      )}
    </>
  );
}

export default NotificationIconButton;