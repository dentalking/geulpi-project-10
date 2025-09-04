'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  RefreshCw, 
  Plus, 
  ExternalLink, 
  Clock,
  CalendarDays,
  CalendarRange
} from 'lucide-react';
import { getGoogleCalendarUrl, getGoogleCalendarCreateEventUrl } from '@/utils/googleCalendarUrl';

interface GoogleCalendarLinkProps {
  currentDate?: Date;
  currentView?: 'day' | 'week' | 'month';
  selectedEventId?: string;
  lastSyncTime?: Date;
  syncStatus?: 'syncing' | 'success' | 'error' | 'idle';
  onSync?: () => void;
}

export default function GoogleCalendarLink({
  currentDate = new Date(),
  currentView = 'month',
  selectedEventId,
  lastSyncTime,
  syncStatus = 'idle',
  onSync
}: GoogleCalendarLinkProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.google-calendar-link')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDropdown]);

  const handleOpenCalendar = (options?: { view?: string; eventId?: string }) => {
    const url = getGoogleCalendarUrl({
      view: (options?.view || currentView) as any,
      date: currentDate,
      eventId: options?.eventId || selectedEventId
    });
    
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowDropdown(false);
  };

  const handleCreateEvent = () => {
    const url = getGoogleCalendarCreateEventUrl({
      dates: {
        start: currentDate,
        end: new Date(currentDate.getTime() + 60 * 60 * 1000)
      }
    });
    
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowDropdown(false);
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-white/60';
    }
  };

  const getSyncStatusText = () => {
    if (lastSyncTime) {
      const now = new Date();
      const diff = now.getTime() - lastSyncTime.getTime();
      const minutes = Math.floor(diff / 60000);
      
      if (minutes < 1) return '방금 동기화됨';
      if (minutes < 60) return `${minutes}분 전 동기화`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}시간 전 동기화`;
      
      const days = Math.floor(hours / 24);
      return `${days}일 전 동기화`;
    }
    
    return '동기화 필요';
  };

  return (
    <div className="google-calendar-link relative">
      {/* Main Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-3 min-h-[44px] bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full transition-all group"
        aria-label="Google Calendar menu"
        aria-expanded={showDropdown}
        aria-haspopup="menu"
        id="google-calendar-button"
      >
        <Calendar className="w-4 h-4" />
        {!isMobile && (
          <span className="text-sm font-medium">Google Calendar</span>
        )}
        {syncStatus === 'syncing' && (
          <RefreshCw className="w-4 h-4 animate-spin" />
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden z-50"
            role="menu"
            aria-labelledby="google-calendar-button"
          >
            {/* Sync Status */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/60">동기화 상태</span>
                <span className={`text-xs ${getSyncStatusColor()}`}>
                  {getSyncStatusText()}
                </span>
              </div>
              <button
                onClick={() => {
                  if (onSync) {
                    onSync();
                  }
                  setShowDropdown(false);
                }}
                disabled={syncStatus === 'syncing'}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">
                  {syncStatus === 'syncing' ? '동기화 중...' : '지금 동기화'}
                </span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="p-2">
              <button
                onClick={handleCreateEvent}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-all group"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">새 일정 만들기</div>
                  <div className="text-xs text-white/60">Google Calendar에서</div>
                </div>
              </button>

              <button
                onClick={() => handleOpenCalendar()}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-all group"
              >
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-all">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">캘린더 열기</div>
                  <div className="text-xs text-white/60">현재 보기로 이동</div>
                </div>
              </button>
            </div>

            {/* View Options */}
            <div className="p-2 border-t border-white/10">
              <div className="text-xs text-white/40 px-3 py-1 mb-1">보기 옵션</div>
              
              <button
                onClick={() => handleOpenCalendar({ view: 'day' })}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <CalendarDays className="w-4 h-4 text-white/60" />
                <span className="text-sm">일간 보기</span>
              </button>

              <button
                onClick={() => handleOpenCalendar({ view: 'week' })}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <CalendarRange className="w-4 h-4 text-white/60" />
                <span className="text-sm">주간 보기</span>
              </button>

              <button
                onClick={() => handleOpenCalendar({ view: 'month' })}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <Calendar className="w-4 h-4 text-white/60" />
                <span className="text-sm">월간 보기</span>
              </button>
            </div>

            {/* Selected Event */}
            {selectedEventId && (
              <div className="p-2 border-t border-white/10">
                <button
                  onClick={() => handleOpenCalendar({ eventId: selectedEventId })}
                  className="w-full flex items-center gap-3 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all"
                >
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-200">선택된 일정 보기</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}