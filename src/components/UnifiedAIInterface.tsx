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
  Bot
} from 'lucide-react';
import { useToastContext } from '@/providers/ToastProvider';
import Image from 'next/image';

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

interface UnifiedAIInterfaceProps {
  onSubmit?: (text: string, imageData?: string) => Promise<{ message?: string; action?: any; success?: boolean } | void>;
  className?: string;
  autoFocus?: boolean;
  isProcessing?: boolean;
  locale?: 'ko' | 'en';
  sessionId?: string;
  focusLevel?: 'background' | 'medium' | 'focus';
  onFocusLevelChange?: (level: 'background' | 'medium' | 'focus') => void;
  initialMessages?: Message[];
}


export function UnifiedAIInterface({ 
  onSubmit, 
  className = '', 
  autoFocus = false, 
  isProcessing = false,
  locale = 'ko',
  sessionId = `session-${Date.now()}`,
  focusLevel = 'medium',
  onFocusLevelChange,
  initialMessages = []
}: UnifiedAIInterfaceProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToastContext();

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
        console.log('[UnifiedAIInterface] Loading previous chat with', initialMessages.length, 'messages');
      }
    }
  }, [initialMessages]);

  // Fetch AI-powered suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        // Prepare recent messages for context
        const recentMessages = messages.slice(-5).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        const response = await fetch('/api/ai/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            locale,
            sessionId,
            recentMessages
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.data?.suggestions || []);
        } else {
          // Fallback suggestions if API fails
          setSuggestions(getFallbackSuggestions());
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions(getFallbackSuggestions());
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
    
    // Refresh suggestions when messages change or every 5 minutes
    const interval = setInterval(fetchSuggestions, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [locale, sessionId, messages]);

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
    
    // Default fallback suggestions
    return locale === 'ko' ? [
      "오늘 일정 보여줘",
      "내일 오후 3시 회의 추가",
      "이번주 일정 확인",
      "다음주 계획 정리",
      "중요한 일정 알려줘"
    ] : [
      "Show today's schedule",
      "Add meeting tomorrow at 3pm",
      "Check this week",
      "Plan next week",
      "Show important events"
    ];
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
    if (!query.trim() || isProcessing) return;
    
    // Show chat history immediately when user sends a message
    setShowChatHistory(true);
    
    // Don't add user message locally - let AIOverlayDashboard handle all message storage
    setInputValue('');
    setShowSuggestions(false);
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
        const response = await onSubmit(query);
        
        // Process the response - don't store locally, let AIOverlayDashboard handle it
        setTimeout(() => {
          setIsTyping(false);
          // Messages will be updated via initialMessages prop from AIOverlayDashboard
        }, 1500);
      } catch (error) {
        setIsTyping(false);
        // Error messages will be handled by AIOverlayDashboard
      }
    }
  }, [inputValue, isProcessing, onSubmit, locale, messages.length]);

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

  return (
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
                  <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 relative">
                    <Image
                      src="/images/logo.svg"
                      alt="Geulpi Logo"
                      fill
                      className="object-contain dark:invert"
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
                          <User className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        ) : (
                          <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 relative">
                            <Image
                              src="/images/logo.svg"
                              alt="Geulpi Logo"
                              fill
                              className="object-contain dark:invert"
                            />
                          </div>
                        )}
                      </div>
                      <div className={`px-3 py-2 sm:px-4 sm:py-3 md:px-5 md:py-4 rounded-lg sm:rounded-xl md:rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <div className="text-xs sm:text-sm md:text-base lg:text-base leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                        {message.action && (
                          <div className="mt-1 sm:mt-2 text-xs sm:text-xs md:text-sm opacity-70">
                            {message.action.status === 'completed' && '✓ '}
                            {message.action.type}
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
                    <div className="p-1 sm:p-2 md:p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 relative">
                        <Image
                          src="/images/logo.svg"
                          alt="Geulpi Logo"
                          fill
                          className="object-contain dark:invert"
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
        className={`relative flex flex-col gap-0 p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 rounded-xl sm:rounded-2xl md:rounded-3xl lg:rounded-3xl transition-all bg-white/95 dark:bg-black/95 backdrop-blur-2xl shadow-xl border ${
          isImportant 
            ? 'border-amber-500/30 ring-2 ring-amber-500/30' 
            : 'border-white/20 dark:border-white/10'
        } ${isFocused ? 'ring-2 ring-primary/60' : ''}`}
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 px-2 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2 md:py-3 lg:py-4">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(e.target.value.length === 0 && isFocused);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
              // 프롬프트창 클릭만으로는 대화창이 자동으로 열리지 않음
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isImportant 
              ? (locale === 'ko' ? "⭐ 중요한 일정을 입력하세요" : "⭐ Enter important event")
              : (locale === 'ko' ? "무엇이든 물어보세요" : "Ask me anything")}
            className="flex-1 bg-transparent outline-none text-sm sm:text-base md:text-lg lg:text-xl placeholder:text-muted-foreground/60 py-1 sm:py-2"
            disabled={isProcessing}
          />
        </div>
        
        <div className="h-px bg-border/20 mx-2 sm:mx-3 md:mx-4 lg:mx-5" />
        
        <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2 md:py-3 lg:py-4">
          <div className="flex items-center gap-1 sm:gap-2 md:gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 rounded-md sm:rounded-lg md:rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
              onClick={() => {
                if (messages.length > 0) {
                  setShowChatHistory(!showChatHistory);
                }
              }}
              disabled={messages.length === 0}
              title={locale === 'ko' ? '대화 기록' : 'Chat history'}
            >
              {showChatHistory ? (
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              ) : (
                <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              )}
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              className={`h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 rounded-md sm:rounded-lg md:rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center ${
                focusLevel !== 'background' ? 'bg-primary/10' : ''
              }`}
              onClick={() => {
                if (onFocusLevelChange) {
                  const nextLevel = 
                    focusLevel === 'background' ? 'medium' :
                    focusLevel === 'medium' ? 'focus' : 'background';
                  onFocusLevelChange(nextLevel);
                }
              }}
              title={
                locale === 'ko' 
                  ? `캘린더 투명도 (${focusLevel})` 
                  : `Calendar opacity (${focusLevel})`
              }
            >
              <Layers className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 ${
                focusLevel === 'focus' ? 'text-primary' :
                focusLevel === 'medium' ? 'text-primary/60' : ''
              }`} />
            </motion.button>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <motion.button
              onClick={() => setIsImportant(!isImportant)}
              className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1 md:py-2 rounded-full text-xs sm:text-xs md:text-sm font-medium transition-all ${
                isImportant 
                  ? "bg-amber-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {isImportant ? "⭐ " : ""}{locale === 'ko' ? "중요" : "Important"}
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 rounded-md sm:rounded-lg md:rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Camera className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
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
              className={`h-7 sm:h-8 md:h-9 lg:h-10 px-2 sm:px-3 md:px-4 rounded-md sm:rounded-lg md:rounded-lg ml-1 sm:ml-2 transition-all flex items-center justify-center ${
                isProcessing 
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-md"
                  : !inputValue.trim() 
                    ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600"
                    : "bg-primary hover:bg-primary/90 text-white shadow-md"
              }`}
              onClick={() => {
                if (!isProcessing) {
                  handleSubmit();
                }
              }}
              disabled={!inputValue.trim() && !isProcessing}
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
        {showSuggestions && !isProcessing && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="absolute top-full mt-6 sm:mt-7 md:mt-8 w-full z-40"
          >
            <div className="flex flex-wrap gap-2 items-center justify-center">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <motion.button
                  key={`${suggestion}-${index}`}
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/90 dark:bg-black/90 backdrop-blur-xl border border-white/20 hover:border-primary/30 hover:bg-white/95 dark:hover:bg-black/95 px-3 py-1.5 rounded-full text-xs text-center transition-all duration-200 hover:scale-105 hover:shadow-md whitespace-nowrap max-w-[180px] truncate"
                  onClick={() => {
                    setInputValue(suggestion);
                    setShowSuggestions(false);
                    handleSubmit(suggestion);
                  }}
                  title={suggestion} // Full text on hover
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Loading suggestions indicator */}
        {showSuggestions && !isProcessing && loadingSuggestions && suggestions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-6 sm:mt-7 md:mt-8 w-full z-40"
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
          if (file && onSubmit) {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = reader.result as string;
              const message = locale === 'ko' 
                ? '이 이미지에서 일정을 찾아줘' 
                : 'Find schedule in this image';
              
              await onSubmit(message, base64);
            };
            reader.readAsDataURL(file);
          }
        }}
      />

    </motion.div>
  );
}