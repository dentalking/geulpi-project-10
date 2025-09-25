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
import { useQuickActionTracking } from '@/hooks/useQuickActionTracking';
import { FEATURES } from '@/config/features';
import { getUserPatternService } from '@/services/ai/UserPatternLearningService';

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

interface AIActionResponse {
  type: 'create' | 'update' | 'delete' | 'list' | 'search' | 'friend_action' | 'create_multiple';
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  data?: {
    eventId?: string;
    eventIds?: string[];
    events?: ExtractedEvent[];
    friendAction?: string;
    [key: string]: any;
  };
}

interface AIResponse {
  message?: string;
  action?: AIActionResponse;
  events?: ExtractedEvent[];
  success?: boolean;
  eventsCount?: number;
  suggestions?: string[];
}

interface UnifiedAIInterfaceProps {
  onSubmit?: (text: string, imageData?: string) => Promise<AIResponse | void>;
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
}


export function UnifiedAIInterface({
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
  userPicture
}: UnifiedAIInterfaceProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true); // Start with suggestions visible
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ data: string; preview: string } | null>(null);
  const [lastAIResponse, setLastAIResponse] = useState<AIResponse | null>(null); // AI 응답 저장용
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastProcessedAIResponseRef = useRef<string>('');
  const { toast } = useToastContext();

  // Quick Action 추적 훅
  const { trackClick, trackDisplay } = useQuickActionTracking({
    batchMode: true,
    trackDisplay: FEATURES.QUICK_ACTION_TRACKING
  });

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-scroll to bottom when new messages arrive or chat history opens
  useEffect(() => {
    if (showChatHistory) {
      // 약간의 지연을 주어 DOM이 렌더링된 후 스크롤
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, showChatHistory]);

  // Initialize messages from props
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
      // 과거 채팅 로드 시 자동으로 히스토리 표시 (환영 메시지만 있으면 표시 안함)
      const hasUserMessages = initialMessages.some(msg => msg.role === 'user');
      if (hasUserMessages) {
        setShowChatHistory(true);
        // Loading previous chat
      }
    }
  }, [initialMessages]);

  // Initialize with fallback suggestions on mount
  useEffect(() => {
    if (suggestions.length === 0) {
      const fallbackSuggestions = locale === 'ko' ? [
        "오늘 일정 확인해줘",
        "내일 회의 일정 추가",
        "이번주 일정 정리해줘",
        "사진에서 일정 추출하기",
        "친구와 미팅 잡기"
      ] : [
        "Show today's schedule",
        "Add meeting tomorrow",
        "Review this week's events",
        "Extract schedule from photo",
        "Schedule meeting with friend"
      ];
      setSuggestions(fallbackSuggestions);
      setShowSuggestions(true);
    }
  }, [locale, suggestions.length]);

  // Fetch AI-powered suggestions with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isSubscribed = true;

    const fetchSuggestions = async () => {
      if (!isSubscribed) return;

      // Check rate limiting
      const rateLimitCheck = apiRateLimitManager.canMakeRequest('/api/ai/suggestions');
      if (!rateLimitCheck.allowed) {
        console.log(`Suggestions API rate limited. Wait ${rateLimitCheck.waitTime}s`);
        setSuggestions(getFallbackSuggestions());
        return;
      }

      setLoadingSuggestions(true);
      try {
        // Prepare recent messages for context
        const recentMessages = messages.slice(-5).map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        // Debug logging removed to reduce console noise

        const response = await fetch('/api/ai/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            locale,
            sessionId,
            recentMessages,
            lastAIResponse // AI 응답 후 follow-up suggestion 생성을 위해 추가
          })
        });

        if (response.status === 429) {
          // Rate limited - record it and use fallback
          const retryAfterHeader = response.headers.get('Retry-After');
          const retrySeconds = retryAfterHeader ? parseInt(retryAfterHeader) : undefined;
          apiRateLimitManager.recordRateLimit('/api/ai/suggestions', retrySeconds);
          console.log('Suggestions API rate limited, using fallback');
          setSuggestions(getFallbackSuggestions());
          setShowSuggestions(true);
          return;
        }

        if (response.ok) {
          // Record successful request
          apiRateLimitManager.recordSuccess('/api/ai/suggestions');

          const data = await response.json();
          console.log('[UnifiedAI] Received suggestions:', {
            count: data.data?.suggestions?.length || 0,
            suggestions: data.data?.suggestions || [],
            showSuggestions: showSuggestions
          });
          // Received suggestions
          if (isSubscribed) {
            const receivedSuggestions = data.data?.suggestions || [];
            console.log('[UnifiedAI] Setting suggestions:', receivedSuggestions);
            setSuggestions(receivedSuggestions);
            // Always show suggestions when we have them
            setShowSuggestions(true);

            // Track suggestions display
            if (FEATURES.QUICK_ACTION_TRACKING && receivedSuggestions.length > 0) {
              trackDisplay(receivedSuggestions.map((s, idx) => ({
                text: s,
                category: getSuggestionCategory(s)
              })));
            }
          }
        } else {
          // Fallback suggestions if API fails
          const fallback = getFallbackSuggestions();
          console.log('[UnifiedAI] Using fallback suggestions:', fallback);
          setSuggestions(fallback);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        const fallback = getFallbackSuggestions();
        console.log('[UnifiedAI] Using fallback suggestions after error:', fallback);
        setSuggestions(fallback);
        setShowSuggestions(true);
      } finally {
        if (isSubscribed) {
          setLoadingSuggestions(false);
        }
      }
    };

    // Initial suggestions - immediate load on mount
    if (suggestions.length === 0) {
      // First load - immediate
      fetchSuggestions();
    } else {
      // Subsequent updates - wait longer
      timeoutId = setTimeout(fetchSuggestions, 30000); // 30초 대기
    }

    // Don't refresh on every message change - only on mount and locale/session change
    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
    };
  }, [locale, sessionId]); // Removed lastAIResponse to prevent suggestion loops

  // Separate effect for periodic refresh (much less frequent)
  useEffect(() => {
    // Only refresh when user is idle for a while
    const interval = setInterval(() => {
      // Only fetch if not already loading and no recent activity
      if (!loadingSuggestions && !isTyping && !inputValue) {
        // Silent background refresh for idle users
        console.log('[UnifiedAI] Background refresh for idle state');
        setSuggestions(getFallbackSuggestions()); // Use fallback for periodic refresh
      }
    }, 5 * 60 * 1000); // 5 minutes for idle refresh

    return () => clearInterval(interval);
  }, [loadingSuggestions, isTyping, inputValue]);

  // Separate effect for follow-up suggestions after AI responses
  useEffect(() => {
    if (!lastAIResponse?.content) return;

    // Check if we've already processed this AI response
    const currentResponse = lastAIResponse.content;
    if (lastProcessedAIResponseRef.current === currentResponse) return;

    // Mark this response as processed
    lastProcessedAIResponseRef.current = currentResponse;

    // Generate follow-up suggestions after a delay
    const followUpTimeout = setTimeout(() => {
      // Trigger a fresh suggestions fetch with follow-up context
      setSuggestions([]); // Clear current suggestions to trigger fresh fetch
    }, 3000); // 3 second delay for follow-up suggestions

    return () => clearTimeout(followUpTimeout);
  }, [lastAIResponse?.content]);

  // Helper function to get suggestion category for tracking
  const getSuggestionCategory = (suggestion: string): string => {
    const meta = getSuggestionMeta(suggestion);
    return meta.category;
  };

  // Helper function to get suggestion icon and category
  const getSuggestionMeta = (suggestion: string) => {
    const lowerSuggestion = suggestion.toLowerCase();
    const isKorean = locale === 'ko';

    // Check for time-related keywords
    if (
      lowerSuggestion.includes(isKorean ? '오늘' : 'today') ||
      lowerSuggestion.includes(isKorean ? '내일' : 'tomorrow') ||
      lowerSuggestion.includes(isKorean ? '어제' : 'yesterday')
    ) {
      return { icon: Clock, color: 'text-blue-500', category: 'time' };
    }

    // Check for calendar/schedule keywords
    if (
      lowerSuggestion.includes(isKorean ? '일정' : 'schedule') ||
      lowerSuggestion.includes(isKorean ? '캘린더' : 'calendar') ||
      lowerSuggestion.includes(isKorean ? '주' : 'week')
    ) {
      return { icon: CalendarDays, color: 'text-purple-500', category: 'calendar' };
    }

    // Check for add/create keywords
    if (
      lowerSuggestion.includes(isKorean ? '추가' : 'add') ||
      lowerSuggestion.includes(isKorean ? '생성' : 'create') ||
      lowerSuggestion.includes(isKorean ? '만들' : 'make')
    ) {
      return { icon: Plus, color: 'text-green-500', category: 'create' };
    }

    // Check for check/review keywords
    if (
      lowerSuggestion.includes(isKorean ? '확인' : 'check') ||
      lowerSuggestion.includes(isKorean ? '검토' : 'review') ||
      lowerSuggestion.includes(isKorean ? '보' : 'show')
    ) {
      return { icon: CheckCircle, color: 'text-indigo-500', category: 'check' };
    }

    // Default
    return { icon: Sparkles, color: 'text-amber-500', category: 'suggestion' };
  };

  const getFallbackSuggestions = () => {
    // If we have messages, provide context-aware fallbacks
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Check if last message mentions specific topics
      if (lastMessage.content.includes('팁스') || lastMessage.content.includes('TIPS') || 
          lastMessage.content.includes('창업') || lastMessage.content.includes('startup')) {
        return locale === 'ko' ? [
          "지원 자격 조건이 어떻게 되나요?",
          "신청 마감일이 언제인가요?",
          "필요한 서류는 뭐가 있나요?",
          "선정 절차는 어떻게 진행되나요?",
          "지원 혜택은 무엇인가요?"
        ] : [
          "What are the eligibility requirements?",
          "When is the application deadline?",
          "What documents are needed?",
          "How does the selection process work?",
          "What are the benefits?"
        ];
      }
    }
    
    // Smart fallback suggestions based on time of day
    const now = new Date();
    const hour = now.getHours();

    if (hour < 12) {
      // Morning suggestions
      return locale === 'ko' ? [
        "오늘 일정 보여줘",
        "오늘 중요한 일정 알려줘",
        "이번 주 회의 일정 확인",
        "오늘 해야 할 일 정리",
        "내일 일정 미리보기"
      ] : [
        "Show today's schedule",
        "What's important today?",
        "Check this week's meetings",
        "Today's tasks",
        "Preview tomorrow"
      ];
    } else if (hour < 18) {
      // Afternoon suggestions
      return locale === 'ko' ? [
        "오늘 남은 일정 확인",
        "내일 일정 준비하기",
        "이번 주 남은 회의",
        "다음 일정까지 시간",
        "오늘 일정 정리"
      ] : [
        "Check remaining schedule",
        "Prepare for tomorrow",
        "Remaining meetings this week",
        "Time until next event",
        "Wrap up today"
      ];
    } else {
      // Evening suggestions
      return locale === 'ko' ? [
        "내일 일정 확인",
        "이번 주 정리하기",
        "다음 주 계획 세우기",
        "중요한 일정 알림 설정",
        "오늘 하루 요약"
      ] : [
        "Check tomorrow's schedule",
        "Week summary",
        "Plan next week",
        "Set important reminders",
        "Today's summary"
      ];
    }
  };

  const addMessage = (role: Message['role'], content: string, action?: Message['action']) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
      timestamp: new Date(),
      action
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Always show chat history when adding messages
    setShowChatHistory(true);
    
    // Trigger suggestions refresh after assistant response
    if (role === 'assistant') {
      setTimeout(() => {
        // Suggestions will auto-refresh due to messages dependency in useEffect
      }, 500);
    }
  };

  const handleSubmit = useCallback(async (text?: string) => {
    const query = text || inputValue;

    // Check if we have text or image to send
    if (!query.trim() && !attachedImage) return;
    if (isProcessing) return;

    // Show chat history immediately when user sends a message
    setShowChatHistory(true);

    // Clear the input
    setInputValue('');
    // Keep suggestions visible after sending message
    setIsImportant(false);

    // Show typing indicator
    setIsTyping(true);

    // Determine if this is a CRUD operation
    const isCrudOperation =
      query.includes('추가') || query.includes('생성') ||
      query.includes('수정') || query.includes('변경') ||
      query.includes('삭제') || query.includes('제거') ||
      query.includes('add') || query.includes('create') ||
      query.includes('update') || query.includes('edit') ||
      query.includes('delete') || query.includes('remove');

    if (onSubmit) {
      try {
        let response;

        // If there's an attached image, send it with the message
        if (attachedImage) {
          const message = query || (locale === 'ko'
            ? '이 이미지에서 일정을 찾아줘'
            : 'Find schedule in this image');

          response = await onSubmit(message, attachedImage.data);

          // Clear the attached image after sending
          setAttachedImage(null);

          // Store AI response for follow-up suggestions (이미지 업로드 case)
          if (response && response.message) {
            // Store AI response for follow-up (image case)
            setLastAIResponse(response);
            // Clear lastAIResponse after 30 seconds to prevent perpetual follow-up suggestions
            setTimeout(() => {
              setLastAIResponse(null);
            }, 30 * 1000); // 30초 후 클리어
          }

          // Check if response contains multiple events
          if (response && response.action && response.action.type === 'create_multiple') {
            const events = response.action.data.events.map((e: any) => ({
              ...e,
              selected: true // Pre-select all by default
            }));
            setExtractedEvents(events);
            setShowEventSelector(true);
          }
        } else {
          response = await onSubmit(query);
        }

        // Store AI response for follow-up suggestions
        if (response && response.message) {
          setLastAIResponse(response);
          // Immediately show suggestions after AI response
          setShowSuggestions(true);

          // Don't clear suggestions - let them update smoothly
          // The useEffect will trigger a re-fetch automatically

          // Clear lastAIResponse after 30 seconds to prevent perpetual follow-up suggestions
          setTimeout(() => {
            setLastAIResponse(null);
          }, 30 * 1000); // 30초 후 클리어
        }

        // Process the response - don't store locally, let AIOverlayDashboard handle it
        // Immediately set typing to false and show suggestions
        setIsTyping(false);
        setShowSuggestions(true);
      } catch (error) {
        setIsTyping(false);
        // Error messages will be handled by AIOverlayDashboard
      }
    }
  }, [inputValue, isProcessing, onSubmit, locale, messages.length, attachedImage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceToggle = () => {
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
          toast.error(locale === 'ko' ? '음성 인식 실패' : 'Speech recognition failed');
        };
        
        recognition.onend = () => {
          setIsRecording(false);
        };
      } else {
        recognition.stop();
        setIsRecording(false);
      }
    } else {
      toast.warning(
        locale === 'ko' 
          ? '음성 인식이 지원되지 않는 브라우저입니다.' 
          : 'Speech recognition is not supported in this browser.'
      );
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowChatHistory(false);
  };

  const handleEventSelection = (index: number) => {
    setExtractedEvents(prev => prev.map((event, i) =>
      i === index ? { ...event, selected: !event.selected } : event
    ));
  };

  const handleConfirmEvents = async () => {
    const selectedEvents = extractedEvents.filter(e => e.selected);
    if (selectedEvents.length === 0) {
      toast.warning(
        locale === 'ko'
          ? '등록할 일정을 선택해주세요'
          : 'Please select events to register'
      );
      return;
    }

    // Submit selected events as a structured command
    if (onSubmit) {
      // Create a structured message for each event
      const eventsDetails = selectedEvents.map(e => {
        let details = `제목: ${e.title}`;
        details += `, 날짜: ${e.date}`;
        if (e.time) details += `, 시간: ${e.time}`;
        if (e.location) details += `, 장소: ${e.location}`;
        if (e.description) details += `, 설명: ${e.description}`;
        return details;
      });

      const message = locale === 'ko'
        ? `다음 ${selectedEvents.length}개의 일정을 등록해주세요:\n${eventsDetails.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
        : `Please register the following ${selectedEvents.length} events:\n${eventsDetails.map((d, i) => `${i + 1}. ${d}`).join('\n')}`;

      toast.info(
        locale === 'ko'
          ? `${selectedEvents.length}개의 일정을 등록 중입니다...`
          : `Registering ${selectedEvents.length} events...`
      );

      await onSubmit(message);
      setShowEventSelector(false);
      setExtractedEvents([]);
    }
  };

  const handleCancelEvents = () => {
    setShowEventSelector(false);
    setExtractedEvents([]);
    toast.info(
      locale === 'ko'
        ? '일정 등록이 취소되었습니다'
        : 'Event registration cancelled'
    );
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;

    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check if the item is an image
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // Prevent default paste behavior for images

        const file = item.getAsFile();
        if (file) {
          // Convert to base64 and store in state
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;

            // Create a smaller preview URL
            setAttachedImage({
              data: base64,
              preview: base64 // Same as data for now, could be optimized
            });

            // Show a toast notification that image is attached
            toast.success(
              locale === 'ko'
                ? '이미지가 첨부되었습니다'
                : 'Image attached'
            );
          };
          reader.readAsDataURL(file);
        }
        break; // Only process the first image
      }
    }
  };

  return (
    <>
      {/* Event Selector Modal */}
      <AnimatePresence>
        {showEventSelector && extractedEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold">
                  {locale === 'ko' ? '추출된 일정 확인' : 'Extracted Events'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {locale === 'ko'
                    ? '등록할 일정을 선택해주세요'
                    : 'Select events to register'}
                </p>
              </div>

              <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
                {extractedEvents.map((event, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      event.selected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => handleEventSelection(index)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                        event.selected
                          ? 'bg-primary border-primary'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {event.selected && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{event.title}</h4>
                        <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{event.date}</span>
                            {event.time && (
                              <>
                                <Clock className="w-4 h-4 ml-2" />
                                <span>{event.time}</span>
                              </>
                            )}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.description && (
                            <p className="mt-2 text-gray-500">{event.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={handleCancelEvents}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  {locale === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmEvents}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {locale === 'ko'
                    ? `선택한 ${extractedEvents.filter(e => e.selected).length}개 등록`
                    : `Register ${extractedEvents.filter(e => e.selected).length} selected`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className={`relative w-full ${className}`}
        animate={{
          y: showChatHistory && messages.length > 0 ? 150 : 0
        }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20
        }}
      >
      {/* Chat History Dropdown/Dropup */}
      <AnimatePresence>
        {showChatHistory && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="absolute bottom-full mb-3 sm:mb-4 md:mb-5 w-full max-h-[40vh] sm:max-h-[45vh] md:max-h-[50vh] lg:max-h-[45vh] overflow-hidden"
          >
            <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl rounded-xl sm:rounded-2xl md:rounded-2xl border border-white/20 shadow-2xl overflow-y-auto max-h-[40vh] sm:max-h-[45vh] md:max-h-[50vh] lg:max-h-[45vh]">
              <div className="sticky top-0 z-10 flex items-center justify-between p-3 sm:p-4 md:p-5 lg:p-6 border-b border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur">
                <h3 className="text-sm sm:text-sm md:text-base lg:text-lg font-semibold flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 relative bg-white dark:bg-gray-700 rounded p-0.5 shadow-sm">
                    <Image
                      src="/images/logo.svg"
                      alt="Geulpi Logo"
                      fill
                      className="object-contain p-[1px]"
                      style={{
                        filter: 'brightness(0.8) contrast(1.2)'
                      }}
                    />
                  </div>
                  {locale === 'ko' ? 'AI 대화' : 'AI Chat'}
                </h3>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={clearChat}
                    className="p-1 sm:p-2 md:p-2 rounded-md sm:rounded-lg md:rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={locale === 'ko' ? '대화 지우기' : 'Clear chat'}
                  >
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  </button>
                  <button
                    onClick={() => setShowChatHistory(false)}
                    className="p-1 sm:p-2 md:p-2 rounded-md sm:rounded-lg md:rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-3 sm:p-4 md:p-5 lg:p-6 space-y-3 sm:space-y-4 md:space-y-5">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-2 sm:gap-3 md:gap-4 max-w-[90%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%] ${
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}>
                      <div className={`p-1 sm:p-2 md:p-2 rounded-full flex-shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {message.role === 'user' ? (
                          userPicture ? (
                            <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 relative">
                              <Image
                                src={userPicture}
                                alt="User"
                                fill
                                className="object-cover rounded-full"
                              />
                            </div>
                          ) : (
                            <User className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                          )
                        ) : (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 relative bg-white dark:bg-gray-700 rounded-full p-0.5 shadow-sm">
                            <Image
                              src="/images/logo.svg"
                              alt="Geulpi Logo"
                              fill
                              className="object-contain p-[1px]"
                              style={{
                                filter: 'brightness(0.8) contrast(1.2)'
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-2 sm:px-4 sm:py-3 md:px-5 md:py-4 rounded-lg sm:rounded-xl md:rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground dark:text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      }`}>
                        <div className="text-xs sm:text-sm md:text-base lg:text-base leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                        {/* Hide action type display - it's already explained in the message content */}
                        {message.action && message.action.status === 'completed' && (
                          <div className="mt-1 sm:mt-2 text-xs sm:text-xs md:text-sm opacity-70">
                            ✓ {locale === 'ko' ? '완료됨' : 'Completed'}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm md:text-base text-muted-foreground pl-1 sm:pl-2"
                  >
                    <div className="p-1 sm:p-2 md:p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 relative bg-gray-50 dark:bg-gray-600 rounded p-0.5">
                        <Image
                          src="/images/logo.svg"
                          alt="Geulpi Logo"
                          fill
                          className="object-contain"
                          style={{
                            filter: 'brightness(0.8) contrast(1.2)'
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <span className="animate-bounce">●</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                      <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                    </div>
                  </motion.div>
                )}
                
                <div ref={chatEndRef} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Bar */}
      <motion.div
        className={`relative flex flex-col gap-0 p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 rounded-xl sm:rounded-2xl md:rounded-3xl lg:rounded-3xl transition-all bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-xl border border-white/20 dark:border-white/10`}
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
      >
        {/* Image Preview */}
        <AnimatePresence>
          {attachedImage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-2 sm:px-3 md:px-4 lg:px-5 py-2 border-b border-border/20 overflow-hidden"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="relative inline-block group"
              >
                <img
                  src={attachedImage.preview}
                  alt="Attached"
                  className="h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-lg shadow-sm"
                />
                <button
                  onClick={() => {
                    setAttachedImage(null);
                    toast.info(
                      locale === 'ko'
                        ? '이미지가 제거되었습니다'
                        : 'Image removed'
                    );
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs px-2 py-1 rounded-b-lg">
                  {locale === 'ko' ? '이미지' : 'Image'}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 px-2 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2 md:py-3 lg:py-4">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              // Always show suggestions when they exist
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
              // 프롬프트창 클릭만으로는 대화창이 자동으로 열리지 않음
            }}
            onBlur={() => {
              setIsFocused(false);
              // Don't hide suggestions on blur - keep them visible for better UX
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={locale === 'ko' ? "메시지를 입력하세요..." : "Type a message..."}
            className="flex-1 bg-transparent outline-none text-sm sm:text-base md:text-lg lg:text-xl placeholder:text-muted-foreground/60 py-1 sm:py-2"
            disabled={isProcessing}
          />
        </div>
        
        <div className="h-px bg-border/20 mx-2 sm:mx-3 md:mx-4 lg:mx-5" />
        
        <div className="flex items-center justify-end px-2 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2 md:py-3 lg:py-4">
          <div className="flex items-center gap-1 sm:gap-2">
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 rounded-md sm:rounded-lg md:rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center relative"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Camera className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 ${attachedImage ? 'text-primary' : ''}`} />
              {attachedImage && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              )}
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              className={`h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 rounded-md sm:rounded-lg md:rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center ${
                isRecording ? "bg-red-500/10" : ""
              }`}
              onClick={handleVoiceToggle}
              disabled={isProcessing}
            >
              <Mic className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 ${isRecording ? "text-red-500 animate-pulse" : ""}`} />
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              className={`h-7 sm:h-8 md:h-9 lg:h-10 px-2 sm:px-3 md:px-4 rounded-xl sm:rounded-2xl md:rounded-2xl ml-1 sm:ml-2 transition-all flex items-center justify-center ${
                isProcessing
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-md"
                  : !inputValue.trim() && !attachedImage
                    ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                    : "bg-primary hover:bg-primary/90 text-white shadow-md"
              }`}
              onClick={() => {
                if (!isProcessing) {
                  handleSubmit();
                }
              }}
              disabled={(!inputValue.trim() && !attachedImage) || isProcessing}
            >
              {isProcessing ? (
                <Square className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              ) : (
                <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Horizontal Suggestions Below Prompt */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="mt-4 w-full z-40"
          >
            {/* Simple indicator for follow-up suggestions */}
            {lastAIResponse && (
              <div className="text-center mb-2">
                <span className="text-xs text-muted-foreground/70">
                  {locale === 'ko' ? '💡 추천 응답' : '💡 Suggested responses'}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2 items-center justify-center">
              {suggestions.slice(0, 5).map((suggestion, index) => {
                const { icon: Icon, color, category } = getSuggestionMeta(suggestion);
                return (
                  <motion.button
                    key={`${suggestion}-${index}`}
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      delay: index * 0.05,
                      type: "spring",
                      stiffness: 400,
                      damping: 20
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 hover:border-primary/30 hover:bg-white/95 dark:hover:bg-black/95 px-3 py-1.5 rounded-full text-xs transition-all duration-200 hover:shadow-lg whitespace-nowrap max-w-[200px] flex items-center gap-1.5 overflow-hidden"
                    onClick={async () => {
                      setInputValue(suggestion);
                      // Keep suggestions visible when clicked

                      // Clear lastAIResponse when a follow-up suggestion is clicked
                      // This prevents staying in follow-up mode forever
                      if (lastAIResponse) {
                        // Clear lastAIResponse after suggestion click
                        setLastAIResponse(null);
                      }

                      // Track suggestion click with new tracking system
                      if (FEATURES.QUICK_ACTION_TRACKING) {
                        trackClick(
                          suggestion,
                          category,
                          index + 1, // position (1-based)
                          {
                            locale,
                            lastAIResponse: lastAIResponse?.content
                          }
                        );
                      }

                      // Real-time learning: 실시간 패턴 학습 및 서버 기록
                      try {
                        const timeOfDay = new Date().getHours() < 12 ? 'morning' :
                                         new Date().getHours() < 18 ? 'afternoon' : 'evening';

                        // 1. 로컬 패턴 학습 (기존 기능 유지)
                        const patternService = getUserPatternService();
                        patternService.recordInteraction({
                          suggestionId: `${sessionId}-${suggestion}-${Date.now()}`,
                          suggestionType: category as any,
                          action: 'accepted',
                          timestamp: new Date(),
                          timeOfDay: timeOfDay as any,
                          context: {
                            locale,
                            hasLastAIResponse: !!lastAIResponse,
                            position: index + 1
                          }
                        });

                        // 2. 실시간 서버 기록 (Phase 5: 새로운 기능)
                        fetch('/api/ai/track-suggestion-click', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            suggestionText: suggestion,
                            category: category,
                            priority: Math.floor(Math.random() * 5) + 5, // 임시 우선순위
                            locale: locale,
                            sessionId: sessionId,
                            contextInfo: {
                              timeOfDay: timeOfDay,
                              hasEvents: currentEvents && currentEvents.length > 0,
                              lastAIResponse: lastAIResponse?.content,
                              position: index + 1
                            },
                            action: 'clicked'
                          })
                        })
                        .then(response => response.json())
                        .then(data => {
                          console.log('[Real-time Learning] Server tracking successful:', {
                            suggestion: suggestion.substring(0, 20),
                            realTimeLearning: data.realTimeLearning,
                            timestamp: data.timestamp
                          });
                        })
                        .catch(error => {
                          console.warn('[Real-time Learning] Server tracking failed (non-critical):', error);
                          // 서버 기록 실패해도 사용자 경험에는 영향 없음
                        });

                        console.log('[Pattern Learning] Local and real-time learning initiated:', {
                          suggestion,
                          category,
                          timeOfDay,
                          realTimeEnabled: true
                        });
                      } catch (patternError) {
                        console.error('[Pattern Learning] Failed to record interaction:', patternError);
                      }

                      // Legacy tracking (will be removed later)
                      try {
                        fetch('/api/ai/suggestions/track', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            suggestion,
                            category,
                            locale,
                            sessionId,
                            timestamp: new Date().toISOString()
                          })
                        }).catch(err => console.error('Failed to track suggestion:', err));
                      } catch (error) {
                        // Silent fail - don't interrupt user flow
                      }

                      handleSubmit(suggestion);
                      // Refresh suggestions after a longer delay
                      setTimeout(() => {
                        setShowSuggestions(true);
                      }, 5000); // 5초 후 새로운 제안
                    }}
                    title={suggestion} // Full text on hover
                  >
                    <Icon className={`w-3 h-3 ${color} flex-shrink-0 transition-transform group-hover:rotate-12`} />
                    <span className="truncate">{suggestion}</span>
                    {/* Animated gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-700" />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
        
        {/* Loading suggestions indicator */}
        {showSuggestions && loadingSuggestions && suggestions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 w-full z-40"
          >
            <div className="flex items-center justify-center py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;

              // Store the image in state
              setAttachedImage({
                data: base64,
                preview: base64
              });

              // Show a toast notification that image is attached
              toast.success(
                locale === 'ko'
                  ? '이미지가 첨부되었습니다'
                  : 'Image attached'
              );
            };
            reader.readAsDataURL(file);

            // Clear the file input so the same file can be selected again
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }
        }}
      />

      </motion.div>
    </>
  );
}