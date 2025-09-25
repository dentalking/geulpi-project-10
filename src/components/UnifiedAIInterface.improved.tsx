'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Mic,
  Image as ImageIcon,
  X,
  Sparkles,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { CalendarEvent } from '@/types';
import { getSuggestionCache } from '@/services/ai/SuggestionCacheService';
import { getUserPatternService } from '@/services/ai/UserPatternLearningService';
import {
  ChatMessage,
  SmartSuggestion,
  AIResponse,
  SuggestionGenerationContext,
  UserInteraction
} from '@/types/suggestions';

// Constants
const MAX_MESSAGES = 20; // 메모리 관리를 위한 메시지 제한
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface UnifiedAIInterfaceImprovedProps {
  onSubmit?: (message: string, image?: string) => Promise<AIResponse | null>;
  onArtifactUpdate?: (artifact: any) => void;
  userId?: string;
  userEmail?: string;
  locale?: 'ko' | 'en';
  events?: CalendarEvent[];
}

export function UnifiedAIInterfaceImproved({
  onSubmit,
  onArtifactUpdate,
  userId = 'anonymous',
  userEmail,
  locale = 'ko',
  events = []
}: UnifiedAIInterfaceImprovedProps) {
  // State management with proper types
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [attachedImage, setAttachedImage] = useState<{ data: string; preview: string } | null>(null);

  // Refs for performance optimization
  const messagesRef = useRef<ChatMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastAIResponseRef = useRef<string | null>(null);
  const componentIdRef = useRef(`component-${Date.now()}-${Math.random()}`);

  // Services
  const cacheService = useMemo(() => getSuggestionCache(), []);
  const patternService = useMemo(() => getUserPatternService(), []);

  // Initialize component
  useEffect(() => {
    console.log(`[UnifiedAIInterface] 🚀 Component mounted with ID: ${componentIdRef.current}`);
    loadInitialSuggestions();

    return () => {
      console.log(`[UnifiedAIInterface] 💀 Component unmounting with ID: ${componentIdRef.current}`);
    };
  }, []);

  /**
   * Load initial suggestions with caching
   */
  const loadInitialSuggestions = useCallback(async () => {
    const context: Partial<SuggestionGenerationContext> = {
      userId,
      userEmail,
      locale,
      currentEvents: events,
      timeOfDay: getTimeOfDay(),
      viewMode: 'month',
      recentMessages: []
    };

    // Check cache first
    const cached = cacheService.get(context);
    if (cached) {
      const adjusted = patternService.adjustSuggestionsBasedOnPatterns(cached, userId);
      setSuggestions(adjusted);
      setShowSuggestions(true);
      return;
    }

    // Fetch from API with retry mechanism
    await fetchSuggestionsWithRetry(context);
  }, [userId, userEmail, locale, events, cacheService, patternService]);

  /**
   * Fetch suggestions with retry logic
   */
  const fetchSuggestionsWithRetry = async (
    context: Partial<SuggestionGenerationContext>,
    retries = MAX_RETRIES
  ): Promise<void> => {
    try {
      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.success && data.data?.smartSuggestions) {
        const smartSuggestions = data.data.smartSuggestions;

        // Cache the results
        cacheService.set(context, smartSuggestions);

        // Apply pattern-based adjustments
        const adjusted = patternService.adjustSuggestionsBasedOnPatterns(smartSuggestions, userId);
        setSuggestions(adjusted);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('[UnifiedAIInterface] Failed to fetch suggestions:', error);

      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchSuggestionsWithRetry(context, retries - 1);
      }

      // Fallback to default suggestions
      setSuggestions(getDefaultSuggestions());
    }
  };

  /**
   * Handle message submission
   */
  const handleSubmit = useCallback(async (text?: string, imageData?: string) => {
    const messageText = text || inputValue.trim();
    const imageToSend = imageData || attachedImage?.data;

    if (!messageText && !imageToSend) return;

    let response: AIResponse | null = null;

    try {
      setIsTyping(true);

      // Create user message with proper type
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: new Date(),
        metadata: { hasImage: !!imageToSend }
      };

      // Update messages with memory limit
      setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), userMessage]);
      messagesRef.current = [...messagesRef.current.slice(-MAX_MESSAGES + 1), userMessage];

      // Call the submit handler
      if (onSubmit) {
        response = await onSubmit(messageText, imageToSend);

        if (response) {
          // Create AI message
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: response.message || 'Task completed',
            timestamp: new Date(),
            metadata: {
              actionType: response.action?.type,
              eventsCount: response.eventsCount
            }
          };

          // Update messages with memory limit
          setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), aiMessage]);
          messagesRef.current = [...messagesRef.current.slice(-MAX_MESSAGES + 1), aiMessage];
          lastAIResponseRef.current = response.message;

          // Update artifact if needed
          if (response.action && onArtifactUpdate) {
            onArtifactUpdate(response.action);
          }

          // Generate new suggestions based on conversation context
          await generateContextualSuggestions(response);
        }
      }

      // Clear input
      setInputValue('');
      setAttachedImage(null);

    } catch (error) {
      console.error('[UnifiedAIInterface] Submit error:', error);
      toast.error(locale === 'ko' ? '오류가 발생했습니다' : 'An error occurred');
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, attachedImage, onSubmit, onArtifactUpdate, locale]);

  /**
   * Generate contextual suggestions after AI response
   */
  const generateContextualSuggestions = useCallback(async (response: AIResponse) => {
    const context: Partial<SuggestionGenerationContext> = {
      userId,
      userEmail,
      locale,
      currentEvents: events,
      timeOfDay: getTimeOfDay(),
      viewMode: 'month',
      recentMessages: messagesRef.current.slice(-5) // Last 5 messages for context
    };

    // Check cache first
    const cached = cacheService.get(context);
    if (cached) {
      const adjusted = patternService.adjustSuggestionsBasedOnPatterns(cached, userId);
      setSuggestions(adjusted);
      setShowSuggestions(true);
      return;
    }

    // Fetch new suggestions
    await fetchSuggestionsWithRetry(context);
  }, [userId, userEmail, locale, events, cacheService, patternService]);

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = useCallback((suggestion: SmartSuggestion) => {
    // Record user interaction
    const interaction: UserInteraction = {
      suggestionId: suggestion.id,
      suggestionType: suggestion.type,
      action: 'accepted',
      timestamp: new Date(),
      timeOfDay: getTimeOfDay() as any,
      context: { locale, userId }
    };
    patternService.recordInteraction(interaction);

    // Populate input field
    setInputValue(suggestion.text);
    setShowSuggestions(false);

    // Focus and highlight input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.backgroundColor = '';
          }
        }, 500);
      }
    }, 50);
  }, [patternService, locale, userId]);

  /**
   * Get time of day
   */
  function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Get default suggestions
   */
  function getDefaultSuggestions(): SmartSuggestion[] {
    const defaults = locale === 'ko' ? [
      '오늘 일정 보여줘',
      '내일 중요한 일정 추가',
      '이번 주 일정 확인'
    ] : [
      'Show today\'s schedule',
      'Add important event for tomorrow',
      'Check this week\'s schedule'
    ];

    return defaults.map((text, index) => ({
      id: `default-${index}`,
      text,
      type: 'create_routine' as const,
      priority: 1,
      action: 'requires_input' as const
    }));
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {suggestions.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="flex-shrink-0 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="max-w-[200px] truncate">{suggestion.text}</span>
                {suggestion.confidence && suggestion.confidence > 0.7 && (
                  <span className="text-xs text-green-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={locale === 'ko' ? '메시지를 입력하세요...' : 'Type a message...'}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            rows={1}
          />

          <button
            onClick={() => handleSubmit()}
            disabled={isTyping || (!inputValue.trim() && !attachedImage)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTyping ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {attachedImage && (
          <div className="mt-2 relative inline-block">
            <img
              src={attachedImage.preview}
              alt="Attached"
              className="h-20 rounded-lg"
            />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}