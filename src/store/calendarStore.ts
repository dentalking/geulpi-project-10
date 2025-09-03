import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  CalendarEvent, 
  SchedulingSuggestion,
  ConflictInfo 
} from '@/types';

interface CalendarState {
  // 상태
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  currentView: 'month' | 'week' | 'day' | 'agenda';
  currentDate: Date;
  isLoading: boolean;
  error: string | null;
  
  // 스케줄링 관련
  schedulingSuggestions: SchedulingSuggestion[];
  conflicts: ConflictInfo[];
  
  // 필터 및 설정
  filters: {
    categories: string[];
    searchQuery: string;
    showCompleted: boolean;
  };
  
  // 액션
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  selectEvent: (event: CalendarEvent | null) => void;
  
  // 뷰 관련
  setCurrentView: (view: 'month' | 'week' | 'day' | 'agenda') => void;
  setCurrentDate: (date: Date) => void;
  navigateToday: () => void;
  navigatePrevious: () => void;
  navigateNext: () => void;
  
  // 스케줄링 액션
  setSchedulingSuggestions: (suggestions: SchedulingSuggestion[]) => void;
  setConflicts: (conflicts: ConflictInfo[]) => void;
  clearConflicts: () => void;
  
  // 필터 액션
  setSearchQuery: (query: string) => void;
  toggleCategory: (category: string) => void;
  toggleShowCompleted: () => void;
  clearFilters: () => void;
  
  // 유틸리티
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  events: [],
  selectedEvent: null,
  currentView: 'month' as const,
  currentDate: new Date(),
  isLoading: false,
  error: null,
  schedulingSuggestions: [],
  conflicts: [],
  filters: {
    categories: [],
    searchQuery: '',
    showCompleted: true
  }
};

export const useCalendarStore = create<CalendarState>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,
        
        // 이벤트 관리
        setEvents: (events) => set((state) => {
          state.events = events;
        }),
        
        addEvent: (event) => set((state) => {
          state.events.push(event);
        }),
        
        updateEvent: (id, updates) => set((state) => {
          const index = state.events.findIndex(e => e.id === id);
          if (index !== -1) {
            state.events[index] = { ...state.events[index], ...updates };
          }
        }),
        
        deleteEvent: (id) => set((state) => {
          state.events = state.events.filter(e => e.id !== id);
          if (state.selectedEvent?.id === id) {
            state.selectedEvent = null;
          }
        }),
        
        selectEvent: (event) => set((state) => {
          state.selectedEvent = event;
        }),
        
        // 뷰 관리
        setCurrentView: (view) => set((state) => {
          state.currentView = view;
        }),
        
        setCurrentDate: (date) => set((state) => {
          state.currentDate = date;
        }),
        
        navigateToday: () => set((state) => {
          state.currentDate = new Date();
        }),
        
        navigatePrevious: () => set((state) => {
          const date = new Date(state.currentDate);
          switch (state.currentView) {
            case 'month':
              date.setMonth(date.getMonth() - 1);
              break;
            case 'week':
              date.setDate(date.getDate() - 7);
              break;
            case 'day':
              date.setDate(date.getDate() - 1);
              break;
          }
          state.currentDate = date;
        }),
        
        navigateNext: () => set((state) => {
          const date = new Date(state.currentDate);
          switch (state.currentView) {
            case 'month':
              date.setMonth(date.getMonth() + 1);
              break;
            case 'week':
              date.setDate(date.getDate() + 7);
              break;
            case 'day':
              date.setDate(date.getDate() + 1);
              break;
          }
          state.currentDate = date;
        }),
        
        // 스케줄링
        setSchedulingSuggestions: (suggestions) => set((state) => {
          state.schedulingSuggestions = suggestions;
        }),
        
        setConflicts: (conflicts) => set((state) => {
          state.conflicts = conflicts;
        }),
        
        clearConflicts: () => set((state) => {
          state.conflicts = [];
        }),
        
        // 필터
        setSearchQuery: (query) => set((state) => {
          state.filters.searchQuery = query;
        }),
        
        toggleCategory: (category) => set((state) => {
          const index = state.filters.categories.indexOf(category);
          if (index === -1) {
            state.filters.categories.push(category);
          } else {
            state.filters.categories.splice(index, 1);
          }
        }),
        
        toggleShowCompleted: () => set((state) => {
          state.filters.showCompleted = !state.filters.showCompleted;
        }),
        
        clearFilters: () => set((state) => {
          state.filters = initialState.filters;
        }),
        
        // 유틸리티
        setLoading: (loading) => set((state) => {
          state.isLoading = loading;
        }),
        
        setError: (error) => set((state) => {
          state.error = error;
        }),
        
        reset: () => set(() => initialState)
      })),
      {
        name: 'calendar-storage',
        partialize: (state) => ({
          currentView: state.currentView,
          filters: state.filters
        })
      }
    ),
    {
      name: 'CalendarStore'
    }
  )
);