'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
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
  Plus
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { MobileBottomNav, MobileHeader, MobileSideMenu } from '@/components/MobileNavigation';
import { FullPageLoader } from '@/components/LoadingStates';
import { AIChatInterface } from '@/components/AIChatInterface';
import { EmptyState } from '@/components/EmptyState';

const UniversalCommandBar = dynamic(() => import('@/components/UniversalCommandBar'), { 
  ssr: false 
});
const SimpleCalendar = dynamic(() => import('@/components/SimpleCalendar'), { 
  ssr: false 
});

export default function MobileOptimizedDashboard() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToastContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [unreadCount, setUnreadCount] = useState(3);
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
    try {
      const response = await fetch(`/api/calendar/sync?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
        toast.success(t('dashboard.sync.success'));
      }
    } catch (error) {
      console.error('Event sync failed:', error);
      toast.error(t('dashboard.sync.failed'));
    }
  };

  const handleAddEvent = () => {
    setShowAIChat(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    toast.info(event.summary || 'Event selected');
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      syncEvents();
    }
  }, [isAuthenticated]);

  if (loading) {
    return <FullPageLoader message={t('common.loading')} />;
  }

  return (
    <div className="min-h-screen pb-safe-bottom" 
         style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse" 
             style={{ background: 'var(--effect-purple)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse delay-1000" 
             style={{ background: 'var(--effect-pink)' }} />
      </div>

      {/* Mobile Header - Only on Mobile */}
      <div className="md:hidden">
        <MobileHeader onMenuClick={() => setShowMobileSidebar(true)} />
      </div>

      {/* Desktop Navigation - Only on Desktop */}
      <nav className="hidden md:block sticky top-0 z-50 backdrop-blur-xl border-b" 
           style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
        {/* Desktop nav content */}
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Logo size={32} />
              <span className="text-xl font-medium">Geulpi</span>
            </div>
            <div className="flex-1 mx-8 max-w-2xl">
              <UniversalCommandBar
                events={events}
                onEventSync={syncEvents}
                sessionId={sessionId}
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 min-w-touch-sm min-h-touch-sm rounded-lg">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 min-w-touch-sm min-h-touch-sm rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Side Menu */}
      <MobileSideMenu 
        isOpen={showMobileSidebar} 
        onClose={() => setShowMobileSidebar(false)} 
      />

      {/* Main Content with Responsive Padding */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1400px] mx-auto">
        
        {/* Header with Month Navigation */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl-responsive sm:text-2xl-responsive font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            {currentDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { 
              year: 'numeric', 
              month: 'long' 
            })}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
              className="p-2 min-w-touch-sm min-h-touch-sm rounded-lg transition-all"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
              className="p-2 min-w-touch-sm min-h-touch-sm rounded-lg transition-all"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>


        {/* Calendar or Empty State - Responsive Height */}
        {events.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="backdrop-blur-xl rounded-xl sm:rounded-2xl border overflow-hidden mb-20 md:mb-6"
            style={{ 
              background: 'var(--surface-primary)', 
              borderColor: 'var(--glass-border)',
              minHeight: '400px'
            }}
          >
            <div className="p-3 sm:p-4 md:p-6" 
                 style={{ 
                   height: 'calc(100vh - 280px)',
                   maxHeight: '600px',
                   overflowY: 'auto' 
                 }}>
              <SimpleCalendar
                events={events}
                onEventClick={handleEventClick}
                onTimeSlotClick={(date, hour) => {
                  const message = `${date.toLocaleDateString()} ${hour}:00`;
                  toast.info(message);
                }}
              />
            </div>
          </motion.div>
        ) : (
          <EmptyState onAddEvent={() => setShowAIChat(true)} />
        )}

        {/* Quick Stats - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-20 md:mb-0">
          {[
            { 
              icon: Calendar, 
              label: t('dashboard.stats.todayEvents'), 
              value: events.filter(e => {
                const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
                const today = new Date();
                return eventDate.toDateString() === today.toDateString();
              }).length, 
              color: 'from-blue-500 to-cyan-500' 
            },
            { 
              icon: Clock, 
              label: t('dashboard.stats.thisWeek'), 
              value: events.filter(e => {
                const eventDate = new Date(e.start?.dateTime || e.start?.date || '');
                const now = new Date();
                const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                return eventDate >= now && eventDate <= weekFromNow;
              }).length, 
              color: 'from-green-500 to-emerald-500' 
            },
            { 
              icon: Users, 
              label: t('dashboard.stats.meetings'), 
              value: events.filter(e => {
                const summary = e.summary?.toLowerCase() || '';
                return summary.includes('meeting') || summary.includes('meet');
              }).length, 
              color: 'from-orange-500 to-red-500' 
            },
            { 
              icon: MapPin, 
              label: t('dashboard.stats.withLocation'), 
              value: events.filter(e => e.location).length, 
              color: 'from-purple-500 to-pink-500' 
            }
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 sm:p-4 backdrop-blur-sm rounded-lg sm:rounded-xl border"
                style={{ 
                  background: 'var(--surface-primary)', 
                  borderColor: 'var(--glass-border)' 
                }}
              >
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs-responsive sm:text-sm" 
                       style={{ color: 'var(--text-tertiary)' }}>
                      {stat.label}
                    </p>
                    <p className="text-lg-responsive sm:text-2xl font-semibold" 
                       style={{ color: 'var(--text-primary)' }}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile Bottom Navigation - Only on Mobile */}
      <div className="md:hidden">
        <MobileBottomNav 
          onAddEvent={handleAddEvent}
        />
      </div>

      {/* Selected Event Modal - Mobile Optimized */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-0 left-0 right-0 sm:relative sm:max-w-md sm:mx-auto sm:mt-20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="backdrop-blur-xl rounded-t-3xl sm:rounded-2xl p-6 pb-safe-bottom"
                   style={{ 
                     background: 'var(--surface-overlay)', 
                     borderColor: 'var(--glass-border)',
                     borderWidth: '1px',
                     borderStyle: 'solid'
                   }}>
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />
                
                <h3 className="text-lg-responsive font-semibold mb-3">
                  {selectedEvent.summary}
                </h3>
                
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-sm-responsive" style={{ color: 'var(--text-secondary)' }}>
                      {selectedEvent.location}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-sm-responsive" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(selectedEvent.start?.dateTime || selectedEvent.start?.date || '').toLocaleString()}
                  </span>
                </div>
                
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-full py-3 min-h-touch bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium"
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
        onSubmit={(input, type) => {
          // Handle AI chat submission
          console.log('AI Chat:', { input, type });
          toast.info('Processing your request...');
        }}
      />
    </div>
  );
}