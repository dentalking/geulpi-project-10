import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import type { CalendarEvent, SchedulingSuggestion, ConflictInfo } from '@/types';

// API 함수들 (실제로는 API 서비스로 분리)
const calendarAPI = {
  fetchEvents: async (start?: Date, end?: Date): Promise<CalendarEvent[]> => {
    const params = new URLSearchParams();
    if (start) params.append('start', start.toISOString());
    if (end) params.append('end', end.toISOString());
    
    const response = await fetch(`/api/calendar/events?${params}`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  },
  
  fetchEvent: async (id: string): Promise<CalendarEvent> => {
    const response = await fetch(`/api/calendar/events/${id}`);
    if (!response.ok) throw new Error('Failed to fetch event');
    return response.json();
  },
  
  createEvent: async (event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const response = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },
  
  updateEvent: async ({ id, ...updates }: Partial<CalendarEvent> & { id: string }): Promise<CalendarEvent> => {
    const response = await fetch(`/api/calendar/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update event');
    return response.json();
  },
  
  deleteEvent: async (id: string): Promise<void> => {
    const response = await fetch(`/api/calendar/events/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete event');
  },
  
  fetchSuggestions: async (): Promise<SchedulingSuggestion[]> => {
    const response = await fetch('/api/calendar/suggestions');
    if (!response.ok) throw new Error('Failed to fetch suggestions');
    return response.json();
  },
  
  fetchConflicts: async (eventId: string): Promise<ConflictInfo[]> => {
    const response = await fetch(`/api/calendar/conflicts/${eventId}`);
    if (!response.ok) throw new Error('Failed to fetch conflicts');
    return response.json();
  },
};

// 캘린더 이벤트 목록 조회
export function useCalendarEvents(start?: Date, end?: Date) {
  return useQuery({
    queryKey: start && end ? queryKeys.calendar.range(start, end) : queryKeys.calendar.all(),
    queryFn: () => calendarAPI.fetchEvents(start, end),
  });
}

// 단일 캘린더 이벤트 조회
export function useCalendarEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.calendar.detail(id),
    queryFn: () => calendarAPI.fetchEvent(id),
    enabled: !!id,
  });
}

// 캘린더 이벤트 생성
export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: calendarAPI.createEvent,
    onSuccess: (newEvent) => {
      // 캐시 업데이트
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all() });
      
      // 옵티미스틱 업데이트
      queryClient.setQueryData<CalendarEvent[]>(
        queryKeys.calendar.all(),
        (old) => [...(old || []), newEvent]
      );
    },
  });
}

// 캘린더 이벤트 수정
export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: calendarAPI.updateEvent,
    onMutate: async (updatedEvent) => {
      // 진행 중인 refetch 취소
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.calendar.detail(updatedEvent.id) 
      });
      
      // 이전 값 저장
      const previousEvent = queryClient.getQueryData<CalendarEvent>(
        queryKeys.calendar.detail(updatedEvent.id)
      );
      
      // 옵티미스틱 업데이트
      queryClient.setQueryData<CalendarEvent>(
        queryKeys.calendar.detail(updatedEvent.id),
        (old) => ({ ...old, ...updatedEvent } as CalendarEvent)
      );
      
      return { previousEvent };
    },
    onError: (err, updatedEvent, context) => {
      // 에러 시 롤백
      if (context?.previousEvent) {
        queryClient.setQueryData(
          queryKeys.calendar.detail(updatedEvent.id),
          context.previousEvent
        );
      }
    },
    onSettled: (data, error, variables) => {
      // 캐시 재검증
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.calendar.detail(variables.id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.calendar.all() 
      });
    },
  });
}

// 캘린더 이벤트 삭제
export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: calendarAPI.deleteEvent,
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.calendar.all() });
      
      const previousEvents = queryClient.getQueryData<CalendarEvent[]>(
        queryKeys.calendar.all()
      );
      
      // 옵티미스틱 업데이트
      queryClient.setQueryData<CalendarEvent[]>(
        queryKeys.calendar.all(),
        (old) => old?.filter(event => event.id !== eventId) || []
      );
      
      return { previousEvents };
    },
    onError: (err, eventId, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(queryKeys.calendar.all(), context.previousEvents);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all() });
    },
  });
}

// 스케줄링 제안 조회
export function useSchedulingSuggestions() {
  return useQuery({
    queryKey: queryKeys.calendar.suggestions(),
    queryFn: calendarAPI.fetchSuggestions,
    staleTime: 5 * 60 * 1000, // 5분
  });
}

// 충돌 정보 조회
export function useCalendarConflicts(eventId: string) {
  return useQuery({
    queryKey: queryKeys.calendar.conflicts(eventId),
    queryFn: () => calendarAPI.fetchConflicts(eventId),
    enabled: !!eventId,
  });
}