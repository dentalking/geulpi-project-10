'use client';

import { useState, useEffect, Suspense, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useToastContext } from '@/providers/ToastProvider';
import { useEvents, useCalendarView } from '@/contexts/EventContext';
import type { CalendarEvent } from '@/types';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

// 통합 상태 관리 import
import { UnifiedEventProvider } from '@/providers/UnifiedEventProvider';
import { motion } from 'framer-motion';
import { useTheme } from '@/providers/ThemeProvider';
import { 
  Bell, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Layout
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { FullPageLoader, CalendarSkeleton } from '@/components/LoadingStates';
import { MobileBottomNav } from '@/components/MobileNavigation';
import { UnifiedSidebar, UnifiedHeader } from '@/components/UnifiedSidebar';
import { UnifiedCalendarView } from '@/components/MobileCalendarView';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { FriendsManager } from '@/components/FriendsManager';
import { EventSharingModal } from '@/components/EventSharingModal';
import { ProfilePanel } from '@/components/ProfilePanel';
import { ScrollAnimation, ScrollStagger } from '@/components/ScrollAnimation';
// import { useKeyboardShortcuts } from '@/components/KeyboardNavigation';
import { PullToRefresh, Swipeable, BottomSheet } from '@/components/MobileInteractions';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { UnifiedEventModal } from '@/components/UnifiedEventModal';
import { fetchWithRetry } from '@/hooks/useRetry';
import { AIOverlayDashboard } from '@/components/AIOverlayDashboard';
import { chatStorage } from '@/utils/chatStorage';
import { SearchModal } from '@/components/SearchModal';
import { Modal, ModalBody } from '@/components/ui';
import { useSupabaseNotifications } from '@/hooks/useSupabaseNotifications';
import SimpleNotificationWidget from '@/components/SimpleNotificationWidget';
import NotificationIconButton from '@/components/NotificationIconButton';

// Use Next.js dynamic import for better code splitting
const GoogleCalendarLink = dynamic(() => import('@/components/GoogleCalendarLink'), {
  ssr: false,
  loading: () => null
});
const SettingsPanel = dynamic(() => import('@/components/SettingsPanel'), {
  ssr: false,
  loading: () => null
});

export default function SimplifiedDashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToastContext();

  // EventContext hooks
  const {
    events,
    selectedEvent,
    setEvents,
    selectEvent,
    setLoading: setContextLoading,
    isLoading: contextLoading
  } = useEvents();

  const {
    date: selectedDate,
    setDate: setSelectedDate,
    view: viewType,
    setView: setViewType
  } = useCalendarView();

  // Core states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [spotlightEvent, setSpotlightEvent] = useState<{ id: string; date: Date; title: string } | null>(null);
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const [userInfo, setUserInfo] = useState<{ id?: string; email?: string; name?: string; picture?: string } | null>(null);
  const isInitializedRef = useRef(false);
  const isSyncingRef = useRef(false);
  
  // UI states
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showEventSharing, setShowEventSharing] = useState(false);
  const [eventToShare, setEventToShare] = useState<CalendarEvent | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [isMobile, setIsMobile] = useState(false);
  
  // Dashboard view mode - Feature flag for overlay dashboard
  const [dashboardView, setDashboardView] = useState<'classic' | 'overlay'>(() => {
    // Check localStorage for user preference, default to classic for safety
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-view');
      // Migrate from old modes to overlay
      if (saved === 'ai-first' || saved === 'enhanced') {
        localStorage.setItem('dashboard-view', 'overlay');
        return 'overlay';
      }
      return saved as 'classic' | 'overlay' || 'classic';
    }
    return 'classic';
  });

  // Debug logging for view modes
  useEffect(() => {
    console.log('[Dashboard] Current view mode:', {
      dashboardView,
      isRendering: dashboardView === 'overlay' ? 'Overlay' : 'Classic'
    });
  }, [dashboardView]);
  
  // Dashboard view cycle function
  const cycleDashboardView = useCallback(() => {
    const views: ('classic' | 'overlay')[] = ['classic', 'overlay'];
    const currentIndex = views.indexOf(dashboardView);
    const newView = views[(currentIndex + 1) % views.length];
    setDashboardView(newView);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-view', newView);
    }
    const messages = {
      'classic': locale === 'ko' ? '클래식 대시보드로 전환했습니다' : 'Switched to Classic Dashboard',
      'overlay': locale === 'ko' ? 'AI 오버레이 대시보드로 전환했습니다' : 'Switched to AI Overlay Dashboard'
    };
    toast.success(messages[newView]);
  }, [dashboardView, locale, toast]);

  // Open AI chat with event context
  const handleOpenAIChatWithEvent = useCallback((event?: CalendarEvent) => {
    // Store event context for AI chat
    if (event) {
      localStorage.setItem('ai-chat-event-context', JSON.stringify({
        id: event.id,
        title: event.summary,
        date: event.start?.dateTime || event.start?.date,
        location: event.location,
        description: event.description
      }));
    }
    // Switch to AI overlay
    setDashboardView('overlay');
  }, []);
  
  // Sync events when switching to overlay mode if needed
  useEffect(() => {
    if (dashboardView === 'overlay' && (!events || events.length === 0) && isAuthenticated && !isSyncingRef.current) {
      console.log('[Dashboard] Forcing sync for overlay mode');
      isSyncingRef.current = true;
      setSyncStatus('syncing');
      fetch(`/api/calendar/sync?sessionId=${sessionIdRef.current}`)
        .then(response => response.json())
        .then(data => {
          console.log('[Dashboard] Overlay sync response:', {
            success: data.success,
            eventCount: data.data?.events?.length || 0,
            source: data.data?.source,
            data: data
          });
          if (data.success && data.data) {
            setEvents(data.data.events || []);
            setLastSyncTime(new Date());
            setSyncStatus('success');
          } else {
            setSyncStatus('error');
            console.error('[Dashboard] Sync failed:', data.error);
          }
        })
        .catch(error => {
          console.error('Event sync failed:', error);
          setSyncStatus('error');
        })
        .finally(() => {
          isSyncingRef.current = false;
        });
    }
  }, [dashboardView, isAuthenticated]);

  // Note: No longer redirecting for one-line mode - rendering inline instead

  // Mobile Bottom Sheet for event details
  const [showEventBottomSheet, setShowEventBottomSheet] = useState(false);

  // Initialize Supabase notifications
  const [userId, setUserId] = useState<string | null>(null);

  // Use Supabase notifications hook
  const { markAsRead, dismissNotification, markAllAsRead } = useSupabaseNotifications(userId || undefined);

  // Notification permission setup - moved to checkAuth function

  // Schedule notifications for events when they are loaded
  // Disabled - causing excessive API calls and authentication errors
  // TODO: Implement proper notification scheduling strategy
  /*
  useEffect(() => {
    if (events && events.length > 0 && isAuthenticated) {
      // Schedule notifications for each event via API
      events.forEach(async (event) => {
        if (event.start?.dateTime || event.start?.date) {
          try {
            await fetch('/api/notifications/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include', // Include cookies for authentication
              body: JSON.stringify({ event })
            });
          } catch (error) {
            console.error('Failed to schedule notifications for event:', error);
          }
        }
      });
    }
  }, [events, isAuthenticated]);
  */

  // Memoized notification count (legacy - for simple display)
  const notificationCount = useMemo(() => {
    // events가 undefined나 null일 경우를 처리
    if (!events || !Array.isArray(events)) {
      return 0;
    }
    return events.filter(e => {
      const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
      const now = new Date();
      const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      return eventDate >= now && eventDate <= hourFromNow;
    }).length;
  }, [events]);
  
  const checkAuth = async () => {
    if (isInitializedRef.current) return; // Prevent multiple initializations
    isInitializedRef.current = true;

    try {
      const response = await fetchWithRetry('/api/auth/status', {
        retryOptions: {
          maxAttempts: 2,
          delay: 500,
          backoff: 'linear'
        }
      });
      const data = await response.json();
      console.log('Auth status response:', data);

      const authenticated = data.data?.authenticated || false;
      const user = data.data?.user || null;

      setIsAuthenticated(authenticated);

      if (authenticated && user) {
        console.log('Setting user info:', user);
        setUserInfo(user);
        setUserId(user.id);

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }

      if (!authenticated) {
        console.log('Not authenticated, redirecting to landing');
        router.push(`/${locale}/landing`);
      } else {
        console.log('Authentication successful, staying on dashboard');
      }
    } catch (error) {
      console.error('Auth check failed after retries:', error);
      router.push(`/${locale}/landing`);
    } finally {
      setLoading(false);
    }
  };
  
  // Manual sync function for user-triggered syncs with retry logic
  const syncEvents = useCallback(async () => {
    if (isSyncingRef.current) {
      console.log('[Dashboard] Sync already in progress, skipping');
      return;
    }

    console.log('[Dashboard] Manual sync triggered');
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    try {
      const response = await fetchWithRetry(
        `/api/calendar/sync?sessionId=${sessionIdRef.current}`,
        {
          retryOptions: {
            maxAttempts: 3,
            delay: 1000,
            backoff: 'exponential',
            onRetry: (attempt) => {
              console.log(`Retrying event sync... Attempt ${attempt}`);
              toast.info(`재시도 중... (${attempt}/3)`);
            }
          }
        }
      );
      const data = await response.json();
      console.log('[Dashboard] Manual sync response:', {
        success: data.success,
        eventCount: data.data?.events?.length || 0,
        source: data.data?.source,
        error: data.error
      });

      if (data.success && data.data) {
        const receivedEvents = data.data.events || [];
        console.log('[Dashboard] Setting events from manual sync:', receivedEvents.length);
        setEvents(receivedEvents);
        setLastSyncTime(new Date());
        setSyncStatus('success');
        toast.success(`${t('dashboard.sync.success')} (${receivedEvents.length} events)`);
      } else {
        setSyncStatus('error');
        toast.error(data.error?.message || t('dashboard.sync.failed'));
        console.error('[Dashboard] Sync error:', data.error);
      }
    } catch (error) {
      console.error('Event sync failed after retries:', error);
      setSyncStatus('error');
      toast.error(`${t('dashboard.sync.failed')} - 네트워크 연결을 확인해주세요`);
    } finally {
      isSyncingRef.current = false;
    }
  }, [t, toast]);
  
  // Remove the handleEventClick function - let the calendar component handle event clicks internally
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  // Initial sync on authentication - NO dependencies on syncEvents to prevent loops
  useEffect(() => {
    if (!isAuthenticated || isSyncingRef.current) return;

    console.log('[Dashboard] Initial sync - isAuthenticated:', isAuthenticated);
    console.log('[Dashboard] Dashboard view:', dashboardView);

    isSyncingRef.current = true;
    setSyncStatus('syncing');
    fetch(`/api/calendar/sync?sessionId=${sessionIdRef.current}`)
      .then(response => response.json())
      .then(data => {
        console.log('[Dashboard] Sync response:', data);
        if (data.success && data.data) {
          const receivedEvents = data.data.events || [];
          console.log('[Dashboard] Setting events:', receivedEvents.length, 'events');
          setEvents(receivedEvents);
          setLastSyncTime(new Date());
          setSyncStatus('success');
          toast.success(t('dashboard.sync.success'));
        } else {
          setSyncStatus('error');
          toast.error(t('dashboard.sync.failed'));
        }
      })
      .catch(error => {
        console.error('Event sync failed:', error);
        setSyncStatus('error');
        toast.error(t('dashboard.sync.failed'));
      })
      .finally(() => {
        isSyncingRef.current = false;
      });
  }, [isAuthenticated]); // Only depend on isAuthenticated to run once on login
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts with improved hook - temporarily disabled
  /*
  const shortcuts = useMemo(() => [
    { 
      key: 'ArrowLeft', 
      ctrl: true, 
      action: () => {
        const prevMonth = new Date(currentDate);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        setCurrentDate(prevMonth);
      },
      description: '이전 달'
    },
    { 
      key: 'ArrowRight', 
      ctrl: true, 
      action: () => {
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setCurrentDate(nextMonth);
      },
      description: '다음 달'
    },
    { 
      key: 't', 
      ctrl: true, 
      action: () => setCurrentDate(new Date()),
      description: '오늘로 이동'
    },
    { 
      key: 'n', 
      ctrl: true, 
      action: () => cycleDashboardView(),
      description: 'AI 오버레이 전환'
    },
    { 
      key: 'm', 
      ctrl: true, 
      action: () => setShowSidebar(!showSidebar),
      description: '메뉴 토글'
    },
    { 
      key: '/', 
      action: () => cycleDashboardView(),
      description: 'AI 오버레이 전환'
    },
    { 
      key: 'Escape', 
      action: () => {
        setShowSidebar(false);
        setShowSettings(false);
        setShowNotifications(false);
        setShowSubscription(false);
        setShowFriends(false);
        setShowProfile(false);
      },
      description: '모든 창 닫기'
    }
  ], [currentDate, showSidebar]);

  useKeyboardShortcuts(shortcuts);
  */
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <DashboardSkeleton />
      </div>
    );
  }
  
  return (
    <UnifiedEventProvider
      userId={userInfo?.id}
      authToken={undefined} // JWT 토큰이 있다면 여기에 전달
      enabled={isAuthenticated}
    >
      <div className="min-h-screen pb-safe-bottom" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Unified Header for both mobile and desktop - Hide in overlay mode */}
      {dashboardView === 'classic' && (
        <div className="logo-container">
          <UnifiedHeader
            onMenuClick={() => setShowSidebar(true)}
            onSearchClick={() => setShowSearch(true)}
            onAddEvent={cycleDashboardView}
            showMenuButton={true}
            isMobile={isMobile}
            notificationIcon={
              isAuthenticated && userInfo?.id ? (
                <NotificationIconButton
                  userId={userInfo.id}
                  events={events}
                  locale={locale}
                />
              ) : null
            }
          />
        </div>
      )}

      {/* Simple Notification Widget - Show only in classic view and when authenticated */}
      {/* Notification widget now accessed via NotificationIconButton in header */}

      {/* Unified Sidebar for both mobile and desktop */}
      <UnifiedSidebar 
        isOpen={showSidebar} 
        onClose={() => setShowSidebar(false)}
        onSearchClick={() => {
          setShowSidebar(false);
          setShowSearch(true);
        }}
        onSettingsClick={() => {
          console.log('[Dashboard] Settings clicked, opening settings modal');
          setShowSidebar(false);
          setShowSettings(true);
        }}
        onSubscriptionClick={() => {
          setShowSidebar(false);
          setShowSubscription(true);
        }}
        onFriendsClick={() => {
          setShowSidebar(false);
          router.push(`/${locale}/friends`);
        }}
        onProfileClick={() => {
          console.log('Dashboard: onProfileClick called - opening profile');
          setShowSidebar(false);
          setShowProfile(true);
        }}
        onAIChatClick={() => {
          setShowSidebar(false);
          // AI 오버레이로 전환 (새 채팅) - 활성 세션 클리어는 UnifiedSidebar에서 이미 처리
          setDashboardView('overlay');
        }}
        onChatClick={async (chatId: string) => {
          setShowSidebar(false);
          // 특정 채팅을 활성 세션으로 설정
          await chatStorage.setActiveSession(chatId);
          console.log('[Dashboard] Loading specific chat:', chatId);
          // AI 오버레이로 전환 - AIOverlayDashboard가 폴링으로 감지하여 자동 로드
          setDashboardView('overlay');
        }}
        isMobile={isMobile}
        userInfo={userInfo}
      />
      
      {/* Main Content - Optimized for Mobile */}
      <main className={`main-content ${dashboardView === 'overlay' ? '' : isMobile ? '' : 'max-w-[1600px] mx-auto px-2 sm:px-4 py-2'}`}>
        
        {/* Month Navigation and Actions Bar - Hide in overlay mode */}
        {dashboardView === 'classic' && (
          <div className={`month-navigation ${isMobile ? 'sticky top-[56px]' : ''} backdrop-blur-xl border-b`}
               style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', zIndex: 20 }}>
            <div className="flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-2">
              {/* Today button - Moved to the left */}
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ 
                  background: 'var(--surface-secondary)', 
                  color: 'var(--text-secondary)' 
                }}
              >
                {t('dashboard.today')}
              </button>
              
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}
                className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={t('dashboard.previousMonth')}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <h2 className="px-3 text-lg font-semibold">
                {currentDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </h2>
              
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentDate(newDate);
                }}
                className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={t('dashboard.nextMonth')}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Google Calendar Sync */}
              <div className="google-sync-button">
                <GoogleCalendarLink
                  currentDate={currentDate}
                  currentView="month"
                  lastSyncTime={lastSyncTime}
                  syncStatus={syncStatus}
                  onSync={syncEvents}
                />
              </div>

              {/* Legacy Notifications - If any */}
              {notificationCount > 0 && false && (
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg transition-all relative hover:bg-gray-100 dark:hover:bg-gray-800"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                </button>
              )}
            </div>
          </div>
          </div>
        )}
        
        {/* Dashboard Content - Conditional Rendering */}
        <ScrollAnimation animation="fadeUp" delay={0.1}>
          {dashboardView === 'overlay' ? (
            // AI Overlay Dashboard View - Full screen with medium opacity background
            <div className="fixed inset-0 z-40">
              <AIOverlayDashboard
                locale={locale as 'ko' | 'en'}
                userId={userInfo?.id}
                events={events}
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                onEventCreated={syncEvents}
                highlightedEventId={highlightedEventId}
                spotlightEvent={spotlightEvent}
                sessionId={sessionIdRef.current}
                userInfo={userInfo}
                onViewToggle={cycleDashboardView}
              />
            </div>
          ) : (
            // Classic Calendar View
            <div>
            {isMobile ? (
            // Mobile view with pull-to-refresh and swipe gestures
            <PullToRefresh onRefresh={syncEvents} threshold={80}>
              <div className="calendar-container" style={{ height: 'calc(100vh - 160px)' }}>
                  <Swipeable
                    onSwipeLeft={() => {
                      // Next month
                      const nextMonth = new Date(currentDate);
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      setCurrentDate(nextMonth);
                      toast.info(`${nextMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`);
                    }}
                    onSwipeRight={() => {
                      // Previous month
                      const prevMonth = new Date(currentDate);
                      prevMonth.setMonth(prevMonth.getMonth() - 1);
                      setCurrentDate(prevMonth);
                      toast.info(`${prevMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`);
                    }}
                    threshold={50}
                  >
                    <UnifiedCalendarView
                      events={events || []}
                      currentDate={currentDate}
                      locale={locale as 'ko' | 'en'}
                      isDesktop={false}
                      highlightedEventId={highlightedEventId}
                      spotlightEvent={spotlightEvent}
                      onEventClick={(event) => {
                        if (event.start) {
                          const eventDate = new Date(event.start.dateTime || event.start.date || '');
                          setSelectedDate(eventDate);
                          // Open bottom sheet for mobile
                          selectEvent(event);
                          setShowEventBottomSheet(true);
                        }
                      }}
                      onDateClick={(date) => {
                        setSelectedDate(date);
                      }}
                      onAddEvent={cycleDashboardView}
                      onEventCreated={() => {
                        syncEvents();
                      }}
                      onOpenAIChat={handleOpenAIChatWithEvent}
                    >
                      <div />
                    </UnifiedCalendarView>
                  </Swipeable>
              </div>
            </PullToRefresh>
          ) : (
            // Desktop view without pull-to-refresh - optimized for larger display
            <div className="calendar-container mt-2" style={{ height: '82vh' }}>
                <div className="backdrop-blur-xl rounded-lg border overflow-hidden"
                     style={{
                       background: 'var(--surface-primary)',
                       borderColor: 'var(--glass-border)',
                       height: '100%'
                     }}>
                  <UnifiedCalendarView
                    events={events || []}
                    currentDate={currentDate}
                    locale={locale as 'ko' | 'en'}
                    isDesktop={true}
                    highlightedEventId={highlightedEventId}
                    spotlightEvent={spotlightEvent}
                    onEventClick={(event) => {
                      if (event.start) {
                        const eventDate = new Date(event.start.dateTime || event.start.date || '');
                        setSelectedDate(eventDate);
                        // Show event detail modal for desktop too
                        selectEvent(event);
                        setShowEventBottomSheet(true);
                      }
                    }}
                    onDateClick={(date) => {
                      setSelectedDate(date);
                    }}
                    onAddEvent={cycleDashboardView}
                    onEventCreated={() => {
                      syncEvents();
                    }}
                    onOpenAIChat={handleOpenAIChatWithEvent}
                  >
                    <div />
                  </UnifiedCalendarView>
                </div>
            </div>
            )}
            </div>
          )}
        </ScrollAnimation>
        
      </main>
      
      {/* Settings Panel */}
      <Suspense fallback={null}>
        {showSettings && (
          <>
            {console.log('[Dashboard] Rendering SettingsPanel, showSettings:', showSettings)}
            <SettingsPanel 
              isOpen={showSettings} 
              onClose={() => {
                console.log('[Dashboard] Closing settings modal');
                setShowSettings(false);
              }} 
              showTriggerButton={false}
            />
          </>
        )}
      </Suspense>
      
      {/* Simple Notifications */}
      {showNotifications && notificationCount > 0 && (
        <div className="fixed top-16 right-6 z-50 w-80 p-4 backdrop-blur-xl border rounded-xl"
             style={{ background: 'var(--surface-overlay)', borderColor: 'var(--glass-border)' }}>
          <h3 className="font-semibold mb-2">{t('dashboard.upcomingEvents')}</h3>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {notificationCount} {t('dashboard.eventsInNextHour')}
          </div>
        </div>
      )}
      
      
      {/* Subscription Management Modal */}
      <SubscriptionManagement
        isOpen={showSubscription}
        onClose={() => setShowSubscription(false)}
      />
      
      {/* Friends Manager */}
      <FriendsManager
        isOpen={showFriends}
        onClose={() => setShowFriends(false)}
      />
      
      {/* Search Modal */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectEvent={(event) => {
          // Handle event selection - could open event detail modal or navigate to date
          setSelectedDate(new Date(event.start?.dateTime || event.start?.date || new Date()));
          setHighlightedEventId(event.id || null);
          toast.success(locale === 'ko' ? '일정을 선택했습니다' : 'Event selected');
        }}
      />
      
      {/* Profile Panel */}
      <ProfilePanel
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
      
      {/* Event Sharing Modal */}
      <EventSharingModal
        isOpen={showEventSharing}
        onClose={() => {
          setShowEventSharing(false);
          setEventToShare(null);
        }}
        event={eventToShare}
        onEventUpdated={() => {
          syncEvents();
        }}
      />
      
      {/* Unified Event Detail Modal */}
      <UnifiedEventModal
        isOpen={showEventBottomSheet}
        onClose={() => {
          setShowEventBottomSheet(false);
          selectEvent(null);
        }}
        event={selectedEvent}
        onEdit={(event) => {
          // Edit event logic
          setShowEventBottomSheet(false);
          // AI 오버레이로 전환하여 수정
          setDashboardView('overlay');
        }}
        onDelete={async (event) => {
          // Delete event logic
          if (confirm('이 일정을 삭제하시겠습니까?')) {
            try {
              const response = await fetch(`/api/calendar/events/${event.id}`, {
                method: 'DELETE',
                credentials: 'include'
              });
              if (response.ok) {
                toast.success(t('eventDeleted'));
                setShowEventBottomSheet(false);
                selectEvent(null);
                syncEvents();
              }
            } catch (error) {
              toast.error(t('errorDeletingEvent'));
            }
          }
        }}
        locale={locale}
        enableAI={true}
        onChat={(event) => {
          setShowEventBottomSheet(false);
          setDashboardView('overlay');
        }}
        onShare={(event) => {
          setEventToShare(event);
          setShowEventSharing(true);
        }}
      />
      </div>
    </UnifiedEventProvider>
  );
}