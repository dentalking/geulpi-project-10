'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
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
import { MobileHeader, MobileSideMenu } from '@/components/MobileNavigation';
import { AIChatInterface } from '@/components/AIChatInterface';
import { EmptyState } from '@/components/EmptyState';

// Lazy load heavy components
const SimpleCalendar = lazy(() => import('@/components/SimpleCalendar'));
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
  const [sessionId] = useState(() => `session-${Date.now()}`);
  
  // UI states
  const [showSettings, setShowSettings] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  
  // Simple notification count
  const notificationCount = events.filter(e => {
    const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
    const now = new Date();
    const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    return eventDate >= now && eventDate <= hourFromNow;
  }).length;
  
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
  
  const syncEvents = async () => {
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
  };
  
  const handleEventClick = (event: CalendarEvent) => {
    toast.info(event.summary || t('dashboard.eventSelected'));
  };
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  useEffect(() => {
    if (isAuthenticated) {
      syncEvents();
    }
  }, [isAuthenticated]);
  
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  if (loading) {
    return <FullPageLoader message={t('common.loading')} />;
  }
  
  return (
    <div className="min-h-screen pb-safe-bottom" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Mobile Header */}
      {isMobile && <MobileHeader onMenuClick={() => setShowMobileSidebar(true)} />}
      
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
      
      {/* Main Content - Simplified */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
        
        {/* Simple Header with Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
              className="p-2 rounded-lg transition-all"
              style={{ color: 'var(--text-tertiary)' }}
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
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
              className="p-2 rounded-lg transition-all"
              style={{ color: 'var(--text-tertiary)' }}
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
        
        {/* Calendar */}
        {events.length > 0 ? (
          <div className="backdrop-blur-xl rounded-xl border overflow-hidden"
               style={{ background: 'var(--surface-primary)', borderColor: 'var(--glass-border)' }}>
            <div className="p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <Suspense fallback={<CalendarSkeleton />}>
                <SimpleCalendar
                  events={events}
                  onEventClick={handleEventClick}
                  onTimeSlotClick={(date, hour) => {
                    const dateStr = date.toLocaleDateString();
                    const timeStr = `${hour}:00`;
                    toast.info(`${dateStr} ${timeStr}`);
                  }}
                />
              </Suspense>
            </div>
          </div>
        ) : (
          <EmptyState onAddEvent={() => setShowAIChat(true)} />
        )}
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