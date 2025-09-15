'use client';

import { useState, useEffect, lazy, Suspense, memo, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BackgroundCalendarLayer } from './BackgroundCalendarLayer';
import { UnifiedAIInterface } from './UnifiedAIInterface';
import { UnifiedHeader, UnifiedSidebar } from './UnifiedSidebar';
import { SearchModal } from './SearchModal';
import { CalendarEvent } from '@/types';
import { useToastContext } from '@/providers/ToastProvider';
import { useRouter } from 'next/navigation';
import { chatStorage } from '@/utils/chatStorage';
import { AIMessage, ChatSession } from '@/types';

const SettingsPanel = lazy(() => import('@/components/SettingsPanel'));
const ProfilePanel = lazy(() => import('@/components/ProfilePanel').then(module => ({ default: module.ProfilePanel })));
const FriendsList = lazy(() => import('@/components/FriendsList').then(module => ({ default: module.FriendsList })));
const SubscriptionManagement = lazy(() => import('@/components/SubscriptionManagement').then(module => ({ default: module.SubscriptionManagement })));

interface AIOverlayDashboardProps {
  locale: 'ko' | 'en';
  userId?: string | null;
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onEventCreated: () => void;
  highlightedEventId?: string | null;
  spotlightEvent?: { id: string; date: Date; title: string } | null;
  sessionId: string;
  userInfo?: {
    email?: string;
    name?: string;
    picture?: string;
  } | null;
  onViewToggle?: () => void;
}

function AIOverlayDashboardComponent({ 
  locale, 
  userId,
  events,
  currentDate,
  onDateChange,
  onEventCreated,
  highlightedEventId,
  spotlightEvent,
  sessionId,
  userInfo,
  onViewToggle
}: AIOverlayDashboardProps) {
  // Debug: Check events data
  useEffect(() => {
    console.log('[AIOverlayDashboard] Events received:', events);
    console.log('[AIOverlayDashboard] Events count:', events?.length || 0);
  }, [events]);
  
  const router = useRouter();
  const [backgroundFocus, setBackgroundFocus] = useState<'background' | 'medium' | 'focus'>('medium'); // Always start with medium opacity
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState<string | null>(highlightedEventId || null);
  const [highlightedEventIds, setHighlightedEventIds] = useState<string[]>([]);
  const [isManualFocus, setIsManualFocus] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [currentChatSession, setCurrentChatSession] = useState<ChatSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const { toast } = useToastContext();

  useEffect(() => {
    setCurrentHighlight(highlightedEventId ?? null);
  }, [highlightedEventId]);

  // 채팅 세션 초기화 및 활성 세션 변경 감지
  useEffect(() => {
    const initializeChatSession = async () => {
      if (isSessionLoading) return;

      setIsSessionLoading(true);
      try {
        // 1. 먼저 활성 세션이 있는지 확인
        const activeSessionId = chatStorage.getActiveSessionId();
        let session: ChatSession | null = null;

        if (activeSessionId) {
          // 2. 활성 세션이 있으면 로드 시도
          session = await chatStorage.getSession(activeSessionId);
          
          // 세션이 유효한지 확인 (삭제되었거나 다른 사용자의 세션일 수 있음)
          if (session && session.userId === userId) {
            console.log('[AIOverlayDashboard] Continuing existing session:', session.id);
          } else {
            // 유효하지 않은 세션은 클리어
            chatStorage.clearActiveSession();
            session = null;
          }
        }

        if (!session) {
          // 3. 활성 세션이 없으면 새로 생성
          console.log('[AIOverlayDashboard] Creating new chat session');
          session = await chatStorage.createSession(
            locale === 'ko' ? '새 채팅' : 'New Chat',
            userId
          );
          
          if (session) {
            // 새 세션을 활성 세션으로 설정
            await chatStorage.setActiveSession(session.id);
            
            // Check for event context from localStorage
            const eventContextStr = localStorage.getItem('ai-chat-event-context');
            if (eventContextStr) {
              try {
                const eventContext = JSON.parse(eventContextStr);
                localStorage.removeItem('ai-chat-event-context'); // Clear after using
                
                // Create context message
                const contextMessage: AIMessage = {
                  id: `context-${Date.now()}`,
                  role: 'assistant',
                  content: locale === 'ko' 
                    ? `"${eventContext.title}" 일정에 대해 도움을 드릴게요. 이 일정에 대해 무엇을 알고 싶으신가요?` 
                    : `I'll help you with the event "${eventContext.title}". What would you like to know about this event?`,
                  type: 'text',
                  timestamp: new Date()
                };
                await chatStorage.addMessage(session.id, contextMessage);
                
                // Add event details as system context (not visible to user but available to AI)
                const systemContext: AIMessage = {
                  id: `system-${Date.now()}`,
                  role: 'system',
                  content: `Event context: ${JSON.stringify(eventContext)}`,
                  type: 'text',
                  timestamp: new Date()
                };
                await chatStorage.addMessage(session.id, systemContext);
              } catch (error) {
                console.error('Failed to parse event context:', error);
                // Fall back to welcome message
                const welcomeMessage: AIMessage = {
                  id: `welcome-${Date.now()}`,
                  role: 'assistant',
                  content: locale === 'ko' 
                    ? '안녕하세요! 일정 관리에 대해 무엇이든 물어보세요.' 
                    : 'Hello! Ask me anything about managing your schedule.',
                  type: 'text',
                  timestamp: new Date()
                };
                await chatStorage.addMessage(session.id, welcomeMessage);
              }
            } else {
              // 환영 메시지 추가 (새 세션일 때만)
              const welcomeMessage: AIMessage = {
                id: `welcome-${Date.now()}`,
                role: 'assistant',
                content: locale === 'ko' 
                  ? '안녕하세요! 일정 관리에 대해 무엇이든 물어보세요.' 
                  : 'Hello! Ask me anything about managing your schedule.',
                type: 'text',
                timestamp: new Date()
              };
              await chatStorage.addMessage(session.id, welcomeMessage);
            }
          }
        }

        setCurrentChatSession(session);
        console.log('[AIOverlayDashboard] Chat session ready:', session?.id, 'Messages:', session?.messages?.length);
      } catch (error) {
        console.error('Failed to initialize chat session:', error);
      } finally {
        setIsSessionLoading(false);
      }
    };

    initializeChatSession();
  }, [userId, locale]); // sessionId 제거 - 더 이상 필요 없음
  
  // 활성 세션 변경 감지 (폴링 방식)
  useEffect(() => {
    const checkActiveSessionChange = async () => {
      const activeSessionId = chatStorage.getActiveSessionId();
      
      // 디버깅 로그
      if (activeSessionId) {
        console.log('[AIOverlayDashboard] Polling check - activeSessionId:', activeSessionId, 'currentChatSession:', currentChatSession?.id);
      }
      
      // 조건 수정: currentChatSession이 없거나 ID가 다른 경우 모두 처리
      if (activeSessionId && (!currentChatSession || activeSessionId !== currentChatSession.id)) {
        console.log('[AIOverlayDashboard] Session change detected! Loading session:', activeSessionId);
        setIsSessionLoading(true);
        try {
          const newSession = await chatStorage.getSession(activeSessionId);
          if (newSession) {
            setCurrentChatSession(newSession);
            console.log('[AIOverlayDashboard] Successfully loaded session:', newSession.id, 'with', newSession.messages?.length || 0, 'messages');
          } else {
            console.warn('[AIOverlayDashboard] Session not found:', activeSessionId);
          }
        } catch (error) {
          console.error('[AIOverlayDashboard] Failed to load session:', error);
        } finally {
          setIsSessionLoading(false);
        }
      }
    };
    
    // 초기 실행
    checkActiveSessionChange();
    
    // 주기적 체크
    const interval = setInterval(checkActiveSessionChange, 500); // 더 빠른 반응을 위해 500ms
    return () => clearInterval(interval);
  }, [currentChatSession]);

  // Header and Sidebar event handlers - memoized for performance
  const handleMenuClick = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  const handleSearchClick = useCallback(() => {
    setShowSearch(true);
  }, []);

  const handleAddEvent = useCallback(() => {
    // You could implement this to open an event creation modal or redirect
    console.log('Add event clicked');
  }, []);

  const handleSidebarClose = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const handleChatClick = useCallback(async (chatId: string) => {
    // Handle loading a specific chat session
    console.log('Loading chat:', chatId);

    if (chatId === currentChatSession?.id) {
      // Already viewing this session
      setIsSidebarOpen(false);
      return;
    }

    setIsSessionLoading(true);
    try {
      const session = await chatStorage.getSession(chatId);
      if (session) {
        setCurrentChatSession(session);
        await chatStorage.setActiveSession(chatId);
        console.log('[AIOverlayDashboard] Loaded chat session:', session.title);
      }
    } catch (error) {
      console.error('Failed to load chat session:', error);
    } finally {
      setIsSessionLoading(false);
      setIsSidebarOpen(false);
    }
  }, [currentChatSession?.id]);

  const handleManualFocusChange = useCallback((level: 'background' | 'medium' | 'focus') => {
    setBackgroundFocus(level);
    setIsManualFocus(true);
    // Reset manual flag after a delay
    setTimeout(() => setIsManualFocus(false), 10000);
  }, []);

  // Convert ChatSession messages to UnifiedAIInterface Message format - memoized
  const convertMessagesToUIFormat = useCallback((messages: AIMessage[] = []) => {
    return messages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.timestamp,
      action: msg.data?.action ? {
        type: msg.data.action.type || 'create',
        status: msg.metadata?.actionPerformed ? 'completed' : 'pending'
      } : undefined
    }));
  }, []);

  const handleAICommand = async (text: string, imageData?: string): Promise<{ message?: string; action?: any; success?: boolean }> => {
    setIsProcessing(true);
    
    // Keep medium focus, don't auto-change

    // 사용자 메시지를 chatStorage에 저장
    if (currentChatSession) {
      try {
        const userMessage: AIMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: text,
          type: imageData ? 'image' : 'text',
          timestamp: new Date(),
          data: imageData ? { imageData, mimeType: 'image/png' } : undefined
        };
        
        await chatStorage.addMessage(currentChatSession.id, userMessage);
        console.log('[AIOverlayDashboard] User message saved to chatStorage');
        
        // Reload session to get updated messages for UI
        const updatedSession = await chatStorage.getSession(currentChatSession.id);
        if (updatedSession) {
          setCurrentChatSession(updatedSession);
        }
      } catch (error) {
        console.error('Failed to save user message:', error);
      }
    }
    
    try {
      // Prepare request body
      const requestBody: any = {
        message: text,
        locale,
        sessionId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      // Add image data if provided
      if (imageData) {
        requestBody.type = 'image';
        requestBody.imageData = imageData;
        requestBody.mimeType = 'image/png';
      }

      // Send to AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      const responseData = data.data || data;

      // AI 응답을 chatStorage에 저장
      if (currentChatSession && responseData.message) {
        try {
          const aiMessage: AIMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: responseData.message,
            type: 'text',
            timestamp: new Date(),
            data: responseData.action ? { action: responseData.action } : undefined,
            metadata: {
              suggestions: responseData.suggestions,
              actionPerformed: !!responseData.action
            }
          };
          
          await chatStorage.addMessage(currentChatSession.id, aiMessage);
          console.log('[AIOverlayDashboard] AI response saved to chatStorage');
          
          // Reload session to get updated messages for UI
          const updatedSession = await chatStorage.getSession(currentChatSession.id);
          if (updatedSession) {
            setCurrentChatSession(updatedSession);
          }
        } catch (error) {
          console.error('Failed to save AI response:', error);
        }
      }

      // Check if action was performed
      if (responseData.action) {
        const actionType = responseData.action.type;

        // Keep medium focus during actions

        // Handle friend actions
        if (actionType === 'friend_action') {
          const friendAction = responseData.action.friendAction;
          const friendData = responseData.action.data;

          // Show friend list or request list in UI if available
          if (friendAction === 'list' && friendData?.friends) {
            // Could open friends panel or show in chat
            toast.info(
              locale === 'ko' ? '친구 목록' : 'Friends List',
              `${friendData.friends.length}${locale === 'ko' ? '명의 친구가 있습니다' : ' friends found'}`
            );
          } else if (friendAction === 'view_requests' && friendData?.requests) {
            toast.info(
              locale === 'ko' ? '친구 요청' : 'Friend Requests',
              `${friendData.requests.length}${locale === 'ko' ? '개의 대기 중인 요청이 있습니다' : ' pending requests'}`
            );
          } else if (friendAction === 'add' && friendData?.success) {
            toast.success(
              locale === 'ko' ? '친구 요청 전송' : 'Friend Request Sent',
              locale === 'ko' ? '친구 요청을 보냈습니다' : 'Friend request has been sent'
            );
          } else if (friendAction === 'accept' && friendData?.success) {
            toast.success(
              locale === 'ko' ? '친구 추가 완료' : 'Friend Added',
              locale === 'ko' ? '새로운 친구가 추가되었습니다' : 'New friend has been added'
            );
          }

          setIsProcessing(false);
          return { success: true, message: responseData.message };
        }

        // Handle different action types
        if (actionType === 'create' && responseData.createdEventId) {
          // Highlight the created event
          setCurrentHighlight(responseData.createdEventId);
          setHighlightedEventIds([responseData.createdEventId]);
          
          // Don't show toast - message will appear in chat
          
          // Refresh events to show the new one
          onEventCreated();
          
          // Keep highlight for 5 seconds
          setTimeout(() => {
            setCurrentHighlight(null);
            setHighlightedEventIds([]);
            // Keep medium focus, don't auto-hide
          }, 5000);
        } else if (actionType === 'update' || actionType === 'delete') {
          // Don't show toast - message will appear in chat
          
          // Refresh events for update/delete
          onEventCreated();
          
          // Keep medium focus after action
          setTimeout(() => {
            // Keep medium focus
          }, 3000);
        } else if (actionType === 'list' || actionType === 'search') {
          // Keep medium focus for search results
          
          // Handle date navigation for weekly/monthly queries
          if (responseData.events && responseData.events.length > 0) {
            // For weekly queries, navigate to the start of the week
            const isWeeklyQuery = text.includes('이번주') || text.includes('this week') || 
                                 text.includes('다음주') || text.includes('next week');
            
            if (isWeeklyQuery) {
              // Navigate to the start of the relevant week
              const now = new Date();
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay()); // Go to Sunday
              
              if (text.includes('다음주') || text.includes('next week')) {
                weekStart.setDate(weekStart.getDate() + 7);
              }
              
              onDateChange(weekStart);
            } else {
              // For other queries, use first event's date
              const firstEvent = responseData.events[0];
              const eventDate = new Date(firstEvent.start?.dateTime || firstEvent.start?.date || '');
              
              if (!isNaN(eventDate.getTime())) {
                onDateChange(eventDate);
              }
            }
            
            // Highlight all found events
            const eventIds = responseData.events
              .filter((e: any) => e.id)
              .map((e: any) => e.id);
            
            if (eventIds.length > 0) {
              setHighlightedEventIds(eventIds);
              setCurrentHighlight(eventIds[0]);
            }
            
            // Don't show toast - results will appear in chat
          } else {
            // No events found - show message
            // Don't show toast - message will appear in chat
          }
          
          // Keep calendar visible longer for user to see results
          setTimeout(() => {
            setCurrentHighlight(null);
            setHighlightedEventIds([]);
            // Don't auto-hide - let user manually toggle
          }, 7000);
        }
      } else {
        // Just conversation, keep medium focus
      }

      // Don't show toast - message will appear in chat
      
      // Return response for UnifiedAIInterface
      return {
        message: responseData.message,
        action: responseData.action,
        success: true
      };

    } catch (error: any) {
      console.error('Error processing command:', error);
      
      // Show user-friendly error message
      let errorMessage = locale === 'ko' ? '오류가 발생했습니다' : 'An error occurred';
      
      if (error?.message?.includes('401') || error?.message?.includes('authentication')) {
        errorMessage = locale === 'ko' 
          ? 'Google 계정 재인증이 필요합니다. 설정에서 다시 로그인해주세요.'
          : 'Google account re-authentication required. Please login again in settings.';
      } else if (error?.message?.includes('network')) {
        errorMessage = locale === 'ko' 
          ? '네트워크 연결을 확인해주세요'
          : 'Please check your network connection';
      }
      
      // 에러 메시지를 chatStorage에 저장
      if (currentChatSession) {
        try {
          const errorAIMessage: AIMessage = {
            id: `ai-error-${Date.now()}`,
            role: 'assistant',
            content: errorMessage,
            type: 'text',
            timestamp: new Date(),
            metadata: {
              isError: true,
              errorType: error?.message?.includes('401') ? 'auth' : 'general'
            }
          };
          
          await chatStorage.addMessage(currentChatSession.id, errorAIMessage);
          console.log('[AIOverlayDashboard] Error message saved to chatStorage');
          
          // Reload session to get updated messages for UI
          const updatedSession = await chatStorage.getSession(currentChatSession.id);
          if (updatedSession) {
            setCurrentChatSession(updatedSession);
          }
        } catch (storageError) {
          console.error('Failed to save error message:', storageError);
        }
      }
      
      // Don't show toast - error will appear in chat
      
      // Keep medium focus on error
      
      // Return error response
      return {
        message: errorMessage,
        success: false
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden flex flex-col">
      {/* Unified Header */}
      <UnifiedHeader 
        onMenuClick={handleMenuClick}
        onSearchClick={handleSearchClick}
        onAddEvent={onViewToggle || handleAddEvent}
        title="Geulpi"
        subtitle={locale === 'ko' ? 'AI 일정 관리' : 'AI Schedule Assistant'}
      />

      {/* Unified Sidebar */}
      <UnifiedSidebar 
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
        onSearchClick={handleSearchClick}
        onChatClick={handleChatClick}
        onSettingsClick={() => {
          console.log('[AIOverlayDashboard] Settings clicked');
          setIsSidebarOpen(false);
          setShowSettings(true);
        }}
        onProfileClick={() => {
          console.log('[AIOverlayDashboard] Profile clicked');
          setIsSidebarOpen(false);
          setShowProfile(true);
        }}
        onFriendsClick={() => {
          console.log('[AIOverlayDashboard] Friends clicked');
          setIsSidebarOpen(false);
          setShowFriends(true);
        }}
        onSubscriptionClick={() => {
          console.log('[AIOverlayDashboard] Subscription clicked');
          setIsSidebarOpen(false);
          setShowSubscription(true);
        }}
        userInfo={userInfo}
      />

      {/* Main Content Container */}
      <div className="relative flex-1 overflow-hidden">
        {/* Background Calendar Layer */}
        <BackgroundCalendarLayer 
          events={events || []}
          currentDate={currentDate}
          locale={locale}
          focusLevel={backgroundFocus}
          isProcessing={isProcessing}
          highlightedEventId={highlightedEventIds.length > 0 ? highlightedEventIds[0] : currentHighlight}
          highlightedEventIds={highlightedEventIds}
          onDateChange={onDateChange}
          onEventCreated={onEventCreated}
        />

        {/* AI Prompt Interface */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
          <motion.div
            className="w-full max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              {isSessionLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-gray-300 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {locale === 'ko' ? '채팅을 불러오는 중...' : 'Loading chat...'}
                  </p>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold mb-2">
                    {locale === 'ko' ? '무엇을 도와드릴까요?' : 'How can I help you?'}
                  </h1>
                  <p className="text-base text-muted-foreground">
                    {locale === 'ko' 
                      ? '일정을 자연스럽게 말씀해주세요' 
                      : 'Tell me about your schedule naturally'}
                  </p>
                </>
              )}
            </div>

            <UnifiedAIInterface 
              onSubmit={handleAICommand} 
              autoFocus 
              isProcessing={isProcessing}
              locale={locale}
              focusLevel={backgroundFocus}
              onFocusLevelChange={handleManualFocusChange}
              sessionId={sessionId}
              initialMessages={convertMessagesToUIFormat(currentChatSession?.messages)}
            />

          </motion.div>
        </div>
      </div>
      
      {/* Settings Panel */}
      <Suspense fallback={null}>
        {showSettings && (
          <SettingsPanel 
            isOpen={showSettings} 
            onClose={() => {
              console.log('[AIOverlayDashboard] Closing settings modal');
              setShowSettings(false);
            }} 
            showTriggerButton={false}
          />
        )}
      </Suspense>
      
      {/* Profile Panel */}
      <Suspense fallback={null}>
        {showProfile && (
          <ProfilePanel
            isOpen={showProfile}
            onClose={() => {
              console.log('[AIOverlayDashboard] Closing profile modal');
              setShowProfile(false);
            }}
          />
        )}
      </Suspense>
      
      {/* Friends List */}
      <Suspense fallback={null}>
        {showFriends && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h2 className="text-xl font-semibold">{locale === 'ko' ? '친구 목록' : 'Friends List'}</h2>
                <button
                  onClick={() => setShowFriends(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  ✕
                </button>
              </div>
              <FriendsList />
            </div>
          </div>
        )}
      </Suspense>
      
      {/* Subscription Management */}
      <Suspense fallback={null}>
        {showSubscription && (
          <SubscriptionManagement
            isOpen={showSubscription}
            onClose={() => {
              console.log('[AIOverlayDashboard] Closing subscription modal');
              setShowSubscription(false);
            }}
          />
        )}
      </Suspense>
      
      {/* Search Modal */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectEvent={(event) => {
          // Highlight the selected event
          setCurrentHighlight(event.id || null);
          if (event.id) {
            setHighlightedEventIds([event.id]);
          }
          // Navigate to the event's date
          const eventDate = new Date(event.start?.dateTime || event.start?.date || new Date());
          onDateChange(eventDate);
          toast({
            title: locale === 'ko' ? '일정 선택됨' : 'Event Selected',
            description: event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled'),
          });
        }}
      />
    </div>
  );
}

// Memoize component for performance
export const AIOverlayDashboard = memo(AIOverlayDashboardComponent, (prevProps, nextProps) => {
  // Custom comparison for performance optimization
  return (
    prevProps.locale === nextProps.locale &&
    prevProps.userId === nextProps.userId &&
    prevProps.currentDate?.getTime() === nextProps.currentDate?.getTime() &&
    prevProps.events?.length === nextProps.events?.length &&
    prevProps.highlightedEventId === nextProps.highlightedEventId &&
    prevProps.sessionId === nextProps.sessionId &&
    JSON.stringify(prevProps.userInfo) === JSON.stringify(nextProps.userInfo)
  );
});