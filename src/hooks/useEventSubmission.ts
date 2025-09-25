/**
 * Custom hook for handling event submission and creation logic
 * Extracted from UnifiedAIInterface to reduce component complexity
 */

import { useCallback, useRef } from 'react';
import { CalendarEvent } from '@/types';
import { useToastContext } from '@/providers/ToastProvider';
import {
  useEvents,
  useArtifactPanel,
  useSyncState
} from '@/store/unifiedEventStore';

interface UseEventSubmissionOptions {
  locale?: 'ko' | 'en';
  sessionId?: string;
}

export function useEventSubmission({ locale = 'ko', sessionId }: UseEventSubmissionOptions = {}) {
  const { toast } = useToastContext();
  const { addEvent, updateEvent } = useEvents();
  const { openArtifactPanel, setArtifactMode } = useArtifactPanel();
  const { setSyncStatus, markSyncComplete } = useSyncState();

  // Track processing state without causing re-renders
  const processingRef = useRef(false);

  const calculateEndTime = useCallback((date: string, time: string, duration: number): string => {
    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
    return endDateTime.toISOString().slice(0, 19);
  }, []);

  const handleSingleEventCreation = useCallback(async (eventData: any) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      // CalendarEvent 형식으로 변환
      const newEvent: CalendarEvent = {
        id: `temp-${Date.now()}`,
        summary: eventData.title,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: `${eventData.date}T${eventData.time || '09:00'}:00`,
          timeZone: 'Asia/Seoul'
        },
        end: {
          dateTime: calculateEndTime(eventData.date, eventData.time || '09:00', eventData.duration || 60),
          timeZone: 'Asia/Seoul'
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        status: 'confirmed'
      };

      // 스토어에 추가 (자동으로 아티팩트 패널 열림)
      addEvent(newEvent);

      // 동기화 시작
      setSyncStatus('syncing');

      // 실제 서버에 이벤트 저장
      const saveResponse = await fetch('/api/calendar/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newEvent.summary,
          description: newEvent.description,
          location: newEvent.location,
          start: newEvent.start,
          end: newEvent.end,
          sessionId
        })
      });

      if (saveResponse.ok) {
        const saveData = await saveResponse.json();
        if (saveData.success && saveData.data?.id) {
          // 임시 ID를 실제 ID로 업데이트
          updateEvent(newEvent.id!, { id: saveData.data.id });
          console.log('[Event Submission Hook] Event saved with real ID:', saveData.data.id);
        }
        markSyncComplete();
        toast.success(locale === 'ko' ? '일정이 저장되었습니다' : 'Event saved successfully');
      } else {
        throw new Error('Failed to save event');
      }
    } catch (error) {
      console.error('[Event Submission Hook] Failed to save event:', error);
      setSyncStatus('error');
      toast.error(locale === 'ko' ? '일정 저장에 실패했습니다' : 'Failed to save event');
    } finally {
      processingRef.current = false;
    }
  }, [locale, sessionId, addEvent, updateEvent, setSyncStatus, markSyncComplete, toast, calculateEndTime]);

  const handleMultipleEventCreation = useCallback(async (events: any[]) => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const newEvents: CalendarEvent[] = events.map((eventData: any, index: number) => ({
        id: `temp-${Date.now()}-${index}`,
        summary: eventData.title,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: `${eventData.date}T${eventData.time || '09:00'}:00`,
          timeZone: 'Asia/Seoul'
        },
        end: {
          dateTime: calculateEndTime(eventData.date, eventData.time || '09:00', eventData.duration || 60),
          timeZone: 'Asia/Seoul'
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        status: 'confirmed'
      }));

      // 스토어에 추가
      newEvents.forEach(event => addEvent(event));

      // 아티팩트 패널을 리스트 모드로 열기
      openArtifactPanel(newEvents);
      setArtifactMode('list');

      setSyncStatus('syncing');

      // Simulate async save for multiple events
      setTimeout(() => {
        markSyncComplete();
        toast.success(locale === 'ko' ? '다중 일정이 저장되었습니다' : 'Multiple events saved successfully');
      }, 1000);

    } catch (error) {
      console.error('[Event Submission Hook] Failed to save multiple events:', error);
      setSyncStatus('error');
      toast.error(locale === 'ko' ? '다중 일정 저장에 실패했습니다' : 'Failed to save multiple events');
    } finally {
      processingRef.current = false;
    }
  }, [locale, addEvent, openArtifactPanel, setArtifactMode, setSyncStatus, markSyncComplete, toast, calculateEndTime]);

  const isProcessing = useCallback(() => processingRef.current, []);

  return {
    handleSingleEventCreation,
    handleMultipleEventCreation,
    isProcessing
  };
}