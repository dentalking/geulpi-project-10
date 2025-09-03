import { useCalendarStore } from './calendarStore';
import { useAIStore } from './aiStore';

export { useCalendarStore, useAIStore };

// Store selectors for common use cases
export const useCalendarEvents = () => useCalendarStore((state) => state.events);
export const useCurrentView = () => useCalendarStore((state) => state.currentView);
export const useSelectedEvent = () => useCalendarStore((state) => state.selectedEvent);

export const useAIMessages = () => useAIStore((state) => state.messages);
export const useAISuggestions = () => useAIStore((state) => state.suggestions);
export const useAISettings = () => useAIStore((state) => state.settings);