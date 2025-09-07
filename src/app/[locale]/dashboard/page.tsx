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
  Menu
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { FullPageLoader, CalendarSkeleton } from '@/components/LoadingStates';
import { MobileHeader, MobileSideMenu, MobileBottomNav } from '@/components/MobileNavigation';
import { UnifiedCalendarView } from '@/components/MobileCalendarView';
import { AIChatInterface } from '@/components/AIChatInterface';
import { EmptyState } from '@/components/EmptyState';

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
  const [sessionId] = useState(() => `session-${Date.now()}`);
  
  // UI states
  const [showSettings, setShowSettings] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [isMobile, setIsMobile] = useState(false);
  
  // Memoized notification count
  const notificationCount = useMemo(() => {
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
      setIsAuthenticated(data.authenticated);
      
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
      if (data.success) {
        setEvents(data.events);
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
        if (data.success) {
          setEvents(data.events);
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
        case '/':
          // Open AI chat
          e.preventDefault();
          setShowAIChat(true);
          break;
        case 'Escape':
          // Close modals
          setShowSettings(false);
          setShowAIChat(false);
          setShowNotifications(false);
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
      
      {/* Mobile Header */}
      {isMobile && (
        <>
          <MobileHeader onMenuClick={() => setShowMobileSidebar(true)} />
          <MobileBottomNav onAddEvent={() => setShowAIChat(true)} />
        </>
      )}
      
      {/* Desktop Navigation - Simplified */}
      {!isMobile && (
        <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" 
             style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
          <div className="max-w-[1400px] mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3">
                <Logo size={28} color="currentColor" />
                <span className="text-lg font-medium">Geulpi</span>
              </Link>
              
              {/* Actions - Simplified */}
              <div className="flex items-center gap-2">
                {/* AI Chat - Simple Icon Button */}
                <button
                  onClick={() => setShowAIChat(true)}
                  className="p-2 rounded-lg transition-all"
                  style={{ color: 'var(--text-tertiary)' }}
                  aria-label="AI Chat"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
                
                {/* Notifications - Show count only if > 0 */}
                {notificationCount > 0 && (
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-lg transition-all relative"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notificationCount}
                    </span>
                  </button>
                )}
                
                {/* Settings */}
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg transition-all"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {/* Google Calendar Sync */}
                <Suspense fallback={null}>
                  <GoogleCalendarLink
                    currentDate={currentDate}
                    currentView="month"
                    lastSyncTime={lastSyncTime}
                    syncStatus={syncStatus}
                    onSync={syncEvents}
                  />
                </Suspense>
                
                {/* Logout */}
                <a
                  href="/api/auth/logout"
                  className="p-2 rounded-lg transition-all"
                  style={{ color: 'var(--text-tertiary)' }}
                  aria-label={t('auth.logout')}
                >
                  <LogOut className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </nav>
      )}
      
      {/* Mobile Side Menu */}
      <MobileSideMenu 
        isOpen={showMobileSidebar} 
        onClose={() => setShowMobileSidebar(false)}
        onSettingsClick={() => {
          setShowMobileSidebar(false);
          setShowSettings(true);
        }}
      />
      
      {/* Main Content - Optimized for Mobile */}
      <main className={`${isMobile ? '' : 'max-w-[1400px] mx-auto px-4 sm:px-6 py-4'}`}>
        
        {/* Mobile-optimized Month Navigation */}
        {isMobile ? (
          <div className="sticky top-[56px] z-30 backdrop-blur-xl border-b" 
               style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
            <div className="flex items-center justify-center py-3 px-4">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}
                className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={t('dashboard.previousMonth')}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <h2 className="flex-1 text-center text-lg font-semibold">
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
                className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={t('dashboard.nextMonth')}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* Desktop Header with Month Navigation */
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}
                className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={t('dashboard.previousMonth')}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <h1 className="text-xl font-semibold">
                {currentDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </h1>
              
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentDate(newDate);
                }}
                className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={t('dashboard.nextMonth')}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            {/* Today button */}
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm rounded-lg transition-all"
              style={{ 
                background: 'var(--surface-secondary)', 
                color: 'var(--text-secondary)' 
              }}
            >
              {t('dashboard.today')}
            </button>
          </div>
        )}
        
        {/* Calendar */}
        <div style={{ height: isMobile ? 'calc(100vh - 90px)' : '75vh' }}>
          {events.length > 0 ? (
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
        onClose={() => setShowAIChat(false)}
        onSubmit={(input, type) => {
          console.log('AI Chat:', { input, type });
        }}
      />
    </div>
  );
}