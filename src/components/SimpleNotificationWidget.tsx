'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, AlertTriangle, Sparkles, Users, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTheme } from '@/providers/ThemeProvider';
import type { LoginNotifications } from '@/services/notification/SimpleNotificationService';
import SimpleNotificationService from '@/services/notification/SimpleNotificationService';
import type { CalendarEvent } from '@/types';

interface SimpleNotificationWidgetProps {
  userId?: string;
  events?: CalendarEvent[];
  className?: string;
  locale?: string;
  onClose?: () => void;
}

export function SimpleNotificationWidget({
  userId,
  events = [],
  className = '',
  locale = 'ko',
  onClose
}: SimpleNotificationWidgetProps) {
  const [notifications, setNotifications] = useState<LoginNotifications | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    // 기존 localStorage 값 정리 (더 이상 사용하지 않음)
    localStorage.removeItem('notifications-shown-date');

    // 사용자가 직접 알림 아이콘을 클릭했을 때는 항상 알림을 가져오기
    if (userId && events.length > 0) {
      fetchNotifications();
    } else {
      setIsLoading(false);
    }
  }, [userId, events]);

  const fetchNotifications = async () => {
    try {
      console.log('🔔 Fetching notifications for user:', userId, 'with events:', events.length);

      // 직접 서비스 사용 (API 호출 대신)
      const service = new SimpleNotificationService();
      const data = await service.getLoginNotifications(userId!, events);

      console.log('🔔 Notification data received:', data);

      // 실제 내용이 있는지 확인
      const hasContent = data.brief ||
                        data.conflicts.length > 0 ||
                        data.suggestions.length > 0;

      console.log('🔔 Has content:', hasContent);

      // 내용이 있든 없든 항상 데이터를 설정 (빈 알림도 표시)
      setNotifications(data);
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const dismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id));

    // 모두 닫으면 컴포넌트 숨기기
    const totalNotifications =
      (notifications?.brief ? 1 : 0) +
      (notifications?.conflicts?.length || 0) +
      (notifications?.suggestions?.length || 0) +
      (notifications?.friendUpdates?.length || 0);

    if (dismissed.size + 1 >= totalNotifications) {
      setTimeout(() => setNotifications(null), 300);
    }
  };

  const dismissAll = () => {
    setNotifications(null);
    if (onClose) onClose();
  };

  if (isLoading) {
    return (
      <div className={`fixed top-20 right-4 w-96 z-30 ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Always show at least a basic notification for debugging
  if (!notifications) {
    return (
      <div className={`fixed top-20 right-4 w-96 z-30 ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">알림</h3>
            {onClose && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {locale === 'ko' ? '알림을 불러오는 중...' : 'Loading notifications...'}
          </p>
        </div>
      </div>
    );
  }

  const hasContent =
    notifications.brief ||
    notifications.conflicts?.length > 0 ||
    notifications.suggestions?.length > 0 ||
    notifications.friendUpdates?.length > 0;

  // For debugging, always show something
  if (!hasContent) {
    return (
      <div className={`fixed top-20 right-4 w-96 z-30 ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {locale === 'ko' ? '알림' : 'Notifications'}
            </h3>
            {onClose && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {locale === 'ko' ? '새로운 알림이 없습니다.' : 'No new notifications.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed top-20 right-4 w-96 z-30 ${className}`}>
      <AnimatePresence mode="wait">
        {/* 전체 닫기 버튼 */}
        {notifications && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissAll}
            className="absolute -top-8 right-0 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            {locale === 'ko' ? '모두 닫기' : 'Dismiss all'}
          </motion.button>
        )}

        <div className="space-y-3">
          {/* 오늘의 브리핑 */}
          {notifications.brief && !dismissed.has('brief') && (
            <NotificationCard
              id="brief"
              icon={<Calendar className="w-4 h-4" />}
              iconColor="text-blue-500 dark:text-blue-400"
              bgColor={isDark ? "bg-gray-800/50" : "bg-gradient-to-r from-blue-50 to-indigo-50"}
              title={locale === 'ko' ? "오늘의 일정" : "Today's Schedule"}
              onDismiss={() => dismiss('brief')}
              isDark={isDark}
            >
              <div className="space-y-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">{notifications.brief.eventCount}개</span>의 일정 •
                  <span className="font-semibold">{notifications.brief.busyHours}시간</span> 예약
                </p>
                {notifications.brief.firstEventTime && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    첫 일정: {format(new Date(notifications.brief.firstEventTime), 'a h:mm', { locale: ko })}
                  </p>
                )}
                {notifications.brief.freeSlots.length > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    <Clock className="inline w-3 h-3 mr-1" />
                    {notifications.brief.freeSlots.length}개의 빈 시간대 있음
                  </p>
                )}
              </div>
            </NotificationCard>
          )}

          {/* 충돌 알림 */}
          {notifications.conflicts?.map((conflict, index) => (
            !dismissed.has(`conflict-${index}`) && (
              <NotificationCard
                key={`conflict-${index}`}
                id={`conflict-${index}`}
                icon={<AlertTriangle className="w-4 h-4" />}
                iconColor="text-red-500 dark:text-red-400"
                bgColor={isDark ? "bg-red-900/20" : "bg-gradient-to-r from-red-50 to-pink-50"}
                title={locale === 'ko' ? "일정 충돌" : "Schedule Conflict"}
                priority="high"
                onDismiss={() => dismiss(`conflict-${index}`)}
                isDark={isDark}
              >
                <div className="space-y-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{conflict.event1.summary}</span>
                    {conflict.type === 'overlap' ? ' ↔ ' : ' → '}
                    <span className="font-medium">{conflict.event2.summary}</span>
                  </p>
                  {conflict.suggestion && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{conflict.suggestion}</p>
                  )}
                  <button
                    onClick={() => {
                      console.log('충돌 해결 클릭:', conflict);
                      // TODO: 충돌 해결 UI 열기 또는 캘린더 페이지로 이동
                      alert(`일정 충돌: ${conflict.event1.summary} ↔ ${conflict.event2.summary}\n\n${conflict.suggestion || '일정을 조정하거나 하나를 취소하세요'}`);
                    }}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors"
                  >
                    해결하기 →
                  </button>
                </div>
              </NotificationCard>
            )
          ))}

          {/* AI 제안 */}
          {notifications.suggestions?.map((suggestion, index) => (
            !dismissed.has(`suggestion-${index}`) && (
              <NotificationCard
                key={`suggestion-${index}`}
                id={`suggestion-${index}`}
                icon={<Sparkles className="w-4 h-4" />}
                iconColor="text-purple-500 dark:text-purple-400"
                bgColor={isDark ? "bg-purple-900/20" : "bg-gradient-to-r from-purple-50 to-pink-50"}
                title={locale === 'ko' ? "AI 제안" : "AI Suggestion"}
                onDismiss={() => dismiss(`suggestion-${index}`)}
                isDark={isDark}
              >
                <p className="text-sm text-gray-700 dark:text-gray-300">{suggestion.message}</p>
                {suggestion.action && (
                  <button
                    onClick={() => {
                      console.log('AI 제안 적용:', suggestion);
                      // AI 제안 액션 실행
                      if (suggestion.action) {
                        suggestion.action();
                      } else {
                        alert(`AI 제안: ${suggestion.message}`);
                      }
                    }}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium mt-1 transition-colors"
                  >
                    적용하기 →
                  </button>
                )}
              </NotificationCard>
            )
          ))}

          {/* 친구 업데이트 */}
          {notifications.friendUpdates && notifications.friendUpdates.length > 0 &&
           !dismissed.has('friends') && (
            <NotificationCard
              id="friends"
              icon={<Users className="w-4 h-4" />}
              iconColor="text-green-500 dark:text-green-400"
              bgColor={isDark ? "bg-green-900/20" : "bg-gradient-to-r from-green-50 to-emerald-50"}
              title={locale === 'ko' ? "친구 소식" : "Friend Updates"}
              onDismiss={() => dismiss('friends')}
              isDark={isDark}
            >
              <div className="space-y-1">
                {notifications.friendUpdates.map((update, i) => (
                  <p key={i} className="text-sm text-gray-700 dark:text-gray-300">{update}</p>
                ))}
              </div>
            </NotificationCard>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
}

// 개별 알림 카드 컴포넌트
interface NotificationCardProps {
  id: string;
  icon: React.ReactNode;
  iconColor: string;
  bgColor: string;
  title: string;
  priority?: 'low' | 'medium' | 'high';
  children: React.ReactNode;
  onDismiss: () => void;
  isDark?: boolean;
}

function NotificationCard({
  icon,
  iconColor,
  bgColor,
  title,
  priority = 'medium',
  children,
  onDismiss,
  isDark = false
}: NotificationCardProps) {
  // 다크 모드용 배경색 조정
  const darkBgColor = isDark ? bgColor.replace(/50/g, '900').replace(/100/g, '800') : bgColor;
  const cardBg = isDark
    ? 'bg-gray-800 border border-gray-700'
    : 'bg-white border border-gray-200';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25
      }}
      className={`
        ${cardBg}
        rounded-xl shadow-lg overflow-hidden backdrop-blur-xl
        ${priority === 'high' ? 'ring-2 ring-red-400 dark:ring-red-600' : ''}
      `}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={`mt-0.5 ${iconColor}`}>
              {icon}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {title}
              </h3>
              {children}
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 프로그레스 바 (자동 사라짐 효과) */}
      {priority !== 'high' && (
        <motion.div
          className="h-0.5 bg-gradient-to-r from-transparent via-white to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 10, ease: 'linear' }}
          onAnimationComplete={onDismiss}
          style={{ originX: 0 }}
        />
      )}
    </motion.div>
  );
}

export default SimpleNotificationWidget;