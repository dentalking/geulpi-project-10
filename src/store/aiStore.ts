import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  AIMessage, 
  SmartSuggestion,
  PatternInsight,
  ConversationHistory 
} from '@/types';

interface AIState {
  // 채팅 상태
  messages: AIMessage[];
  currentSessionId: string;
  isTyping: boolean;
  isListening: boolean;
  
  // AI 제안 및 인사이트
  suggestions: SmartSuggestion[];
  insights: PatternInsight[];
  predictions: string[];
  
  // 대화 히스토리
  conversationHistory: ConversationHistory[];
  
  // 설정
  settings: {
    autoSuggest: boolean;
    voiceEnabled: boolean;
    proactiveNotifications: boolean;
    language: 'ko' | 'en';
    responseSpeed: 'fast' | 'balanced' | 'thorough';
  };
  
  // 상태 플래그
  isProcessing: boolean;
  error: string | null;
  lastActivity: Date | null;
  
  // 메시지 액션
  addMessage: (message: AIMessage) => void;
  updateMessage: (id: string, updates: Partial<AIMessage>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  
  // 세션 관리
  setSessionId: (id: string) => void;
  resetSession: () => void;
  
  // AI 상태 액션
  setTyping: (typing: boolean) => void;
  setListening: (listening: boolean) => void;
  setProcessing: (processing: boolean) => void;
  
  // 제안 및 인사이트
  setSuggestions: (suggestions: SmartSuggestion[]) => void;
  addSuggestion: (suggestion: SmartSuggestion) => void;
  removeSuggestion: (id: string) => void;
  setInsights: (insights: PatternInsight[]) => void;
  setPredictions: (predictions: string[]) => void;
  
  // 대화 히스토리
  addToHistory: (entry: ConversationHistory) => void;
  clearHistory: () => void;
  
  // 설정 액션
  updateSettings: (settings: Partial<AIState['settings']>) => void;
  toggleAutoSuggest: () => void;
  toggleVoice: () => void;
  toggleProactiveNotifications: () => void;
  setLanguage: (language: 'ko' | 'en') => void;
  setResponseSpeed: (speed: 'fast' | 'balanced' | 'thorough') => void;
  
  // 유틸리티
  setError: (error: string | null) => void;
  updateLastActivity: () => void;
  reset: () => void;
}

const initialState = {
  messages: [],
  currentSessionId: `session-${Date.now()}`,
  isTyping: false,
  isListening: false,
  suggestions: [],
  insights: [],
  predictions: [],
  conversationHistory: [],
  settings: {
    autoSuggest: true,
    voiceEnabled: false,
    proactiveNotifications: true,
    language: 'ko' as const,
    responseSpeed: 'balanced' as const
  },
  isProcessing: false,
  error: null,
  lastActivity: null
};

export const useAIStore = create<AIState>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,
        
        // 메시지 관리
        addMessage: (message) => set((state) => {
          state.messages.push(message);
          state.lastActivity = new Date();
        }),
        
        updateMessage: (id, updates) => set((state) => {
          const index = state.messages.findIndex(m => m.id === id);
          if (index !== -1) {
            state.messages[index] = { ...state.messages[index], ...updates };
          }
        }),
        
        deleteMessage: (id) => set((state) => {
          state.messages = state.messages.filter(m => m.id !== id);
        }),
        
        clearMessages: () => set((state) => {
          state.messages = [];
        }),
        
        // 세션 관리
        setSessionId: (id) => set((state) => {
          state.currentSessionId = id;
        }),
        
        resetSession: () => set((state) => {
          state.currentSessionId = `session-${Date.now()}`;
          state.messages = [];
          state.conversationHistory = [];
        }),
        
        // AI 상태
        setTyping: (typing) => set((state) => {
          state.isTyping = typing;
        }),
        
        setListening: (listening) => set((state) => {
          state.isListening = listening;
        }),
        
        setProcessing: (processing) => set((state) => {
          state.isProcessing = processing;
        }),
        
        // 제안 및 인사이트
        setSuggestions: (suggestions) => set((state) => {
          state.suggestions = suggestions;
        }),
        
        addSuggestion: (suggestion) => set((state) => {
          state.suggestions.push(suggestion);
        }),
        
        removeSuggestion: (id) => set((state) => {
          state.suggestions = state.suggestions.filter(s => s.id !== id);
        }),
        
        setInsights: (insights) => set((state) => {
          state.insights = insights;
        }),
        
        setPredictions: (predictions) => set((state) => {
          state.predictions = predictions;
        }),
        
        // 대화 히스토리
        addToHistory: (entry) => set((state) => {
          state.conversationHistory.push(entry);
          // 최대 100개 유지
          if (state.conversationHistory.length > 100) {
            state.conversationHistory.shift();
          }
        }),
        
        clearHistory: () => set((state) => {
          state.conversationHistory = [];
        }),
        
        // 설정
        updateSettings: (settings) => set((state) => {
          state.settings = { ...state.settings, ...settings };
        }),
        
        toggleAutoSuggest: () => set((state) => {
          state.settings.autoSuggest = !state.settings.autoSuggest;
        }),
        
        toggleVoice: () => set((state) => {
          state.settings.voiceEnabled = !state.settings.voiceEnabled;
        }),
        
        toggleProactiveNotifications: () => set((state) => {
          state.settings.proactiveNotifications = !state.settings.proactiveNotifications;
        }),
        
        setLanguage: (language) => set((state) => {
          state.settings.language = language;
        }),
        
        setResponseSpeed: (speed) => set((state) => {
          state.settings.responseSpeed = speed;
        }),
        
        // 유틸리티
        setError: (error) => set((state) => {
          state.error = error;
        }),
        
        updateLastActivity: () => set((state) => {
          state.lastActivity = new Date();
        }),
        
        reset: () => set(() => initialState)
      })),
      {
        name: 'ai-storage',
        partialize: (state) => ({
          settings: state.settings,
          conversationHistory: state.conversationHistory.slice(-20) // 최근 20개만 저장
        })
      }
    ),
    {
      name: 'AIStore'
    }
  )
);