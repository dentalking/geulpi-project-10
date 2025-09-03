'use client';

import React, { useState } from 'react';
import type { CalendarEvent } from '@/types';

interface SimpleCalendarProps {
    events: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
    onTimeSlotClick?: (date: Date, hour: number) => void;
}

export default function SimpleCalendar({ events, onEventClick, onTimeSlotClick }: SimpleCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewType, setViewType] = useState<'list' | 'week' | 'month' | 'day'>('month');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const today = new Date();
    const isToday = (date: Date) => date.toDateString() === today.toDateString();
    const isTomorrow = (date: Date) => {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date.toDateString() === tomorrow.toDateString();
    };

    // 월간 캘린더 그리드 생성
    const generateCalendarDays = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        // 이번 달 첫 날
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        // 첫 주의 시작 (일요일)
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
        
        // 6주 = 42일
        const days = [];
        for (let i = 0; i < 42; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            days.push(day);
        }
        
        return days;
    };

    const calendarDays = generateCalendarDays(currentDate);
    
    // 날짜별 이벤트 그룹화
    const getEventsForDate = (date: Date) => {
        const dateString = date.toDateString();
        return events.filter(event => {
            const eventDate = event.start?.dateTime || event.start?.date;
            if (!eventDate) return false;
            return new Date(eventDate).toDateString() === dateString;
        });
    };

    const upcomingEvents = events
        .filter(event => {
            const startTime = event.start?.dateTime || event.start?.date;
            return startTime && new Date(startTime) >= today;
        })
        .sort((a, b) => {
            const aStart = a.start?.dateTime || a.start?.date || '';
            const bStart = b.start?.dateTime || b.start?.date || '';
            return new Date(aStart).getTime() - new Date(bStart).getTime();
        })
        .slice(0, 10);
        
    // 주간 뷰용 함수들
    const getWeekDays = (date: Date) => {
        const startOfWeek = new Date(date);
        const dayOfWeek = startOfWeek.getDay();
        startOfWeek.setDate(date.getDate() - dayOfWeek);
        
        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            weekDays.push(day);
        }
        return weekDays;
    };

    const weekDays = getWeekDays(currentDate);
    
    // 시간 슬롯 생성 (9시-18시)
    const generateTimeSlots = () => {
        const slots = [];
        for (let hour = 9; hour <= 18; hour++) {
            slots.push(hour);
        }
        return slots;
    };
    
    const timeSlots = generateTimeSlots();
    
    // 이벤트 색상 테마 시스템
    const getEventColor = (event: CalendarEvent) => {
        const summary = event.summary?.toLowerCase() || '';
        const attendeesCount = event.attendees?.length || 0;
        const eventTime = event.start?.dateTime ? new Date(event.start.dateTime).getHours() : 12;
        
        // 1. 키워드 기반 카테고리 분류
        const categories = {
            work: ['미팅', '회의', '회사', '업무', '프로젝트', '발표', '고객', '클라이언트'],
            personal: ['개인', '취미', '운동', '헬스', '요가', '독서', '쇼핑', '병원'],
            social: ['친구', '가족', '모임', '파티', '술', '맥주', '커피', '식사', '저녁', '점심'],
            important: ['중요', '긴급', '데드라인', '마감', '면접', '시험', '발표'],
            travel: ['출장', '여행', '휴가', '비행', '기차', '호텔']
        };
        
        let category = 'default';
        for (const [cat, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => summary.includes(keyword))) {
                category = cat;
                break;
            }
        }
        
        // 2. 색상 테마 정의
        const colorThemes = {
            work: {
                bg: 'rgba(0, 122, 255, 0.15)',
                border: 'rgba(0, 122, 255, 0.4)',
                text: '#007AFF',
                hoverBg: 'rgba(0, 122, 255, 0.25)'
            },
            personal: {
                bg: 'rgba(52, 199, 89, 0.15)',
                border: 'rgba(52, 199, 89, 0.4)', 
                text: '#34C759',
                hoverBg: 'rgba(52, 199, 89, 0.25)'
            },
            social: {
                bg: 'rgba(255, 149, 0, 0.15)',
                border: 'rgba(255, 149, 0, 0.4)',
                text: '#FF9500',
                hoverBg: 'rgba(255, 149, 0, 0.25)'
            },
            important: {
                bg: 'rgba(255, 59, 48, 0.15)',
                border: 'rgba(255, 59, 48, 0.4)',
                text: '#FF3B30',
                hoverBg: 'rgba(255, 59, 48, 0.25)'
            },
            travel: {
                bg: 'rgba(175, 82, 222, 0.15)',
                border: 'rgba(175, 82, 222, 0.4)',
                text: '#AF52DE',
                hoverBg: 'rgba(175, 82, 222, 0.25)'
            },
            default: {
                bg: 'rgba(142, 142, 147, 0.15)',
                border: 'rgba(142, 142, 147, 0.4)',
                text: '#8E8E93',
                hoverBg: 'rgba(142, 142, 147, 0.25)'
            }
        };
        
        // 3. 시간대별 강도 조절
        let theme = colorThemes[category as keyof typeof colorThemes] || colorThemes.default;
        
        // 아침(6-11): 연한색, 오후(12-17): 기본, 저녁(18-23): 진한색
        if (eventTime >= 6 && eventTime < 12) {
            // 아침: 투명도 낮춤 (연한색)
            theme = {
                ...theme,
                bg: theme.bg.replace('0.15', '0.12'),
                border: theme.border.replace('0.4', '0.3')
            };
        } else if (eventTime >= 18) {
            // 저녁: 투명도 높임 (진한색)
            theme = {
                ...theme,
                bg: theme.bg.replace('0.15', '0.2'),
                border: theme.border.replace('0.4', '0.5')
            };
        }
        
        // 4. 참석자 수별 추가 강도
        if (attendeesCount > 3) {
            // 다수 참석: 더 진하게
            theme = {
                ...theme,
                bg: theme.bg.replace(/0\.1[0-9]/, '0.18'),
                border: theme.border.replace(/0\.[0-9]/, '0.6')
            };
        }
        
        return theme;
    };

    // 이벤트를 시간대별로 분류
    const getEventsForTimeSlot = (day: Date, hour: number) => {
        const dayString = day.toDateString();
        return events.filter(event => {
            const eventDate = event.start?.dateTime;
            if (!eventDate) return false;
            
            const eventStart = new Date(eventDate);
            return eventStart.toDateString() === dayString && 
                   eventStart.getHours() === hour;
        });
    };

    // 네비게이션 함수들
    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
            return newDate;
        });
    };
    
    const navigateWeek = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
            return newDate;
        });
    };

    return (
        <div className="glass-medium" style={{
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-6)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background gradient overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at top right, rgba(0, 122, 255, 0.05), transparent 50%)',
                pointerEvents: 'none'
            }} />

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-6)',
                position: 'relative'
            }}>
                <h2 className="text-on-glass-strong" style={{ 
                    margin: 0,
                    fontSize: 'var(--font-xl)',
                    fontWeight: '600',
                    letterSpacing: 'var(--tracking-tight)'
                }}>
                    {viewType === 'month' ? '월간 캘린더' : 
                     viewType === 'week' ? '주간 캘린더' :
                     viewType === 'day' ? '일간 캘린더' : '다가오는 일정'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    {/* 네비게이션 (월간/주간/일간 뷰일 때) */}
                    {(viewType === 'month' || viewType === 'week' || viewType === 'day') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <button
                                onClick={() => {
                                    if (viewType === 'month') navigateMonth('prev');
                                    else if (viewType === 'week') navigateWeek('prev');
                                    else if (viewType === 'day') {
                                        setSelectedDate(prev => {
                                            const newDate = new Date(prev);
                                            newDate.setDate(prev.getDate() - 1);
                                            return newDate;
                                        });
                                    }
                                }}
                                className="glass-light interactive focus-ring"
                                style={{
                                    padding: 'var(--space-2)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '0.5px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    fontSize: 'var(--font-sm)',
                                    transition: 'var(--transition-fast)'
                                }}
                                aria-label={viewType === 'month' ? '이전 달' : viewType === 'week' ? '이전 주' : '이전 날'}
                            >
                                ←
                            </button>
                            <div style={{
                                fontSize: 'var(--font-base)',
                                fontWeight: '600',
                                color: 'var(--text-high-contrast)',
                                minWidth: '140px',
                                textAlign: 'center'
                            }}>
                                {viewType === 'month' ? 
                                    currentDate.toLocaleDateString('ko-KR', { 
                                        year: 'numeric', 
                                        month: 'long' 
                                    }) :
                                    viewType === 'week' ?
                                    `${weekDays[0].toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}` :
                                    selectedDate.toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        weekday: 'short'
                                    })
                                }
                            </div>
                            <button
                                onClick={() => {
                                    if (viewType === 'month') navigateMonth('next');
                                    else if (viewType === 'week') navigateWeek('next');
                                    else if (viewType === 'day') {
                                        setSelectedDate(prev => {
                                            const newDate = new Date(prev);
                                            newDate.setDate(prev.getDate() + 1);
                                            return newDate;
                                        });
                                    }
                                }}
                                className="glass-light interactive focus-ring"
                                style={{
                                    padding: 'var(--space-2)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '0.5px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    fontSize: 'var(--font-sm)',
                                    transition: 'var(--transition-fast)'
                                }}
                                aria-label={viewType === 'month' ? '다음 달' : viewType === 'week' ? '다음 주' : '다음 날'}
                            >
                                →
                            </button>
                        </div>
                    )}
                    
                    {/* 뷰 타입 버튼 */}
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        {[
                            { key: 'month', label: '월간', icon: '📅' },
                            { key: 'week', label: '주간', icon: '📊' },
                            { key: 'day', label: '일간', icon: '🌅' },
                            { key: 'list', label: '목록', icon: '📋' }
                        ].map(({ key, label, icon }) => (
                            <button
                                key={key}
                                onClick={() => setViewType(key as any)}
                                className="glass-light interactive focus-ring"
                                style={{
                                    padding: 'var(--space-2) var(--space-3)',
                                    background: viewType === key 
                                        ? 'rgba(0, 122, 255, 0.15)' 
                                        : 'rgba(255, 255, 255, 0.05)',
                                    color: viewType === key 
                                        ? 'var(--text-high-contrast)' 
                                        : 'var(--text-secondary)',
                                    border: viewType === key
                                        ? '0.5px solid rgba(0, 122, 255, 0.3)'
                                        : '0.5px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    fontSize: 'var(--font-sm)',
                                    fontWeight: '500',
                                    transition: 'var(--transition-fast)',
                                    backdropFilter: 'blur(20px)',
                                    WebkitBackdropFilter: 'blur(20px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-1)'
                                }}
                                aria-label={`${label} 보기`}
                                aria-pressed={viewType === key}
                            >
                                <span style={{ fontSize: '14px' }}>{icon}</span>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 뷰 타입별 렌더링 */}
            {viewType === 'day' ? (
                /* 24시간 원형 시계 일간 뷰 */
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--space-8)' }}>
                    {/* 원형 시계 컨테이너 */}
                    <div style={{
                        position: 'relative',
                        width: '400px',
                        height: '400px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 70%, rgba(255, 255, 255, 0.01) 100%)',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: `
                            inset 0 4px 20px rgba(255, 255, 255, 0.1),
                            inset 0 -4px 20px rgba(0, 0, 0, 0.2),
                            0 8px 32px rgba(0, 0, 0, 0.3)
                        `,
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)'
                    }}>
                        {/* 시간 마커 (24시간) */}
                        {Array.from({ length: 24 }, (_, hour) => {
                            const angle = (hour * 15) - 90; // 12시가 맨 위로 오도록 90도 회전
                            const radians = (angle * Math.PI) / 180;
                            const radius = 180; // 시계 반지름
                            const markerRadius = 160; // 마커 위치
                            
                            const x = Math.cos(radians) * markerRadius + radius;
                            const y = Math.sin(radians) * markerRadius + radius;
                            
                            const isCurrentHour = new Date().getHours() === hour && 
                                                 isToday(selectedDate);
                            
                            const dayEvents = events.filter(event => {
                                const eventDate = event.start?.dateTime;
                                if (!eventDate) return false;
                                
                                const eventStart = new Date(eventDate);
                                return eventStart.toDateString() === selectedDate.toDateString() && 
                                       eventStart.getHours() === hour;
                            });
                            
                            return (
                                <div
                                    key={hour}
                                    style={{
                                        position: 'absolute',
                                        left: x - 15,
                                        top: y - 15,
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        background: isCurrentHour ? 
                                            'radial-gradient(circle, rgba(0, 122, 255, 0.6) 0%, rgba(0, 122, 255, 0.2) 100%)' :
                                            dayEvents.length > 0 ?
                                            'radial-gradient(circle, rgba(255, 149, 0, 0.6) 0%, rgba(255, 149, 0, 0.2) 100%)' :
                                            'rgba(255, 255, 255, 0.1)',
                                        border: isCurrentHour ? 
                                            '2px solid rgba(0, 122, 255, 0.8)' :
                                            dayEvents.length > 0 ?
                                            '2px solid rgba(255, 149, 0, 0.8)' :
                                            '1px solid rgba(255, 255, 255, 0.2)',
                                        cursor: 'pointer',
                                        transition: 'all var(--transition-fast)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 'var(--font-xs)',
                                        fontWeight: '600',
                                        color: isCurrentHour ? 
                                            'var(--accent-primary)' :
                                            dayEvents.length > 0 ?
                                            'var(--accent-warning)' :
                                            'var(--text-secondary)',
                                        boxShadow: isCurrentHour ? 
                                            '0 4px 12px rgba(0, 122, 255, 0.3)' :
                                            dayEvents.length > 0 ?
                                            '0 4px 12px rgba(255, 149, 0, 0.3)' :
                                            '0 2px 8px rgba(0, 0, 0, 0.1)'
                                    }}
                                    onClick={() => {
                                        onTimeSlotClick?.(selectedDate, hour);
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.3)';
                                        e.currentTarget.style.zIndex = '10';
                                        if (!isCurrentHour && dayEvents.length === 0) {
                                            e.currentTarget.style.background = 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.zIndex = '1';
                                        if (!isCurrentHour && dayEvents.length === 0) {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                        }
                                    }}
                                    title={`${hour}:00 ${dayEvents.length > 0 ? `(${dayEvents.length}개 일정)` : ''}`}
                                >
                                    {hour}
                                </div>
                            );
                        })}
                        
                        {/* 중앙 일자 표시 */}
                        <div style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            background: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: 'var(--radius-xl)',
                            padding: 'var(--space-4)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            minWidth: '120px'
                        }}>
                            <div style={{
                                fontSize: 'var(--font-xs)',
                                color: 'var(--text-tertiary)',
                                marginBottom: 'var(--space-1)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                {selectedDate.toLocaleDateString('ko-KR', { weekday: 'short' })}
                            </div>
                            <div style={{
                                fontSize: 'var(--font-xl)',
                                fontWeight: '700',
                                color: 'var(--text-high-contrast)',
                                marginBottom: 'var(--space-1)'
                            }}>
                                {selectedDate.getDate()}
                            </div>
                            <div style={{
                                fontSize: 'var(--font-xs)',
                                color: 'var(--text-secondary)'
                            }}>
                                {selectedDate.toLocaleDateString('ko-KR', { 
                                    year: 'numeric',
                                    month: 'short'
                                })}
                            </div>
                            
                            {/* 현재 시간 표시 (오늘인 경우) */}
                            {isToday(selectedDate) && (
                                <div style={{
                                    marginTop: 'var(--space-3)',
                                    paddingTop: 'var(--space-2)',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                    fontSize: 'var(--font-sm)',
                                    color: 'var(--accent-primary)',
                                    fontWeight: '600'
                                }}>
                                    {new Date().toLocaleTimeString('ko-KR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            )}
                        </div>
                        
                        {/* 현재 시간 지시 바늘 (오늘인 경우) */}
                        {isToday(selectedDate) && (
                            <div style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                transformOrigin: '0 0',
                                transform: `translate(-1px, -1px) rotate(${(new Date().getHours() + new Date().getMinutes() / 60) * 15 - 90}deg)`,
                                width: '2px',
                                height: '140px',
                                background: 'linear-gradient(to bottom, rgba(0, 122, 255, 0.9) 0%, rgba(0, 122, 255, 0.6) 70%, transparent 100%)',
                                borderRadius: '1px',
                                boxShadow: '0 0 8px rgba(0, 122, 255, 0.5)',
                                zIndex: 5,
                                animation: 'pulse 2s ease-in-out infinite'
                            }} />
                        )}
                    </div>
                    
                    {/* 일정 목록 (우측) */}
                    <div style={{
                        marginLeft: 'var(--space-8)',
                        maxWidth: '300px',
                        width: '300px'
                    }}>
                        <h3 style={{
                            margin: '0 0 var(--space-4) 0',
                            fontSize: 'var(--font-lg)',
                            fontWeight: '600',
                            color: 'var(--text-high-contrast)'
                        }}>오늘의 일정</h3>
                        
                        <div style={{
                            maxHeight: '350px',
                            overflowY: 'auto',
                            paddingRight: 'var(--space-2)'
                        }}>
                            {events
                                .filter(event => {
                                    const eventDate = event.start?.dateTime || event.start?.date;
                                    return eventDate && new Date(eventDate).toDateString() === selectedDate.toDateString();
                                })
                                .sort((a, b) => {
                                    const aStart = a.start?.dateTime || a.start?.date || '';
                                    const bStart = b.start?.dateTime || b.start?.date || '';
                                    return new Date(aStart).getTime() - new Date(bStart).getTime();
                                })
                                .map((event, index) => {
                                    const eventColors = getEventColor(event);
                                    const startTime = event.start?.dateTime || event.start?.date || '';
                                    const eventDate = startTime ? new Date(startTime) : new Date();
                                    
                                    return (
                                        <div
                                            key={event.id}
                                            className="glass-light interactive hover-lift focus-ring"
                                            style={{
                                                padding: 'var(--space-3)',
                                                marginBottom: 'var(--space-2)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '0.5px solid rgba(255, 255, 255, 0.08)',
                                                borderLeft: `3px solid ${eventColors.text}`,
                                                cursor: 'pointer',
                                                transition: 'var(--transition-fast)',
                                                animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                                            }}
                                            onClick={() => onEventClick?.(event)}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-2)',
                                                marginBottom: 'var(--space-1)'
                                            }}>
                                                <div style={{
                                                    fontSize: 'var(--font-sm)',
                                                    fontWeight: '600',
                                                    color: 'var(--text-high-contrast)',
                                                    flex: 1
                                                }}>
                                                    {event.summary}
                                                </div>
                                                <div style={{
                                                    fontSize: 'var(--font-xs)',
                                                    color: eventColors.text,
                                                    background: eventColors.bg,
                                                    padding: '2px var(--space-2)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: `0.5px solid ${eventColors.border}`,
                                                    fontWeight: '500'
                                                }}>
                                                    {eventDate.toLocaleTimeString('ko-KR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                            
                                            {event.location && (
                                                <div style={{
                                                    fontSize: 'var(--font-xs)',
                                                    color: 'var(--text-secondary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-1)'
                                                }}>
                                                    <span>📍</span>
                                                    {event.location}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            }
                            
                            {events.filter(event => {
                                const eventDate = event.start?.dateTime || event.start?.date;
                                return eventDate && new Date(eventDate).toDateString() === selectedDate.toDateString();
                            }).length === 0 && (
                                <div className="glass-light" style={{
                                    padding: 'var(--space-6)',
                                    textAlign: 'center',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '0.5px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                    <div style={{ fontSize: '48px', marginBottom: 'var(--space-3)' }}>📅</div>
                                    <div style={{
                                        fontSize: 'var(--font-sm)',
                                        color: 'var(--text-secondary)',
                                        marginBottom: 'var(--space-2)'
                                    }}>
                                        이 날에는 일정이 없습니다
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--font-xs)',
                                        color: 'var(--text-tertiary)'
                                    }}>
                                        시간을 클릭하여 새 일정을 추가하세요
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : viewType === 'month' ? (
                /* 월간 캘린더 그리드 */
                <div style={{ position: 'relative' }}>
                    {/* 요일 헤더 */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '1px',
                        marginBottom: 'var(--space-3)'
                    }}>
                        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                            <div
                                key={day}
                                style={{
                                    padding: 'var(--space-2)',
                                    textAlign: 'center',
                                    fontSize: 'var(--font-sm)',
                                    fontWeight: '600',
                                    color: index === 0 ? 'var(--accent-danger)' : 
                                          index === 6 ? 'var(--accent-primary)' : 
                                          'var(--text-secondary)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '0.5px solid rgba(255, 255, 255, 0.08)'
                                }}
                            >
                                {day}
                            </div>
                        ))}
                    </div>
                    
                    {/* 날짜 그리드 */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '1px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1px'
                    }}>
                        {calendarDays.map((day, index) => {
                            const dayEvents = getEventsForDate(day);
                            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                            const isDayToday = isToday(day);
                            const dayOfWeek = day.getDay();
                            
                            return (
                                <div
                                    key={day.toISOString()}
                                    className="glass-light interactive"
                                    style={{
                                        minHeight: '80px',
                                        padding: 'var(--space-2)',
                                        backgroundColor: isDayToday ? 'rgba(0, 122, 255, 0.1)' : 
                                                       isCurrentMonth ? 'rgba(255, 255, 255, 0.05)' :
                                                       'rgba(255, 255, 255, 0.02)',
                                        border: isDayToday ? '0.5px solid rgba(0, 122, 255, 0.3)' :
                                               '0.5px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        transition: 'var(--transition-fast)',
                                        position: 'relative',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        opacity: isCurrentMonth ? 1 : 0.4
                                    }}
                                    onClick={() => {
                                        // 날짜 클릭 시 해당 날짜의 오전 9시로 일정 생성 제안
                                        onTimeSlotClick?.(day, 9);
                                    }}
                                    onMouseEnter={(e) => {
                                        if (isCurrentMonth) {
                                            e.currentTarget.style.backgroundColor = isDayToday ? 
                                                'rgba(0, 122, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = isDayToday ? 
                                            'rgba(0, 122, 255, 0.1)' : 
                                            isCurrentMonth ? 'rgba(255, 255, 255, 0.05)' : 
                                            'rgba(255, 255, 255, 0.02)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {/* 날짜 숫자 */}
                                    <div style={{
                                        fontSize: 'var(--font-sm)',
                                        fontWeight: isDayToday ? '700' : '600',
                                        color: isDayToday ? 'var(--accent-primary)' :
                                              dayOfWeek === 0 ? 'var(--accent-danger)' :
                                              dayOfWeek === 6 ? 'var(--accent-primary)' :
                                              isCurrentMonth ? 'var(--text-high-contrast)' : 'var(--text-tertiary)',
                                        marginBottom: 'var(--space-1)'
                                    }}>
                                        {day.getDate()}
                                    </div>
                                    
                                    {/* 이벤트 인디케이터 */}
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        gap: '2px',
                                        flex: 1
                                    }}>
                                        {dayEvents.slice(0, 2).map((event, eventIndex) => {
                                            const eventColors = getEventColor(event);
                                            return (
                                                <div
                                                    key={event.id}
                                                    className="interactive"
                                                    style={{
                                                        fontSize: 'var(--font-xs)',
                                                        color: eventColors.text,
                                                        backgroundColor: eventColors.bg,
                                                        border: `0.5px solid ${eventColors.border}`,
                                                        borderRadius: 'var(--radius-sm)',
                                                        padding: '2px var(--space-1)',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        cursor: 'pointer',
                                                        transition: 'var(--transition-fast)',
                                                        fontWeight: '500'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEventClick?.(event);
                                                    }}
                                                    title={`${event.summary} (카테고리 색상 적용)`}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = eventColors.hoverBg;
                                                        e.currentTarget.style.transform = 'scale(1.02)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = eventColors.bg;
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                    }}
                                                >
                                                    {event.summary}
                                                </div>
                                            );
                                        })}
                                        
                                        {/* 더 많은 이벤트가 있을 때 */}
                                        {dayEvents.length > 2 && (
                                            <div style={{
                                                fontSize: 'var(--font-xs)',
                                                color: 'var(--text-tertiary)',
                                                padding: '2px var(--space-1)',
                                                cursor: 'pointer'
                                            }}>
                                                +{dayEvents.length - 2}개
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : viewType === 'week' ? (
                /* 주간 뷰 */
                <div style={{ position: 'relative', overflowX: 'auto' }}>
                    {/* 주간 캘린더 그리드 */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '80px repeat(7, 1fr)',
                        gap: '1px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1px',
                        minWidth: '700px'
                    }}>
                        {/* 헤더: 시간 컬럼 + 요일들 */}
                        <div style={{
                            padding: 'var(--space-2)',
                            fontSize: 'var(--font-sm)',
                            fontWeight: '600',
                            color: 'var(--text-tertiary)',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            시간
                        </div>
                        
                        {weekDays.map((day, dayIndex) => {
                            const isDayToday = isToday(day);
                            const dayOfWeek = day.getDay();
                            
                            return (
                                <div
                                    key={day.toISOString()}
                                    style={{
                                        padding: 'var(--space-2)',
                                        textAlign: 'center',
                                        backgroundColor: isDayToday ? 
                                            'rgba(0, 122, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: 'var(--radius-md)',
                                        border: isDayToday ? 
                                            '0.5px solid rgba(0, 122, 255, 0.3)' : 
                                            '0.5px solid rgba(255, 255, 255, 0.08)'
                                    }}
                                >
                                    <div style={{
                                        fontSize: 'var(--font-sm)',
                                        fontWeight: '600',
                                        color: dayOfWeek === 0 ? 'var(--accent-danger)' :
                                               dayOfWeek === 6 ? 'var(--accent-primary)' :
                                               isDayToday ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        marginBottom: 'var(--space-1)'
                                    }}>
                                        {['일', '월', '화', '수', '목', '금', '토'][dayOfWeek]}
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--font-sm)',
                                        fontWeight: isDayToday ? '700' : '500',
                                        color: isDayToday ? 'var(--accent-primary)' : 'var(--text-high-contrast)'
                                    }}>
                                        {day.getDate()}
                                    </div>
                                </div>
                            );
                        })}

                        {/* 시간 슬롯들 */}
                        {timeSlots.map(hour => (
                            <React.Fragment key={hour}>
                                {/* 시간 레이블 */}
                                <div style={{
                                    padding: 'var(--space-2)',
                                    fontSize: 'var(--font-xs)',
                                    color: 'var(--text-tertiary)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '500'
                                }}>
                                    {hour}:00
                                </div>
                                
                                {/* 각 날짜의 시간 슬롯 */}
                                {weekDays.map((day, dayIndex) => {
                                    const slotEvents = getEventsForTimeSlot(day, hour);
                                    const isDayToday = isToday(day);
                                    
                                    return (
                                        <div
                                            key={`${day.toISOString()}-${hour}`}
                                            className="glass-light interactive"
                                            style={{
                                                minHeight: '60px',
                                                padding: 'var(--space-2)',
                                                backgroundColor: isDayToday ? 
                                                    'rgba(0, 122, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                                border: '0.5px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: 'var(--radius-md)',
                                                cursor: 'pointer',
                                                transition: 'var(--transition-fast)',
                                                position: 'relative',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '2px'
                                            }}
                                            onClick={() => {
                                                // 시간 슬롯 클릭 시 AI 채팅에 해당 시간으로 일정 생성 제안
                                                onTimeSlotClick?.(day, hour);
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = isDayToday ? 
                                                    'rgba(0, 122, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)';
                                                e.currentTarget.style.transform = 'scale(1.02)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = isDayToday ? 
                                                    'rgba(0, 122, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)';
                                                e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                        >
                                            {/* 이벤트 표시 */}
                                            {slotEvents.map((event, eventIndex) => {
                                                const eventColors = getEventColor(event);
                                                return (
                                                    <div
                                                        key={event.id}
                                                        className="interactive"
                                                        style={{
                                                            fontSize: 'var(--font-xs)',
                                                            color: eventColors.text,
                                                            backgroundColor: eventColors.bg,
                                                            border: `0.5px solid ${eventColors.border}`,
                                                            borderRadius: 'var(--radius-sm)',
                                                            padding: '4px var(--space-2)',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            cursor: 'pointer',
                                                            transition: 'var(--transition-fast)',
                                                            fontWeight: '500'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEventClick?.(event);
                                                        }}
                                                        title={`${event.summary} (스마트 색상 분류)`}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = eventColors.hoverBg;
                                                            e.currentTarget.style.transform = 'scale(1.05)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = eventColors.bg;
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                        }}
                                                    >
                                                        {event.summary}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                    
                    {/* 스크롤 가이드 */}
                    <div style={{
                        textAlign: 'center',
                        marginTop: 'var(--space-4)',
                        fontSize: 'var(--font-xs)',
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-2)'
                    }}>
                        <span>💡</span>
                        시간 슬롯을 클릭하여 새 일정을 추가하세요
                    </div>
                </div>
            ) : upcomingEvents.length === 0 ? (
                <div className="glass-light" style={{
                    textAlign: 'center',
                    padding: 'var(--space-10) var(--space-6)',
                    borderRadius: 'var(--radius-xl)',
                    border: '0.5px solid rgba(255, 255, 255, 0.08)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Gradient overlay for visual interest */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'radial-gradient(circle at center, rgba(0, 122, 255, 0.03), transparent 70%)',
                        pointerEvents: 'none'
                    }} />
                    
                    <div style={{ 
                        fontSize: '64px', 
                        marginBottom: 'var(--space-4)',
                        animation: 'floatSmooth 6s ease-in-out infinite',
                        filter: 'grayscale(0.2)'
                    }}>📅</div>
                    
                    <h3 className="text-on-glass-strong" style={{ 
                        margin: '0 0 var(--space-2) 0', 
                        fontSize: 'var(--font-xl)',
                        fontWeight: '600'
                    }}>
                        일정이 비어있네요!
                    </h3>
                    
                    <p style={{ 
                        margin: '0 0 var(--space-6) 0', 
                        fontSize: 'var(--font-base)',
                        color: 'var(--text-secondary)',
                        maxWidth: '300px',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                    }}>
                        AI 어시스턴트가 자연어로 일정을 관리해드립니다
                    </p>
                    
                    {/* Quick action examples */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-2)',
                        maxWidth: '280px',
                        margin: '0 auto'
                    }}>
                        <p style={{
                            fontSize: 'var(--font-xs)',
                            color: 'var(--text-tertiary)',
                            margin: '0 0 var(--space-2) 0',
                            fontWeight: '500',
                            letterSpacing: 'var(--tracking-wide)',
                            textTransform: 'uppercase'
                        }}>예시 명령어</p>
                        
                        {[
                            { icon: '☕', text: '"내일 오전 10시 팀 미팅"' },
                            { icon: '🍽️', text: '"금요일 저녁 7시 친구와 저녁"' },
                            { icon: '✈️', text: '"다음주 월요일 출장"' }
                        ].map((example, index) => (
                            <div
                                key={index}
                                className="glass-medium interactive"
                                style={{
                                    padding: 'var(--space-3)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '0.5px solid rgba(255, 255, 255, 0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    fontSize: 'var(--font-sm)',
                                    color: 'var(--text-secondary)',
                                    cursor: 'default',
                                    animation: `fadeIn 0.4s ease-out ${index * 0.1 + 0.2}s both`,
                                    transition: 'var(--transition-fast)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                }}
                            >
                                <span style={{ fontSize: '18px' }}>{example.icon}</span>
                                <span style={{ fontStyle: 'italic' }}>{example.text}</span>
                            </div>
                        ))}
                    </div>
                    
                    <p style={{
                        margin: 'var(--space-6) 0 0 0',
                        fontSize: 'var(--font-sm)',
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-2)'
                    }}>
                        <span style={{ 
                            display: 'inline-block',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'var(--accent-success)',
                            animation: 'breathe 2s ease-in-out infinite'
                        }} />
                        AI 채팅창에서 시작하세요
                    </p>
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    {upcomingEvents.map((event, index) => {
                        const startTime = event.start?.dateTime || event.start?.date || '';
                        const eventDate = startTime ? new Date(startTime) : new Date();
                        const eventToday = isToday(eventDate);
                        const eventTomorrow = isTomorrow(eventDate);

                        return (
                            <div
                                key={event.id}
                                onClick={() => onEventClick?.(event)}
                                className="glass-light interactive hover-lift focus-ring"
                                style={{
                                    padding: 'var(--space-4)',
                                    marginBottom: 'var(--space-3)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '0.5px solid rgba(255, 255, 255, 0.08)',
                                    cursor: onEventClick ? 'pointer' : 'default',
                                    borderLeft: `3px solid ${getEventColor(event).text}`,
                                    transition: 'var(--transition-smooth)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`
                                }}
                                role="article"
                                aria-label={`일정: ${event.summary}`}
                                tabIndex={onEventClick ? 0 : -1}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        onEventClick?.(event);
                                    }
                                }}
                            >
                                {/* Gradient overlay for depth */}
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.02))',
                                    pointerEvents: 'none'
                                }} />

                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'start',
                                    position: 'relative'
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 className="text-on-glass-strong" style={{
                                            margin: '0 0 var(--space-2) 0',
                                            fontSize: 'var(--font-base)',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)'
                                        }}>
                                            {event.summary}
                                            {eventToday && (
                                                <span className="glass-heavy" style={{
                                                    fontSize: 'var(--font-xs)',
                                                    background: 'rgba(255, 59, 48, 0.15)',
                                                    color: 'var(--accent-danger)',
                                                    padding: 'var(--space-1) var(--space-2)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '0.5px solid rgba(255, 59, 48, 0.3)',
                                                    fontWeight: '600'
                                                }}>오늘</span>
                                            )}
                                            {eventTomorrow && (
                                                <span className="glass-heavy" style={{
                                                    fontSize: 'var(--font-xs)',
                                                    background: 'rgba(255, 149, 0, 0.15)',
                                                    color: 'var(--accent-warning)',
                                                    padding: 'var(--space-1) var(--space-2)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '0.5px solid rgba(255, 149, 0, 0.3)',
                                                    fontWeight: '600'
                                                }}>내일</span>
                                            )}
                                        </h3>

                                        <p style={{
                                            margin: '0 0 var(--space-1) 0',
                                            fontSize: 'var(--font-sm)',
                                            color: 'var(--text-secondary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)'
                                        }}>
                                            <span style={{ opacity: 0.7 }}>🕒</span>
                                            {eventDate.toLocaleString('ko-KR', {
                                                month: 'short',
                                                day: 'numeric',
                                                weekday: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>

                                        {event.location && (
                                            <p style={{
                                                margin: '0 0 var(--space-1) 0',
                                                fontSize: 'var(--font-sm)',
                                                color: 'var(--text-secondary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-2)'
                                            }}>
                                                <span style={{ opacity: 0.7 }}>📍</span>
                                                {event.location}
                                            </p>
                                        )}

                                        {event.attendees && event.attendees.length > 0 && (
                                            <p style={{
                                                margin: 'var(--space-2) 0 0 0',
                                                fontSize: 'var(--font-xs)',
                                                color: 'var(--text-tertiary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-2)'
                                            }}>
                                                <span style={{ opacity: 0.7 }}>👥</span>
                                                {event.attendees.length}명 참석
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}