'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { CalendarEvent } from '@/types';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

// Context Types
interface EventState {
  // Events
  events: CalendarEvent[];
  filteredEvents: CalendarEvent[];
  selectedEvent: CalendarEvent | null;

  // Artifact Panel
  artifactMode: 'list' | 'focused' | 'edit';
  isArtifactOpen: boolean;
  artifactEvents: CalendarEvent[];
  focusedEvent: CalendarEvent | null;
  pendingChanges: Partial<CalendarEvent> | null;

  // Calendar View
  viewType: 'month' | 'week' | 'day' | 'list';
  selectedDate: Date;

  // UI State
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Modals
  showEventDetail: boolean;
  showEventCreate: boolean;
  editingEvent: CalendarEvent | null;
}

type EventAction =
  | { type: 'SET_EVENTS'; payload: CalendarEvent[] }
  | { type: 'ADD_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: { id: string; updates: Partial<CalendarEvent> } }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SELECT_EVENT'; payload: CalendarEvent | null }
  | { type: 'SET_ARTIFACT_MODE'; payload: 'list' | 'focused' | 'edit' }
  | { type: 'TOGGLE_ARTIFACT_PANEL'; payload?: boolean }
  | { type: 'SET_ARTIFACT_EVENTS'; payload: CalendarEvent[] }
  | { type: 'SET_FOCUSED_EVENT'; payload: CalendarEvent | null }
  | { type: 'SET_PENDING_CHANGES'; payload: Partial<CalendarEvent> | null }
  | { type: 'SET_VIEW_TYPE'; payload: 'month' | 'week' | 'day' | 'list' }
  | { type: 'SET_SELECTED_DATE'; payload: Date }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'TOGGLE_EVENT_DETAIL'; payload?: boolean }
  | { type: 'TOGGLE_EVENT_CREATE'; payload?: boolean }
  | { type: 'SET_EDITING_EVENT'; payload: CalendarEvent | null }
  | { type: 'APPLY_PENDING_CHANGES' }
  | { type: 'CANCEL_PENDING_CHANGES' }
  | { type: 'SYNC_ARTIFACT_TO_CALENDAR' }
  | { type: 'SYNC_CALENDAR_TO_ARTIFACT' };

// Initial State
const initialState: EventState = {
  events: [],
  filteredEvents: [],
  selectedEvent: null,
  artifactMode: 'list',
  isArtifactOpen: false,
  artifactEvents: [],
  focusedEvent: null,
  pendingChanges: null,
  viewType: 'month',
  selectedDate: new Date(),
  isLoading: false,
  error: null,
  searchQuery: '',
  showEventDetail: false,
  showEventCreate: false,
  editingEvent: null,
};

// Reducer
function eventReducer(state: EventState, action: EventAction): EventState {
  switch (action.type) {
    case 'SET_EVENTS':
      return {
        ...state,
        events: action.payload,
        filteredEvents: filterEvents(action.payload, state.searchQuery),
      };

    case 'ADD_EVENT':
      const newEvents = [...state.events, action.payload];
      return {
        ...state,
        events: newEvents,
        filteredEvents: filterEvents(newEvents, state.searchQuery),
        artifactEvents: state.isArtifactOpen ? [...state.artifactEvents, action.payload] : state.artifactEvents,
      };

    case 'UPDATE_EVENT':
      const updatedEvents = state.events.map(event =>
        event.id === action.payload.id
          ? { ...event, ...action.payload.updates }
          : event
      );
      const updatedArtifactEvents = state.artifactEvents.map(event =>
        event.id === action.payload.id
          ? { ...event, ...action.payload.updates }
          : event
      );
      return {
        ...state,
        events: updatedEvents,
        filteredEvents: filterEvents(updatedEvents, state.searchQuery),
        artifactEvents: updatedArtifactEvents,
        selectedEvent: state.selectedEvent?.id === action.payload.id
          ? { ...state.selectedEvent, ...action.payload.updates }
          : state.selectedEvent,
        focusedEvent: state.focusedEvent?.id === action.payload.id
          ? { ...state.focusedEvent, ...action.payload.updates }
          : state.focusedEvent,
      };

    case 'DELETE_EVENT':
      const remainingEvents = state.events.filter(event => event.id !== action.payload);
      return {
        ...state,
        events: remainingEvents,
        filteredEvents: filterEvents(remainingEvents, state.searchQuery),
        artifactEvents: state.artifactEvents.filter(event => event.id !== action.payload),
        selectedEvent: state.selectedEvent?.id === action.payload ? null : state.selectedEvent,
        focusedEvent: state.focusedEvent?.id === action.payload ? null : state.focusedEvent,
      };

    case 'SELECT_EVENT':
      return {
        ...state,
        selectedEvent: action.payload,
        showEventDetail: action.payload !== null,
      };

    case 'SET_ARTIFACT_MODE':
      return {
        ...state,
        artifactMode: action.payload,
      };

    case 'TOGGLE_ARTIFACT_PANEL':
      const isOpen = action.payload !== undefined ? action.payload : !state.isArtifactOpen;
      return {
        ...state,
        isArtifactOpen: isOpen,
        artifactEvents: isOpen ? state.filteredEvents : [],
        artifactMode: isOpen ? state.artifactMode : 'list',
        focusedEvent: isOpen ? state.focusedEvent : null,
      };

    case 'SET_ARTIFACT_EVENTS':
      return {
        ...state,
        artifactEvents: action.payload,
        isArtifactOpen: action.payload.length > 0,
      };

    case 'SET_FOCUSED_EVENT':
      return {
        ...state,
        focusedEvent: action.payload,
        artifactMode: action.payload ? 'focused' : 'list',
      };

    case 'SET_PENDING_CHANGES':
      return {
        ...state,
        pendingChanges: action.payload,
      };

    case 'APPLY_PENDING_CHANGES':
      if (!state.pendingChanges || !state.focusedEvent) return state;

      const appliedEvents = state.events.map(event =>
        event.id === state.focusedEvent?.id
          ? { ...event, ...state.pendingChanges }
          : event
      );
      return {
        ...state,
        events: appliedEvents,
        filteredEvents: filterEvents(appliedEvents, state.searchQuery),
        focusedEvent: { ...state.focusedEvent, ...state.pendingChanges },
        pendingChanges: null,
        artifactMode: 'list',
      };

    case 'CANCEL_PENDING_CHANGES':
      return {
        ...state,
        pendingChanges: null,
        artifactMode: state.focusedEvent ? 'focused' : 'list',
      };

    case 'SET_VIEW_TYPE':
      return {
        ...state,
        viewType: action.payload,
      };

    case 'SET_SELECTED_DATE':
      return {
        ...state,
        selectedDate: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'SET_SEARCH_QUERY':
      const query = action.payload;
      return {
        ...state,
        searchQuery: query,
        filteredEvents: filterEvents(state.events, query),
        artifactEvents: state.isArtifactOpen ? filterEvents(state.events, query) : state.artifactEvents,
      };

    case 'TOGGLE_EVENT_DETAIL':
      return {
        ...state,
        showEventDetail: action.payload !== undefined ? action.payload : !state.showEventDetail,
      };

    case 'TOGGLE_EVENT_CREATE':
      return {
        ...state,
        showEventCreate: action.payload !== undefined ? action.payload : !state.showEventCreate,
      };

    case 'SET_EDITING_EVENT':
      return {
        ...state,
        editingEvent: action.payload,
        showEventCreate: action.payload !== null,
      };

    case 'SYNC_ARTIFACT_TO_CALENDAR':
      // Sync artifact panel changes to calendar view
      return {
        ...state,
        events: [...state.artifactEvents],
        filteredEvents: filterEvents(state.artifactEvents, state.searchQuery),
      };

    case 'SYNC_CALENDAR_TO_ARTIFACT':
      // Sync calendar changes to artifact panel
      return {
        ...state,
        artifactEvents: state.isArtifactOpen ? [...state.filteredEvents] : state.artifactEvents,
      };

    default:
      return state;
  }
}

// Helper function to filter events
function filterEvents(events: CalendarEvent[], query: string): CalendarEvent[] {
  if (!query) return events;

  const lowerQuery = query.toLowerCase();
  return events.filter(event =>
    event.summary?.toLowerCase().includes(lowerQuery) ||
    event.description?.toLowerCase().includes(lowerQuery) ||
    event.location?.toLowerCase().includes(lowerQuery)
  );
}

// Context
interface EventContextValue extends EventState {
  // Actions
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  selectEvent: (event: CalendarEvent | null) => void;

  // Artifact Panel Actions
  setArtifactMode: (mode: 'list' | 'focused' | 'edit') => void;
  toggleArtifactPanel: (open?: boolean) => void;
  setArtifactEvents: (events: CalendarEvent[]) => void;
  setFocusedEvent: (event: CalendarEvent | null) => void;
  setPendingChanges: (changes: Partial<CalendarEvent> | null) => void;
  applyPendingChanges: () => void;
  cancelPendingChanges: () => void;

  // Calendar View Actions
  setViewType: (type: 'month' | 'week' | 'day' | 'list') => void;
  setSelectedDate: (date: Date) => void;

  // UI Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleEventDetail: (show?: boolean) => void;
  toggleEventCreate: (show?: boolean) => void;
  setEditingEvent: (event: CalendarEvent | null) => void;

  // Sync Actions
  syncArtifactToCalendar: () => void;
  syncCalendarToArtifact: () => void;
}

const EventContext = createContext<EventContextValue | null>(null);

// Provider Component
interface EventProviderProps {
  children: ReactNode;
  initialEvents?: CalendarEvent[];
  enableRealtime?: boolean;
}

export function EventProvider({
  children,
  initialEvents = [],
  enableRealtime = true,
}: EventProviderProps) {
  const [state, dispatch] = useReducer(eventReducer, {
    ...initialState,
    events: initialEvents,
    filteredEvents: initialEvents,
  });

  // Memoize fetch function to prevent recreating on every render
  const fetchEvents = useCallback(async () => {
    // This would be your actual fetch function
    // For now returning current state to avoid infinite loop
    return state.events;
  }, []); // Empty deps as this is just a placeholder

  // Realtime sync hook (temporarily disabled to prevent conflicts with UnifiedSync)
  // The IntegratedCalendarDashboard uses UnifiedSync which handles realtime functionality
  const syncState = false ? useRealtimeSync(
    fetchEvents,
    {
      onSync: useCallback((events) => {
        dispatch({ type: 'SET_EVENTS', payload: events });
      }, [])
    }
  ) : null;

  // Sync realtime events
  useEffect(() => {
    // syncState is a state object, not an array
    // You would need to handle the sync differently based on your needs
  }, [syncState]);

  // Action creators
  const actions: Omit<EventContextValue, keyof EventState> = {
    setEvents: useCallback((events) => dispatch({ type: 'SET_EVENTS', payload: events }), []),
    addEvent: useCallback((event) => dispatch({ type: 'ADD_EVENT', payload: event }), []),
    updateEvent: useCallback((id, updates) => dispatch({ type: 'UPDATE_EVENT', payload: { id, updates } }), []),
    deleteEvent: useCallback((id) => dispatch({ type: 'DELETE_EVENT', payload: id }), []),
    selectEvent: useCallback((event) => dispatch({ type: 'SELECT_EVENT', payload: event }), []),
    setArtifactMode: useCallback((mode) => dispatch({ type: 'SET_ARTIFACT_MODE', payload: mode }), []),
    toggleArtifactPanel: useCallback((open) => dispatch({ type: 'TOGGLE_ARTIFACT_PANEL', payload: open }), []),
    setArtifactEvents: useCallback((events) => dispatch({ type: 'SET_ARTIFACT_EVENTS', payload: events }), []),
    setFocusedEvent: useCallback((event) => dispatch({ type: 'SET_FOCUSED_EVENT', payload: event }), []),
    setPendingChanges: useCallback((changes) => dispatch({ type: 'SET_PENDING_CHANGES', payload: changes }), []),
    applyPendingChanges: useCallback(() => dispatch({ type: 'APPLY_PENDING_CHANGES' }), []),
    cancelPendingChanges: useCallback(() => dispatch({ type: 'CANCEL_PENDING_CHANGES' }), []),
    setViewType: useCallback((type) => dispatch({ type: 'SET_VIEW_TYPE', payload: type }), []),
    setSelectedDate: useCallback((date) => dispatch({ type: 'SET_SELECTED_DATE', payload: date }), []),
    setLoading: useCallback((loading) => dispatch({ type: 'SET_LOADING', payload: loading }), []),
    setError: useCallback((error) => dispatch({ type: 'SET_ERROR', payload: error }), []),
    setSearchQuery: useCallback((query) => dispatch({ type: 'SET_SEARCH_QUERY', payload: query }), []),
    toggleEventDetail: useCallback((show) => dispatch({ type: 'TOGGLE_EVENT_DETAIL', payload: show }), []),
    toggleEventCreate: useCallback((show) => dispatch({ type: 'TOGGLE_EVENT_CREATE', payload: show }), []),
    setEditingEvent: useCallback((event) => dispatch({ type: 'SET_EDITING_EVENT', payload: event }), []),
    syncArtifactToCalendar: useCallback(() => dispatch({ type: 'SYNC_ARTIFACT_TO_CALENDAR' }), []),
    syncCalendarToArtifact: useCallback(() => dispatch({ type: 'SYNC_CALENDAR_TO_ARTIFACT' }), []),
  };

  const value = {
    ...state,
    ...actions,
  };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

// Hook to use event context
export function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}

// Convenience hooks for specific parts of the state
export function useArtifactPanel() {
  const {
    artifactMode,
    isArtifactOpen,
    artifactEvents,
    focusedEvent,
    pendingChanges,
    setArtifactMode,
    toggleArtifactPanel,
    setArtifactEvents,
    setFocusedEvent,
    setPendingChanges,
    applyPendingChanges,
    cancelPendingChanges,
  } = useEvents();

  return {
    mode: artifactMode,
    isOpen: isArtifactOpen,
    events: artifactEvents,
    focusedEvent,
    pendingChanges,
    setMode: setArtifactMode,
    toggle: toggleArtifactPanel,
    setEvents: setArtifactEvents,
    setFocused: setFocusedEvent,
    setPending: setPendingChanges,
    applyChanges: applyPendingChanges,
    cancelChanges: cancelPendingChanges,
  };
}

export function useCalendarView() {
  const {
    viewType,
    selectedDate,
    filteredEvents,
    setViewType,
    setSelectedDate,
  } = useEvents();

  return {
    view: viewType,
    date: selectedDate,
    events: filteredEvents,
    setView: setViewType,
    setDate: setSelectedDate,
  };
}