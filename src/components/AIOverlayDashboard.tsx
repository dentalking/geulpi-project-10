'use client';

import { useState, useEffect, lazy, Suspense, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BackgroundCalendarLayer } from './BackgroundCalendarLayer';
import { EnhancedUnifiedAIInterface as UnifiedAIInterface } from './UnifiedAIInterface.enhanced';
import { UnifiedHeader, UnifiedSidebar } from './UnifiedSidebar';
import { SearchModal } from './SearchModal';
import { OptimizedEventsArtifactPanel } from './EventsArtifactPanel.optimized';
import NotificationIconButton from './NotificationIconButton';
// Removed status widgets for cleaner UI

// 통합 상태 관리 import
import {
  useUnifiedEventStore,
  type UnifiedEventStore
} from '@/store/unifiedEventStore';
import { CalendarEvent } from '@/types';
import { useToastContext } from '@/providers/ToastProvider';
// import { useSimpleSync } from '@/hooks/useSimpleSync'; // Replaced with Realtime
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
// import { useOptimisticEvents } from '@/hooks/useOptimisticEvent'; // Temporarily disabled
// import { useRouter } from 'next/navigation'; // Removed unused import
import { chatStorage } from '@/utils/chatStorage';
import { AIMessage, ChatSession } from '@/types';
import { apiRateLimitManager } from '@/lib/ApiRateLimitManager';
import { ChatMessage } from './ChatMessage';
import { Plus } from 'lucide-react';
import { SettingsControlServiceV2 } from '@/services/ai/SettingsControlServiceV2';
import { settingsManager } from '@/services/SettingsManager';
// Unified date utilities for consistent timezone handling
import {
  getUserTimezone,
  getDateRangeForQuery,
  isEventInRange
} from '@/utils/dateUtils';

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
  spotlightEvent?: { id: string; date: Date; title: string } | null; // Currently unused
  sessionId: string;
  userInfo?: {
    email?: string;
    name?: string;
    picture?: string;
  } | null;
  onViewToggle?: () => void;
  onEventAdd?: (event: CalendarEvent) => void; // Currently unused
  onEventUpdate?: (event: CalendarEvent) => void; // Currently unused
  onEventDelete?: (eventId: string) => void; // Currently unused
}

function AIOverlayDashboardComponent({
  locale,
  userId,
  events: propEvents,
  currentDate,
  onDateChange,
  onEventCreated,
  highlightedEventId,
  spotlightEvent: _spotlightEvent, // Prefix with _ to indicate intentionally unused
  sessionId,
  userInfo,
  onViewToggle,
  onEventAdd: _onEventAdd, // Prefix with _ to indicate intentionally unused
  onEventUpdate: _onEventUpdate, // Prefix with _ to indicate intentionally unused
  onEventDelete: _onEventDelete // Prefix with _ to indicate intentionally unused
}: AIOverlayDashboardProps) {
  // 통합 상태 관리 사용 - Individual selectors to prevent object recreation
  const contextEvents = useUnifiedEventStore((state: UnifiedEventStore) => state.events);
  const addEvent = useUnifiedEventStore((state: UnifiedEventStore) => state.addEvent);
  const updateEvent = useUnifiedEventStore((state: UnifiedEventStore) => state.updateEvent);
  const deleteEvent = useUnifiedEventStore((state: UnifiedEventStore) => state.deleteEvent);
  // const selectedEvent = useUnifiedEventStore((state: UnifiedEventStore) => state.selectedEvent); // Currently unused
  // const selectEvent = useUnifiedEventStore((state: UnifiedEventStore) => state.selectEvent); // Currently unused

  const isOpen = useUnifiedEventStore((state: UnifiedEventStore) => state.isArtifactOpen);
  const openArtifactPanel = useUnifiedEventStore((state: UnifiedEventStore) => state.openArtifactPanel);
  const closeArtifactPanel = useUnifiedEventStore((state: UnifiedEventStore) => state.closeArtifactPanel);
  const artifactEvents = useUnifiedEventStore((state: UnifiedEventStore) => state.artifactEvents);
  const setEvents = useUnifiedEventStore((state: UnifiedEventStore) => state.setArtifactEvents);
  const focusedEvent = useUnifiedEventStore((state: UnifiedEventStore) => state.focusedEvent);
  const pendingChanges = useUnifiedEventStore((state: UnifiedEventStore) => state.pendingChanges);
  const artifactQuery = useUnifiedEventStore((state: UnifiedEventStore) => state.artifactQuery);
  const setArtifactQuery = useUnifiedEventStore((state: UnifiedEventStore) => state.setArtifactQuery);
  const setMode = useUnifiedEventStore((state: UnifiedEventStore) => state.setArtifactMode);
  const setFocused = useUnifiedEventStore((state: UnifiedEventStore) => state.setFocusedEvent);
  const setPending = useUnifiedEventStore((state: UnifiedEventStore) => state.setPendingChanges);

  // Use context events if available - memoized to prevent infinite loops
  const events = useMemo(() => {
    return contextEvents.length > 0 ? contextEvents : propEvents;
  }, [contextEvents, propEvents]);

  // Debug logs removed to improve performance and prevent potential loops

  // const router = useRouter(); // Temporarily disabled
  const [backgroundFocus, setBackgroundFocus] = useState<'background' | 'medium' | 'focus'>('medium'); // Always start with medium opacity
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentHighlight, setCurrentHighlight] = useState<string | null>(highlightedEventId || null);
  const [lastAIResponse, setLastAIResponse] = useState<any>(null);
  const [highlightedEventIds, setHighlightedEventIds] = useState<string[]>([]);
  // const [isManualFocus, setIsManualFocus] = useState(false); // Temporarily disabled
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [currentChatSession, setCurrentChatSession] = useState<ChatSession | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // 로컬 상태 (unified store로 대체된 것들 제거)
  const [artifactTitle, setArtifactTitle] = useState<string>('');
  const [useAIFilteredEvents, setUseAIFilteredEvents] = useState<boolean>(false); // Flag to use AI filtered events
  const { toast } = useToastContext();

  // Settings control integration
  const settingsControlService = new SettingsControlServiceV2();

  // Settings change listener
  useEffect(() => {
    const handleSettingChanged = () => {
      // Could show a toast notification here if needed
    };

    settingsManager.on('settingChanged', handleSettingChanged);
    return () => {
      settingsManager.off('settingChanged', handleSettingChanged);
    };
  }, []);

  // Use optimistic events hook for better UX - temporarily disabled
  // const {
  //   events: optimisticEvents,
  //   actions: optimisticActions
  // } = useOptimisticEvents(artifactEvents);

  useEffect(() => {
    setCurrentHighlight(highlightedEventId ?? null);
  }, [highlightedEventId]);

  // Reset AI filtered events when main events change significantly - OPTIMIZED
  const eventsLength = useMemo(() => events.length, [events]);
  const artifactEventsLength = useMemo(() => artifactEvents.length, [artifactEvents]);

  useEffect(() => {
    // Only reset if we're in AI filtered mode and there's a significant change
    if (useAIFilteredEvents && Math.abs(eventsLength - artifactEventsLength) > 0) {
      setUseAIFilteredEvents(false);
    }
  }, [eventsLength, artifactEventsLength, useAIFilteredEvents]);

  // Update artifact panel when events change if it's open - OPTIMIZED TO PREVENT LOOPS
  useEffect(() => {
    // Only update if panel is open, we have events, and not using AI filtered events
    if (isOpen && events && events.length > 0 && !useAIFilteredEvents) {
      setEvents(events);
    }
  }, [isOpen, events, useAIFilteredEvents]); // Remove setEvents from deps to prevent infinite loop

  // Separate effect for AI filtering to avoid dependency conflicts
  const filteredEvents = useMemo(() => {
    if (!isOpen || !artifactQuery || useAIFilteredEvents || !events) {
      return [];
    }

    // Perform filtering with minimal dependencies
    const filtered = events.filter(event => {
      const lowerQuery = artifactQuery.toLowerCase();
      return (
        event.summary?.toLowerCase().includes(lowerQuery) ||
        event.description?.toLowerCase().includes(lowerQuery) ||
        event.location?.toLowerCase().includes(lowerQuery)
      );
    });

    return filtered;
  }, [events, artifactQuery, isOpen, useAIFilteredEvents]);

  useEffect(() => {
    if (filteredEvents.length > 0 && isOpen && artifactQuery && !useAIFilteredEvents) {
      setEvents(filteredEvents);
    }
  }, [filteredEvents, isOpen, artifactQuery, useAIFilteredEvents]); // Remove setEvents from deps

  // Legacy complex filtering logic removed to prevent infinite loops and unreachable code

  // 채팅 세션 초기화 - 자동 로드 하지 않음
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeChatSession = async () => {
      // 초기 로딩은 매우 짧게만 표시 (1초)
      if (isInitialLoad && isMounted) {
        setIsInitialLoad(false);
      }

      // 로딩 타임아웃 설정 (1초로 단축)
      timeoutId = setTimeout(() => {
        if (isMounted) {
          // Loading timeout - showing default UI
        }
      }, 1000);

      try {
        // 이전 세션을 자동으로 로드하지 않음
        // 사용자가 사이드바에서 명시적으로 선택할 때만 로드
        // Starting fresh - no auto-load of previous sessions

        // 활성 세션 클리어 - 매번 새로 시작
        chatStorage.clearActiveSession();

        setCurrentChatSession(null);
        clearTimeout(timeoutId);

        // Ready for new chat
      } catch (error) {
        console.error('Failed to initialize chat session:', error);
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
        }
      }
    };

    void initializeChatSession();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [userId]); // isSessionLoading 제거 - 무한 루프 방지
  
  // 폴링 방식 세션 감지 비활성화 - 자동 로드 방지

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
      setIsSidebarOpen(false);
    }
  }, [currentChatSession?.id]);

  const handleManualFocusChange = useCallback((level: 'background' | 'medium' | 'focus') => {
    setBackgroundFocus(level);
  }, []);

  // Handle new chat creation - MEMOIZED
  const handleNewChat = useCallback(async () => {
    // 세션을 즉시 생성하지 않고, 사용자가 첫 메시지를 입력할 때 생성
    setCurrentChatSession(null);
    chatStorage.clearActiveSession();
    closeArtifactPanel();
    setEvents([]);
    setArtifactTitle('');
    setArtifactQuery(null);
    setUseAIFilteredEvents(false);
    toast.success(locale === 'ko' ? '새 대화를 시작합니다' : 'Starting new conversation');
  }, [locale, toast, closeArtifactPanel]); // Remove setEvents from deps

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close chat
      if (e.key === 'Escape' && currentChatSession) {
        setCurrentChatSession(null);
        chatStorage.clearActiveSession();
      }
      // Cmd+K or Ctrl+K for new chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        void handleNewChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChatSession, handleNewChat]);

  // Convert ChatSession messages to UnifiedAIInterface Message format - memoized
  // Temporarily disabled to fix infinite loop
  // const convertMessagesToUIFormat = useCallback((messages: AIMessage[] = []) => {
  //   return messages.map(msg => ({
  //     id: msg.id,
  //     role: msg.role as 'user' | 'assistant' | 'system',
  //     content: msg.content,
  //     timestamp: msg.timestamp,
  //     action: msg.data?.action ? {
  //       type: msg.data.action.type || 'create' as 'create' | 'update' | 'delete' | 'list' | 'search',
  //       status: (msg.data.action.status || 'pending') as 'pending' | 'processing' | 'completed' | 'failed'
  //     } : undefined
  //   }));
  // }, []);

  // Debug artifactEvents changes - REMOVED TO PREVENT INFINITE LOOPS
  // This debug effect was causing infinite re-renders and should not watch artifactEvents
  // Console logs moved to specific action points where needed

  // Auto-save pending changes on session end
  const savePendingChanges = useCallback(async () => {
    if (pendingChanges && focusedEvent?.id) {
      try {
        // Save changes to the server
        const response = await fetch(`/api/calendar/events/${focusedEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingChanges),
        });

        if (response.ok) {
          setPending(null);
          toast.success(
            locale === 'ko' ? '변경사항이 자동 저장되었습니다' : 'Changes auto-saved'
          );
        } else {
          toast.warning(
            locale === 'ko' ? '변경사항 저장 실패' : 'Failed to save changes'
          );
        }
      } catch (error) {
        console.error('[AIOverlayDashboard] Auto-save error:', error);
      }
    }
  }, [pendingChanges, focusedEvent, locale, toast, setPending]); // Add setPending to deps

  // Handle page unload - auto-save pending changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingChanges && focusedEvent?.id) {
        e.preventDefault();
        e.returnValue = locale === 'ko'
          ? '저장되지 않은 변경사항이 있습니다. 저장하시겠습니까?'
          : 'You have unsaved changes. Do you want to save them?';

        // Try to save synchronously (not guaranteed to work)
        void savePendingChanges();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Save when component unmounts
      if (pendingChanges && focusedEvent?.id) {
        void savePendingChanges();
      }
    };
  }, [pendingChanges, focusedEvent, locale, savePendingChanges]);

  // Memoize fetch function to prevent recreating on every render
  const fetchEventsForSync = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/events');
      if (response.ok) {
        const data = await response.json();
        return data.events || [];
      }
    } catch (error) {
      console.error('[AIOverlayDashboard] Sync error:', error);
    }
    return [];
  }, []); // Empty deps - function doesn't depend on any props/state

  // Get auth token from cookies for realtime sync
  const getAuthToken = useCallback(() => {
    if (typeof document === 'undefined') return undefined;

    // Check for JWT auth token
    const authToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1];

    if (authToken) return authToken;

    // Check for Google OAuth token
    const accessToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('access_token=') || row.startsWith('google_access_token='))
      ?.split('=')[1];

    return accessToken || undefined;
  }, []);

  // Supabase Realtime sync for live updates - 안정성 개선
  const realtimeCallbacks = useMemo(() => ({
    onEventCreated: (event: CalendarEvent) => {
      console.log('[AIOverlayDashboard] Realtime event created:', event.id);
      // Add to unified store
      addEvent(event);
      // Update artifact events if panel is open
      if (isOpen) {
        setEvents(prev => [...prev, event]);
      }
      toast.success(locale === 'ko' ? '새 일정이 추가되었습니다' : 'New event added');
    },
    onEventUpdated: (event: CalendarEvent) => {
      console.log('[AIOverlayDashboard] Realtime event updated:', event.id);
      // Update in unified store
      updateEvent(event.id!, event);
      // Update artifact events if panel is open
      if (isOpen) {
        setEvents(prev => prev.map(e => e.id === event.id ? event : e));
      }
    },
    onEventDeleted: (eventId: string) => {
      console.log('[AIOverlayDashboard] Realtime event deleted:', eventId);
      // Delete from unified store
      deleteEvent(eventId);
      // Update artifact events if panel is open
      if (isOpen) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
      }
    },
    onSyncRequired: () => {
      console.log('[AIOverlayDashboard] Sync required, fetching fresh events');
      // Fallback to fetching events when realtime fails
      fetchEventsForSync().then(freshEvents => {
        if (!useAIFilteredEvents && isOpen) {
          setEvents(freshEvents);
        }
      });
    },
    onError: (error: Error) => {
      console.error('[AIOverlayDashboard] Realtime sync error:', error);
      // Don't show error toast for connection issues - silently fallback
    }
  }), [addEvent, updateEvent, deleteEvent, isOpen, locale, useAIFilteredEvents]);

  // Temporarily disable realtime to fix infinite loop issue
  // useSupabaseRealtime({
  //   userId: userId || undefined,
  //   enabled: !!userId && isOpen, // Only active when overlay is open
  //   ...realtimeCallbacks
  // });

  // Show sync status in UI - simplified for new sync approach
  // Removed debug logging to improve performance

  const handleAICommand = async (text: string, imageData?: string): Promise<{ message?: string; action?: any; success?: boolean }> => {
    // Check rate limiting
    const rateLimitCheck = apiRateLimitManager.canMakeRequest('/api/ai/chat');
    if (!rateLimitCheck.allowed) {
      const message = locale === 'ko'
        ? `잠시 후에 다시 시도해주세요 (${rateLimitCheck.waitTime}초)`
        : `Please try again in ${rateLimitCheck.waitTime} seconds`;

      toast.warning(locale === 'ko' ? '너무 빠른 요청' : 'Too Many Requests', message);
      return {
        message,
        success: false
      };
    }

    setIsProcessing(true);

    // Check for artifact request first (before any API calls)
    const lowerText = text.toLowerCase().trim();
    if (lowerText.includes('아티팩트') || lowerText.includes('artifact') ||
        lowerText.includes('아티팩') || lowerText.includes('시각적') ||
        lowerText.includes('visual') || lowerText.includes('패널')) {

      // If artifact panel is already open with events, just refresh/show it
      if (artifactEvents && artifactEvents.length > 0) {
        openArtifactPanel();
        const message = locale === 'ko'
          ? `아티팩트 패널을 열어 ${artifactEvents.length}개의 일정을 보여드렸습니다.`
          : `Opened artifact panel showing ${artifactEvents.length} events.`;

        setIsProcessing(false);
        return {
          message,
          success: true,
          action: {
            type: 'view',
            status: 'completed'
          }
        };
      }

      // If we have recent events from store, use them
      if (events && events.length > 0) {
        setEvents(events);
        setArtifactQuery(text);
        openArtifactPanel();

        const message = locale === 'ko'
          ? `캘린더 일정을 아티팩트 패널에서 확인하실 수 있습니다.`
          : `You can view calendar events in the artifact panel.`;

        setIsProcessing(false);
        return {
          message,
          success: true,
          action: {
            type: 'view',
            status: 'completed'
          }
        };
      }
    }

    // Check for settings commands first (local processing for performance)
    try {
      const settingsResponse = await settingsControlService.parseAndExecute(text);
      if (settingsResponse) {
        console.log('[AIOverlayDashboard] Processing settings command:', settingsResponse);

        // Create session if needed for settings messages
        let sessionToUse = currentChatSession;
        if (!sessionToUse) {
          const newSession = await chatStorage.createSession();
          if (newSession) {
            sessionToUse = newSession;
            await chatStorage.setActiveSession(newSession.id);
          }
        }

        // Save user message
        if (sessionToUse) {
          const userMessage: AIMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            type: 'text',
            timestamp: new Date()
          };
          await chatStorage.addMessage(sessionToUse.id, userMessage);

          // Save AI response with settings action info
          const aiMessage: AIMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: settingsResponse.message,
            type: 'text',
            timestamp: new Date(),
            data: settingsResponse.settingChanged ? {
              action: {
                type: 'settings_change',
                status: settingsResponse.success ? 'completed' : 'failed'
              },
              settingChanged: settingsResponse.settingChanged,
              requiresReload: settingsResponse.requiresReload
            } : undefined
          };
          await chatStorage.addMessage(sessionToUse.id, aiMessage);

          // Update current session
          const updatedSession = await chatStorage.getSession(sessionToUse.id);
          if (updatedSession) {
            setCurrentChatSession(updatedSession);
          }
        }

        // Show reload notice if needed and actually reload
        if (settingsResponse.requiresReload) {
          // Show toast message first
          toast.info(
            locale === 'ko' ? '설정 적용을 위해 새로고침합니다...' : 'Applying settings and refreshing...',
            locale === 'ko' ? '잠시만 기다려주세요' : 'Please wait a moment'
          );

          // Note: Actual page reload is handled by SettingsManager for chat source
          // This toast is just for user feedback
          console.log('[AIOverlayDashboard] Page reload triggered by settings change');
        }

        setIsProcessing(false);
        return {
          message: settingsResponse.message,
          success: settingsResponse.success,
          action: {
            type: 'settings_change',
            status: settingsResponse.success ? 'completed' : 'failed'
          }
        };
      }
    } catch (error) {
      console.error('[AIOverlayDashboard] Settings processing error:', error);
      // Continue with normal AI processing if settings parsing fails
    }

    // Switch to chat mode when user sends first message

    // Keep medium focus, don't auto-change

    // Create session if needed (for first message)
    let sessionToUse = currentChatSession;
    if (!sessionToUse) {
      const newSession = await chatStorage.createSession();
      if (newSession) {
        sessionToUse = newSession;
        await chatStorage.setActiveSession(newSession.id);
        // Don't set currentChatSession yet - wait until we have messages
      }
    }

    // 사용자 메시지를 chatStorage에 저장
    if (sessionToUse) {
      try {
        const userMessage: AIMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: text,
          type: imageData ? 'image' : 'text',
          timestamp: new Date(),
          data: imageData ? { imageData, mimeType: 'image/png' } : undefined
        };

        await chatStorage.addMessage(sessionToUse.id, userMessage);
        console.log('[AIOverlayDashboard] User message saved to chatStorage');

        // Now that we have messages, update the session
        const updatedSession = await chatStorage.getSession(sessionToUse.id);
        if (updatedSession) {
          setCurrentChatSession(updatedSession);
        }
      } catch (error) {
        console.error('Failed to save user message:', error);
      }
    }

    try {
      // Debug: Check events data
      console.log('[AI Command] Events being sent:', {
        count: events?.length || 0,
        contextEventsCount: contextEvents?.length || 0,
        propEventsCount: propEvents?.length || 0,
        firstEvent: events?.[0]
      });

      // Prepare request body
      const requestBody: any = {
        message: text,
        locale,
        sessionId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        events: events, // AI가 현재 이벤트를 인식할 수 있도록 전달
        currentDate: currentDate.toISOString(), // 현재 날짜도 전달
      };

      // Add image data if provided
      if (imageData) {
        requestBody.type = 'image';
        requestBody.imageData = imageData;
        requestBody.mimeType = 'image/png';
      }

      // Send to AI API with retry logic
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // Handle 429 Rate Limit
      if (response.status === 429) {
        const retryAfterHeader = response.headers.get('Retry-After');
        const retrySeconds = retryAfterHeader ? parseInt(retryAfterHeader) : undefined;
        const waitTime = apiRateLimitManager.recordRateLimit('/api/ai/chat', retrySeconds);

        const message = locale === 'ko'
          ? `API 요청 한도에 도달했습니다. ${waitTime}초 후에 다시 시도해주세요.`
          : `API rate limit reached. Please try again in ${waitTime} seconds.`;

        // Save error to chat
        if (sessionToUse) {
          const errorMessage: AIMessage = {
            id: `ai-ratelimit-${Date.now()}`,
            role: 'assistant',
            content: message,
            type: 'text',
            timestamp: new Date(),
            data: { isError: true, errorType: 'rate_limit' }
          };

          await chatStorage.addMessage(sessionToUse.id, errorMessage);
          const updatedSession = await chatStorage.getSession(sessionToUse.id);
          if (updatedSession) {
            setCurrentChatSession(updatedSession);
          }
        }

        return { message, success: false };
      }

      // Record successful request
      apiRateLimitManager.recordSuccess('/api/ai/chat');

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const responseData = data.data || data;

      // 디버깅: AI 응답 확인
      console.log('[AIOverlayDashboard] AI Response:', {
        action: responseData.action,
        actionType: responseData.action?.type,
        events: responseData.events,
        eventsCount: responseData.events?.length,
        message: responseData.message,
        mode: responseData.mode,
        focusedEvent: responseData.focusedEvent,
        fullResponseData: responseData
      });

      // Store AI response for suggestion updates
      setLastAIResponse({
        message: responseData.message,
        action: responseData.action,
        events: responseData.events,
        timestamp: Date.now()
      });
      console.log('[AIOverlayDashboard] ✅ Set lastAIResponse for suggestion updates');

      // AI 응답을 chatStorage에 저장
      if (sessionToUse && responseData.message) {
        try {
          // Make sure to store events properly
          const messageData: any = {
            action: responseData.action,
            suggestions: responseData.suggestions
          };

          // Always include events if they exist, regardless of action
          if (responseData.events && responseData.events.length > 0) {
            messageData.events = responseData.events;
            console.log('[AIOverlayDashboard] Adding events to messageData:', {
              eventsCount: responseData.events.length,
              firstEvent: responseData.events[0],
              messageDataKeys: Object.keys(messageData)
            });
          }

          const aiMessage: AIMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: responseData.message,
            type: 'text',
            timestamp: new Date(),
            data: (responseData.action || responseData.suggestions || responseData.events) ? messageData : undefined,
            metadata: {}
            // Store suggestions and action status in data instead
          };

          console.log('[AIOverlayDashboard] Storing AI message with data:', {
            messageId: aiMessage.id,
            hasData: !!aiMessage.data,
            dataKeys: aiMessage.data ? Object.keys(aiMessage.data) : [],
            hasEvents: !!aiMessage.data?.events,
            eventsCount: aiMessage.data?.events?.length || 0,
            fullData: JSON.stringify(aiMessage.data)
          });

          await chatStorage.addMessage(sessionToUse.id, aiMessage);

          // Verify the stored message by getting the updated session
          const verifiedSession = await chatStorage.getSession(sessionToUse.id);
          const lastStoredMessage = verifiedSession?.messages?.[verifiedSession.messages.length - 1];
          console.log('[AIOverlayDashboard] Verified stored message:', {
            hasData: !!lastStoredMessage?.data,
            hasEvents: !!lastStoredMessage?.data?.events,
            eventsCount: lastStoredMessage?.data?.events?.length || 0,
            storedDataKeys: lastStoredMessage?.data ? Object.keys(lastStoredMessage.data) : []
          });
          console.log('[AIOverlayDashboard] AI response saved to chatStorage:', {
            actionType: aiMessage.data?.action?.type,
            hasEvents: !!aiMessage.data?.events,
            eventsCount: aiMessage.data?.events?.length,
            events: aiMessage.data?.events,
            messageData: aiMessage.data
          });

          // Reload session to get updated messages for UI
          const updatedSession = await chatStorage.getSession(sessionToUse.id);
          if (updatedSession) {
            setCurrentChatSession(updatedSession);
          }
        } catch (error) {
          console.error('Failed to save AI response:', error);
        }
      }

      // Handle artifact mode if specified
      if (responseData.mode) {
        setMode(responseData.mode);

        if (responseData.mode === 'focused' && responseData.focusedEvent) {
          setFocused(responseData.focusedEvent);
          openArtifactPanel();

          // If there are pending changes, set them
          if (responseData.pendingChanges) {
            setPending(responseData.pendingChanges);
          }
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
          return { success: true, message: responseData.message, action: responseData.action };
        }

        // Handle multiple events creation
        if (actionType === 'create_multiple') {
          setIsProcessing(false);
          return { success: true, message: responseData.message, action: responseData.action };
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
        } else if (actionType === 'update') {
          // Don't show toast - message will appear in chat

          // Refresh events for update
          onEventCreated();

          // Keep medium focus after action
          setTimeout(() => {
            // Keep medium focus
          }, 3000);
        } else if (actionType === 'delete') {
          // Process delete action - actually delete the events
          const deleteData = responseData.action.data;

          if (deleteData) {
            // Handle both single eventId and multiple eventIds
            const eventIdsToDelete = deleteData.eventIds || (deleteData.eventId ? [deleteData.eventId] : []);

            if (eventIdsToDelete.length > 0) {
              console.log('[AIOverlayDashboard] Deleting events:', eventIdsToDelete);

              // Delete each event
              const deletePromises = eventIdsToDelete.map(async (eventId: string) => {
                try {
                  const response = await fetch(`/api/calendar/events/${eventId}`, {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  });

                  if (!response.ok) {
                    console.error(`Failed to delete event ${eventId}:`, await response.text());
                    return false;
                  }

                  const result = await response.json();
                  console.log(`Event ${eventId} deleted:`, result);
                  return true;
                } catch (error) {
                  console.error(`Error deleting event ${eventId}:`, error);
                  return false;
                }
              });

              // Wait for all deletions to complete
              const results = await Promise.all(deletePromises);
              const successCount = results.filter(r => r).length;

              console.log(`[AIOverlayDashboard] Deleted ${successCount}/${eventIdsToDelete.length} events`);

              // Show success feedback if any events were deleted
              if (successCount > 0) {
                // Refresh events to update the UI
                onEventCreated();

                // Optional: Show a subtle visual feedback
                if (successCount < eventIdsToDelete.length) {
                  console.warn(`Some events failed to delete: ${eventIdsToDelete.length - successCount} failed`);
                }
              }
            } else {
              console.warn('[AIOverlayDashboard] No event IDs provided for deletion');
            }
          }

          // Keep medium focus after action
          setTimeout(() => {
            // Keep medium focus
          }, 3000);
        } else if (actionType === 'friend_action') {
          // Handle friend actions
          console.log('[AIOverlayDashboard] Processing friend action:', responseData.action);

          const friendAction = responseData.action.data;
          if (!friendAction) {
            console.error('No friend action data provided');
            return { success: false, message: 'Friend action data not provided' };
          }

          // Call the appropriate friend API based on the action
          if (friendAction.action === 'add' && friendAction.email) {
            // Add friend
            const friendResponse = await fetch('/api/friends/request', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email: friendAction.email }),
            });

            const friendData = await friendResponse.json();
            console.log('[AIOverlayDashboard] Friend request result:', friendData);

          } else if (friendAction.action === 'list') {
            // Get friend list
            const friendResponse = await fetch('/api/friends', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            const friendData = await friendResponse.json();
            console.log('[AIOverlayDashboard] Friend list:', friendData);
          }
        } else if (actionType === 'list' || actionType === 'search' || actionType === 'summary') {
          // Keep medium focus for search results
          console.log('[AIOverlayDashboard] Processing search/list action:', {
            actionType,
            searchData: responseData.action?.data,
            eventsReceived: responseData.events?.length || 0,
            allResponseData: responseData
          });

          // Open the artifact panel with events - even if empty
          // Set artifact data and open panel
          let aiEvents = responseData.events || [];

          // If no events in response, try to get from current calendar events
          if (aiEvents.length === 0 && responseData.action?.data?.events) {
            aiEvents = responseData.action.data.events;
          }

          // Enhanced fallback logic for different action types
          if (aiEvents.length === 0) {
            if (actionType === 'summary') {
              // For summary actions, show today's events from the main calendar
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);

              aiEvents = events.filter(event => {
                const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
                return eventStart >= today && eventStart < tomorrow;
              });

              console.log('[AIOverlayDashboard] Using today\'s events for summary:', {
                todayEventsCount: aiEvents.length,
                today: today.toISOString(),
                tomorrow: tomorrow.toISOString()
              });
            } else if (actionType === 'list' || actionType === 'search') {
              // For list/search actions, show all upcoming events if no specific results
              const now = new Date();
              aiEvents = events.filter(event => {
                const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
                return eventStart >= now;
              }).slice(0, 10); // Show max 10 upcoming events

              console.log('[AIOverlayDashboard] Using upcoming events for list/search:', {
                upcomingEventsCount: aiEvents.length
              });
            }
          }

          console.log('[AIOverlayDashboard] Setting artifact events:', {
            actionType: responseData.action?.type,
            count: aiEvents.length,
            responseDataKeys: Object.keys(responseData),
            hasActionData: !!responseData.action?.data,
            actionDataKeys: responseData.action?.data ? Object.keys(responseData.action.data) : [],
            events: aiEvents.map((e: any) => ({
              summary: e.summary,
              start: e.start,
              id: e.id
            })),
            fullEvents: aiEvents
          });

          setEvents(aiEvents);
          setUseAIFilteredEvents(true); // Use AI filtered events, don't re-filter

          // Force update to ensure state is set
          setTimeout(() => {
            console.log('[AIOverlayDashboard] Verifying artifactEvents after timeout:', {
              artifactEventsCount: artifactEvents.length,
              artifactEvents: artifactEvents
            });
          }, 100);

          console.log('[AIOverlayDashboard] After setEvents:', {
            artifactEventsState: artifactEvents.length,
            newEventsSet: aiEvents.length,
            useAIFilteredEventsState: true
          });

          // Set appropriate title based on query
          let panelTitle = locale === 'ko' ? '일정 검색 결과' : 'Search Results';
          const lowerText = text.toLowerCase();

          if (lowerText.includes('오늘') || lowerText.includes('today')) {
            panelTitle = locale === 'ko' ? '오늘의 일정' : "Today's Events";
          } else if (lowerText.includes('내일') || lowerText.includes('tomorrow')) {
            panelTitle = locale === 'ko' ? '내일의 일정' : "Tomorrow's Events";
          } else if (lowerText.includes('어제') || lowerText.includes('yesterday')) {
            panelTitle = locale === 'ko' ? '어제의 일정' : "Yesterday's Events";
          } else if (lowerText.includes('이번주') || lowerText.includes('이번 주') || lowerText.includes('this week')) {
            panelTitle = locale === 'ko' ? '이번 주 일정' : 'This Week';
          } else if (lowerText.includes('다음주') || lowerText.includes('다음 주') || lowerText.includes('next week')) {
            panelTitle = locale === 'ko' ? '다음 주 일정' : 'Next Week';
          } else if (lowerText.includes('이번달') || lowerText.includes('이번 달') || lowerText.includes('this month')) {
            panelTitle = locale === 'ko' ? '이번 달 일정' : 'This Month';
          } else if (lowerText.includes('다음달') || lowerText.includes('다음 달') || lowerText.includes('next month')) {
            panelTitle = locale === 'ko' ? '다음 달 일정' : 'Next Month';
          }

          setArtifactTitle(panelTitle);
          setArtifactQuery(text); // Store the query for real-time updates
          openArtifactPanel(undefined, text);

          // Navigate to appropriate date based on query
          if (lowerText.includes('내일') || lowerText.includes('tomorrow')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            onDateChange(tomorrow);
          } else if (lowerText.includes('어제') || lowerText.includes('yesterday')) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            onDateChange(yesterday);
          } else if (lowerText.includes('이번주') || lowerText.includes('이번 주') || lowerText.includes('this week') ||
                     lowerText.includes('다음주') || lowerText.includes('다음 주') || lowerText.includes('next week')) {
            // Navigate to the start of the relevant week
            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay()); // Go to Sunday

            if (lowerText.includes('다음주') || lowerText.includes('다음 주') || lowerText.includes('next week')) {
              weekStart.setDate(weekStart.getDate() + 7);
            }

            onDateChange(weekStart);
          } else if (lowerText.includes('이번달') || lowerText.includes('이번 달') || lowerText.includes('this month')) {
            const monthStart = new Date();
            monthStart.setDate(1);
            onDateChange(monthStart);
          } else if (lowerText.includes('다음달') || lowerText.includes('다음 달') || lowerText.includes('next month')) {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            nextMonth.setDate(1);
            onDateChange(nextMonth);
          } else if (responseData.events && responseData.events.length > 0) {
            // For other queries, use first event's date if available
            const firstEvent = responseData.events[0];
            const eventDate = new Date(firstEvent.start?.dateTime || firstEvent.start?.date || '');

            if (!isNaN(eventDate.getTime())) {
              onDateChange(eventDate);
            }
          }

          // Highlight all found events if any
          if (responseData.events && responseData.events.length > 0) {
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
      if (sessionToUse) {
        try {
          const errorAIMessage: AIMessage = {
            id: `ai-error-${Date.now()}`,
            role: 'assistant',
            content: errorMessage,
            type: 'text',
            timestamp: new Date(),
            metadata: {},
            data: {
              isError: true,
              errorType: error?.message?.includes('401') ? 'auth' : 'general'
            }
          };

          await chatStorage.addMessage(sessionToUse.id, errorAIMessage);
          console.log('[AIOverlayDashboard] Error message saved to chatStorage');

          // Reload session to get updated messages for UI
          const updatedSession = await chatStorage.getSession(sessionToUse.id);
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
        notificationIcon={
          userId ? (
            <NotificationIconButton
              userId={userId}
              events={events}
              locale={locale}
            />
          ) : null
        }
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

      {/* Main Content Container - Overlay Style */}
      <div className="relative flex-1 overflow-visible">
        {/* Background Calendar Layer */}
        <BackgroundCalendarLayer
          events={events || []}
          currentDate={currentDate}
          locale={locale}
          focusLevel={isOpen ? 'background' : backgroundFocus}
          isProcessing={isProcessing}
          highlightedEventId={highlightedEventIds.length > 0 ? highlightedEventIds[0] : currentHighlight}
          highlightedEventIds={highlightedEventIds}
          onDateChange={onDateChange}
          onEventCreated={onEventCreated}
        />

        {/* Removed status badges for cleaner UI */}

        {/* Dynamic Chat Interface - Center when no messages, bottom when chatting */}
        <AnimatePresence mode="wait">
          {(!currentChatSession || !currentChatSession.messages || currentChatSession.messages.length === 0) ? (
            /* Centered Prompt for Initial State */
            <motion.div
              key="center-prompt"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-[90%] md:max-w-[70%] lg:max-w-[60%] overflow-visible">
                {/* Title only shown in centered prompt mode */}
                <div className="text-center mb-6">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-800 dark:text-gray-200">
                    {locale === 'ko' ? '무엇을 도와드릴까요?' : 'How can I help you today?'}
                  </h2>
                </div>
                <UnifiedAIInterface
                  key="unified-ai-interface" // 고정 키로 마운트/언마운트 방지
                  onSubmit={async (text, imageData) => {
                    // Don't create session here - handleAICommand will do it when needed
                    return await handleAICommand(text, imageData || '');
                  }}
                  locale={locale}
                  isProcessing={isProcessing}
                  sessionId={sessionId}
                  focusLevel={backgroundFocus}
                  autoFocus={true}
                  userPicture={userInfo?.picture}
                  initialMessages={[]}
                  lastAIResponse={lastAIResponse}
                />
              </div>
            </motion.div>
          ) : (
            /* Bottom Chat Interface when messages exist */
            <motion.div
              key="bottom-chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-4 left-4 right-4 z-20"
            >
              <div className={`mx-auto transition-all duration-300 ${
                isOpen
                  ? 'max-w-[90%] md:max-w-[55%] lg:max-w-[50%] xl:max-w-[45%] md:ml-4'
                  : 'max-w-[90%] md:max-w-[70%] lg:max-w-[60%]'
              }`}>
                {/* Chat Messages Container */}
                <motion.div
                  initial={{ opacity: 0, y: 20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: 20, height: 0 }}
                  className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 mb-3 max-h-[400px] overflow-hidden"
                >
                  {/* Chat Header */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {locale === 'ko' ? 'AI 어시스턴트' : 'AI Assistant'}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {currentChatSession.messages.length} {locale === 'ko' ? '메시지' : 'messages'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleNewChat}
                        className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title={locale === 'ko' ? '새 대화 (Cmd+K)' : 'New Chat (Cmd+K)'}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Messages List */}
                  <div className="p-4 space-y-3 overflow-y-auto max-h-[350px]">
                    {currentChatSession.messages.map((message, index) => {
                      const isLastAssistantMessage =
                        index === currentChatSession.messages.length - 1 &&
                        message.role === 'assistant';

                      // Debug log for artifact events
                      const shouldShowArtifact = message.role === 'assistant' &&
                        message.data?.action &&
                        (message.data.action.type === 'list' || message.data.action.type === 'search');

                      // Use events from message data if available, otherwise use current artifactEvents
                      const messageEvents = message.data?.events ||
                        (shouldShowArtifact && isLastAssistantMessage ? artifactEvents : []);

                      // console.log('[AIOverlayDashboard] Message artifact check:', {
                      //   messageId: message.id,
                      //   role: message.role,
                      //   hasAction: !!message.data?.action,
                      //   actionType: message.data?.action?.type,
                      //   hasEventsInData: !!message.data?.events,
                      //   eventsInDataCount: message.data?.events?.length || 0,
                      //   eventsArray: message.data?.events,
                      //   isEventsArray: Array.isArray(message.data?.events),
                      //   shouldShowArtifact,
                      //   isLastAssistantMessage,
                      //   messageEventsCount: messageEvents.length,
                      //   messageEvents: messageEvents,
                      //   currentArtifactEventsCount: artifactEvents.length,
                      //   fullMessageData: JSON.stringify(message.data)
                      // });

                      return (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          locale={locale}
                          isTyping={isProcessing && isLastAssistantMessage}
                          artifactEvents={messageEvents}
                          artifactTitle={artifactTitle}
                          onArtifactOpen={() => {
                            // Set the artifact events from this specific message
                            if (messageEvents && messageEvents.length > 0) {
                              setEvents(messageEvents);
                              setUseAIFilteredEvents(true);
                            }
                            openArtifactPanel();
                          }}
                          onArtifactClose={() => {
                            closeArtifactPanel();
                            setMode('list');
                            setFocused(null);
                            setPending(null);
                            setUseAIFilteredEvents(false);
                          }}
                          userPicture={userInfo?.picture}
                        />
                      );
                    })}

                    {/* Typing Indicator */}
                    {isProcessing && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Input Prompt Area - Bottom position when messages exist */}
                <UnifiedAIInterface
                  onSubmit={async (text, imageData) => {
                    return await handleAICommand(text, imageData || '');
                  }}
                  locale={locale}
                  isProcessing={isProcessing}
                  sessionId={sessionId}
                  focusLevel={backgroundFocus}
                  autoFocus={false}
                  initialMessages={[]}
                  userPicture={userInfo?.picture}
                  lastAIResponse={lastAIResponse}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Artifact Panel - Floating on Right Side */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 250,
              duration: 0.4
            }}
            className="hidden md:block fixed right-0 top-0 h-full w-[400px] lg:w-[450px] xl:w-[500px] bg-white dark:bg-gray-900 shadow-2xl z-30 border-l border-gray-200 dark:border-gray-800"
            >
              <OptimizedEventsArtifactPanel
                locale={locale}
                userId={userId || ''}
                authToken={getAuthToken()}
                onEventEdit={(eventId) => {
                  // 이벤트 편집 로직
                  console.log('Edit event:', eventId);
                }}
                onEventDelete={(eventId) => {
                  // 이벤트 삭제 로직
                  deleteEvent(eventId);
                }}
                onRefresh={() => {
                  // 새로고침 로직
                  onEventCreated();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Artifact Panel (Bottom Sheet) */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 250,
                duration: 0.4
              }}
              className="md:hidden fixed inset-x-0 bottom-0 h-[75vh] max-h-[600px] bg-white dark:bg-gray-900 shadow-2xl z-50 border-t-2 border-gray-200 dark:border-gray-800 rounded-t-2xl overflow-hidden"
            >
              <OptimizedEventsArtifactPanel
                locale={locale}
                userId={userId || ''}
                authToken={getAuthToken()}
                onEventEdit={(eventId) => {
                  // 이벤트 편집 로직
                  console.log('Edit event:', eventId);
                }}
                onEventDelete={(eventId) => {
                  // 이벤트 삭제 로직
                  deleteEvent(eventId);
                }}
                onRefresh={() => {
                  // 새로고침 로직
                  onEventCreated();
                }}
              />
          </motion.div>
        )}
      </AnimatePresence>

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
            backgroundFocus={backgroundFocus}
            onBackgroundFocusChange={handleManualFocusChange}
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
          toast.info(
            locale === 'ko' ? '일정 선택됨' : 'Event Selected',
            event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled')
          );
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

