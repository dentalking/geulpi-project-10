import { CalendarEvent } from '@/types';

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  action: 'create' | 'update' | 'delete';
  eventId: string;
  previousState?: CalendarEvent;
  currentState?: CalendarEvent;
  changes?: Partial<CalendarEvent>;
  userId?: string;
  description?: string;
}

export interface HistoryState {
  entries: HistoryEntry[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * 이벤트 변경 히스토리를 관리하는 클래스
 * Undo/Redo 기능 지원
 */
export class EventHistoryManager {
  private history: HistoryEntry[] = [];
  private currentIndex = -1;
  private maxHistorySize = 50;
  private listeners: Set<(state: HistoryState) => void> = new Set();

  constructor(maxSize?: number) {
    if (maxSize) {
      this.maxHistorySize = maxSize;
    }
  }

  /**
   * 새로운 히스토리 엔트리 추가
   */
  addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    const newEntry: HistoryEntry = {
      ...entry,
      id: `history-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date()
    };

    // 현재 인덱스 이후의 히스토리 제거 (새 분기 생성)
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 새 엔트리 추가
    this.history.push(newEntry);
    this.currentIndex++;

    // 최대 크기 제한
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }

    this.notifyListeners();
  }

  /**
   * 이벤트 생성 기록
   */
  recordCreate(event: CalendarEvent, description?: string): void {
    this.addEntry({
      action: 'create',
      eventId: event.id!,
      currentState: event,
      description: description || `Created event: ${event.summary}`
    });
  }

  /**
   * 이벤트 수정 기록
   */
  recordUpdate(
    eventId: string,
    previousState: CalendarEvent,
    currentState: CalendarEvent,
    description?: string
  ): void {
    const changes: Partial<CalendarEvent> = {};

    // 변경된 필드만 추출
    (Object.keys(currentState) as (keyof CalendarEvent)[]).forEach(key => {
      if (JSON.stringify(previousState[key]) !== JSON.stringify(currentState[key])) {
        (changes as any)[key] = currentState[key];
      }
    });

    this.addEntry({
      action: 'update',
      eventId,
      previousState,
      currentState,
      changes,
      description: description || `Updated event: ${currentState.summary}`
    });
  }

  /**
   * 이벤트 삭제 기록
   */
  recordDelete(event: CalendarEvent, description?: string): void {
    this.addEntry({
      action: 'delete',
      eventId: event.id!,
      previousState: event,
      description: description || `Deleted event: ${event.summary}`
    });
  }

  /**
   * Undo 작업
   */
  undo(): HistoryEntry | null {
    if (!this.canUndo()) {
      return null;
    }

    const entry = this.history[this.currentIndex];
    this.currentIndex--;
    this.notifyListeners();
    return entry;
  }

  /**
   * Redo 작업
   */
  redo(): HistoryEntry | null {
    if (!this.canRedo()) {
      return null;
    }

    this.currentIndex++;
    const entry = this.history[this.currentIndex];
    this.notifyListeners();
    return entry;
  }

  /**
   * Undo 가능 여부
   */
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  /**
   * Redo 가능 여부
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 현재 히스토리 상태 가져오기
   */
  getState(): HistoryState {
    return {
      entries: this.history,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  /**
   * 특정 시점으로 이동
   */
  goToIndex(index: number): HistoryEntry[] {
    if (index < -1 || index >= this.history.length) {
      throw new Error('Invalid history index');
    }

    const changes: HistoryEntry[] = [];

    // 현재 위치에서 목표 위치까지의 변경사항 수집
    if (index < this.currentIndex) {
      // Undo 방향
      for (let i = this.currentIndex; i > index; i--) {
        changes.push(this.history[i]);
      }
    } else {
      // Redo 방향
      for (let i = this.currentIndex + 1; i <= index; i++) {
        changes.push(this.history[i]);
      }
    }

    this.currentIndex = index;
    this.notifyListeners();
    return changes;
  }

  /**
   * 히스토리 초기화
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
    this.notifyListeners();
  }

  /**
   * 최근 히스토리 가져오기
   */
  getRecentEntries(count = 10): HistoryEntry[] {
    const start = Math.max(0, this.currentIndex - count + 1);
    const end = this.currentIndex + 1;
    return this.history.slice(start, end).reverse();
  }

  /**
   * 리스너 등록
   */
  subscribe(listener: (state: HistoryState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 리스너들에게 상태 변경 알림
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  /**
   * 특정 이벤트의 변경 이력 조회
   */
  getEventHistory(eventId: string): HistoryEntry[] {
    return this.history.filter(entry => entry.eventId === eventId);
  }

  /**
   * 히스토리 내보내기 (JSON)
   */
  export(): string {
    return JSON.stringify({
      history: this.history,
      currentIndex: this.currentIndex,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * 히스토리 가져오기 (JSON)
   */
  import(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      this.history = data.history.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
      this.currentIndex = data.currentIndex;
      this.notifyListeners();
    } catch (error) {
      throw new Error('Invalid history data');
    }
  }
}

// 싱글톤 인스턴스
export const eventHistoryManager = new EventHistoryManager();