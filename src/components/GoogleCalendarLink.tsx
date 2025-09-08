'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  RefreshCw
} from 'lucide-react';
import { getGoogleCalendarUrl, getGoogleCalendarCreateEventUrl } from '@/utils/googleCalendarUrl';
import { GoogleCalendarDropdown } from './GoogleCalendarDropdown';

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
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleOpenCalendar = (options?: { view?: string; eventId?: string }) => {
    const url = getGoogleCalendarUrl({
      view: (options?.view || currentView) as any,
      date: currentDate,
      eventId: options?.eventId || selectedEventId
    });
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCreateEvent = () => {
    const url = getGoogleCalendarCreateEventUrl({
      dates: {
        start: currentDate,
        end: new Date(currentDate.getTime() + 60 * 60 * 1000)
      }
    });
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Main Button */}
      <button
        ref={buttonRef}
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

      {/* Portal-based Dropdown */}
      <GoogleCalendarDropdown
        isOpen={showDropdown}
        onClose={() => setShowDropdown(false)}
        anchorRef={buttonRef}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onSync={onSync}
        onOpenCalendar={handleOpenCalendar}
        onCreateEvent={handleCreateEvent}
        selectedEventId={selectedEventId}
      />
    </>
  );
}