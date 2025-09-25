import { useState, useCallback, useRef } from 'react';
import { CalendarEvent } from '@/types';

interface OptimisticState<T> {
  data: T;
  isOptimistic: boolean;
  error?: Error | null;
}

interface OptimisticActions<T> {
  setOptimistic: (data: T) => void;
  confirm: (data?: T) => void;
  revert: (error?: Error) => void;
  reset: () => void;
}

/**
 * Optimistic UI 패턴을 구현하는 Hook
 * 즉각적인 UI 업데이트와 서버 동기화 관리
 */
export function useOptimisticEvent<T = CalendarEvent>(
  initialData: T
): [OptimisticState<T>, OptimisticActions<T>] {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isOptimistic: false,
    error: null
  });

  const originalDataRef = useRef<T>(initialData);
  const optimisticTimeoutRef = useRef<NodeJS.Timeout>();

  // 낙관적 업데이트 설정
  const setOptimistic = useCallback((data: T) => {
    // 원본 데이터 저장
    originalDataRef.current = state.data;

    setState({
      data,
      isOptimistic: true,
      error: null
    });

    // 5초 후 자동으로 확정 (timeout 방지)
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }

    optimisticTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isOptimistic: false
      }));
    }, 5000);
  }, [state.data]);

  // 낙관적 업데이트 확정
  const confirm = useCallback((confirmedData?: T) => {
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }

    setState(prev => ({
      data: confirmedData || prev.data,
      isOptimistic: false,
      error: null
    }));
  }, []);

  // 낙관적 업데이트 되돌리기
  const revert = useCallback((error?: Error) => {
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }

    setState({
      data: originalDataRef.current,
      isOptimistic: false,
      error: error || new Error('Operation failed')
    });
  }, []);

  // 상태 초기화
  const reset = useCallback(() => {
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }

    setState({
      data: initialData,
      isOptimistic: false,
      error: null
    });
  }, [initialData]);

  return [
    state,
    { setOptimistic, confirm, revert, reset }
  ];
}

/**
 * 여러 이벤트에 대한 Optimistic UI 관리
 */
export function useOptimisticEvents(
  initialEvents: CalendarEvent[] = []
) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  const originalEventsRef = useRef<Map<string, CalendarEvent>>(new Map());

  // 이벤트 추가 (낙관적)
  const addEventOptimistic = useCallback((event: CalendarEvent) => {
    if (!event.id) return;

    // 원본 저장
    originalEventsRef.current.set(event.id, event);

    // 낙관적 업데이트
    setEvents(prev => [...prev, { ...event, isOptimistic: true }]);
    setOptimisticIds(prev => new Set([...prev, event.id!]));
  }, []);

  // 이벤트 수정 (낙관적)
  const updateEventOptimistic = useCallback((eventId: string, updates: Partial<CalendarEvent>) => {
    const currentEvent = events.find(e => e.id === eventId);
    if (!currentEvent) return;

    // 원본 저장
    if (!originalEventsRef.current.has(eventId)) {
      originalEventsRef.current.set(eventId, currentEvent);
    }

    // 낙관적 업데이트
    setEvents(prev => prev.map(e =>
      e.id === eventId
        ? { ...e, ...updates, isOptimistic: true }
        : e
    ));
    setOptimisticIds(prev => new Set([...prev, eventId]));
  }, [events]);

  // 이벤트 삭제 (낙관적)
  const deleteEventOptimistic = useCallback((eventId: string) => {
    const currentEvent = events.find(e => e.id === eventId);
    if (!currentEvent) return;

    // 원본 저장
    originalEventsRef.current.set(eventId, currentEvent);

    // 낙관적 삭제 (실제로는 숨김 처리)
    setEvents(prev => prev.map(e =>
      e.id === eventId
        ? { ...e, isDeleting: true, isOptimistic: true }
        : e
    ));
    setOptimisticIds(prev => new Set([...prev, eventId]));
  }, [events]);

  // 낙관적 업데이트 확정
  const confirmOptimistic = useCallback((eventId: string, confirmedData?: CalendarEvent) => {
    originalEventsRef.current.delete(eventId);

    setEvents(prev => {
      if (confirmedData) {
        return prev.map(e =>
          e.id === eventId
            ? { ...confirmedData, isOptimistic: false, isDeleting: false }
            : e
        );
      } else {
        // 삭제 확정
        return prev.filter(e => e.id !== eventId);
      }
    });

    setOptimisticIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(eventId);
      return newSet;
    });

    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(eventId);
      return newErrors;
    });
  }, []);

  // 낙관적 업데이트 되돌리기
  const revertOptimistic = useCallback((eventId: string, error?: Error) => {
    const original = originalEventsRef.current.get(eventId);

    if (original) {
      setEvents(prev => prev.map(e =>
        e.id === eventId
          ? { ...original, isOptimistic: false, isDeleting: false }
          : e
      ));
    } else {
      // 새로 추가된 항목이었다면 제거
      setEvents(prev => prev.filter(e => e.id !== eventId));
    }

    originalEventsRef.current.delete(eventId);

    setOptimisticIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(eventId);
      return newSet;
    });

    if (error) {
      setErrors(prev => new Map(prev).set(eventId, error));
    }
  }, []);

  // 모든 낙관적 업데이트 되돌리기
  const revertAll = useCallback(() => {
    setEvents(prev => prev.map(event => {
      if (optimisticIds.has(event.id!)) {
        const original = originalEventsRef.current.get(event.id!);
        return original || event;
      }
      return event;
    }));

    originalEventsRef.current.clear();
    setOptimisticIds(new Set());
    setErrors(new Map());
  }, [optimisticIds]);

  return {
    events,
    optimisticIds,
    errors,
    actions: {
      addEventOptimistic,
      updateEventOptimistic,
      deleteEventOptimistic,
      confirmOptimistic,
      revertOptimistic,
      revertAll
    }
  };
}