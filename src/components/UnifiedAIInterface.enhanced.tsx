/**
 * 개선된 UnifiedAIInterface - 통합 상태 관리 적용
 * 실시간 동기화와 아티팩트 패널 자동 연동
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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

// 통합 상태 관리 import
import {
  useUnifiedEventStore,
  useEvents,
  useArtifactPanel,
  useSyncState
} from '@/store/unifiedEventStore';
import { useUnifiedSync } from '@/hooks/useUnifiedSync';
import { shallow } from 'zustand/shallow';
import { CalendarEvent } from '@/types';
import { SmartSuggestionService, type SmartSuggestion, type SuggestionContext } from '@/services/ai/SmartSuggestionService';
import { useEventSubmission } from '@/hooks/useEventSubmission';
import { useSuggestionManager } from '@/hooks/useSuggestionManager';

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

export function EnhancedUnifiedAIInterface({
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
}: UnifiedAIInterfaceProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestionService] = useState(() => new SmartSuggestionService(locale));
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ data: string; preview: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const componentIdRef = useRef(`component-${Date.now()}-${Math.random()}`);

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

  // Component lifecycle tracking
  useEffect(() => {
    console.log('[UnifiedAIInterface] 🚀 Component mounted with ID:', componentIdRef.current);
    return () => {
      console.log('[UnifiedAIInterface] 💀 Component unmounting with ID:', componentIdRef.current);
    };
  }, []);
  const { toast } = useToastContext();

  // === 통합 상태 관리 - Use pre-configured hook with shallow comparison ===
  const { events, addEvent, updateEvent, highlightEvent, lastCreatedEventId } = useEvents();

  const {
    open: openArtifactPanel,
    close: closeArtifactPanel,
    setMode: setArtifactMode,
    setFocused: setFocusedEvent
  } = useArtifactPanel();

  const {
    status: syncStatus,
    setStatus: setSyncStatus,
    markComplete: markSyncComplete
  } = useSyncState();

  // === 실시간 동기화 === (temporarily disabled)
  // const unifiedSync = useUnifiedSync({
  //   userId,
  //   authToken,
  //   enabled: true,
  //   preferredMethod: 'auto'
  // });
  const unifiedSync = { connected: false, errors: 0, quality: 'disconnected' as const }; // Mock for now

  // === 기존 useEffect들 ===
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (showChatHistory) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, showChatHistory]);

  useEffect(() => {
    if (initialMessages && (initialMessages?.length || 0) > 0) {
      setMessages(initialMessages);
      const hasUserMessages = initialMessages.some(msg => msg.role === 'user');
      if (hasUserMessages) {
        setShowChatHistory(true);
      }
    }
  }, [initialMessages]);

  // === AI Response Processing - Simplified ===

  // === Additional refs for tracking ===
  const messagesRef = useRef<Message[]>([]);
  const lastAIResponseRef = useRef<any>(null);
  const sessionStartTimeRef = useRef(new Date());

  // Hook already initializes suggestions

  // Safe AI response handling with explicit trigger conditions
  const aiResponseCountRef = useRef(0);
  const lastProcessedResponseIdRef = useRef<string | null>(null);

  // Add debugging for state changes
  useEffect(() => {
    console.log('[UnifiedAIInterface] 🔍 State tracking - lastAIResponse state changed:', {
      hasLastAIResponse: !!propLastAIResponse,
      lastAIResponseObject: propLastAIResponse,
      stateType: typeof propLastAIResponse,
      isNull: propLastAIResponse === null,
      isUndefined: propLastAIResponse === undefined,
      objectKeys: propLastAIResponse ? Object.keys(propLastAIResponse) : [],
      stringifiedState: JSON.stringify(propLastAIResponse),
      currentRenderTime: Date.now()
    });
  }, [propLastAIResponse]);

  useEffect(() => {
    console.log('[UnifiedAIInterface] 🔄 Main AI response processing useEffect triggered:', {
      hasLastAIResponse: !!propLastAIResponse,
      lastAIResponseKeys: propLastAIResponse ? Object.keys(propLastAIResponse) : [],
      timestamp: propLastAIResponse?.timestamp,
      message: propLastAIResponse?.message ? propLastAIResponse.message.substring(0, 50) + '...' : null,
      hasAction: !!propLastAIResponse?.action,
      actionType: propLastAIResponse?.action?.type,
      currentTime: Date.now()
    });

    // Process AI response if we have meaningful content (더 유연한 조건)
    if (propLastAIResponse &&
        (propLastAIResponse.message || propLastAIResponse.content || propLastAIResponse.action)) {

      const responseId = propLastAIResponse.timestamp?.toString() ||
                        `${Date.now()}-${Math.random()}`;

      console.log('[UnifiedAIInterface] 🎯 AI response validation passed:', {
        responseId,
        lastProcessedId: lastProcessedResponseIdRef.current,
        willProcess: lastProcessedResponseIdRef.current !== responseId
      });

      // Prevent duplicate processing
      if (lastProcessedResponseIdRef.current === responseId) {
        console.log('[UnifiedAIInterface] ⚠️ Skipping duplicate response processing');
        return;
      }

      lastProcessedResponseIdRef.current = responseId;
      aiResponseCountRef.current += 1;

      console.log(`[UnifiedAIInterface] ✅ Processing AI response #${aiResponseCountRef.current}`, {
        hasMessage: !!propLastAIResponse.message,
        hasAction: !!propLastAIResponse.action?.type,
        actionType: propLastAIResponse.action?.type
      });

      // Debounced suggestion update for any meaningful AI response
      const timer = setTimeout(() => {
        console.log('[UnifiedAIInterface] 🚀 Triggering contextual suggestion update');
        generateContextualSuggestions();
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      console.log('[UnifiedAIInterface] ❌ AI response validation failed:', {
        hasLastAIResponse: !!propLastAIResponse,
        hasMessage: !!propLastAIResponse?.message,
        hasContent: !!propLastAIResponse?.content,
        hasAction: !!propLastAIResponse?.action
      });
    }
  }, [propLastAIResponse, generateContextualSuggestions]); // Added generateContextualSuggestions to dependencies


  // === 실시간 동기화 상태 모니터링 - Safe implementation ===
  const prevSyncStateRef = useRef<{connected: boolean; errors: number}>({
    connected: false,
    errors: 0
  });

  useEffect(() => {
    const currentSyncState = {
      connected: unifiedSync.connected,
      errors: unifiedSync.errors
    };

    // Only update if state actually changed
    const hasChanged =
      prevSyncStateRef.current.connected !== currentSyncState.connected ||
      prevSyncStateRef.current.errors !== currentSyncState.errors;

    if (hasChanged) {
      prevSyncStateRef.current = currentSyncState;

      // Debounced status update
      const timer = setTimeout(() => {
        if (currentSyncState.connected) {
          setSyncStatus('success');
          console.log('[UnifiedAIInterface] Sync status: Connected');
        } else if (currentSyncState.errors > 0) {
          setSyncStatus('error');
          console.log('[UnifiedAIInterface] Sync status: Error');
        } else {
          setSyncStatus('syncing');
          console.log('[UnifiedAIInterface] Sync status: Syncing');
        }
      }, 300); // Small delay to prevent rapid updates

      return () => clearTimeout(timer);
    }
  }, [unifiedSync.connected, unifiedSync.errors, setSyncStatus]);

  // === 새로 생성된 이벤트 하이라이팅 ===
  useEffect(() => {
    if (lastCreatedEventId) {
      highlightEvent(lastCreatedEventId);

      // 3초 후 하이라이팅 해제
      const timer = setTimeout(() => {
        highlightEvent(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [lastCreatedEventId, highlightEvent]); // highlightEvent is stable from store but include for completeness

  // === 향상된 이벤트 처리 ===
  const processedResponsesRef = useRef<Set<string>>(new Set());

  const handleAIResponse = useCallback(async (response: any) => {
    // Add timestamp to response for tracking
    const responseWithTimestamp = {
      ...response,
      timestamp: response.timestamp || Date.now()
    };

    const responseId = responseWithTimestamp.timestamp.toString();

    // Prevent duplicate processing
    if (processedResponsesRef.current.has(responseId)) {
      console.log('[UnifiedAIInterface] Skipping duplicate response:', responseId);
      return;
    }

    processedResponsesRef.current.add(responseId);

    // Clean up old processed responses (keep last 10)
    if (processedResponsesRef.current.size > 10) {
      const sorted = Array.from(processedResponsesRef.current).sort();
      processedResponsesRef.current = new Set(sorted.slice(-10));
    }

    console.log('[UnifiedAIInterface] 📝 handleAIResponse called - state managed by parent component:', {
      componentId: componentIdRef.current,
      responseId,
      hasMessage: !!responseWithTimestamp.message,
      hasAction: !!responseWithTimestamp.action,
      actionType: responseWithTimestamp.action?.type,
      timestamp: responseWithTimestamp.timestamp
    });

    // 이벤트 생성 처리
    if (response.action?.type === 'create' && response.action?.data) {
      const eventData = response.action.data;

      // CalendarEvent 형식으로 변환
      const newEvent: CalendarEvent = {
        id: `temp-${Date.now()}`,
        summary: eventData.title,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: `${eventData.date}T${eventData.time || '09:00'}:00`,
          timeZone: 'Asia/Seoul'
        },
        end: {
          dateTime: calculateEndTime(eventData.date, eventData.time || '09:00', eventData.duration || 60),
          timeZone: 'Asia/Seoul'
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        status: 'confirmed'
      };

      // 스토어에 추가 (자동으로 아티팩트 패널 열림)
      addEvent(newEvent);

      // 동기화 시작
      setSyncStatus('syncing');

      try {
        // 실제 서버에 이벤트 저장
        const saveResponse = await fetch('/api/calendar/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: newEvent.summary,
            description: newEvent.description,
            location: newEvent.location,
            start: newEvent.start,
            end: newEvent.end,
            sessionId
          })
        });

        if (saveResponse.ok) {
          const saveData = await saveResponse.json();
          if (saveData.success && saveData.data?.id) {
            // 임시 ID를 실제 ID로 업데이트
            updateEvent(newEvent.id!, { id: saveData.data.id });
            console.log('[Enhanced AI Interface] Event saved with real ID:', saveData.data.id);
          }
          markSyncComplete();
          toast.success(locale === 'ko' ? '일정이 저장되었습니다' : 'Event saved successfully');
        } else {
          throw new Error('Failed to save event');
        }
      } catch (error) {
        console.error('[Enhanced AI Interface] Failed to save event:', error);
        setSyncStatus('error');
        toast.error(locale === 'ko' ? '일정 저장에 실패했습니다' : 'Failed to save event');
      }
    }

    // 다중 이벤트 생성 처리
    if (response.action?.type === 'create_multiple' && response.action?.data?.events) {
      const events = response.action.data.events;
      const newEvents: CalendarEvent[] = events.map((eventData: any, index: number) => ({
        id: `temp-${Date.now()}-${index}`,
        summary: eventData.title,
        description: eventData.description || '',
        location: eventData.location || '',
        start: {
          dateTime: `${eventData.date}T${eventData.time || '09:00'}:00`,
          timeZone: 'Asia/Seoul'
        },
        end: {
          dateTime: calculateEndTime(eventData.date, eventData.time || '09:00', eventData.duration || 60),
          timeZone: 'Asia/Seoul'
        },
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        status: 'confirmed'
      }));

      // 스토어에 추가
      newEvents.forEach(event => addEvent(event));

      // 아티팩트 패널을 리스트 모드로 열기
      openArtifactPanel(newEvents);
      setArtifactMode('list');

      setSyncStatus('syncing');
      setTimeout(() => {
        markSyncComplete();
        toast.success(
          locale === 'ko'
            ? `${newEvents?.length || 0}개의 일정이 저장되었습니다`
            : `${newEvents?.length || 0} events saved successfully`
        );
      }, 1000);
    }

    // 이벤트 검색 결과 처리
    if (response.events && Array.isArray(response.events)) {
      openArtifactPanel(response.events);
      setArtifactMode('list');
    }
  }, [
    addEvent,
    openArtifactPanel,
    setArtifactMode,
    setSyncStatus,
    markSyncComplete,
    toast,
    locale
  ]);

  // === 기존 제출 핸들러 향상 ===
  const handleSubmit = useCallback(async (text?: string, imageData?: string) => {
    const messageText = text || inputValue.trim();
    const imageToSend = imageData || attachedImage?.data;
    if (!messageText && !imageToSend) return;

    let response: any; // Declare response outside if block for proper scoping

    try {
      setIsTyping(true);
      setSyncStatus('syncing');

      // 사용자 메시지 추가
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // 기존 제출 핸들러 호출
      if (onSubmit) {
        console.log('[UnifiedAIInterface] 🔍 Calling onSubmit with:', { messageText, hasImage: !!imageToSend });
        response = await onSubmit(messageText, imageToSend);
        console.log('[UnifiedAIInterface] 🔍 onSubmit returned:', {
          hasResponse: !!response,
          responseType: typeof response,
          responseKeys: response ? Object.keys(response) : [],
          response: response
        });

        if (response) {
          // AI 응답 메시지 추가
          const aiMessage: Message = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: response.message || 'Task completed',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);

          console.log('[UnifiedAIInterface] About to call handleAIResponse with:', {
            hasResponse: !!response,
            hasMessage: !!response.message,
            hasAction: !!response.action,
            actionType: response.action?.type
          });

          // 향상된 응답 처리
          await handleAIResponse(response);
        } else {
          console.log('[UnifiedAIInterface] ⚠️ onSubmit returned falsy response');
        }
      } else {
        console.log('[UnifiedAIInterface] ⚠️ No onSubmit function provided');
      }

      // 입력 필드 초기화
      setInputValue('');
      setAttachedImage(null);

      // 메시지 전송 후 새로운 제안 생성 및 표시
      if (response) {
        console.log('[UnifiedAIInterface] Message sent with response, regenerating suggestions...');
        // Wait for AI response to be added to messages before generating suggestions
        setTimeout(async () => {
          // Build complete message history including the latest exchange
          const fullMessages = [
            ...messages,
            userMessage,
            {
              id: `ai-${Date.now()}`,
              role: 'assistant' as const,
              content: response.message || response.content || '',
              timestamp: new Date()
            }
          ];

          // Update refs with complete conversation context
          messagesRef.current = fullMessages;
          lastAIResponseRef.current = response.message || response.content || response || null;

          console.log('[UnifiedAIInterface] Updated messages for suggestions:', {
            totalMessages: fullMessages.length,
            lastUserMessage: userMessage.content,
            lastAIResponse: lastAIResponseRef.current?.substring ? lastAIResponseRef.current.substring(0, 100) : lastAIResponseRef.current
          });

          await generateContextualSuggestions();
          setShowSuggestions(true);
        }, 1000); // 1s delay to ensure the AI response is processed and messages are updated
      } else {
        console.log('[UnifiedAIInterface] Message sent without response, updating context...');
        // Even without response, update context and regenerate suggestions
        setTimeout(async () => {
          messagesRef.current = [...messages, userMessage];
          await generateContextualSuggestions();
          setShowSuggestions(true);
        }, 500);
      }

    } catch (error) {
      console.error('Submit error:', error);
      toast.error(locale === 'ko' ? '오류가 발생했습니다' : 'An error occurred');
      setSyncStatus('error');
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, attachedImage, onSubmit, handleAIResponse, setSyncStatus, toast, locale]);

  // === 헬퍼 함수 ===
  const calculateEndTime = (date: string, time: string, durationMinutes: number): string => {
    const [hour, minute] = time.split(':').map(Number);
    const startDate = new Date(`${date}T${time}:00`);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    return endDate.toISOString().slice(0, 19);
  };

  const getFallbackSuggestionsArray = (): SmartSuggestion[] => {
    return (locale === 'ko' ? [
      "오늘 일정 확인해줘",
      "내일 회의 일정 추가",
      "이번주 일정 정리해줘",
      "사진에서 일정 추출하기"
    ] : [
      "Show today's schedule",
      "Add meeting tomorrow",
      "Review this week's events",
      "Extract schedule from photo"
    ]).map((text, index) => ({
      id: `fallback-${Date.now()}-${index}`,
      text,
      type: 'view' as const,
      priority: 5,
      context: {},
      action: 'requires_input' as const
    }));
  };

  const getFallbackSuggestions = () => {
    return locale === 'ko' ? [
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
  };

  // === 음성 입력 핸들러 ===
  const handleVoiceToggle = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = locale === 'ko' ? 'ko-KR' : 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      if (!isRecording) {
        setIsRecording(true);
        recognition.start();

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');

          setInputValue(transcript);

          if (event.results[0].isFinal) {
            handleSubmit(transcript);
            setIsRecording(false);
          }
        };

        recognition.onerror = () => {
          setIsRecording(false);
          toast.error(locale === 'ko' ? '음성 인식 오류가 발생했습니다' : 'Speech recognition error');
        };

        recognition.onend = () => {
          setIsRecording(false);
        };
      } else {
        recognition.stop();
        setIsRecording(false);
      }
    } else {
      toast.error(locale === 'ko' ? '음성 인식이 지원되지 않는 브라우저입니다.' : 'Speech recognition is not supported in this browser.');
    }
  }, [isRecording, locale, handleSubmit, toast]);

  // === 이미지 업로드 핸들러 ===
  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(locale === 'ko' ? '이미지 파일만 업로드 가능합니다' : 'Only image files are allowed');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAttachedImage({
        data: base64,
        preview: base64
      });

      // 자동으로 이미지 분석 메시지 추가
      const message = locale === 'ko'
        ? '이 이미지에서 일정을 찾아줘'
        : 'Find schedule in this image';
      setInputValue(message);
    };
    reader.readAsDataURL(file);
  }, [locale, toast]);

  // === 클립보드 붙여넣기 핸들러 ===
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleImageUpload(file);
        }
        break;
      }
    }
  }, [handleImageUpload]);

  // 클립보드 이벤트 리스너 등록
  useEffect(() => {
    const handlePasteEvent = (e: ClipboardEvent) => handlePaste(e);
    document.addEventListener('paste', handlePasteEvent);
    return () => {
      document.removeEventListener('paste', handlePasteEvent);
    };
  }, [handlePaste]);

  // === 실시간 상태 표시 ===
  const renderSyncStatus = () => {
    if (!unifiedSync.connected) return null;

    const statusInfo = {
      excellent: { color: 'text-green-500', icon: '🟢', text: 'Live' },
      good: { color: 'text-green-500', icon: '🟢', text: 'Live' },
      fair: { color: 'text-yellow-500', icon: '🟡', text: 'Connected' },
      poor: { color: 'text-orange-500', icon: '🟡', text: 'Unstable' },
      disconnected: { color: 'text-red-500', icon: '🔴', text: 'Offline' }
    }[unifiedSync.quality] || { color: 'text-gray-500', icon: '⚪', text: 'Unknown' };

    return (
      <div className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
        <span>{statusInfo.icon}</span>
        <span>{statusInfo.text}</span>
      </div>
    );
  };

  // === 렌더링 (기존 UI 구조 유지하되 상태 표시 추가) ===
  return (
    <div className={`unified-ai-interface ${className}`}>
      {/* 실시간 동기화 상태 표시 */}
      <div className="absolute top-2 right-2 z-10">
        {renderSyncStatus()}
      </div>

      {/* 기존 UI 구조는 동일하게 유지... */}
      {/* 여기에 기존 UnifiedAIInterface의 나머지 JSX 구조가 들어갑니다 */}

      <div className="relative w-full max-w-3xl mx-auto">
        {/* Claude 스타일 메시지 영역 */}
        {showChatHistory && (messages?.length || 0) > 0 && (
          <div className="mb-4 space-y-4 max-h-96 overflow-y-auto">
            {(messages || []).map((message) => (
              <div
                key={message.id}
                className="flex gap-3"
              >
                {/* 아바타 */}
                <div className="flex-shrink-0">
                  {message.role === 'user' ? (
                    userPicture ? (
                      <img
                        src={userPicture}
                        alt="User"
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </div>
                    )
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* 메시지 컨텐츠 */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {message.role === 'user' ? (locale === 'ko' ? '사용자' : 'You') : 'Claude'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {message.timestamp.toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}

            {/* 타이핑 표시기 */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 pt-2">
                  <div className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* 첨부된 이미지 미리보기 - Claude 스타일 */}
        {attachedImage && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <div className="relative inline-block">
              <img
                src={attachedImage.preview}
                alt="Attached"
                className="h-32 w-auto rounded-lg shadow-sm"
              />
              <button
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-red-500 rounded-full p-1.5 shadow-sm hover:shadow-md transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Claude 스타일 입력 영역 */}
        <div className="relative">
          <div className="flex items-end gap-0 p-2 border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-900 focus-within:border-gray-300 dark:focus-within:border-gray-600 transition-colors">
            {/* 첨부 버튼 - 왼쪽 끝에 배치 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800/50 transition-all self-end"
              disabled={isProcessing || isTyping}
              title={locale === 'ko' ? '파일 첨부' : 'Attach file'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* 텍스트 입력 영역 */}
            <div className="flex-1 px-3">
              <textarea
                ref={inputRef as any}
                value={inputValue}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setInputValue(newValue);
                  // Show suggestions again if input is cleared
                  if (newValue === '' && !showSuggestions) {
                    setShowSuggestions(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={
                  attachedImage
                    ? (locale === 'ko' ? "이미지에 대해 설명해주세요..." : "Describe the image...")
                    : (locale === 'ko' ? "오늘 어떤 도움을 드릴까요?" : "Message Claude...")
                }
                className="w-full py-2 resize-none outline-none focus:outline-none focus:ring-0 border-0 bg-transparent text-[15px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 max-h-32"
                rows={1}
                style={{
                  minHeight: '28px',
                  height: 'auto',
                  boxShadow: 'none'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
                disabled={isProcessing || isTyping}
              />
            </div>

            {/* 오른쪽 버튼 그룹 */}
            <div className="flex items-center gap-1.5 pr-2 self-end">
              {/* 음성 입력 버튼 */}
              <button
                onClick={handleVoiceToggle}
                className={`p-2 rounded-xl transition-all ${
                  isRecording
                    ? 'text-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800/50'
                }`}
                disabled={isProcessing || isTyping}
                title={locale === 'ko' ? '음성 입력' : 'Voice input'}
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* 전송 버튼 */}
              <button
                onClick={() => {
                  if (isProcessing || isTyping) {
                    // 정지 기능 추가 가능
                    return;
                  }
                  handleSubmit();
                }}
                disabled={!inputValue.trim() && !attachedImage}
                className={`flex items-center justify-center p-2 rounded-xl transition-all duration-200 ${
                  isProcessing || isTyping
                    ? 'bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100'
                    : (!inputValue.trim() && !attachedImage)
                      ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                      : 'bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100'
                }`}
              >
                <div className="relative w-5 h-5">
                  {/* 화살표에서 정지 버튼으로 변환 애니메이션 */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
                    isProcessing || isTyping ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
                  }`}>
                    <ArrowUp className={`w-5 h-5 ${
                      (!inputValue.trim() && !attachedImage)
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-white dark:text-gray-900'
                    }`} />
                  </div>

                  {/* 정지 버튼 */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
                    isProcessing || isTyping ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}>
                    <Square className="w-4 h-4 text-white dark:text-gray-900 fill-current" />
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 입력 도움말 - 필요시만 표시 */}
          {inputValue.length > 3000 && (
            <div className="flex items-center justify-end mt-1 px-2 text-xs text-gray-400 dark:text-gray-500">
              <span>{inputValue.length} / 4000</span>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleImageUpload(file);
            }
          }}
        />

        {/* Claude 스타일 제안 버튼들 */}
        {showSuggestions && suggestions && suggestions.length > 0 ? (
          <div className="mt-3 relative z-50">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {locale === 'ko' ? '빠른 작업' : 'Quick actions'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={async () => {
                    // Track the click for AI learning
                    try {
                      await fetch('/api/ai/track-suggestion-click', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          suggestionText: suggestion.text,
                          category: (suggestion as any).category || suggestion.type || 'unknown',
                          priority: suggestion.priority || 5,
                          locale: locale || 'ko',
                          sessionId: sessionId || 'anonymous',
                          contextInfo: {
                            timeOfDay: new Date().getHours() >= 6 && new Date().getHours() < 12 ? 'morning' :
                                      new Date().getHours() >= 12 && new Date().getHours() < 18 ? 'afternoon' :
                                      new Date().getHours() >= 18 && new Date().getHours() < 22 ? 'evening' : 'night',
                            hasEvents: events.length > 0,
                            lastAIResponse: propLastAIResponse?.message || undefined,
                            position: suggestions.findIndex(s => s.id === suggestion.id) + 1
                          },
                          action: 'clicked'
                        })
                      });
                    } catch (error) {
                      // Ignore tracking errors - don't impact user experience
                      console.debug('[Quick Actions] Failed to track click:', error);
                    }

                    // Populate input field with suggestion text
                    setInputValue(suggestion.text);
                    // Temporarily hide suggestions while user edits
                    setShowSuggestions(false);
                    // Focus the input field so user can review/edit before sending
                    setTimeout(() => {
                      const inputElement = document.querySelector('textarea') as HTMLTextAreaElement;
                      if (inputElement) {
                        inputElement.focus();
                        // Move cursor to end of text
                        inputElement.setSelectionRange(suggestion.text.length, suggestion.text.length);
                        // Add brief highlight effect to show text was populated
                        inputElement.style.transition = 'background-color 0.3s';
                        inputElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; // Light blue highlight
                        setTimeout(() => {
                          inputElement.style.backgroundColor = '';
                        }, 300);
                      }
                    }, 50); // Small delay to ensure DOM updates
                    // Don't submit automatically - let user review and press Enter or click Send
                  }}
                  className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                  disabled={isProcessing || isTyping || loadingSuggestions}
                >
                  {suggestion.type === 'create' && <Plus className="w-3.5 h-3.5 text-green-500" />}
                  {suggestion.type === 'view' && <Calendar className="w-3.5 h-3.5 text-blue-500" />}
                  {suggestion.type === 'analyze' && <Sparkles className="w-3.5 h-3.5 text-purple-500" />}
                  {suggestion.type === 'image' && <Camera className="w-3.5 h-3.5 text-orange-500" />}
                  {suggestion.type === 'friend' && <User className="w-3.5 h-3.5 text-pink-500" />}
                  <span className="text-gray-700 dark:text-gray-300">{suggestion.text}</span>
                </button>
              ))}
              {loadingSuggestions && (
                <div className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl animate-pulse flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
                  <div className="w-20 h-3 bg-gray-300 dark:bg-gray-600 rounded" />
                </div>
              )}
            </div>
          </div>
        ) : showSuggestions && !loadingSuggestions ? (
          <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg">
            {locale === 'ko' ? '제안을 불러오는 중...' : 'Loading suggestions...'}
          </div>
        ) : null}
      </div>
    </div>
  );
}