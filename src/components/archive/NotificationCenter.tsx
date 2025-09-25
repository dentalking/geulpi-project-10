'use client';

import React, { useEffect, useState } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import { ProactiveNotification } from '@/types';
import { Bell, X, Clock, AlertTriangle, Info, Calendar, Lightbulb, MessageSquare } from 'lucide-react';

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    handleAction,
    removeNotification,
    getHighPriorityNotifications
  } = useNotificationStore();

  const highPriorityNotifications = getHighPriorityNotifications();

  useEffect(() => {
    // 긴급 알림이 있으면 자동으로 열기
    if (highPriorityNotifications && highPriorityNotifications.length > 0 && !isOpen) {
      const hasUnreadUrgent = highPriorityNotifications.some(
        n => n.priority === 'urgent' && !n.metadata?.read
      );
      if (hasUnreadUrgent) {
        setIsOpen(true);
      }
    }
  }, [highPriorityNotifications, isOpen]);

  const getNotificationIcon = (type: ProactiveNotification['type']) => {
    switch (type) {
      case 'reminder':
        return <Clock className="w-5 h-5" />;
      case 'conflict':
        return <AlertTriangle className="w-5 h-5" />;
      case 'suggestion':
        return <Lightbulb className="w-5 h-5" />;
      case 'briefing':
        return <Calendar className="w-5 h-5" />;
      case 'alert':
        return <AlertTriangle className="w-5 h-5" />;
      case 'insight':
        return <Info className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: ProactiveNotification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-blue-500 bg-blue-50';
      case 'low':
        return 'border-gray-300 bg-gray-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const formatTime = (date: Date | string | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60);
    
    if (diff < 1) return '방금 전';
    if (diff < 60) return `${diff}분 전`;
    if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
    return `${Math.floor(diff / 1440)}일 전`;
  };

  return (
    <div className="relative">
      {/* 알림 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="알림"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 패널 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">알림</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  모두 읽음
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="max-h-96 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                새로운 알림이 없습니다
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b last:border-b-0 ${
                    !notification.metadata?.read ? 'bg-blue-50' : ''
                  } hover:bg-gray-50 transition-colors cursor-pointer`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={`flex gap-3 p-3 rounded-lg border-2 ${getPriorityColor(notification.priority)}`}>
                    {/* 아이콘 */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-sm">{notification.title}</h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      
                      {/* 액션 버튼 */}
                      {notification.actions && notification.actions.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {notification.actions.map((action) => (
                            <button
                              key={action.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction(notification.id, action);
                              }}
                              className={`px-3 py-1 text-xs rounded ${
                                action.style === 'primary'
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : action.style === 'danger'
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 시간 표시 */}
                      {notification.scheduledFor && (
                        <div className="text-xs text-gray-400 mt-2">
                          {formatTime(notification.scheduledFor)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 푸터 */}
          {notifications && notifications.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <button
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/notifications';
                }}
              >
                모든 알림 보기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationCenter;