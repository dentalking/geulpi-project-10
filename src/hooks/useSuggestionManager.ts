/**
 * Custom hook for managing AI suggestions
 * Extracted from UnifiedAIInterface to improve performance and reduce complexity
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { SmartSuggestion } from '@/services/ai/SmartSuggestionService';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  action?: {
    type: 'create' | 'update' | 'delete' | 'list' | 'search';
    status: 'pending' | 'processing' | 'completed' | 'failed';
  };
}

interface UseSuggestionManagerOptions {
  locale?: 'ko' | 'en';
  messages?: Message[];
  lastAIResponse?: any;
  sessionId?: string;
  userId?: string;
}

export function useSuggestionManager({
  locale = 'ko',
  messages = [],
  lastAIResponse,
  sessionId = `session-${Date.now()}`,
  userId
}: UseSuggestionManagerOptions) {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Refs to prevent stale closures and unnecessary re-renders
  const loadingSuggestionsRef = useRef(false);
  const lastSuggestionCallRef = useRef<number>(0);
  const sessionStartTimeRef = useRef<Date>(new Date());
  const previousSuggestionsRef = useRef<string[]>([]);
  const messagesRef = useRef(messages);
  const lastAIResponseRef = useRef(lastAIResponse);

  // Update refs when props change
  messagesRef.current = messages;
  lastAIResponseRef.current = lastAIResponse;

  const SUGGESTION_DEBOUNCE_MS = 2000;

  // Fallback suggestions - memoized to prevent recreation
  const fallbackSuggestions = useMemo((): SmartSuggestion[] => {
    const suggestions = locale === 'ko' ? [
      "오늘 일정 확인해줘",
      "내일 회의 일정 추가",
      "이번주 일정 정리해줘",
      "사진에서 일정 추출하기"
    ] : [
      "Show today's schedule",
      "Add meeting tomorrow",
      "Review this week's events",
      "Extract schedule from photo"
    ];

    return suggestions.map((text, index) => ({
      id: `fallback-${index}`,
      text,
      type: index === 3 ? 'image' : index === 1 ? 'create' : 'view' as const,
      priority: 5,
      context: {},
      action: 'requires_input' as const
    }));
  }, [locale]);

  // Memoized API payload creation to prevent recreation
  const createApiPayload = useCallback(() => {
    const currentMessages = messagesRef.current || [];
    const currentLastAIResponse = lastAIResponseRef.current;

    // Format ALL messages for comprehensive context
    const allFormattedMessages = currentMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp?.toISOString() || new Date().toISOString(),
      action: msg.action
    }));

    // Keep recent messages for backward compatibility
    const recentMessages = allFormattedMessages.slice(-5);

    return {
      locale: locale || 'ko',
      sessionId: 'user-session',
      recentMessages: recentMessages,
      conversationHistory: allFormattedMessages,
      selectedDate: new Date().toISOString(),
      viewMode: 'month',
      lastAIResponse: currentLastAIResponse,
      sessionStartTime: sessionStartTimeRef.current.toISOString(),
      previousSuggestions: previousSuggestionsRef.current,
      useImproved: true
    };
  }, [locale]);

  // Generate contextual suggestions with debouncing and duplicate prevention
  const generateContextualSuggestions = useCallback(async () => {
    const now = Date.now();

    // Prevent too frequent calls
    if (now - lastSuggestionCallRef.current < SUGGESTION_DEBOUNCE_MS) {
      console.log('[SuggestionManager] Suggestion call too frequent, skipping');
      return;
    }

    // Prevent concurrent calls
    if (loadingSuggestionsRef.current) {
      console.log('[SuggestionManager] Already loading suggestions, skipping');
      return;
    }

    lastSuggestionCallRef.current = now;
    console.log('[SuggestionManager] generateContextualSuggestions called');
    loadingSuggestionsRef.current = true;
    setLoadingSuggestions(true);

    try {
      const apiPayload = createApiPayload();

      console.log('[SuggestionManager] Sending payload to API:', {
        ...apiPayload,
        messageCount: apiPayload.conversationHistory.length,
        lastAIResponse: apiPayload.lastAIResponse ? 'included' : 'not included',
        lastMessage: apiPayload.conversationHistory[apiPayload.conversationHistory.length - 1]
      });

      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      console.log('[SuggestionManager] API response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        const data = responseData.data || responseData;

        // Track suggestions for next request
        if (data.suggestions) {
          previousSuggestionsRef.current = [...previousSuggestionsRef.current, ...data.suggestions].slice(-20);
        }

        const smartSuggestions = data.smartSuggestions || data.suggestions?.map((text: string, index: number) => ({
          id: `suggestion-${Date.now()}-${index}`,
          text,
          type: (data.metadata?.[index]?.category || 'view') as 'view' | 'create' | 'search' | 'action' | 'smart',
          priority: data.metadata?.[index]?.priority || 5,
          context: {
            isImproved: data.context?.isImproved || false,
            isGeminiAI: data.context?.isGeminiAI || false,
            hasProfile: data.context?.hasProfile || false,
            category: data.metadata?.[index]?.category || 'general'
          },
          action: 'requires_input' as const
        }));

        if (smartSuggestions && smartSuggestions.length > 0) {
          setSuggestions(smartSuggestions);
          console.log('[SuggestionManager] ✅ AI suggestions generated:', {
            count: smartSuggestions.length,
            suggestions: smartSuggestions.map(s => s.text),
            isGeminiAI: data.context?.isGeminiAI
          });
        } else {
          setSuggestions(fallbackSuggestions);
          console.log('[SuggestionManager] No API suggestions, using fallback');
        }
      } else {
        console.log('[SuggestionManager] API failed, using fallback');
        setSuggestions(fallbackSuggestions);
      }
    } catch (error) {
      console.error('[SuggestionManager] Failed to generate suggestions:', error);
      setSuggestions(fallbackSuggestions);
    } finally {
      loadingSuggestionsRef.current = false;
      setLoadingSuggestions(false);
    }
  }, [createApiPayload, fallbackSuggestions]);

  // Initialize suggestions on mount
  const initializeSuggestions = useCallback(async () => {
    if (hasInitialized) return;

    console.log('[SuggestionManager] Initializing suggestions');
    setHasInitialized(true);
    setLoadingSuggestions(true);

    try {
      const apiPayload = createApiPayload();

      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      if (response.ok) {
        const responseData = await response.json();
        const data = responseData.data || responseData;

        const smartSuggestions = data.smartSuggestions || data.suggestions?.map((text: string, index: number) => ({
          id: `suggestion-${Date.now()}-${index}`,
          text,
          type: (data.metadata?.[index]?.category || 'view') as 'view' | 'create' | 'search' | 'action' | 'smart',
          priority: data.metadata?.[index]?.priority || 5,
          context: {
            isImproved: data.context?.isImproved || false,
            isGeminiAI: data.context?.isGeminiAI || false,
            hasProfile: data.context?.hasProfile || false,
            category: data.metadata?.[index]?.category || 'general'
          },
          action: 'requires_input' as const
        }));

        if (smartSuggestions && smartSuggestions.length > 0) {
          setSuggestions(smartSuggestions);
          console.log('[SuggestionManager] ✅ Initial AI suggestions loaded:', {
            count: smartSuggestions.length,
            suggestions: smartSuggestions.map(s => s.text),
            isGeminiAI: data.context?.isGeminiAI
          });
        } else {
          setSuggestions(fallbackSuggestions);
          console.log('[SuggestionManager] No initial API suggestions, using fallback');
        }
      } else {
        setSuggestions(fallbackSuggestions);
        console.log('[SuggestionManager] Initial API failed, using fallback');
      }
    } catch (error) {
      console.error('[SuggestionManager] Failed to load initial suggestions:', error);
      setSuggestions(fallbackSuggestions);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [hasInitialized, createApiPayload, fallbackSuggestions]);

  // Initialize on mount
  useEffect(() => {
    if (!hasInitialized) {
      initializeSuggestions();
    }
  }, [initializeSuggestions, hasInitialized]);

  // Regenerate suggestions when messages change (with debouncing)
  useEffect(() => {
    if (hasInitialized && messages.length > 0) {
      const timeoutId = setTimeout(() => {
        generateContextualSuggestions();
      }, SUGGESTION_DEBOUNCE_MS);

      return () => clearTimeout(timeoutId);
    }
  }, [hasInitialized, messages.length, generateContextualSuggestions]);

  return {
    suggestions,
    loadingSuggestions,
    generateContextualSuggestions,
    initializeSuggestions
  };
}