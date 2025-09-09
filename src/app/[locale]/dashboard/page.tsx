'use client';

import { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { useToastContext } from '@/providers/ToastProvider';
import type { CalendarEvent } from '@/types';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Bell, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { FullPageLoader, CalendarSkeleton } from '@/components/LoadingStates';
import { MobileBottomNav } from '@/components/MobileNavigation';
import { UnifiedSidebar, UnifiedHeader } from '@/components/UnifiedSidebar';
import { UnifiedCalendarView } from '@/components/MobileCalendarView';
import { AIChatInterface } from '@/components/AIChatInterface';
import { EmptyState } from '@/components/EmptyState';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { FriendsList } from '@/components/FriendsList';
import { ProfilePanel } from '@/components/ProfilePanel';

// Lazy load heavy components
const GoogleCalendarLink = lazy(() => import('@/components/GoogleCalendarLink'));
const SettingsPanel = lazy(() => import('@/components/SettingsPanel'));

export default function SimplifiedDashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToastContext();
  
  // Core states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [spotlightEvent, setSpotlightEvent] = useState<{ id: string; date: Date; title: string } | null>(null);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [userInfo, setUserInfo] = useState<{ id?: string; email?: string; name?: string; picture?: string } | null>(null);
  
  // UI states
  const [showSettings, setShowSettings] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(undefined);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [isMobile, setIsMobile] = useState(false);
  
  // Memoized notification count
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
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      console.log('Auth status response:', data); // Debug log
      setIsAuthenticated(data.authenticated);
      
      if (data.authenticated && data.user) {
        console.log('Setting user info:', data.user); // Debug log
        setUserInfo(data.user);
      }
      
      if (!data.authenticated) {
        router.push('/landing');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/landing');
    } finally {
      setLoading(false);
    }
  };
  
  // Manual sync function for user-triggered syncs
  const syncEvents = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const response = await fetch(`/api/calendar/sync?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success && data.data) {
        setEvents(data.data.events || []);
        setLastSyncTime(new Date());
        setSyncStatus('success');
        toast.success(t('dashboard.sync.success'));
      } else {
        setSyncStatus('error');
        toast.error(t('dashboard.sync.failed'));
      }
    } catch (error) {
      console.error('Event sync failed:', error);
      setSyncStatus('error');
      toast.error(t('dashboard.sync.failed'));
    }
  }, [sessionId, t, toast]);
  
  // Remove the handleEventClick function - let the calendar component handle event clicks internally
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  // Initial sync on authentication - NO dependencies on syncEvents to prevent loops
  useEffect(() => {
    if (!isAuthenticated) return;
    
    setSyncStatus('syncing');
    fetch(`/api/calendar/sync?sessionId=${sessionId}`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.data) {
          setEvents(data.data.events || []);
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch(e.key) {
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            // Previous month
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() - 1);
            setCurrentDate(newDate);
          }
          break;
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            // Next month
            const newDate = new Date(currentDate);
            newDate.setMonth(newDate.getMonth() + 1);
            setCurrentDate(newDate);
          }
          break;
        case 't':
          if (e.ctrlKey || e.metaKey) {
            // Today
            e.preventDefault();
            setCurrentDate(new Date());
          }
          break;
        case 'm':
          if (e.ctrlKey || e.metaKey) {
            // Toggle menu/sidebar
            e.preventDefault();
            setShowSidebar(!showSidebar);
          }
          break;
        case '/':
          // Open AI chat
          e.preventDefault();
          setShowAIChat(true);
          break;
        case 'Escape':
          // Close modals
          setShowSidebar(false);
          setShowSettings(false);
          setShowAIChat(false);
          setShowNotifications(false);
          setShowSubscription(false);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDate]);
  
  if (loading) {
    return <FullPageLoader message={t('common.loading')} />;
  }
  
  return (
    <div className="min-h-screen pb-safe-bottom" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Unified Header for both mobile and desktop */}
      <UnifiedHeader 
        onMenuClick={() => setShowSidebar(true)}
        onSearchClick={() => router.push(`/${locale}/search`)}
        onAddEvent={() => setShowAIChat(true)}
        showMenuButton={true}
        isMobile={isMobile}
      />
      
      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav onAddEvent={() => setShowAIChat(true)} />
      )}
      
      {/* Unified Sidebar for both mobile and desktop */}
      <UnifiedSidebar 
        isOpen={showSidebar} 
        onClose={() => setShowSidebar(false)}
        onSettingsClick={() => {
          setShowSidebar(false);
          setShowSettings(true);
        }}
        onSubscriptionClick={() => {
          setShowSidebar(false);
          setShowSubscription(true);
        }}
        onFriendsClick={() => {
          setShowSidebar(false);
          setShowFriends(true);
        }}
        onProfileClick={() => {
          console.log('Dashboard: onProfileClick called - opening profile');
          setShowSidebar(false);
          setShowProfile(true);
        }}
        onAIChatClick={() => {
          setShowSidebar(false);
          setCurrentChatId(undefined); // 새 채팅
          setShowAIChat(true);
        }}
        onChatClick={(chatId: string) => {
          setShowSidebar(false);
          setCurrentChatId(chatId); // 특정 채팅 불러오기
          setShowAIChat(true);
        }}
        isMobile={isMobile}
        userInfo={userInfo}
      />
      
      {/* Main Content - Optimized for Mobile */}
      <main className={`${isMobile ? '' : 'max-w-[1400px] mx-auto px-4 sm:px-6 py-4'}`}>
        
        {/* Month Navigation and Actions Bar */}
        <div className={`${isMobile ? 'sticky top-[56px]' : ''} backdrop-blur-xl border-b`}
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
              {/* Google Calendar Sync - Moved to the top row */}
              <Suspense fallback={null}>
                <GoogleCalendarLink
                  currentDate={currentDate}
                  currentView="month"
                  lastSyncTime={lastSyncTime}
                  syncStatus={syncStatus}
                  onSync={syncEvents}
                />
              </Suspense>
              
              {/* Notifications - If any */}
              {notificationCount > 0 && (
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
        
        {/* Calendar */}
        <div className={isMobile ? '' : 'mt-4'} style={{ height: isMobile ? 'calc(100vh - 160px)' : '75vh' }}>
          {events && events.length > 0 ? (
            <div className={isMobile ? '' : 'backdrop-blur-xl rounded-xl border overflow-hidden'}
                 style={isMobile ? {} : { 
                   background: 'var(--surface-primary)', 
                   borderColor: 'var(--glass-border)',
                   height: '100%'
                 }}>
              <UnifiedCalendarView
                events={events}
                currentDate={currentDate}
                locale={locale}
                isDesktop={!isMobile}
                highlightedEventId={highlightedEventId}
                spotlightEvent={spotlightEvent}
                onEventClick={(event) => {
                  // Let the calendar component handle event clicks internally with its modal system
                  if (event.start) {
                    const eventDate = new Date(event.start.dateTime || event.start.date || '');
                    setSelectedDate(eventDate);
                  }
                }}
                onDateClick={(date) => {
                  setSelectedDate(date);
                }}
                onAddEvent={() => setShowAIChat(true)}
                onEventCreated={() => {
                  // Refresh events after creation
                  syncEvents();
                }}
              >
                <div />
              </UnifiedCalendarView>
            </div>
          ) : (
            <EmptyState onAddEvent={() => setShowAIChat(true)} />
          )}
        </div>
        
      </main>
      
      {/* Settings Panel */}
      <Suspense fallback={null}>
        {showSettings && (
          <SettingsPanel 
            isOpen={showSettings} 
            onClose={() => setShowSettings(false)} 
            showTriggerButton={false}
          />
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
      
      {/* AI Chat Interface */}
      <AIChatInterface
        isOpen={showAIChat}
        locale={locale as 'ko' | 'en'}
        userId={userInfo?.id}
        onClose={() => {
          setShowAIChat(false);
          setCurrentChatId(undefined); // 채팅창 닫을 때 ID 리셋
        }}
        onSubmit={async (input, type) => {
          console.log('AI Chat event created:', { input, type });
          // 캘린더 새로고침
          await syncEvents();
        }}
        onEventCreated={async (eventId, eventData) => {
          // 이벤트 정보로 스포트라이트 모드 설정
          if (eventId && eventData) {
            const eventDate = new Date(eventData.date);
            
            // 해당 월로 이동 (필요한 경우)
            if (eventDate.getMonth() !== currentDate.getMonth() || 
                eventDate.getFullYear() !== currentDate.getFullYear()) {
              setCurrentDate(eventDate);
            }
            
            // 채팅창 페이드아웃 후 스포트라이트 시작
            setTimeout(() => {
              setShowAIChat(false);
              setSpotlightEvent({
                id: eventId,
                date: eventDate,
                title: eventData.title
              });
            }, 300);
          }
          
          // 캘린더 새로고침
          await syncEvents();
          
          // 4초 후 스포트라이트 모드 종료
          setTimeout(() => {
            setSpotlightEvent(null);
            // 채팅창 부드럽게 다시 열기
            setTimeout(() => {
              setShowAIChat(true);
            }, 500);
          }, 4000);
        }}
        initialChatId={currentChatId}
      />
      
      {/* Subscription Management Modal */}
      <SubscriptionManagement
        isOpen={showSubscription}
        onClose={() => setShowSubscription(false)}
      />
      
      {/* Friends Modal */}
      {showFriends && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-4xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-y-auto">
            <div className="sticky top-0 z-10 p-4 border-b bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">친구 관리</h2>
                <button
                  onClick={() => setShowFriends(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <FriendsList />
          </div>
        </div>
      )}
      
      {/* Profile Panel */}
      <ProfilePanel
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </div>
  );
}