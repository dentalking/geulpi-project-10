'use client';

import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useToastContext } from '@/providers/ToastProvider';
import type { CalendarEvent } from '@/types';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Bell, 
  Settings,
  LogOut,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List,
  Filter,
  Zap,
  Menu,
  X,
  Search,
  Plus
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { FullPageLoader, CalendarSkeleton, EventListSkeleton } from '@/components/LoadingStates';
import { MobileBottomNav, MobileHeader, MobileSideMenu } from '@/components/MobileNavigation';
import { AIChatInterface } from '@/components/AIChatInterface';
import { EmptyState } from '@/components/EmptyState';

// Optimized lazy loading with proper fallbacks
const UniversalCommandBar = lazy(() => import('@/components/UniversalCommandBar'));
const SimpleCalendar = lazy(() => import('@/components/SimpleCalendar'));
const GoogleCalendarLink = lazy(() => import('@/components/GoogleCalendarLink'));
const SettingsPanel = lazy(() => import('@/components/SettingsPanel'));

// Custom hook for responsive design
function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
}

// Web Worker for event reminders
function useEventReminders(events: CalendarEvent[], enabled = true) {
  const { toast } = useToastContext();
  const t = useTranslations();
  const workerRef = useRef<Worker | null>(null);
  const processedRemindersRef = useRef<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'reminder' | 'info' | 'alert';
    message: string;
    time: Date;
    read: boolean;
  }>>([]);
  
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !events.length) return;
    
    // Create web worker for background reminder checks
    const workerCode = `
      self.onmessage = function(e) {
        const { events } = e.data;
        
        setInterval(() => {
          const now = new Date();
          const reminderTimes = [15, 30, 60];
          const reminders = [];
          
          events.forEach(event => {
            const eventTime = new Date(event.start?.dateTime || event.start?.date || '');
            const timeDiff = eventTime.getTime() - now.getTime();
            const minutesDiff = Math.floor(timeDiff / (1000 * 60));
            
            reminderTimes.forEach(reminderMinutes => {
              if (minutesDiff > reminderMinutes - 1 && minutesDiff <= reminderMinutes + 1) {
                reminders.push({
                  eventId: event.id,
                  eventTitle: event.summary,
                  minutes: reminderMinutes
                });
              }
            });
          });
          
          if (reminders.length > 0) {
            self.postMessage({ type: 'reminders', data: reminders });
          }
        }, 60000); // Check every minute
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'reminders') {
        e.data.data.forEach((reminder: any) => {
          const notificationId = `${reminder.eventId}-${reminder.minutes}`;
          
          // Check if we've already processed this reminder
          if (!processedRemindersRef.current.has(notificationId)) {
            processedRemindersRef.current.add(notificationId);
            
            const newNotification = {
              id: notificationId,
              type: 'reminder' as const,
              message: t('dashboard.reminder.message', {
                title: reminder.eventTitle,
                minutes: reminder.minutes
              }),
              time: new Date(),
              read: false
            };
            
            setNotifications(prev => {
              // Check if notification already exists in state
              const exists = prev.some(n => n.id === notificationId);
              if (exists) return prev;
              return [newNotification, ...prev];
            });
            
            // Browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(t('dashboard.notification.title'), {
                body: newNotification.message,
                icon: '/images/logo.svg'
              });
            }
            
            toast.info(t('dashboard.notification.title'), newNotification.message);
          }
        });
      }
    };
    
    // Send events to worker
    workerRef.current.postMessage({ events });
    
    return () => {
      workerRef.current?.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, [events, enabled, t, toast]);
  
  return { notifications, setNotifications };
}

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToastContext();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  // Core state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  
  // UI state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Sync state
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  // Use custom hooks
  const { notifications, setNotifications } = useEventReminders(events);
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  
  // Authentication check
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
  
  // Event sync
  const syncEvents = async () => {
    setSyncStatus('syncing');
    try {
      const response = await fetch(`/api/calendar/sync?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
        setLastSyncTime(new Date());
        setSyncStatus('success');
        toast.success(t('dashboard.sync.success'), t('dashboard.sync.eventsLoaded', {count: data.events?.length || 0}));
      } else {
        setSyncStatus('error');
        toast.error(t('dashboard.sync.failed'), t('dashboard.sync.cannotLoad'));
      }
    } catch (error) {
      console.error('Event sync failed:', error);
      setSyncStatus('error');
      toast.error(t('dashboard.sync.failed'), t('dashboard.sync.networkError'));
    }
  };
  
  // Event handlers
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    if (!isMobile) {
      toast.info(t('dashboard.eventSelected'), t('dashboard.eventSelectedDesc', {title: event.summary}));
    }
  };
  
  const handleNotificationClick = (notification: any) => {
    const updatedNotifications = notifications.map(n =>
      n.id === notification.id ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
  };
  
  const markAllNotificationsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };
  
  // Calculate stats - Must be before conditional returns for Hook consistency
  const stats = useMemo(() => ({
    todayEvents: events.filter(e => {
      const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
      const today = new Date();
      return eventDate.toDateString() === today.toDateString();
    }).length,
    thisWeek: events.filter(e => {
      const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return eventDate >= now && eventDate <= weekFromNow;
    }).length,
    meetings: events.filter(e => {
      const summary = e.summary?.toLowerCase() || '';
      return summary.includes('meeting') || 
             summary.includes('meet') ||
             (locale === 'ko' && summary.includes('미팅'));
    }).length,
    withLocation: events.filter(e => e.location).length
  }), [events, locale]);
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    openSettings: true
  });
  
  // Effects
  useEffect(() => {
    checkAuth();
  }, []);
  
  useEffect(() => {
    if (isAuthenticated) {
      syncEvents();
    }
  }, [isAuthenticated]);
  
  // Loading state - Must be after all Hook calls
  if (loading) {
    return <FullPageLoader message={t('common.loading')} />;
  }
  
  return (
    <div className="min-h-screen pb-safe-bottom" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse" 
             style={{ background: 'var(--effect-purple)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse delay-1000" 
             style={{ background: 'var(--effect-pink)' }} />
      </div>
      
      {/* Mobile Header */}
      {isMobile && <MobileHeader onMenuClick={() => setShowMobileSidebar(true)} />}
      
      {/* Desktop Navigation */}
      {!isMobile && (
        <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" 
             style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}
             role="navigation"
             aria-label={t('navigation.main')}>
          <div className="max-w-[1400px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Logo and brand */}
              <div className="flex items-center gap-4">
                {isTablet && (
                  <button
                    onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                    className="p-2 rounded-lg transition-all"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-label={t('navigation.menu')}
                    aria-expanded={showMobileSidebar}
                  >
                    <Menu className="w-6 h-6" />
                  </button>
                )}
                
                <Link href="/" className="flex items-center gap-3 group">
                  <Logo size={32} color="currentColor" className="transition-transform group-hover:scale-110" />
                  <span className="text-xl font-medium hidden sm:inline">Geulpi</span>
                </Link>
                
                <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full" 
                     style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-default)' }}>
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {events.length} {t('dashboard.events')}
                  </span>
                </div>
              </div>
              
              {/* Command Bar */}
              <div className="flex-1 max-w-2xl mx-4 hidden sm:block">
                <Suspense fallback={<div className="h-10 bg-white/5 animate-pulse rounded-xl" />}>
                  <UniversalCommandBar
                    events={events}
                    onEventSync={syncEvents}
                    sessionId={sessionId}
                  />
                </Suspense>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Notifications */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 rounded-lg transition-all relative"
                    style={{ color: 'var(--text-tertiary)' }}
                    aria-label={t('dashboard.notifications')}
                    aria-expanded={showNotifications}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                            role="status"
                            aria-label={t('dashboard.unreadNotifications', {count: unreadCount})}>
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </div>
                
                {/* Settings */}
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg transition-all"
                  style={{ color: 'var(--text-tertiary)' }}
                  aria-label={t('common.settings')}
                  aria-expanded={showSettings}
                >
                  <Settings className="w-5 h-5" />
                </button>
                
                {/* Google Calendar Link */}
                {isDesktop && (
                  <Suspense fallback={null}>
                    <GoogleCalendarLink
                      currentDate={currentDate}
                      currentView="month"
                      selectedEventId={selectedEvent?.id}
                      lastSyncTime={lastSyncTime}
                      syncStatus={syncStatus}
                      onSync={syncEvents}
                    />
                  </Suspense>
                )}
                
                {/* Logout */}
                <a
                  href="/api/auth/logout"
                  className="flex items-center gap-2 px-4 py-2 backdrop-blur-sm rounded-full transition-all"
                  style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-default)' }}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm hidden lg:inline">{t('auth.logout')}</span>
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
      />
      
      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 mb-20 md:mb-0"
            role="main"
            aria-label={t('dashboard.mainContent')}>
        
        {/* Header with Month Navigation */}
        <header className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            {isMobile 
              ? currentDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long' })
              : t('dashboard.title')
            }
          </h1>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Month Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                className="p-2 rounded-lg transition-all touch-manipulation"
                style={{ color: 'var(--text-tertiary)', minWidth: isMobile ? '44px' : 'auto', minHeight: isMobile ? '44px' : 'auto' }}
                aria-label={t('dashboard.previousMonth')}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {!isMobile && (
                <span className="px-4 py-1 rounded-lg font-medium" 
                      style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                  {currentDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long' })}
                </span>
              )}
              
              <button
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                className="p-2 rounded-lg transition-all touch-manipulation"
                style={{ color: 'var(--text-tertiary)', minWidth: isMobile ? '44px' : 'auto', minHeight: isMobile ? '44px' : 'auto' }}
                aria-label={t('dashboard.nextMonth')}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            {/* View Mode Toggle - Desktop only */}
            {!isMobile && (
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={viewMode === 'grid' ? t('dashboard.listView') : t('dashboard.gridView')}
              >
                {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid3x3 className="w-5 h-5" />}
              </button>
            )}
          </div>
        </header>
        
        {/* Selected Event Alert */}
        <AnimatePresence>
          {selectedEvent && !isMobile && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 p-4 backdrop-blur-sm rounded-xl flex items-center gap-3"
              style={{ background: 'var(--surface-secondary)', border: '1px solid var(--accent-primary)', opacity: '0.9' }}
              role="alert"
            >
              <Zap className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <div className="flex-1">
                <strong style={{ color: 'var(--accent-primary)' }}>{t('dashboard.selectedEvent')}:</strong> 
                <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>{selectedEvent.summary}</span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-3 py-1 rounded-full text-sm transition-all"
                style={{ background: 'var(--surface-tertiary)', color: 'var(--text-primary)' }}
                aria-label={t('common.close')}
              >
                {t('common.close')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Calendar or Empty State */}
        {events.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="backdrop-blur-xl rounded-xl sm:rounded-2xl border overflow-hidden"
            style={{ 
              background: 'var(--surface-primary)', 
              borderColor: 'var(--glass-border)',
              minHeight: isMobile ? '400px' : 'auto'
            }}
          >
            <div className="p-3 sm:p-4 md:p-6" 
                 style={{ 
                   height: isMobile ? 'calc(100vh - 280px)' : 'calc(100vh - 250px)',
                   maxHeight: '600px',
                   overflowY: 'auto' 
                 }}>
              <Suspense fallback={<CalendarSkeleton />}>
                <SimpleCalendar
                  events={events}
                  onEventClick={handleEventClick}
                  onTimeSlotClick={(date, hour) => {
                    setCurrentDate(date);
                    if (!isMobile) {
                      const dateStr = date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'short'
                      });
                      const timeStr = `${hour}:00`;
                      toast.info(t('dashboard.timeSelected'), t('dashboard.timeSelectedDesc', {date: dateStr, time: timeStr}));
                    }
                  }}
                />
              </Suspense>
            </div>
          </motion.div>
        ) : (
          <EmptyState onAddEvent={() => setShowAIChat(true)} />
        )}
        
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        >
          {[
            { icon: Calendar, label: t('dashboard.stats.todayEvents'), value: stats.todayEvents, color: 'from-blue-500 to-cyan-500' },
            { icon: Clock, label: t('dashboard.stats.thisWeek'), value: stats.thisWeek, color: 'from-green-500 to-emerald-500' },
            { icon: Users, label: t('dashboard.stats.meetings'), value: stats.meetings, color: 'from-orange-500 to-red-500' },
            { icon: MapPin, label: t('dashboard.stats.withLocation'), value: stats.withLocation, color: 'from-purple-500 to-pink-500' }
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 sm:p-4 backdrop-blur-sm rounded-lg sm:rounded-xl border transition-all group cursor-pointer"
                style={{ background: 'var(--surface-primary)', borderColor: 'var(--glass-border)' }}
                role="article"
                aria-label={`${stat.label}: ${stat.value}`}
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs sm:text-sm" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</p>
                    <p className="text-lg sm:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
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
      
      {/* Notifications Dropdown */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`fixed ${isMobile ? 'inset-x-4 top-20' : 'top-16 right-6'} z-50 ${isMobile ? 'w-auto' : 'w-80'} max-h-96 backdrop-blur-xl border rounded-xl shadow-2xl overflow-hidden`}
            style={{ background: 'var(--surface-overlay)', borderColor: 'var(--glass-border)' }}
            role="dialog"
            aria-label={t('dashboard.notifications')}
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('dashboard.notifications')}</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs text-purple-400 hover:text-purple-300"
                    aria-label={t('dashboard.markAllRead')}
                  >
                    {t('dashboard.markAllRead')}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto max-h-80">
              {notifications.length > 0 ? (
                <div className="p-2" role="list">
                  {notifications.map(notification => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 mb-2 rounded-lg ${
                        notification.read ? 'bg-white/5' : 'bg-purple-500/20'
                      } hover:bg-white/10 transition-all cursor-pointer`}
                      onClick={() => handleNotificationClick(notification)}
                      role="listitem"
                      aria-label={notification.message}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full ${
                          notification.type === 'reminder' ? 'bg-blue-400' :
                          notification.type === 'alert' ? 'bg-red-400' : 'bg-green-400'
                        }`} aria-hidden="true" />
                        <div className="flex-1">
                          <p className="text-sm text-white/80">{notification.message}</p>
                          <p className="text-xs text-white/40 mt-1">
                            <time dateTime={notification.time.toISOString()}>
                              {notification.time.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </time>
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-white/40">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                  <p className="text-sm">{t('dashboard.noNotifications')}</p>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-white/10">
              <button
                onClick={() => {
                  if ('Notification' in window) {
                    Notification.requestPermission().then(permission => {
                      if (permission === 'granted') {
                        toast.success(t('dashboard.notification.allowed'), t('dashboard.notification.browserEnabled'));
                      } else {
                        toast.error(t('dashboard.notification.blocked'), t('dashboard.notification.enableInSettings'));
                      }
                    });
                  }
                }}
                className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm transition-all"
              >
                {t('dashboard.allowBrowserNotifications')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-label={t('dashboard.keyboardShortcuts')}
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="backdrop-blur-xl border rounded-2xl p-6 max-w-md w-full"
              style={{ background: 'var(--surface-overlay)', borderColor: 'var(--glass-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {t('dashboard.keyboardShortcuts')}
              </h2>
              <div className="space-y-3 text-white/80" role="list">
                <div className="flex items-center justify-between" role="listitem">
                  <span>{t('dashboard.shortcuts.openCommandBar')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-sm">Cmd/Ctrl + K</kbd>
                </div>
                <div className="flex items-center justify-between" role="listitem">
                  <span>{t('dashboard.shortcuts.showHelp')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-sm">Shift + ?</kbd>
                </div>
                <div className="flex items-center justify-between" role="listitem">
                  <span>{t('dashboard.shortcuts.toggleSettings')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-sm">Cmd/Ctrl + ,</kbd>
                </div>
                <div className="flex items-center justify-between" role="listitem">
                  <span>{t('dashboard.shortcuts.navigateCalendar')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-sm">← →</kbd>
                </div>
                <div className="flex items-center justify-between" role="listitem">
                  <span>{t('common.close')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-sm">Esc</kbd>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-6 w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                {t('common.close')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Selected Event Modal - Mobile Optimized */}
      <AnimatePresence>
        {selectedEvent && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-4"
            onClick={() => setSelectedEvent(null)}
            role="dialog"
            aria-label={selectedEvent.summary}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-0 left-0 right-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="backdrop-blur-xl rounded-t-3xl p-6 pb-safe-bottom"
                   style={{ 
                     background: 'var(--surface-overlay)', 
                     borderColor: 'var(--glass-border)',
                     borderWidth: '1px',
                     borderStyle: 'solid'
                   }}>
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" aria-hidden="true" />
                
                <h3 className="text-lg font-semibold mb-3">{selectedEvent.summary}</h3>
                
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedEvent.location}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <time dateTime={selectedEvent.start?.dateTime || selectedEvent.start?.date || ''}>
                      {new Date(selectedEvent.start?.dateTime || selectedEvent.start?.date || '').toLocaleString()}
                    </time>
                  </span>
                </div>
                
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-full py-3 min-h-[44px] bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium"
                >
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* AI Chat Interface */}
      <AIChatInterface
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        onSubmit={async (input, type) => {
          console.log('AI Chat:', { inputLength: input.length, type });
          
          if (type === 'image') {
            console.log('[Dashboard] Processing image input');
            toast.info('Processing screenshot...');
            
            try {
              // Extract base64 data from data URL
              const base64Data = input.split(',')[1] || input;
              const mimeType = input.startsWith('data:') 
                ? input.split(':')[1].split(';')[0] 
                : 'image/png';
              
              console.log('[Dashboard] Sending to API, mimeType:', mimeType);
              
              // Send to API for processing
              const response = await fetch('/api/ai/process-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  image: base64Data,
                  mimeType: mimeType,
                  sessionId: sessionId
                })
              });
              
              const data = await response.json();
              console.log('[Dashboard] API response:', data);
              
              if (data.success && data.eventData) {
                toast.success('Event extracted!', `Found: ${data.eventData.title}`);
                // You can add logic here to create the event
              } else {
                toast.error('Failed to extract event', 'Could not find event information in the image');
              }
            } catch (error) {
              console.error('[Dashboard] Image processing error:', error);
              toast.error('Processing failed', 'Could not process the screenshot');
            }
          } else {
            toast.info('Processing your request...');
            // Handle text/voice input
          }
        }}
      />
      
      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav onAddEvent={() => setShowAIChat(true)} />
      )}
    </div>
  );
}