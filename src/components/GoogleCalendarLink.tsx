'use client';

import { useState, useEffect } from 'react';
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
        end: new Date(currentDate.getTime() + 60 * 60 * 1000) // 1시간 후
      }
    });
    
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowDropdown(false);
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '⚠️';
      default:
        return '🔗';
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
    <div className="google-calendar-link" style={{ position: 'relative' }}>
      {/* 메인 버튼 */}
      <button
        className="glass-light btn-haptic interactive focus-ring"
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--font-sm)',
          fontWeight: '500',
          position: 'relative',
          transition: 'var(--transition-smooth)'
        }}
        aria-label="Google Calendar 옵션"
        aria-expanded={showDropdown}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>Google Calendar</span>
        <span style={{ opacity: 0.7, fontSize: '12px' }}>{getSyncStatusIcon()}</span>
      </button>

      {/* 드롭다운 메뉴 */}
      {showDropdown && (
        <>
          {/* 배경 클릭 시 닫기 */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 998
            }}
            onClick={() => setShowDropdown(false)}
          />
          
          <div
            className="glass-high-contrast float"
            style={{
              position: 'absolute',
              top: 'calc(100% + var(--space-2))',
              right: 0,
              minWidth: '220px',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-xl)',
              zIndex: 999,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
            }}
          >
            {/* 동기화 상태 */}
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                marginBottom: 'var(--space-2)'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 'var(--font-xs)',
                color: 'var(--text-secondary)'
              }}>
                <span>{getSyncStatusText()}</span>
                {onSync && syncStatus !== 'syncing' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSync();
                    }}
                    className="btn-haptic"
                    style={{
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '10px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer'
                    }}
                  >
                    새로고침
                  </button>
                )}
              </div>
            </div>

            {/* 메뉴 아이템들 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <button
                className="dropdown-item interactive"
                onClick={() => handleOpenCalendar()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-sm)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>📅</span>
                <span>캘린더 열기</span>
              </button>

              <button
                className="dropdown-item interactive"
                onClick={() => handleOpenCalendar({ view: 'day' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-sm)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>📆</span>
                <span>오늘 일정 보기</span>
              </button>

              <button
                className="dropdown-item interactive"
                onClick={() => handleOpenCalendar({ view: 'week' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-sm)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>📊</span>
                <span>주간 보기</span>
              </button>

              <button
                className="dropdown-item interactive"
                onClick={() => handleOpenCalendar({ view: 'agenda' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-sm)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>📋</span>
                <span>일정 목록</span>
              </button>

              <div style={{
                height: '1px',
                background: 'rgba(255, 255, 255, 0.1)',
                margin: 'var(--space-2) 0'
              }} />

              <button
                className="dropdown-item interactive"
                onClick={handleCreateEvent}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--font-sm)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span>➕</span>
                <span>새 일정 만들기</span>
              </button>

              {isMobile && (
                <>
                  <div style={{
                    height: '1px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    margin: 'var(--space-2) 0'
                  }} />
                  
                  <button
                    className="dropdown-item interactive"
                    onClick={() => {
                      window.location.href = 'googlecalendar://';
                      setShowDropdown(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--font-sm)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>📱</span>
                    <span>앱에서 열기</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}