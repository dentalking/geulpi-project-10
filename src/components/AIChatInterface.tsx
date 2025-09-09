'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, Camera, Sparkles, Calendar, Clock, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { chatStorage } from '@/utils/chatStorage';
import { ChatSession, AIMessage } from '@/types';
import { TypingAnimation } from './TypingAnimation';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  events?: any[];
  action?: {
    type: 'create' | 'update' | 'delete' | 'search' | 'list';
    data?: any;
  };
}

interface AIChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: string, type: 'text' | 'voice' | 'image') => void;
  onEventCreated?: (eventId?: string, eventData?: any) => void; // 일정 생성 성공 시 콜백 (이벤트 ID 및 데이터 포함)
  locale?: string;
  initialChatId?: string; // 특정 채팅을 불러오기 위한 ID
  userId?: string; // Google OAuth user ID
}

export function AIChatInterface({ isOpen, onClose, onSubmit, onEventCreated, locale = 'ko', initialChatId, userId }: AIChatInterfaceProps) {
  const [currentChatSession, setCurrentChatSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(
    locale === 'ko' 
      ? ['내일 3시 회의 추가해줘', '이번 주 일정 보여줘', '오늘 일정 확인']
      : ['Add meeting tomorrow at 3pm', 'Show this week schedule', 'Check today events']
  );
  const [lastExtractedEvent, setLastExtractedEvent] = useState<any>(null);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(Date.now().toString());
  const timezoneRef = useRef<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const router = useRouter();

  // 채팅 세션 초기화
  useEffect(() => {
    const initializeChatSession = async () => {
      console.log('AIChatInterface useEffect - isOpen:', isOpen, 'initialChatId:', initialChatId);
      
      if (isOpen) {
        // 이전 메시지 클리어 (새 세션을 로드하기 전에)
        setMessages([]);
        setIsProcessing(false);
        
        let chatSession: ChatSession;
        
        if (initialChatId) {
          console.log('Loading existing chat session with ID:', initialChatId);
          // 특정 채팅 불러오기
          const existingSession = await chatStorage.getSession(initialChatId);
          console.log('Found existing session:', existingSession);
          if (existingSession) {
            console.log('Session has', existingSession.messages?.length || 0, 'messages');
            chatSession = existingSession;
            await chatStorage.setActiveSession(initialChatId);
          } else {
            console.log('Session not found, creating new one');
            // 해당 채팅을 찾을 수 없으면 새로운 채팅 생성
            const newSession = await chatStorage.createSession('새 채팅', userId);
            if (newSession) {
              chatSession = newSession;
              await chatStorage.setActiveSession(chatSession.id);
            } else {
              console.error('Failed to create new session');
              return;
            }
          }
        } else {
          // 새로운 채팅 생성
          const newSession = await chatStorage.createSession('새 채팅', userId);
          if (newSession) {
            chatSession = newSession;
            await chatStorage.setActiveSession(chatSession.id);
          } else {
            console.error('Failed to create new session');
            return;
          }
        }
        
        setCurrentChatSession(chatSession);
        sessionIdRef.current = chatSession.id;
        
        // AIMessage를 Message로 변환 - 메시지가 있는 경우에만
        const convertedMessages: Message[] = chatSession.messages && chatSession.messages.length > 0 
          ? chatSession.messages.map(aiMsg => ({
              id: aiMsg.id,
              text: aiMsg.content,
              sender: aiMsg.role === 'assistant' ? 'ai' : 'user',
              timestamp: aiMsg.timestamp,
              events: aiMsg.data?.events || [],
              action: aiMsg.data?.action
            }))
          : [];
        
        console.log('Converted messages count:', convertedMessages.length);
        
        // 빈 채팅인 경우 초기 메시지 추가
        if (convertedMessages.length === 0) {
          console.log('No messages found, adding initial message');
          const initialMessage: Message = {
            id: 'initial',
            text: locale === 'ko' 
              ? '안녕하세요! 캘린더 관리를 도와드릴게요. 일정을 말씀해주시거나 스크린샷을 공유해주세요.'
              : 'Hi! I can help manage your calendar. Tell me about your schedule or share a screenshot.',
            sender: 'ai',
            timestamp: new Date()
          };
          convertedMessages.push(initialMessage);
          
          // 초기 메시지를 채팅 세션에도 저장 (새 세션인 경우에만)
          if (!initialChatId) {
            const aiMessage: AIMessage = {
              id: 'initial',
              role: 'assistant',
              content: initialMessage.text,
              timestamp: new Date(),
              type: 'text'
            };
            await chatStorage.addMessage(chatSession.id, aiMessage);
          }
        }
        
        setMessages(convertedMessages);
      } else {
        // 채팅창이 닫힐 때 상태 초기화
        setMessages([]);
        setCurrentChatSession(null);
        setInput('');
      }
    };

    initializeChatSession().catch(error => {
      console.error('Failed to initialize chat session:', error);
    });
  }, [isOpen, initialChatId, locale]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // 채팅 세션이 없으면 생성
    let sessionToUse = currentChatSession;
    if (!sessionToUse) {
      console.log('[AIChatInterface] No current session, creating new one with userId:', userId);
      const newSession = await chatStorage.createSession('새 채팅', userId);
      if (newSession) {
        setCurrentChatSession(newSession);
        sessionIdRef.current = newSession.id;
        await chatStorage.setActiveSession(newSession.id);
        sessionToUse = newSession;
        console.log('[AIChatInterface] Created new session:', newSession.id);
      } else {
        console.error('[AIChatInterface] Failed to create new session');
      }
    }
    
    // 사용자 메시지를 채팅 세션에 저장
    if (sessionToUse) {
      const userAIMessage: AIMessage = {
        id: newMessage.id,
        role: 'user',
        content: newMessage.text,
        timestamp: newMessage.timestamp,
        type: 'text'
      };
      try {
        const updatedSession = await chatStorage.addMessage(sessionToUse.id, userAIMessage);
        console.log('[AIChatInterface] Saved user message to session:', sessionToUse.id);
        if (updatedSession) {
          setCurrentChatSession(updatedSession);
        }
      } catch (error) {
        console.error('[AIChatInterface] Failed to save user message:', error);
      }
    } else {
      console.error('[AIChatInterface] No session available to save message');
    }
    
    const userInput = input;
    setInput('');
    setIsProcessing(true);
    
    try {
      // Call the unified chat/calendar API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 쿠키 전송을 위해 추가
        body: JSON.stringify({
          message: userInput,
          type: 'text',
          sessionId: sessionIdRef.current,
          locale: locale,
          timezone: timezoneRef.current,
          lastExtractedEvent: lastExtractedEvent,
        }),
      });

      const data = await response.json();
      
      // Handle the AI response with calendar actions
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message || (locale === 'ko' ? '죄송합니다. 요청을 처리할 수 없습니다.' : 'Sorry, I couldn\'t process your request.'),
        sender: 'ai',
        timestamp: new Date(),
        events: data.events,
        action: data.action
      };
      
      // Store extracted event for context
      if (data.action && data.action.type === 'create' && data.action.data) {
        setLastExtractedEvent(data.action.data);
      }
      
      setMessages(prev => [...prev, aiResponse]);
      setTypingMessageId(aiResponse.id);
      
      // AI 응답을 채팅 세션에 저장
      if (currentChatSession) {
        const assistantAIMessage: AIMessage = {
          id: aiResponse.id,
          role: 'assistant',
          content: aiResponse.text,
          timestamp: aiResponse.timestamp,
          type: 'text',
          data: {
            events: aiResponse.events,
            action: aiResponse.action
          }
        };
        try {
          const updatedSession = await chatStorage.addMessage(currentChatSession.id, assistantAIMessage);
          console.log('[AIChatInterface] Saved AI response to session:', currentChatSession.id);
          if (updatedSession) {
            setCurrentChatSession(updatedSession);
          }
        } catch (error) {
          console.error('[AIChatInterface] Failed to save AI response:', error);
        }
      } else {
        console.error('[AIChatInterface] No session available to save AI response');
      }
      
      // Update suggestions if provided
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }
      
      // If there's a successful action, refresh the calendar
      if (data.action && data.success) {
        // Call onEventCreated for smooth UI update
        if (['create', 'update', 'delete'].includes(data.action.type)) {
          if (onEventCreated) {
            onEventCreated();
          } else {
            // Fallback to normal submit and refresh
            onSubmit(userInput, 'text');
            setTimeout(() => {
              router.refresh();
            }, 1000);
          }
        } else {
          onSubmit(userInput, 'text');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: locale === 'ko' 
          ? '죄송합니다. 요청을 처리하는 중에 오류가 발생했습니다. 다시 시도해주세요.'
          : 'Sorry, there was an error processing your request. Please try again.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice input logic here
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    if (isProcessing) return;
    
    // Check image size (5MB limit)
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_IMAGE_SIZE) {
      console.error('[AIChatInterface] Image too large:', file.size);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: locale === 'ko'
          ? '이미지 크기가 너무 큽니다. 5MB 이하의 이미지를 사용해주세요.'
          : 'Image size is too large. Please use an image under 5MB.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
    // Add user message indicating image upload
    const newMessage: Message = {
      id: Date.now().toString(),
      text: locale === 'ko' ? '📸 이미지를 분석하고 있습니다...' : '📸 Analyzing image...',
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    
    // Save user message to database
    if (currentChatSession) {
      const userAIMessage: AIMessage = {
        id: newMessage.id,
        role: 'user',
        content: newMessage.text,
        timestamp: newMessage.timestamp,
        type: 'image'
      };
      await chatStorage.addMessage(currentChatSession.id, userAIMessage);
    }
    setIsProcessing(true);
    
    // Convert to base64 and send through unified API
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || file.type || 'image/png';
      
      console.log('[AIChatInterface] Image uploaded and converted to base64:', {
        base64Length: base64?.length,
        mimeType
      });
      
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // 쿠키 전송을 위해 추가
          body: JSON.stringify({
            type: 'image',
            imageData: base64,
            mimeType: mimeType,
            sessionId: sessionIdRef.current,
            locale: locale,
            timezone: timezoneRef.current,
          }),
        });

        const data = await response.json();
        
        // Handle the AI response
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: data.message || (locale === 'ko' ? '이미지에서 일정 정보를 추출했습니다.' : 'Extracted event information from the image.'),
          sender: 'ai',
          timestamp: new Date(),
          events: data.events,
          action: data.action
        };
        
        // Store extracted event for context
        if (data.action && data.action.type === 'create' && data.action.data) {
          setLastExtractedEvent(data.action.data);
        }
        
        setMessages(prev => [...prev, aiResponse]);
      setTypingMessageId(aiResponse.id);
        
        // Save AI response to database
        if (currentChatSession) {
          const aiAIMessage: AIMessage = {
            id: aiResponse.id,
            role: 'assistant',
            content: aiResponse.text,
            timestamp: aiResponse.timestamp,
            type: 'text',
            data: {
              events: aiResponse.events,
              action: aiResponse.action
            }
          };
          try {
            await chatStorage.addMessage(currentChatSession.id, aiAIMessage);
          } catch (error) {
            console.error('Failed to save AI message:', error);
          }
        }
        
        // Update suggestions if provided
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
        
        // If event was created/extracted, refresh calendar
        if (data.action && data.success) {
          // Don't call onSubmit for images - we handle it here
          if (['create', 'update', 'delete'].includes(data.action.type)) {
            // Call onEventCreated for smooth UI update
            if (onEventCreated) {
              onEventCreated(data.createdEventId, data.action?.data);
            } else {
              // Fallback to manual sync
              try {
                const syncResponse = await fetch(`/api/calendar/sync?sessionId=${sessionIdRef.current}`);
                const syncData = await syncResponse.json();
                if (syncData.success && onSubmit) {
                  // Call onSubmit to update parent component's events
                  onSubmit('', 'text');
                }
              } catch (syncError) {
                console.error('[AIChatInterface] Error syncing calendar:', syncError);
              }
              setTimeout(() => {
                router.refresh();
              }, 500);
            }
          }
        }
      } catch (error) {
        console.error('[AIChatInterface] Error processing uploaded image:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: locale === 'ko' 
            ? '이미지를 처리하는 중에 오류가 발생했습니다. 다시 시도해주세요.'
            : 'Error processing image. Please try again.',
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    console.log('[AIChatInterface] Paste event triggered');
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (!imageItem) {
      console.log('[AIChatInterface] No image found in clipboard');
      return;
    }
    
    if (isProcessing) return;
    
    console.log('[AIChatInterface] Image found:', imageItem.type);
    const blob = imageItem.getAsFile();
    if (!blob) return;
    
    // Check image size (5MB limit)
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    if (blob.size > MAX_IMAGE_SIZE) {
      console.error('[AIChatInterface] Image too large:', blob.size);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: locale === 'ko'
          ? '이미지 크기가 너무 큽니다. 5MB 이하의 이미지를 사용해주세요.'
          : 'Image size is too large. Please use an image under 5MB.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
    // Add user message indicating image paste
    const newMessage: Message = {
      id: Date.now().toString(),
      text: locale === 'ko' ? '📸 스크린샷을 분석하고 있습니다...' : '📸 Analyzing screenshot...',
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    setIsProcessing(true);
    
    // Convert to base64 and send through unified API
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || blob.type || 'image/png';
      
      console.log('[AIChatInterface] Image converted to base64:', {
        dataUrlLength: dataUrl.length,
        headerLength: header?.length,
        base64Length: base64?.length,
        base64Preview: base64?.substring(0, 100),
        mimeType
      });
      
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // 쿠키 전송을 위해 추가
          body: JSON.stringify({
            type: 'image',
            imageData: base64,
            mimeType: mimeType,
            sessionId: sessionIdRef.current,
            locale: locale,
            timezone: timezoneRef.current,
          }),
        });

        const data = await response.json();
        
        // Handle the AI response
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: data.message || (locale === 'ko' ? '이미지에서 일정 정보를 추출했습니다.' : 'Extracted event information from the image.'),
          sender: 'ai',
          timestamp: new Date(),
          events: data.events,
          action: data.action
        };
        
        // Store extracted event for context
        if (data.action && data.action.type === 'create' && data.action.data) {
          setLastExtractedEvent(data.action.data);
        }
        
        setMessages(prev => [...prev, aiResponse]);
      setTypingMessageId(aiResponse.id);
        
        // Save AI response to database
        if (currentChatSession) {
          const aiAIMessage: AIMessage = {
            id: aiResponse.id,
            role: 'assistant',
            content: aiResponse.text,
            timestamp: aiResponse.timestamp,
            type: 'text',
            data: {
              events: aiResponse.events,
              action: aiResponse.action
            }
          };
          try {
            await chatStorage.addMessage(currentChatSession.id, aiAIMessage);
          } catch (error) {
            console.error('Failed to save AI message:', error);
          }
        }
        
        // Update suggestions if provided
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
        
        // If event was created/extracted, refresh calendar
        if (data.action && data.success) {
          // Don't call onSubmit for images - we handle it here
          if (['create', 'update', 'delete'].includes(data.action.type)) {
            // Call onEventCreated for smooth UI update
            if (onEventCreated) {
              onEventCreated(data.createdEventId, data.action?.data);
            } else {
              // Fallback to manual sync
              try {
                const syncResponse = await fetch(`/api/calendar/sync?sessionId=${sessionIdRef.current}`);
                const syncData = await syncResponse.json();
                if (syncData.success && onSubmit) {
                  // Call onSubmit to update parent component's events
                  onSubmit('', 'text');
                }
              } catch (syncError) {
                console.error('[AIChatInterface] Error syncing calendar:', syncError);
              }
              setTimeout(() => {
                router.refresh();
              }, 500);
            }
          }
        }
      } catch (error) {
        console.error('[AIChatInterface] Error processing image:', error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: locale === 'ko' 
            ? '이미지를 처리하는 중에 오류가 발생했습니다. 다시 시도해주세요.'
            : 'Error processing image. Please try again.',
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(blob);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Chat Interface */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="ai-chat-interface fixed bottom-0 left-0 right-0 z-50 h-[85vh] flex flex-col rounded-t-3xl overflow-hidden"
            style={{ background: 'var(--bg-primary)' }}
          >
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-default)' }}>
                    <img src="/images/logo.svg" alt="AI Assistant" className="w-5 h-5 opacity-80" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{locale === 'ko' ? 'AI 어시스턴트' : 'AI Assistant'}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {locale === 'ko' ? '일정을 말씀해주세요' : 'Tell me about your schedule'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-colors"
                  style={{ background: 'var(--surface-secondary)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : ''
                    } rounded-2xl overflow-hidden`}
                    style={{
                      background: message.sender === 'ai' ? 'var(--surface-secondary)' : undefined
                    }}
                  >
                    <div className="px-4 py-2">
                      <p className="text-sm whitespace-pre-wrap">
                        {message.sender === 'ai' && typingMessageId === message.id ? (
                          <TypingAnimation 
                            text={message.text} 
                            speed={20}
                            onComplete={() => setTypingMessageId(null)}
                          />
                        ) : (
                          message.text
                        )}
                      </p>
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString('ko-KR', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    
                    {/* Display events if present */}
                    {message.events && message.events.length > 0 && (
                      <div className="px-4 pb-2 space-y-2">
                        <p className="text-xs font-semibold opacity-70">검색된 일정:</p>
                        {message.events.map((event: any, idx: number) => (
                          <div key={idx} className="p-2 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                            <div className="flex items-start gap-2">
                              <Calendar className="w-4 h-4 mt-0.5 opacity-60" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{event.summary || '제목 없음'}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 opacity-60" />
                                    <p className="text-xs opacity-70">
                                      {new Date(event.start?.dateTime || event.start?.date).toLocaleString('ko-KR', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: event.start?.dateTime ? 'numeric' : undefined,
                                        minute: event.start?.dateTime ? '2-digit' : undefined
                                      })}
                                    </p>
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 opacity-60" />
                                      <p className="text-xs opacity-70">{event.location}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="px-4 py-2 rounded-2xl" style={{ background: 'var(--surface-secondary)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150" />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            <div className="px-4 pb-2">
              <div className="flex gap-2 overflow-x-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      if (!isProcessing) {
                        setInput(suggestion);
                      }
                    }}
                    disabled={isProcessing}
                    className="px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors disabled:opacity-50"
                    style={{
                      background: 'var(--surface-secondary)',
                      border: '1px solid var(--border-default)'
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="p-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: 'var(--surface-secondary)' }}
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <button
                  onClick={handleVoiceInput}
                  disabled={isProcessing}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isListening ? 'text-red-500' : ''}`}
                  style={{ background: 'var(--surface-secondary)' }}
                >
                  <Mic className="w-5 h-5" />
                </button>
                
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isProcessing) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  onPaste={handlePaste}
                  placeholder={isProcessing 
                    ? (locale === 'ko' ? "처리 중..." : "Processing...")
                    : (locale === 'ko' ? "메시지를 입력하거나 스크린샷을 붙여넣으세요..." : "Type a message or paste a screenshot...")}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 rounded-lg disabled:opacity-50"
                  style={{
                    background: 'var(--surface-secondary)',
                    border: '1px solid var(--border-default)'
                  }}
                />
                
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isProcessing}
                  className="p-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{
                    background: input.trim() && !isProcessing
                      ? 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)' 
                      : 'var(--surface-secondary)'
                  }}
                >
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Safe area for iOS */}
            <div className="pb-safe" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}