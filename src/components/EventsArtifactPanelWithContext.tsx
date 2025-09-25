'use client';

import React, { useEffect } from 'react';
import { EventsArtifactPanel } from './EventsArtifactPanel';
import { useArtifactPanel, useEvents } from '@/contexts/EventContext';
import type { CalendarEvent } from '@/types';

/**
 * EventsArtifactPanel with EventContext integration
 * This wrapper connects the existing EventsArtifactPanel to the central EventContext
 */
interface EventsArtifactPanelWithContextProps {
  locale: 'ko' | 'en';
  title?: string;
  // Override props for backward compatibility
  overrideEvents?: CalendarEvent[];
  overrideMode?: 'list' | 'focused' | 'edit';
  onEventEditOverride?: (eventId: string) => void;
  onEventDeleteOverride?: (eventId: string) => void;
}

export function EventsArtifactPanelWithContext({
  locale,
  title,
  overrideEvents,
  overrideMode,
  onEventEditOverride,
  onEventDeleteOverride
}: EventsArtifactPanelWithContextProps) {
  const {
    mode,
    isOpen,
    events,
    focusedEvent,
    pendingChanges,
    setMode,
    toggle,
    setFocused,
    setPending,
    applyChanges,
    cancelChanges
  } = useArtifactPanel();

  const {
    updateEvent,
    deleteEvent,
    syncCalendarToArtifact,
    setEvents
  } = useEvents();

  // Sync calendar events to artifact panel when opened
  useEffect(() => {
    if (isOpen) {
      syncCalendarToArtifact();
    }
  }, [isOpen, syncCalendarToArtifact]);

  // Handle event edit
  const handleEventEdit = (eventId: string) => {
    if (onEventEditOverride) {
      onEventEditOverride(eventId);
    } else {
      const event = events.find(e => e.id === eventId);
      if (event) {
        setFocused(event);
        setMode('edit');
      }
    }
  };

  // Handle event delete
  const handleEventDelete = async (eventId: string) => {
    if (onEventDeleteOverride) {
      onEventDeleteOverride(eventId);
    } else {
      // Optimistically delete from UI
      deleteEvent(eventId);

      // Also delete from backend
      try {
        const response = await fetch(`/api/calendar/events/${eventId}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to delete event');
        }

        // If focused event was deleted, clear it
        if (focusedEvent?.id === eventId) {
          setFocused(null);
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        // TODO: Rollback optimistic update
      }
    }
  };

  // Handle apply changes
  const handleApplyChanges = (changes: Partial<CalendarEvent>) => {
    if (focusedEvent?.id) {
      // Update in context
      updateEvent(focusedEvent.id, changes);
      applyChanges();

      // Also update backend
      fetch(`/api/calendar/events/${focusedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(changes)
      }).catch(error => {
        console.error('Error updating event:', error);
        // TODO: Rollback optimistic update
      });
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      const response = await fetch('/api/calendar/sync', {
        credentials: 'include'
      });
      const data = await response.json();

      if (data.success && data.data?.events) {
        // Update context with fresh events
        setEvents(data.data.events);
        syncCalendarToArtifact();
      }
    } catch (error) {
      console.error('Error refreshing events:', error);
    }
  };

  return (
    <EventsArtifactPanel
      isOpen={isOpen}
      onClose={() => toggle(false)}
      events={overrideEvents || events}
      title={title}
      locale={locale}
      mode={overrideMode || mode}
      focusedEvent={focusedEvent}
      pendingChanges={pendingChanges}
      onApplyChanges={handleApplyChanges}
      onEventEdit={handleEventEdit}
      onEventDelete={handleEventDelete}
      onRefresh={handleRefresh}
    />
  );
}

/**
 * Standalone version without EventContext
 * For use in components that don't have EventProvider
 */
export function EventsArtifactPanelStandalone(props: React.ComponentProps<typeof EventsArtifactPanel>) {
  return <EventsArtifactPanel {...props} />;
}