'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
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

const UniversalCommandBar = dynamic(() => import('@/components/UniversalCommandBar'), { 
  ssr: false,
  loading: () => <div className="h-12 bg-white/5 animate-pulse rounded-xl" />
});
const SimpleCalendar = dynamic(() => import('@/components/SimpleCalendar'), { 
  ssr: false,
  loading: () => <CalendarSkeleton />
});
const GoogleCalendarLink = dynamic(() => import('@/components/GoogleCalendarLink'), { ssr: false });
const SettingsPanel = dynamic(() => import('@/components/SettingsPanel'), { ssr: false });

export default function DashboardPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToastContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [showHelp, setShowHelp] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'reminder' | 'info' | 'alert';
    message: string;
    time: Date;
    read: boolean;
  }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

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

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEventId(event.id);
    setSelectedEvent(event);
    toast.info(t('dashboard.eventSelected'), t('dashboard.eventSelectedDesc', {title: event.summary}));
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      syncEvents();
    }
  }, [isAuthenticated]);

  // 일정 리마인더 체크
  useEffect(() => {
    const checkUpcomingEvents = () => {
      const now = new Date();
      const reminderTimes = [15, 30, 60]; // 15분, 30분, 1시간 전

      events.forEach(event => {
        const eventTime = new Date(event.start?.dateTime || event.start?.date || '');
        const timeDiff = eventTime.getTime() - now.getTime();
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));

        reminderTimes.forEach(reminderMinutes => {
          if (minutesDiff > reminderMinutes - 1 && minutesDiff <= reminderMinutes + 1) {
            const notificationId = `${event.id}-${reminderMinutes}`;
            const existingNotification = notifications.find(n => n.id === notificationId);
            
            if (!existingNotification) {
              const newNotification = {
                id: notificationId,
                type: 'reminder' as const,
                message: t('dashboard.reminder.message', {title: event.summary, minutes: reminderMinutes}),
                time: new Date(),
                read: false
              };

              setNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);

              // 브라우저 알림 표시
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(t('dashboard.notification.title'), {
                  body: newNotification.message,
                  icon: '/images/logo.svg'
                });
              }

              toast.info(t('dashboard.notification.title'), newNotification.message);
            }
          }
        });
      });
    };

    // 1분마다 체크
    const interval = setInterval(checkUpcomingEvents, 60000);
    checkUpcomingEvents(); // 초기 실행

    return () => clearInterval(interval);
  }, [events, notifications]);

  useKeyboardShortcuts({
    openSettings: true
  });

  if (loading) {
    return <FullPageLoader message={t('common.loading')} />;
  }

  return (
    <div className="min-h-screen pb-safe-bottom" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ background: 'var(--effect-purple)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000" style={{ background: 'var(--effect-pink)' }} />
      </div>

      {/* Mobile Header - Only on Mobile */}
      <div className="md:hidden">
        <MobileHeader onMenuClick={() => setShowMobileSidebar(true)} />
      </div>

      {/* Navigation Bar - Desktop Only */}
      <nav className="hidden md:block sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-6">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="lg:hidden p-2 rounded-lg transition-all"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                aria-label="Menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <Logo size={32} color="currentColor" className="transition-transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-xl opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
                <span className="text-xl font-medium hidden sm:inline">Geulpi</span>
              </Link>
              
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-default)' }}>
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{events.length} Events</span>
              </div>
            </div>

            {/* Center - Universal Command Bar */}
            <div className="flex-1 mx-2 sm:mx-4 lg:mx-8 hidden sm:block">
              <UniversalCommandBar
                events={events}
                onEventSync={syncEvents}
                sessionId={sessionId}
              />
            </div>
            
            {/* Mobile Search Button */}
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder*="명령어"]') as HTMLInputElement;
                const mobileBar = document.getElementById('mobile-command-bar');
                if (mobileBar) {
                  mobileBar.style.display = 'block';
                  setTimeout(() => input?.focus(), 100);
                }
              }}
              className="sm:hidden p-2 rounded-lg transition-all"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Right Section */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 rounded-lg transition-all relative"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  aria-label={t('dashboard.notifications')}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
              
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                aria-label={t('common.settings')}
              >
                <Settings className="w-5 h-5" />
              </button>

              <GoogleCalendarLink
                currentDate={currentDate}
                currentView="month"
                selectedEventId={selectedEventId}
                lastSyncTime={lastSyncTime}
                syncStatus={syncStatus}
                onSync={syncEvents}
              />

              <a
                href="/api/auth/logout"
                className="flex items-center gap-2 px-4 py-2 backdrop-blur-sm rounded-full transition-all"
                style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-default)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-tertiary)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-secondary)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">{t('auth.logout')}</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Side Menu */}
      <MobileSideMenu 
        isOpen={showMobileSidebar} 
        onClose={() => setShowMobileSidebar(false)} 
      />

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 mb-20 md:mb-0">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              {t('dashboard.title')}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-1 rounded-lg font-medium" style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                {currentDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long' })}
              </span>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 rounded-lg transition-all"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
            >
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid3x3 className="w-5 h-5" />}
            </button>
            
          </div>
        </div>

        {/* Selected Event Alert */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 p-4 backdrop-blur-sm rounded-xl flex items-center gap-3"
              style={{ background: 'var(--surface-secondary)', border: '1px solid var(--accent-primary)', opacity: '0.9' }}
            >
              <Zap className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
              <div className="flex-1">
                <strong style={{ color: 'var(--accent-primary)' }}>{t('dashboard.selectedEvent')}:</strong> 
                <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>{selectedEvent.summary}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setSelectedEventId(undefined);
                }}
                className="px-3 py-1 rounded-full text-sm transition-all"
                style={{ background: 'var(--surface-tertiary)', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-elevated)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface-tertiary)'}
              >
                {t('common.close')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Calendar or Empty State - Full Width */}
        {events.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="backdrop-blur-xl rounded-2xl border overflow-hidden"
            style={{ background: 'var(--surface-primary)', borderColor: 'var(--glass-border)' }}
          >
            <div className="p-6" style={{ height: 'calc(100vh - 250px)', overflowY: 'auto' }}>
              <SimpleCalendar
                events={events}
                onEventClick={handleEventClick}
                onTimeSlotClick={(date, hour) => {
                  setCurrentDate(date);
                  const dateStr = date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { 
                    month: 'long', 
                    day: 'numeric',
                    weekday: 'short'
                  });
                  const timeStr = `${hour}:00`;
                  toast.info(t('dashboard.timeSelected'), t('dashboard.timeSelectedDesc', {date: dateStr, time: timeStr}));
                }}
              />
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
          className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {[
            { icon: Calendar, label: t('dashboard.stats.todayEvents'), value: events.filter(e => {
              const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
              const today = new Date();
              return eventDate.toDateString() === today.toDateString();
            }).length, color: 'from-blue-500 to-cyan-500' },
            { icon: Clock, label: t('dashboard.stats.thisWeek'), value: events.filter(e => {
              const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
              const now = new Date();
              const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              return eventDate >= now && eventDate <= weekFromNow;
            }).length, color: 'from-green-500 to-emerald-500' },
            { icon: Users, label: t('dashboard.stats.meetings'), value: events.filter(e => {
              const summary = e.summary?.toLowerCase() || '';
              return summary.includes('meeting') || 
                     summary.includes('meet') ||
                     (locale === 'ko' && summary.includes('미팅'));
            }).length, color: 'from-orange-500 to-red-500' },
            { icon: MapPin, label: t('dashboard.stats.withLocation'), value: events.filter(e => e.location).length, color: 'from-purple-500 to-pink-500' }
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="p-4 backdrop-blur-sm rounded-xl border transition-all group cursor-pointer"
                style={{ background: 'var(--surface-primary)', borderColor: 'var(--glass-border)' }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{stat.label}</p>
                    <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        showTriggerButton={false}
      />

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 right-6 z-50 w-80 max-h-96 backdrop-blur-xl border rounded-xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--surface-overlay)', borderColor: 'var(--glass-border)' }}
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('dashboard.notifications')}</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      setNotifications(notifications.map(n => ({ ...n, read: true })));
                      setUnreadCount(0);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    {t('dashboard.markAllRead')}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto max-h-80">
              {notifications.length > 0 ? (
                <div className="p-2">
                  {notifications.map(notification => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 mb-2 rounded-lg ${
                        notification.read ? 'bg-white/5' : 'bg-purple-500/20'
                      } hover:bg-white/10 transition-all cursor-pointer`}
                      onClick={() => {
                        const updatedNotifications = notifications.map(n =>
                          n.id === notification.id ? { ...n, read: true } : n
                        );
                        setNotifications(updatedNotifications);
                        setUnreadCount(updatedNotifications.filter(n => !n.read).length);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 mt-2 rounded-full ${
                          notification.type === 'reminder' ? 'bg-blue-400' :
                          notification.type === 'alert' ? 'bg-red-400' : 'bg-green-400'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm text-white/80">{notification.message}</p>
                          <p className="text-xs text-white/40 mt-1">
                            {notification.time.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-white/40">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
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
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="backdrop-blur-xl border rounded-2xl p-6 max-w-md w-full"
              style={{ background: 'var(--surface-overlay)', borderColor: 'var(--glass-border)' }}
            >
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {t('dashboard.keyboardShortcuts')}
              </h2>
              <div className="space-y-3 text-white/80">
                <div className="flex items-center justify-between">
                  <span>{t('dashboard.shortcuts.openCommandBar')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-sm">Cmd/Ctrl + K</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('dashboard.shortcuts.showHelp')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-sm">Shift + ?</kbd>
                </div>
                <div className="flex items-center justify-between">
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
      
      {/* AI Chat Interface */}
      <AIChatInterface
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        onSubmit={(input, type) => {
          // Handle AI chat submission
          console.log('AI Chat:', { input, type });
          toast.info('Processing your request...');
        }}
      />

      {/* Mobile Bottom Navigation - Only on Mobile */}
      <div className="md:hidden">
        <MobileBottomNav
          onAddEvent={() => setShowAIChat(true)}
        />
      </div>
    </div>
  );
}