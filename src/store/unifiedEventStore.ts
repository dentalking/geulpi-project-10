/**
 * 통합 이벤트 상태 관리 스토어
 * Zustand 기반으로 모든 이벤트 관련 상태를 중앙 집중화
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';
import type { CalendarEvent } from '@/types';

// 동기화 상태 타입
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

// 아티팩트 모드 타입
export type ArtifactMode = 'list' | 'focused' | 'edit';

// 뷰 타입
export type ViewType = 'month' | 'week' | 'day' | 'list';

// 메인 상태 인터페이스
interface UnifiedEventState {
  // === 코어 이벤트 데이터 ===
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  highlightedEventId: string | null;
  lastCreatedEventId: string | null; // 최근 생성된 이벤트 ID (하이라이팅용)

  // === 뷰 상태 ===
  currentView: ViewType;
  selectedDate: Date;
  searchQuery: string;
  filteredEvents: CalendarEvent[];

  // === 아티팩트 패널 상태 ===
  isArtifactOpen: boolean;
  artifactMode: ArtifactMode;
  artifactEvents: CalendarEvent[];
  artifactQuery: string | null;
  focusedEvent: CalendarEvent | null;
  pendingChanges: Partial<CalendarEvent> | null;

  // === 동기화 상태 ===
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  pendingUploads: number; // 업로드 대기 중인 변경사항 수
  syncError: string | null;

  // === UI 상태 ===
  isLoading: boolean;
  showEventDetail: boolean;
  showEventCreate: boolean;
  editingEvent: CalendarEvent | null;

  // === 실시간 동기화 ===
  realtimeEnabled: boolean;
  subscribers: Set<(events: CalendarEvent[]) => void>;
}

// 액션 인터페이스
interface UnifiedEventActions {
  // === 이벤트 CRUD ===
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  selectEvent: (event: CalendarEvent | null) => void;
  highlightEvent: (eventId: string | null) => void;

  // === 뷰 관리 ===
  setCurrentView: (view: ViewType) => void;
  setSelectedDate: (date: Date) => void;
  setSearchQuery: (query: string) => void;

  // === 아티팩트 패널 ===
  openArtifactPanel: (events?: CalendarEvent[], query?: string) => void;
  closeArtifactPanel: () => void;
  setArtifactEvents: (events: CalendarEvent[]) => void;
  setArtifactQuery: (query: string | null) => void;
  setArtifactMode: (mode: ArtifactMode) => void;
  setFocusedEvent: (event: CalendarEvent | null) => void;
  setPendingChanges: (changes: Partial<CalendarEvent> | null) => void;
  applyPendingChanges: () => void;
  cancelPendingChanges: () => void;

  // === 동기화 관리 ===
  setSyncStatus: (status: SyncStatus) => void;
  setSyncError: (error: string | null) => void;
  trackUpload: () => void;
  completeUpload: () => void;
  markSyncComplete: () => void;

  // === UI 상태 ===
  setLoading: (loading: boolean) => void;
  setShowEventDetail: (show: boolean) => void;
  setShowEventCreate: (show: boolean) => void;
  setEditingEvent: (event: CalendarEvent | null) => void;

  // === 실시간 동기화 ===
  subscribe: (callback: (events: CalendarEvent[]) => void) => () => void;
  broadcast: (events: CalendarEvent[]) => void;
  enableRealtime: () => void;
  disableRealtime: () => void;

  // === 유틸리티 ===
  getEventsForDate: (date: Date) => CalendarEvent[];
  searchEvents: (query: string) => CalendarEvent[];
  reset: () => void;
}

// 통합 타입
export type UnifiedEventStore = UnifiedEventState & UnifiedEventActions;

// 초기 상태
const initialState: UnifiedEventState = {
  // 코어 데이터
  events: [],
  selectedEvent: null,
  highlightedEventId: null,
  lastCreatedEventId: null,

  // 뷰 상태
  currentView: 'month',
  selectedDate: new Date(),
  searchQuery: '',
  filteredEvents: [],

  // 아티팩트 패널
  isArtifactOpen: false,
  artifactMode: 'list',
  artifactEvents: [],
  artifactQuery: null,
  focusedEvent: null,
  pendingChanges: null,

  // 동기화
  syncStatus: 'idle',
  lastSyncTime: null,
  pendingUploads: 0,
  syncError: null,

  // UI
  isLoading: false,
  showEventDetail: false,
  showEventCreate: false,
  editingEvent: null,

  // 실시간
  realtimeEnabled: true,
  subscribers: new Set(),
};

// 헬퍼 함수들
const filterEvents = (events: CalendarEvent[], query: string): CalendarEvent[] => {
  if (!query.trim()) return events;

  const lowerQuery = query.toLowerCase();
  return events.filter(event =>
    event.summary?.toLowerCase().includes(lowerQuery) ||
    event.description?.toLowerCase().includes(lowerQuery) ||
    event.location?.toLowerCase().includes(lowerQuery)
  );
};

const getEventsForDate = (events: CalendarEvent[], date: Date): CalendarEvent[] => {
  const targetDate = date.toISOString().split('T')[0];
  return events.filter(event => {
    const eventDate = event.start?.dateTime || event.start?.date;
    if (!eventDate) return false;
    return eventDate.startsWith(targetDate);
  });
};

// 메인 스토어 생성
export const useUnifiedEventStore = create<UnifiedEventStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // === 이벤트 CRUD ===
          setEvents: (events) => set((state) => {
            state.events = events;
            state.filteredEvents = filterEvents(events, state.searchQuery);

            // 아티팩트 패널이 열려있으면 이벤트 동기화
            if (state.isArtifactOpen) {
              state.artifactEvents = state.filteredEvents;
            }
          }),

          addEvent: (event) => set((state) => {
            state.events.push(event);
            state.filteredEvents = filterEvents(state.events, state.searchQuery);
            state.lastCreatedEventId = event.id || null;

            // 아티팩트 패널 자동 업데이트
            if (state.isArtifactOpen) {
              state.artifactEvents = state.filteredEvents;
              // 새 이벤트를 포커스로 설정 (선택적)
              if (state.artifactMode === 'list') {
                state.focusedEvent = event;
                state.artifactMode = 'focused';
              }
            } else {
              // 아티팩트 패널이 닫혀있으면 자동으로 열고 새 이벤트 표시
              state.isArtifactOpen = true;
              state.artifactMode = 'focused';
              state.artifactEvents = [event];
              state.focusedEvent = event;
            }
          }),

          updateEvent: (id, updates) => set((state) => {
            const index = state.events.findIndex(e => e.id === id);
            if (index !== -1) {
              state.events[index] = { ...state.events[index], ...updates };
              state.filteredEvents = filterEvents(state.events, state.searchQuery);

              // 선택된 이벤트 업데이트
              if (state.selectedEvent?.id === id) {
                state.selectedEvent = { ...state.selectedEvent, ...updates };
              }

              // 포커스된 이벤트 업데이트
              if (state.focusedEvent?.id === id) {
                state.focusedEvent = { ...state.focusedEvent, ...updates };
              }

              // 아티팩트 이벤트 업데이트
              const artifactIndex = state.artifactEvents.findIndex(e => e.id === id);
              if (artifactIndex !== -1) {
                state.artifactEvents[artifactIndex] = { ...state.artifactEvents[artifactIndex], ...updates };
              }
            }
          }),

          deleteEvent: (id) => set((state) => {
            state.events = state.events.filter(e => e.id !== id);
            state.filteredEvents = filterEvents(state.events, state.searchQuery);
            state.artifactEvents = state.artifactEvents.filter(e => e.id !== id);

            // 관련 상태 정리
            if (state.selectedEvent?.id === id) {
              state.selectedEvent = null;
              state.showEventDetail = false;
            }

            if (state.focusedEvent?.id === id) {
              state.focusedEvent = null;
              state.artifactMode = 'list';
            }

            if (state.editingEvent?.id === id) {
              state.editingEvent = null;
              state.showEventCreate = false;
            }
          }),

          selectEvent: (event) => set((state) => {
            state.selectedEvent = event;
            state.showEventDetail = event !== null;
          }),

          highlightEvent: (eventId) => set((state) => {
            state.highlightedEventId = eventId;
          }),

          // === 뷰 관리 ===
          setCurrentView: (view) => set((state) => {
            state.currentView = view;
          }),

          setSelectedDate: (date) => set((state) => {
            state.selectedDate = date;
          }),

          setSearchQuery: (query) => set((state) => {
            state.searchQuery = query;
            state.filteredEvents = filterEvents(state.events, query);

            // 아티팩트 패널 업데이트
            if (state.isArtifactOpen) {
              state.artifactEvents = state.filteredEvents;
            }
          }),

          // === 아티팩트 패널 ===
          openArtifactPanel: (events, query) => set((state) => {
            state.isArtifactOpen = true;
            state.artifactEvents = events || state.filteredEvents;
            state.artifactQuery = query || null;
            if (state.artifactEvents.length === 1) {
              state.artifactMode = 'focused';
              state.focusedEvent = state.artifactEvents[0];
            } else {
              state.artifactMode = 'list';
              state.focusedEvent = null;
            }
          }),

          closeArtifactPanel: () => set((state) => {
            state.isArtifactOpen = false;
            state.artifactMode = 'list';
            state.artifactEvents = [];
            state.artifactQuery = null;
            state.focusedEvent = null;
            state.pendingChanges = null;
          }),

          setArtifactEvents: (events) => set((state) => {
            state.artifactEvents = events;
          }),

          setArtifactQuery: (query) => set((state) => {
            state.artifactQuery = query;
          }),

          setArtifactMode: (mode) => set((state) => {
            state.artifactMode = mode;
          }),

          setFocusedEvent: (event) => set((state) => {
            state.focusedEvent = event;
            state.artifactMode = event ? 'focused' : 'list';
          }),

          setPendingChanges: (changes) => set((state) => {
            state.pendingChanges = changes;
            if (changes) {
              state.artifactMode = 'edit';
            }
          }),

          applyPendingChanges: () => {
            const { focusedEvent, pendingChanges } = get();
            if (focusedEvent && pendingChanges) {
              get().updateEvent(focusedEvent.id!, pendingChanges);
              set((state) => {
                state.pendingChanges = null;
                state.artifactMode = 'focused';
              });
            }
          },

          cancelPendingChanges: () => set((state) => {
            state.pendingChanges = null;
            state.artifactMode = state.focusedEvent ? 'focused' : 'list';
          }),

          // === 동기화 관리 ===
          setSyncStatus: (status) => set((state) => {
            state.syncStatus = status;
            if (status === 'success') {
              state.syncError = null;
              state.lastSyncTime = new Date();
            }
          }),

          setSyncError: (error) => set((state) => {
            state.syncError = error;
            if (error) {
              state.syncStatus = 'error';
            }
          }),

          trackUpload: () => set((state) => {
            state.pendingUploads += 1;
          }),

          completeUpload: () => set((state) => {
            state.pendingUploads = Math.max(0, state.pendingUploads - 1);
          }),

          markSyncComplete: () => set((state) => {
            state.syncStatus = 'success';
            state.lastSyncTime = new Date();
            state.pendingUploads = 0;
            state.syncError = null;
          }),

          // === UI 상태 ===
          setLoading: (loading) => set((state) => {
            state.isLoading = loading;
          }),

          setShowEventDetail: (show) => set((state) => {
            state.showEventDetail = show;
          }),

          setShowEventCreate: (show) => set((state) => {
            state.showEventCreate = show;
          }),

          setEditingEvent: (event) => set((state) => {
            state.editingEvent = event;
            state.showEventCreate = event !== null;
          }),

          // === 실시간 동기화 ===
          subscribe: (callback) => {
            const { subscribers } = get();
            subscribers.add(callback);

            // cleanup 함수 반환
            return () => {
              subscribers.delete(callback);
            };
          },

          broadcast: (events) => {
            const { subscribers } = get();
            subscribers.forEach(callback => callback(events));
          },

          enableRealtime: () => set((state) => {
            state.realtimeEnabled = true;
          }),

          disableRealtime: () => set((state) => {
            state.realtimeEnabled = false;
          }),

          // === 유틸리티 ===
          getEventsForDate: (date) => {
            const { events } = get();
            return getEventsForDate(events, date);
          },

          searchEvents: (query) => {
            const { events } = get();
            return filterEvents(events, query);
          },

          reset: () => set(() => ({
            ...initialState,
            subscribers: new Set(),
          }))
        }))
      ),
      {
        name: 'unified-event-storage',
        partialize: (state) => ({
          currentView: state.currentView,
          searchQuery: state.searchQuery,
          realtimeEnabled: state.realtimeEnabled,
          selectedDate: state.selectedDate,
        })
      }
    )
  )
);

// === 편의 Hook들 ===

// 이벤트 데이터 관련 - 캐시된 selector 사용하여 무한 루프 방지
const eventsSelector = (state: UnifiedEventStore) => {
  return {
    events: state.events,
    filteredEvents: state.filteredEvents,
    selectedEvent: state.selectedEvent,
    highlightedEventId: state.highlightedEventId,
    lastCreatedEventId: state.lastCreatedEventId,
    setEvents: state.setEvents,
    addEvent: state.addEvent,
    updateEvent: state.updateEvent,
    deleteEvent: state.deleteEvent,
    selectEvent: state.selectEvent,
    highlightEvent: state.highlightEvent
  };
};

// Memoized selector to prevent infinite loops
let lastEventsSnapshot: any = null;
let lastEventsState: any = null;

const stableEventsSelector = (state: UnifiedEventStore) => {
  const currentState = {
    events: state.events,
    filteredEvents: state.filteredEvents,
    selectedEvent: state.selectedEvent,
    highlightedEventId: state.highlightedEventId,
    lastCreatedEventId: state.lastCreatedEventId
  };

  // Check if state actually changed using shallow comparison
  const stateChanged = !lastEventsState ||
    Object.keys(currentState).some(key =>
      (currentState as any)[key] !== (lastEventsState as any)[key]
    );

  if (stateChanged || !lastEventsSnapshot) {
    lastEventsState = currentState;
    lastEventsSnapshot = {
      ...currentState,
      setEvents: state.setEvents,
      addEvent: state.addEvent,
      updateEvent: state.updateEvent,
      deleteEvent: state.deleteEvent,
      selectEvent: state.selectEvent,
      highlightEvent: state.highlightEvent
    };
  }

  return lastEventsSnapshot;
};

export const useEvents = () => useUnifiedEventStore(stableEventsSelector, shallow);

// 아티팩트 패널 관련 - 캐시된 selector로 안정화
let lastArtifactSnapshot: any = null;
let lastArtifactState: any = null;

const stableArtifactPanelSelector = (state: UnifiedEventStore) => {
  const currentState = {
    isOpen: state.isArtifactOpen,
    mode: state.artifactMode,
    events: state.artifactEvents,
    focusedEvent: state.focusedEvent,
    pendingChanges: state.pendingChanges
  };

  const stateChanged = !lastArtifactState ||
    Object.keys(currentState).some(key =>
      (currentState as any)[key] !== (lastArtifactState as any)[key]
    );

  if (stateChanged || !lastArtifactSnapshot) {
    lastArtifactState = currentState;
    lastArtifactSnapshot = {
      ...currentState,
      open: state.openArtifactPanel,
      close: state.closeArtifactPanel,
      setEvents: state.setArtifactEvents,
      setMode: state.setArtifactMode,
      setFocused: state.setFocusedEvent,
      setPending: state.setPendingChanges,
      apply: state.applyPendingChanges,
      cancel: state.cancelPendingChanges
    };
  }

  return lastArtifactSnapshot;
};

export const useArtifactPanel = () => useUnifiedEventStore(stableArtifactPanelSelector, shallow);

// 뷰 상태 관련 - selector를 함수 외부로 이동하여 안정화
const viewStateSelector = (state: UnifiedEventStore) => ({
  view: state.currentView,
  date: state.selectedDate,
  searchQuery: state.searchQuery,
  setView: state.setCurrentView,
  setDate: state.setSelectedDate,
  setSearch: state.setSearchQuery
});

export const useViewState = () => useUnifiedEventStore(viewStateSelector, shallow);

// 동기화 상태 관련 - 캐시된 selector로 안정화
let lastSyncSnapshot: any = null;
let lastSyncState: any = null;

const stableSyncStateSelector = (state: UnifiedEventStore) => {
  const currentState = {
    status: state.syncStatus,
    lastSyncTime: state.lastSyncTime,
    pendingUploads: state.pendingUploads,
    error: state.syncError
  };

  const stateChanged = !lastSyncState ||
    Object.keys(currentState).some(key =>
      (currentState as any)[key] !== (lastSyncState as any)[key]
    );

  if (stateChanged || !lastSyncSnapshot) {
    lastSyncState = currentState;
    lastSyncSnapshot = {
      ...currentState,
      setStatus: state.setSyncStatus,
      setError: state.setSyncError,
      trackUpload: state.trackUpload,
      completeUpload: state.completeUpload,
      markComplete: state.markSyncComplete
    };
  }

  return lastSyncSnapshot;
};

export const useSyncState = () => useUnifiedEventStore(stableSyncStateSelector, shallow);

// UI 상태 관련 - selector를 함수 외부로 이동하여 안정화
const uiStateSelector = (state: UnifiedEventStore) => ({
  isLoading: state.isLoading,
  showEventDetail: state.showEventDetail,
  showEventCreate: state.showEventCreate,
  editingEvent: state.editingEvent,
  setLoading: state.setLoading,
  setShowEventDetail: state.setShowEventDetail,
  setShowEventCreate: state.setShowEventCreate,
  setEditingEvent: state.setEditingEvent
});

export const useUIState = () => useUnifiedEventStore(uiStateSelector, shallow);

// 실시간 동기화 관련 - selector를 함수 외부로 이동하여 안정화
const realtimeSyncSelector = (state: UnifiedEventStore) => ({
  enabled: state.realtimeEnabled,
  subscribe: state.subscribe,
  broadcast: state.broadcast,
  enable: state.enableRealtime,
  disable: state.disableRealtime
});

export const useRealtimeSync = () => useUnifiedEventStore(realtimeSyncSelector, shallow);