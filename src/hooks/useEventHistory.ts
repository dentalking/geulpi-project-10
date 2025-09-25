import { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '@/types';
import { EventHistoryManager, HistoryState, HistoryEntry } from '@/lib/EventHistoryManager';
import { useToastContext } from '@/providers/ToastProvider';

interface UseEventHistoryProps {
  onUndo?: (entry: HistoryEntry) => Promise<void>;
  onRedo?: (entry: HistoryEntry) => Promise<void>;
  locale?: 'ko' | 'en';
}

/**
 * 이벤트 히스토리 관리와 Undo/Redo 기능을 제공하는 Hook
 */
export function useEventHistory({
  onUndo,
  onRedo,
  locale = 'ko'
}: UseEventHistoryProps = {}) {
  const [historyManager] = useState(() => new EventHistoryManager());
  const [historyState, setHistoryState] = useState<HistoryState>(historyManager.getState());
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToastContext();

  // 히스토리 상태 구독
  useEffect(() => {
    const unsubscribe = historyManager.subscribe(setHistoryState);
    return unsubscribe;
  }, [historyManager]);

  // 이벤트 생성 기록
  const recordCreate = useCallback((event: CalendarEvent) => {
    historyManager.recordCreate(event,
      locale === 'ko'
        ? `일정 생성: ${event.summary}`
        : `Created event: ${event.summary}`
    );
  }, [historyManager, locale]);

  // 이벤트 수정 기록
  const recordUpdate = useCallback((
    eventId: string,
    previousState: CalendarEvent,
    currentState: CalendarEvent
  ) => {
    historyManager.recordUpdate(
      eventId,
      previousState,
      currentState,
      locale === 'ko'
        ? `일정 수정: ${currentState.summary}`
        : `Updated event: ${currentState.summary}`
    );
  }, [historyManager, locale]);

  // 이벤트 삭제 기록
  const recordDelete = useCallback((event: CalendarEvent) => {
    historyManager.recordDelete(event,
      locale === 'ko'
        ? `일정 삭제: ${event.summary}`
        : `Deleted event: ${event.summary}`
    );
  }, [historyManager, locale]);

  // Undo 실행
  const undo = useCallback(async () => {
    if (!historyState.canUndo || isProcessing) return;

    setIsProcessing(true);
    try {
      const entry = historyManager.undo();
      if (!entry) return;

      // 외부 핸들러 실행
      if (onUndo) {
        await onUndo(entry);
      }

      // 성공 메시지
      toast.success(
        locale === 'ko' ? '실행 취소' : 'Undo',
        locale === 'ko'
          ? `작업을 되돌렸습니다: ${entry.description}`
          : `Undid action: ${entry.description}`
      );
    } catch (error) {
      toast.error(
        locale === 'ko' ? '실행 취소 실패' : 'Undo Failed',
        locale === 'ko'
          ? '작업을 되돌릴 수 없습니다'
          : 'Failed to undo action'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [historyState.canUndo, isProcessing, historyManager, onUndo, toast, locale]);

  // Redo 실행
  const redo = useCallback(async () => {
    if (!historyState.canRedo || isProcessing) return;

    setIsProcessing(true);
    try {
      const entry = historyManager.redo();
      if (!entry) return;

      // 외부 핸들러 실행
      if (onRedo) {
        await onRedo(entry);
      }

      // 성공 메시지
      toast.success(
        locale === 'ko' ? '다시 실행' : 'Redo',
        locale === 'ko'
          ? `작업을 다시 실행했습니다: ${entry.description}`
          : `Redid action: ${entry.description}`
      );
    } catch (error) {
      toast.error(
        locale === 'ko' ? '다시 실행 실패' : 'Redo Failed',
        locale === 'ko'
          ? '작업을 다시 실행할 수 없습니다'
          : 'Failed to redo action'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [historyState.canRedo, isProcessing, historyManager, onRedo, toast, locale]);

  // 키보드 단축키 설정
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Z: Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Cmd/Ctrl + Shift + Z: Redo
      else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }
      // Cmd/Ctrl + Y: Redo (Windows style)
      else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // 히스토리 초기화
  const clearHistory = useCallback(() => {
    historyManager.clear();
    toast.info(
      locale === 'ko' ? '기록 삭제' : 'History Cleared',
      locale === 'ko'
        ? '변경 기록이 초기화되었습니다'
        : 'Change history has been cleared'
    );
  }, [historyManager, toast, locale]);

  // 최근 기록 가져오기
  const getRecentHistory = useCallback((count = 5) => {
    return historyManager.getRecentEntries(count);
  }, [historyManager]);

  return {
    // State
    canUndo: historyState.canUndo,
    canRedo: historyState.canRedo,
    historyCount: historyState.entries.length,
    currentIndex: historyState.currentIndex,
    isProcessing,

    // Actions
    recordCreate,
    recordUpdate,
    recordDelete,
    undo,
    redo,
    clearHistory,

    // Utilities
    getRecentHistory,
    getEventHistory: (eventId: string) => historyManager.getEventHistory(eventId),
    exportHistory: () => historyManager.export(),
    importHistory: (data: string) => historyManager.import(data)
  };
}

/**
 * 히스토리 UI 컴포넌트를 위한 데이터 포맷팅
 */
export function formatHistoryEntry(
  entry: HistoryEntry,
  locale: 'ko' | 'en' = 'ko'
): {
  icon: string;
  title: string;
  description: string;
  time: string;
  color: string;
} {
  const timeAgo = getTimeAgo(entry.timestamp, locale);

  switch (entry.action) {
    case 'create':
      return {
        icon: '➕',
        title: locale === 'ko' ? '일정 생성' : 'Created Event',
        description: entry.currentState?.summary || '',
        time: timeAgo,
        color: 'green'
      };

    case 'update':
      const changes = entry.changes ? Object.keys(entry.changes).length : 0;
      return {
        icon: '✏️',
        title: locale === 'ko' ? '일정 수정' : 'Updated Event',
        description: locale === 'ko'
          ? `${changes}개 항목 변경`
          : `${changes} field${changes > 1 ? 's' : ''} changed`,
        time: timeAgo,
        color: 'blue'
      };

    case 'delete':
      return {
        icon: '🗑️',
        title: locale === 'ko' ? '일정 삭제' : 'Deleted Event',
        description: entry.previousState?.summary || '',
        time: timeAgo,
        color: 'red'
      };

    default:
      return {
        icon: '📝',
        title: locale === 'ko' ? '변경사항' : 'Change',
        description: entry.description || '',
        time: timeAgo,
        color: 'gray'
      };
  }
}

/**
 * 상대 시간 계산
 */
function getTimeAgo(date: Date, locale: 'ko' | 'en'): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return locale === 'ko' ? '방금 전' : 'Just now';
  } else if (minutes < 60) {
    return locale === 'ko'
      ? `${minutes}분 전`
      : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return locale === 'ko'
      ? `${hours}시간 전`
      : `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    return locale === 'ko'
      ? `${days}일 전`
      : `${days} day${days > 1 ? 's' : ''} ago`;
  }
}