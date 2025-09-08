'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Plus, 
  ExternalLink, 
  Clock,
  CalendarDays,
  CalendarRange,
  Calendar
} from 'lucide-react';

interface GoogleCalendarDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  syncStatus: 'syncing' | 'success' | 'error' | 'idle';
  lastSyncTime?: Date;
  onSync?: () => void;
  onOpenCalendar: (options?: { view?: string; eventId?: string }) => void;
  onCreateEvent: () => void;
  selectedEventId?: string;
}

export function GoogleCalendarDropdown({
  isOpen,
  onClose,
  anchorRef,
  syncStatus,
  lastSyncTime,
  onSync,
  onOpenCalendar,
  onCreateEvent,
  selectedEventId
}: GoogleCalendarDropdownProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const dropdownWidth = 288; // w-72 = 18rem = 288px
      const viewportWidth = window.innerWidth;
      
      // Calculate position
      let left = rect.right - dropdownWidth;
      if (left < 10) {
        left = 10; // Minimum 10px from left edge
      }
      
      setPosition({
        top: rect.bottom + 8,
        left: left
      });
    }
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !dropdownRef.current?.contains(target) &&
        !anchorRef.current?.contains(target)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorRef]);

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
      
      if (minutes < 1) return '방금 전';
      if (minutes < 60) return `${minutes}분 전`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}시간 전`;
      
      return '1일 이상 전';
    }
    return '동기화 안 됨';
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed w-72 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden"
        style={{ 
          top: `${position.top}px`, 
          left: `${position.left}px`,
          zIndex: 99999 
        }}
        role="menu"
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
              onClose();
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
            onClick={() => {
              onCreateEvent();
              onClose();
            }}
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
            onClick={() => {
              onOpenCalendar();
              onClose();
            }}
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
            onClick={() => {
              onOpenCalendar({ view: 'day' });
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <CalendarDays className="w-4 h-4 text-white/60" />
            <span className="text-sm">일간 보기</span>
          </button>

          <button
            onClick={() => {
              onOpenCalendar({ view: 'week' });
              onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <CalendarRange className="w-4 h-4 text-white/60" />
            <span className="text-sm">주간 보기</span>
          </button>

          <button
            onClick={() => {
              onOpenCalendar({ view: 'month' });
              onClose();
            }}
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
              onClick={() => {
                onOpenCalendar({ eventId: selectedEventId });
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-all"
            >
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-200">선택된 일정 보기</span>
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}