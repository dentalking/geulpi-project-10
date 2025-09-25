'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CalendarEvent } from '@/types';
import { usePerformanceMonitor } from '@/utils/performanceMonitor';

interface OptimizedDayViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (hour: number) => void;
  locale: string;
}

export const OptimizedDayView = React.memo(({
  events,
  selectedDate,
  onEventClick,
  onTimeSlotClick,
  locale
}: OptimizedDayViewProps) => {
  const [focusedHour, setFocusedHour] = useState<number | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 400 });

  // Performance monitoring
  usePerformanceMonitor('OptimizedDayView', events.length);

  // 반응형 크기 계산
  React.useEffect(() => {
    const updateSize = () => {
      const size = Math.min(window.innerWidth * 0.8, 500);
      setContainerSize({ width: size, height: size });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 이벤트를 시간별로 그룹화 (메모이제이션)
  const hourlyEvents = useMemo(() => {
    const grouped = new Map<number, CalendarEvent[]>();

    events.forEach(event => {
      const eventDate = new Date(event.start?.dateTime || '');

      // 선택된 날짜와 같은 날인지 확인
      if (eventDate.toDateString() === selectedDate.toDateString()) {
        const hour = eventDate.getHours();
        if (!grouped.has(hour)) {
          grouped.set(hour, []);
        }
        grouped.get(hour)!.push(event);
      }
    });

    return grouped;
  }, [events, selectedDate]);

  // 현재 시간 확인 (메모이제이션)
  const currentHour = useMemo(() => {
    const now = new Date();
    return now.toDateString() === selectedDate.toDateString() ? now.getHours() : null;
  }, [selectedDate]);

  // 동적 반지름 계산
  const radius = containerSize.width / 2 - 20;
  const markerRadius = radius * 0.85;

  // 시간 슬롯 렌더링 함수
  const renderTimeSlot = useCallback((hour: number) => {
    const angle = (hour * 15) - 90; // 0시가 맨 위
    const radians = (angle * Math.PI) / 180;

    const x = Math.cos(radians) * markerRadius + radius;
    const y = Math.sin(radians) * markerRadius + radius;

    const isCurrentHour = currentHour === hour;
    const eventCount = hourlyEvents.get(hour)?.length || 0;
    const isFocused = focusedHour === hour;

    return (
      <motion.button
        key={hour}
        className="time-slot"
        style={{
          position: 'absolute',
          left: x - 20,
          top: y - 20,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: isFocused ? 1.2 : 1,
          opacity: 1,
          background: isCurrentHour
            ? 'radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(59, 130, 246, 0.2) 100%)'
            : eventCount > 0
            ? 'radial-gradient(circle, rgba(251, 146, 60, 0.6) 0%, rgba(251, 146, 60, 0.2) 100%)'
            : 'rgba(255, 255, 255, 0.1)'
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={() => onTimeSlotClick(hour)}
        onFocus={() => setFocusedHour(hour)}
        onBlur={() => setFocusedHour(null)}
        aria-label={`${hour}시 ${eventCount > 0 ? `(${eventCount}개 일정)` : '(일정 없음)'}`}
        role="button"
        tabIndex={0}
      >
        <span className="hour-label" style={{
          fontSize: '12px',
          fontWeight: isCurrentHour ? 'bold' : 'normal',
          color: isCurrentHour ? '#3b82f6' : eventCount > 0 ? '#fb923c' : '#9ca3af'
        }}>
          {hour}
        </span>
        {eventCount > 0 && (
          <span className="event-badge" style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#fb923c',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            {eventCount}
          </span>
        )}
      </motion.button>
    );
  }, [currentHour, hourlyEvents, focusedHour, markerRadius, radius, onTimeSlotClick]);

  // 이벤트 목록 렌더링
  const renderEventList = useCallback(() => {
    if (focusedHour === null) return null;

    const events = hourlyEvents.get(focusedHour) || [];

    return (
      <AnimatePresence>
        {events.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="event-list"
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '300px',
              width: '90%',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <h3 style={{
              fontSize: '14px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#1f2937'
            }}>
              {focusedHour}:00 일정
            </h3>
            {events.map((event, idx) => (
              <button
                key={event.id || idx}
                onClick={() => onEventClick(event)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px',
                  marginBottom: '4px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#1f2937' }}>
                  {event.summary}
                </div>
                {event.location && (
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                    📍 {event.location}
                  </div>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }, [focusedHour, hourlyEvents, onEventClick]);

  return (
    <div
      className="day-view-container"
      style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '500px',
        padding: '20px'
      }}
      role="region"
      aria-label="일간 시간별 일정 보기"
    >
      {/* 원형 시계 배경 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'relative',
          width: containerSize.width,
          height: containerSize.height,
          borderRadius: '50%',
          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 70%)',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          boxShadow: `
            inset 0 4px 20px rgba(255, 255, 255, 0.1),
            inset 0 -4px 20px rgba(0, 0, 0, 0.2),
            0 8px 32px rgba(0, 0, 0, 0.3)
          `,
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* 중앙 날짜 표시 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
            {selectedDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {selectedDate.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
              weekday: 'long'
            })}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            총 {events.length}개 일정
          </div>
        </div>

        {/* 시간 마커 렌더링 */}
        {Array.from({ length: 24 }, (_, hour) => renderTimeSlot(hour))}

        {/* 현재 시간 바늘 (애니메이션) */}
        {currentHour !== null && (
          <motion.div
            animate={{ rotate: currentHour * 15 - 90 }}
            transition={{ duration: 1 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: markerRadius,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #3b82f6)',
              transformOrigin: 'left center',
            }}
          />
        )}
      </motion.div>

      {/* 선택된 시간대의 이벤트 목록 */}
      {renderEventList()}
    </div>
  );
});

OptimizedDayView.displayName = 'OptimizedDayView';