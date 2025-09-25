/**
 * Optimized UnifiedAIInterface - 통합 상태 관리 적용 및 성능 최적화
 * 실시간 동기화와 아티팩트 패널 자동 연동
 * Custom hooks를 사용하여 컴포넌트 복잡도 감소
 */

'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  ArrowUp,
  Camera,
  Plus,
  RotateCcw,
  Layers,
  Square,
  ChevronUp,
  ChevronDown,
  User,
  Bot,
  Calendar,
  Clock,
  MapPin,
  Check,
  X,
  CalendarDays,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { useToastContext } from '@/providers/ToastProvider';
import Image from 'next/image';
import { apiRateLimitManager } from '@/lib/ApiRateLimitManager';

// 통합 상태 관리 및 커스텀 훅 imports
import {
  useUnifiedEventStore,
  useEvents,
  useArtifactPanel,
  useSyncState
} from '@/store/unifiedEventStore';
import { useUnifiedSync } from '@/hooks/useUnifiedSync';
import { useEventSubmission } from '@/hooks/useEventSubmission';
import { useSuggestionManager } from '@/hooks/useSuggestionManager';
import { CalendarEvent } from '@/types';
import { SmartSuggestionService, type SmartSuggestion } from '@/services/ai/SmartSuggestionService';

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

interface ExtractedEvent {
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  duration?: number;
  selected?: boolean;
}

interface UnifiedAIInterfaceProps {
  onSubmit?: (text: string, imageData?: string) => Promise<{ message?: string; action?: any; success?: boolean } | void>;
  onEventsExtracted?: (events: ExtractedEvent[]) => void;
  className?: string;
  autoFocus?: boolean;
  isProcessing?: boolean;
  locale?: 'ko' | 'en';
  sessionId?: string;
  focusLevel?: 'background' | 'medium' | 'focus';
  onFocusLevelChange?: (level: 'background' | 'medium' | 'focus') => void;
  initialMessages?: Message[];
  userPicture?: string | null;
  userId?: string;
  authToken?: string;
  lastAIResponse?: any;
}

export const OptimizedUnifiedAIInterface = React.memo<UnifiedAIInterfaceProps>(function OptimizedUnifiedAIInterface({
  onSubmit,
  onEventsExtracted,
  className = '',
  autoFocus = false,
  isProcessing = false,
  locale = 'ko',
  sessionId = `session-${Date.now()}`,
  focusLevel = 'medium',
  onFocusLevelChange,
  initialMessages = [],
  userPicture,
  userId,
  authToken,
  lastAIResponse: propLastAIResponse
}) {
  // === Local State - Minimal and Optimized ===
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [isTyping, setIsTyping] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ data: string; preview: string } | null>(null);

  // === Refs ===
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const componentIdRef = useRef(`optimized-component-${Date.now()}`);

  // === Services and Toast ===
  const { toast } = useToastContext();
  const suggestionService = useMemo(() => new SmartSuggestionService(locale), [locale]);

  // === Custom Hooks for Complex Logic ===
  const { handleSingleEventCreation, handleMultipleEventCreation, isProcessing: isEventProcessing } = useEventSubmission({
    locale,
    sessionId
  });

  const { suggestions, loadingSuggestions, generateContextualSuggestions } = useSuggestionManager({
    locale,
    messages,
    lastAIResponse: propLastAIResponse,
    sessionId,
    userId
  });

  // === 통합 상태 관리 ===
  const { events, addEvent, updateEvent, highlightEvent } = useEvents();
  const {
    open: openArtifactPanel,
    close: closeArtifactPanel,
    setMode: setArtifactMode,
    setFocused: setFocusedEvent
  } = useArtifactPanel();
  const { status: syncStatus } = useSyncState();

  // === 실시간 동기화 (Temporarily disabled for optimization) ===
  const unifiedSync = { connected: false, errors: 0, quality: 'disconnected' as const };

  // === Component Lifecycle Tracking ===
  useEffect(() => {
    console.log('[Optimized UnifiedAI] 🚀 Component mounted with ID:', componentIdRef.current);
    return () => {
      console.log('[Optimized UnifiedAI] 💀 Component unmounting with ID:', componentIdRef.current);
    };
  }, []);

  // === Auto-focus effect ===
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // === Chat History Scroll ===
  useEffect(() => {
    if (showChatHistory) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, showChatHistory]);

  // === Initial Messages Effect - Optimized ===
  useEffect(() => {
    if (initialMessages?.length > 0) {
      setMessages(initialMessages);
      const hasUserMessages = initialMessages.some(msg => msg.role === 'user');
      if (hasUserMessages) {
        setShowChatHistory(true);
      }
    }
  }, [initialMessages]);

  // === AI Response Processing - Simplified ===
  useEffect(() => {
    if (!propLastAIResponse ||
        (!propLastAIResponse.message && !propLastAIResponse.content && !propLastAIResponse.action)) {
      return;
    }

    console.log('[Optimized UnifiedAI] Processing AI response:', propLastAIResponse);

    const responseWithTimestamp = {
      ...propLastAIResponse,
      timestamp: propLastAIResponse.timestamp || Date.now()
    };

    // Add to messages
    const assistantMessage: Message = {
      id: `assistant-${responseWithTimestamp.timestamp}`,
      role: 'assistant',
      content: responseWithTimestamp.message || responseWithTimestamp.content || 'Action completed',
      timestamp: new Date(responseWithTimestamp.timestamp),
      action: responseWithTimestamp.action
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Handle event creation using the custom hook
    if (responseWithTimestamp.action?.type === 'create' && responseWithTimestamp.action?.data) {
      handleSingleEventCreation(responseWithTimestamp.action.data);
    }

    // Handle multiple event creation
    if (responseWithTimestamp.action?.type === 'create_multiple' && responseWithTimestamp.action?.data?.events) {
      handleMultipleEventCreation(responseWithTimestamp.action.data.events);
    }

    // Regenerate suggestions after AI response
    setTimeout(() => {
      generateContextualSuggestions();
    }, 500);

  }, [propLastAIResponse, handleSingleEventCreation, handleMultipleEventCreation, generateContextualSuggestions]);

  // === Optimized Submit Handler ===
  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() && !attachedImage) return;

    const text = inputValue.trim();
    const imageData = attachedImage?.data;

    // Create user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setAttachedImage(null);
    setIsTyping(true);
    setShowChatHistory(true);

    try {
      // Submit to parent component
      await onSubmit?.(text, imageData);
    } catch (error) {
      console.error('[Optimized UnifiedAI] Submit error:', error);
      toast.error(locale === 'ko' ? '요청 처리 중 오류가 발생했습니다' : 'An error occurred while processing your request');
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, attachedImage, onSubmit, toast, locale]);

  // === Memoized Event Handlers ===
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleSuggestionClick = useCallback(async (suggestion: SmartSuggestion) => {
    console.log('[Optimized UnifiedAI] Suggestion clicked:', suggestion.text);

    // Track suggestion click
    try {
      await fetch('/api/ai/track-suggestion-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionText: suggestion.text,
          category: suggestion.type,
          priority: suggestion.priority,
          locale,
          sessionId,
          action: 'clicked',
          contextInfo: {
            timeOfDay: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening',
            hasEvents: events.length > 0,
            lastAIResponse: propLastAIResponse?.message || null,
            position: suggestions.findIndex(s => s.id === suggestion.id) + 1
          }
        })
      });
    } catch (error) {
      console.error('[Optimized UnifiedAI] Failed to track suggestion click:', error);
    }

    if (suggestion.action === 'requires_input') {
      setInputValue(suggestion.text);
      inputRef.current?.focus();
    } else if (suggestion.action === 'direct_action') {
      await handleSubmit();
    }
  }, [locale, sessionId, events.length, propLastAIResponse, suggestions, handleSubmit]);

  // === Image Upload Handler ===
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setAttachedImage({
        data: result,
        preview: result
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // === Memoized UI State ===
  const connectionStatus = useMemo(() => {
    if (unifiedSync.connected) return 'connected';
    if (unifiedSync.errors > 3) return 'error';
    return 'disconnected';
  }, [unifiedSync.connected, unifiedSync.errors]);

  const shouldShowSuggestions = useMemo(() =>
    showSuggestions && !isTyping && !loadingSuggestions && suggestions.length > 0,
    [showSuggestions, isTyping, loadingSuggestions, suggestions.length]
  );

  return (
    <div className={`relative w-full ${className}`}>
      {/* Connection Status */}
      <div className="hidden">
        <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${connectionStatus === 'connected' ? 'bg-green-100 text-green-700' : connectionStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
          {connectionStatus === 'connected' && '🟢'}
          {connectionStatus === 'error' && '🔴'}
          {connectionStatus === 'disconnected' && '⚪'}
        </div>
        <span className="ml-1 text-xs text-gray-600 dark:text-gray-400">
          {locale === 'ko' ?
            (connectionStatus === 'connected' ? '실시간 연결' :
             connectionStatus === 'error' ? '연결 오류' : '오프라인 모드') :
            (connectionStatus === 'connected' ? 'Live' :
             connectionStatus === 'error' ? 'Error' : 'Offline')
          }
        </span>
      </div>

      {/* Chat History */}
      <AnimatePresence>
        {showChatHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="max-h-96 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((message, index) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex-shrink-0">
                  {message.role === 'user' ? (
                    userPicture ? (
                      <Image src={userPicture} alt="User" width={32} height={32} className="rounded-full" />
                    ) : (
                      <User size={16} />
                    )
                  ) : (
                    <Bot size={16} />
                  )}
                </div>
                <div className={`max-w-[70%] px-4 py-2 rounded-lg ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {message.content}
                  {message.action && (
                    <div className="mt-2 flex items-center gap-2">
                      {message.action.status === 'completed' && <CheckCircle size={16} className="text-green-500" />}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Suggestions */}
      <AnimatePresence>
        {shouldShowSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2 mb-3"
          >
            {suggestions.slice(0, 4).map((suggestion) => (
              <button
                key={suggestion.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-sm transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Sparkles size={14} />
                {suggestion.text}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 transition-all">
        {attachedImage && (
          <div className="relative p-2 border-b border-gray-200 dark:border-gray-700">
            <img src={attachedImage.preview} alt="Attached" className="h-20 w-20 object-cover rounded-lg" />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute top-3 right-3 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={locale === 'ko' ? '일정에 대해 무엇이든 물어보세요...' : 'Ask anything about your schedule...'}
            disabled={isProcessing || isEventProcessing()}
            className="flex-1 bg-transparent outline-none text-base placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              disabled={isProcessing}
            >
              <Camera size={20} className="text-gray-600 dark:text-gray-400" />
            </button>

            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() && !attachedImage}
              className={`p-2 rounded-lg transition-all ${(!inputValue.trim() && !attachedImage) ? 'bg-gray-200 dark:bg-gray-800 text-gray-400' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'}`}
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading States */}
      {(loadingSuggestions || isEventProcessing()) && (
        <div className="absolute -top-12 left-0 right-0 flex items-center justify-center gap-2 px-3 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {loadingSuggestions
              ? (locale === 'ko' ? '제안 생성 중...' : 'Generating suggestions...')
              : (locale === 'ko' ? '일정 처리 중...' : 'Processing event...')
            }
          </span>
        </div>
      )}
    </div>
  );
});

OptimizedUnifiedAIInterface.displayName = 'OptimizedUnifiedAIInterface';