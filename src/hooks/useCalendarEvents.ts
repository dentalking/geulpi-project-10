import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarEvent } from '@/types';

// API functions
async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const response = await fetch('/api/calendar/events');
  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }
  const data = await response.json();
  return data.events || [];
}

async function createCalendarEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const response = await fetch('/api/calendar/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!response.ok) {
    throw new Error('Failed to create event');
  }
  const data = await response.json();
  return data.event;
}

async function updateCalendarEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const response = await fetch(`/api/calendar/update/${event.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!response.ok) {
    throw new Error('Failed to update event');
  }
  const data = await response.json();
  return data.event;
}

async function deleteCalendarEvent(eventId: string): Promise<void> {
  const response = await fetch(`/api/calendar/delete/${eventId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete event');
  }
}

// React Query hooks
export function useCalendarEvents() {
  return useQuery({
    queryKey: ['calendar-events'],
    queryFn: fetchCalendarEvents,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCalendarEvent,
    onMutate: async (newEvent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['calendar-events'] });

      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData<CalendarEvent[]>(['calendar-events']);

      // Optimistically update
      if (previousEvents) {
        queryClient.setQueryData<CalendarEvent[]>(['calendar-events'], [
          ...previousEvents,
          { ...newEvent, id: `temp-${Date.now()}` } as CalendarEvent,
        ]);
      }

      return { previousEvents };
    },
    onError: (err, newEvent, context) => {
      // Rollback on error
      if (context?.previousEvents) {
        queryClient.setQueryData(['calendar-events'], context.previousEvents);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCalendarEvent,
    onMutate: async (updatedEvent) => {
      await queryClient.cancelQueries({ queryKey: ['calendar-events'] });

      const previousEvents = queryClient.getQueryData<CalendarEvent[]>(['calendar-events']);

      if (previousEvents) {
        queryClient.setQueryData<CalendarEvent[]>(
          ['calendar-events'],
          previousEvents.map(event =>
            event.id === updatedEvent.id
              ? { ...event, ...updatedEvent }
              : event
          )
        );
      }

      return { previousEvents };
    },
    onError: (err, updatedEvent, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(['calendar-events'], context.previousEvents);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCalendarEvent,
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: ['calendar-events'] });

      const previousEvents = queryClient.getQueryData<CalendarEvent[]>(['calendar-events']);

      if (previousEvents) {
        queryClient.setQueryData<CalendarEvent[]>(
          ['calendar-events'],
          previousEvents.filter(event => event.id !== eventId)
        );
      }

      return { previousEvents };
    },
    onError: (err, eventId, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(['calendar-events'], context.previousEvents);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}