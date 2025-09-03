'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useToastContext } from '@/providers/ToastProvider';
import type { CalendarEvent } from '@/types';

const AIChat = dynamic(() => import('@/components/AIChat'), { ssr: false });
const SimpleCalendar = dynamic(() => import('@/components/SimpleCalendar'), { ssr: false });
const GoogleCalendarLink = dynamic(() => import('@/components/GoogleCalendarLink'), { ssr: false });

export default function Home() {
  const { toast } = useToastContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [showHelp, setShowHelp] = useState(false);
  const [chatInitialMessage, setChatInitialMessage] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const aiChatRef = useRef<any>(null);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
    } catch (error) {
      console.error('Auth check failed:', error);
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
        toast.success('동기화 완료', `${data.events?.length || 0}개 일정을 불러왔습니다`);
      } else {
        setSyncStatus('error');
        toast.error('동기화 실패', '일정을 불러올 수 없습니다');
      }
    } catch (error) {
      console.error('Event sync failed:', error);
      setSyncStatus('error');
      toast.error('동기화 실패', '네트워크 오류가 발생했습니다');
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEventId(event.id);
    setSelectedEvent(event);
    
    // AI 채팅창 열기
    if (aiChatRef.current) {
      aiChatRef.current.setExpanded(true);
      
      // 선택된 일정 정보를 AI 채팅에 전달
      const startTime = event.start?.dateTime || event.start?.date || '';
      const timeStr = startTime ? new Date(startTime).toLocaleString('ko-KR') : '시간 미정';
      
      const message = `선택한 일정: "${event.summary}"\n시간: ${timeStr}${event.location ? `\n장소: ${event.location}` : ''}\n\n이 일정을 어떻게 수정하시겠습니까? (예: 시간 변경, 제목 수정, 삭제 등)`;
      
      setChatInitialMessage(message);
      toast.info('일정 선택됨', '채팅창에서 일정을 수정할 수 있습니다');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      syncEvents();
    }
  }, [isAuthenticated]);

  // 키보드 단축키 설정
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrl: true,
      handler: () => {
        if (isAuthenticated) {
          toast.info('새 일정 만들기', 'AI 채팅에 일정을 말해주세요');
          // AI 채팅 열기
          aiChatRef.current?.open();
        }
      }
    },
    {
      key: '/',
      ctrl: true,
      handler: () => {
        if (isAuthenticated) {
          aiChatRef.current?.toggle();
        }
      }
    },
    {
      key: '?',
      shift: true,
      handler: () => {
        setShowHelp(!showHelp);
      }
    },
    {
      key: 'Escape',
      handler: () => {
        setShowHelp(false);
      }
    }
  ]);

  if (loading) {
    return (
        <div style={{
          minHeight: '100vh',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div className="skeleton-container" style={{
            maxWidth: '440px',
            width: '100%'
          }}>
            {/* Logo skeleton */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 'var(--space-6)'
            }}>
              <div className="skeleton skeleton-avatar" style={{
                width: '88px',
                height: '88px'
              }} />
            </div>
            
            {/* Title skeleton */}
            <div className="skeleton skeleton-title" style={{
              width: '200px',
              margin: '0 auto var(--space-4) auto'
            }} />
            
            {/* Subtitle skeleton */}
            <div className="skeleton skeleton-text" style={{
              width: '300px',
              margin: '0 auto var(--space-2) auto'
            }} />
            <div className="skeleton skeleton-text" style={{
              width: '250px',
              margin: '0 auto var(--space-8) auto'
            }} />
            
            {/* Button skeleton */}
            <div style={{
              display: 'flex',
              justifyContent: 'center'
            }}>
              <div className="skeleton skeleton-button" style={{
                width: '220px'
              }} />
            </div>
            
            {/* Activity indicator overlay */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}>
              <div className="pulse-loading" style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '8px',
                      height: '8px',
                      background: 'rgba(255, 255, 255, 0.4)',
                      borderRadius: 'var(--radius-full)',
                      animation: `pulse-soft 1.4s ease-in-out ${i * 0.2}s infinite`
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
    );
  }

  if (!isAuthenticated) {
    return (
        <main role="main" style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          position: 'relative'
        }}>
          {/* Help Button */}
          <button
            className="glass-dark btn-haptic interactive focus-ring"
            onClick={() => alert('도움이 필요하신가요? support@aicalendar.com으로 문의해주세요.')}
            style={{
              position: 'fixed',
              bottom: 'var(--space-6)',
              right: 'var(--space-6)',
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '0.5px solid rgba(255, 255, 255, 0.1)',
              fontSize: '20px',
              zIndex: 100,
              transition: 'var(--transition-smooth)',
              animation: 'floatSmooth 6s ease-in-out infinite'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '';
            }}
            onMouseDown={(e) => {
              e.currentTarget.classList.add('haptic-press');
            }}
            onMouseUp={(e) => {
              e.currentTarget.classList.remove('haptic-press');
              e.currentTarget.classList.add('haptic-tap');
              setTimeout(() => {
                e.currentTarget.classList.remove('haptic-tap');
              }, 300);
            }}
            aria-label="도움말"
          >
            <span style={{ filter: 'grayscale(1) brightness(1.2)' }}>❓</span>
          </button>
          <div className="glass-high-contrast float" style={{
            padding: 'var(--space-12)',
            textAlign: 'center',
            maxWidth: '440px',
            position: 'relative'
          }}>
            <div className="icon-container" style={{
              width: '88px',
              height: '88px',
              margin: '0 auto var(--space-8) auto',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                filter: 'grayscale(1) brightness(1.2)'
              }}>📅</div>
              <div className="glow-pulse" style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 'inherit'
              }}></div>
            </div>
            <h1 className="text-on-glass-strong" style={{
              margin: '0 0 var(--space-5) 0',
              fontSize: 'var(--font-3xl)',
              fontWeight: '700',
              letterSpacing: 'var(--tracking-tight)',
              lineHeight: 'var(--leading-tight)'
            }}>
              AI Calendar
            </h1>
            <p className="text-on-glass" style={{
              margin: '0 0 var(--space-10) 0',
              fontSize: 'var(--font-lg)',
              lineHeight: 'var(--leading-relaxed)',
              letterSpacing: 'var(--tracking-normal)'
            }}>
              자연어로 일정을 관리하세요.<br />
              <span style={{ color: 'var(--text-tertiary)' }}>
                "내일 2시 미팅"이라고 말하기만 하면 됩니다.
              </span>
            </p>
            <a
                href="/api/auth/login"
                className="btn btn-primary btn-haptic ripple focus-ring"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-4) var(--space-8)',
                  fontSize: 'var(--font-base)',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-full)',
                  minWidth: '220px',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.classList.add('active');
                  e.currentTarget.classList.add('haptic-press');
                }}
                onMouseUp={(e) => {
                  e.currentTarget.classList.remove('active');
                  e.currentTarget.classList.remove('haptic-press');
                  setTimeout(() => {
                    e.currentTarget.classList.add('haptic-success');
                    setTimeout(() => {
                      e.currentTarget.classList.remove('haptic-success');
                    }, 500);
                  }, 100);
                }}
                aria-label="Google 계정으로 로그인"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google로 시작하기</span>
            </a>
          </div>
        </main>
    );
  }

  return (
      <main role="main" style={{
        minHeight: '100vh',
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 10
        }}>
          <header className="glass-medium" style={{
            marginBottom: 'var(--space-8)',
            padding: 'var(--space-6)',
            textAlign: 'center'
          }} role="banner" aria-labelledby="main-title">
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-5)'
            }}>
              <div className="icon-small" style={{
                width: '42px',
                height: '42px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                filter: 'grayscale(1) brightness(1.2)'
              }}>📅</div>
              <h1 id="main-title" className="text-on-glass-strong" style={{
                margin: 0,
                fontSize: 'var(--font-2xl)',
                fontWeight: '600',
                letterSpacing: 'var(--tracking-tight)'
              }}>
                AI Calendar
              </h1>
            </div>
            <p className="text-on-glass" style={{
              margin: '0 0 var(--space-5) 0',
              fontSize: 'var(--font-base)',
              letterSpacing: 'var(--tracking-normal)'
            }}>
              자연어로 일정을 관리하세요
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'var(--space-3)',
              fontSize: 'var(--font-sm)',
              flexWrap: 'wrap'
            }}>
              <div className="glass-light interactive" style={{
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.6)',
                  animation: 'breathe 2s ease-in-out infinite'
                }}></div>
                {events.length} Events
              </div>
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
                  className="btn btn-secondary btn-haptic focus-ring"
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    fontSize: 'var(--font-sm)',
                    textDecoration: 'none'
                  }}
              >
                Sign Out
              </a>
            </div>
          </header>

          <div className="glass-medium" style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-2xl)',
            position: 'relative'
          }}>
            {/* Selected Event Indicator */}
            {selectedEvent && (
              <div style={{
                position: 'absolute',
                top: 'var(--space-4)',
                right: 'var(--space-4)',
                zIndex: 10,
                padding: 'var(--space-2) var(--space-3)',
                background: 'rgba(0, 122, 255, 0.15)',
                border: '0.5px solid rgba(0, 122, 255, 0.3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-sm)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
              }}>
                <span>✏️</span>
                선택됨: {selectedEvent.summary}
              </div>
            )}
            
            <SimpleCalendar
              events={events}
              onEventClick={handleEventClick}
                onTimeSlotClick={(date, hour) => {
                  // 시간 슬롯 클릭 시 날짜 업데이트 및 AI 채팅에 제안
                  setCurrentDate(date);
                  const dateStr = date.toLocaleDateString('ko-KR', { 
                    month: 'long', 
                    day: 'numeric',
                    weekday: 'short'
                  });
                  const timeStr = `${hour}:00`;
                  const message = `${dateStr} ${timeStr}에 일정을 만들어주세요`;
                  
                  setChatInitialMessage(message);
                  toast.info('일정 생성', '자세한 내용을 설명해주세요');
                }}
            />
          </div>

          <div className="glass-dark" style={{ 
            padding: 'var(--space-6)',
            borderRadius: 'var(--radius-2xl)'
          }}>
            <AIChat
                ref={aiChatRef}
                onEventSync={syncEvents}
                sessionId={sessionId}
                initialMessage={chatInitialMessage}
                onInitialMessageProcessed={() => setChatInitialMessage('')}
                selectedEvent={selectedEvent}
            />
          </div>
        </div>
      </main>
  );
}