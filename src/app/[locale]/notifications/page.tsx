'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  X,
  Clock,
  MapPin,
  Users,
  Calendar,
  AlertCircle,
  ChevronLeft,
  Filter,
  Search,
  Archive,
  Trash2,
  CheckCircle,
  MessageSquare,
  Lightbulb,
  Info
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabaseNotifications } from '@/hooks/useSupabaseNotifications';
import { useNotificationStore } from '@/store/notificationStore';
import { ProactiveNotification } from '@/types';

export default function NotificationsPage() {
  const locale = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread' | 'high' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);

  const { notifications, markAsRead, removeNotification } = useNotificationStore();
  const { markAsRead: markSupabaseRead, dismissNotification, markAllAsRead } = useSupabaseNotifications();

  // Fetch all notifications from API
  useEffect(() => {
    const fetchAllNotifications = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/notifications?limit=100');
        if (response.ok) {
          const data = await response.json();
          setAllNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllNotifications();
  }, []);

  // Filter and search notifications
  const filteredNotifications = allNotifications.filter(notification => {
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'high' && !['urgent', 'high'].includes(notification.priority)) return false;
    if (filter === 'archived' && !notification.dismissed) return false;
    if (filter !== 'archived' && notification.dismissed) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title?.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reminder':
        return <Clock className="w-5 h-5" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5" />;
      case 'suggestion':
        return <Lightbulb className="w-5 h-5" />;
      case 'briefing':
        return <Calendar className="w-5 h-5" />;
      case 'conflict':
        return <AlertCircle className="w-5 h-5" />;
      case 'insight':
        return <Info className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'from-red-500/20 to-red-600/20 border-red-500/50 text-red-400';
      case 'high':
        return 'from-orange-500/20 to-orange-600/20 border-orange-500/50 text-orange-400';
      case 'medium':
        return 'from-blue-500/20 to-blue-600/20 border-blue-500/50 text-blue-400';
      case 'low':
        return 'from-gray-500/20 to-gray-600/20 border-gray-500/50 text-gray-400';
      default:
        return 'from-gray-500/20 to-gray-600/20 border-gray-500/50 text-gray-400';
    }
  };

  const formatTime = (date: string | Date | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60);

    if (diff < 1) return locale === 'ko' ? '방금 전' : 'Just now';
    if (diff < 60) return locale === 'ko' ? `${diff}분 전` : `${diff}m ago`;
    if (diff < 1440) return locale === 'ko' ? `${Math.floor(diff / 60)}시간 전` : `${Math.floor(diff / 60)}h ago`;
    return locale === 'ko' ? `${Math.floor(diff / 1440)}일 전` : `${Math.floor(diff / 1440)}d ago`;
  };

  const handleBulkAction = async (action: 'read' | 'archive' | 'delete') => {
    const selectedIds = Array.from(selectedNotifications);

    for (const id of selectedIds) {
      switch (action) {
        case 'read':
          await markSupabaseRead(id);
          break;
        case 'archive':
          await dismissNotification(id);
          break;
        case 'delete':
          await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
          break;
      }
    }

    setSelectedNotifications(new Set());
    // Refetch notifications
    const response = await fetch('/api/notifications?limit=100');
    if (response.ok) {
      const data = await response.json();
      setAllNotifications(data.notifications || []);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
                  <Bell className="w-5 h-5 text-purple-400" />
                </div>
                <h1 className="text-xl font-semibold text-white">
                  {locale === 'ko' ? '알림' : 'Notifications'}
                </h1>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {selectedNotifications.size > 0 && (
                <>
                  <button
                    onClick={() => handleBulkAction('read')}
                    className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-800/70 text-white rounded-lg transition-colors text-sm"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    {locale === 'ko' ? '읽음 표시' : 'Mark Read'}
                  </button>
                  <button
                    onClick={() => handleBulkAction('archive')}
                    className="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-800/70 text-white rounded-lg transition-colors text-sm"
                  >
                    <Archive className="w-4 h-4 inline mr-1" />
                    {locale === 'ko' ? '보관' : 'Archive'}
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4 inline mr-1" />
                    {locale === 'ko' ? '삭제' : 'Delete'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filter Tabs */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: locale === 'ko' ? '전체' : 'All' },
              { value: 'unread', label: locale === 'ko' ? '읽지 않음' : 'Unread' },
              { value: 'high', label: locale === 'ko' ? '중요' : 'Important' },
              { value: 'archived', label: locale === 'ko' ? '보관됨' : 'Archived' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as any)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  filter === tab.value
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800/70 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={locale === 'ko' ? '알림 검색...' : 'Search notifications...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {locale === 'ko' ? '알림이 없습니다' : 'No notifications'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                  className={`group relative bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-800/70 transition-all ${
                    !notification.read ? 'border-purple-500/30 bg-purple-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="flex-shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.has(notification.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedNotifications);
                          if (e.target.checked) {
                            newSelected.add(notification.id);
                          } else {
                            newSelected.delete(notification.id);
                          }
                          setSelectedNotifications(newSelected);
                        }}
                        className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 bg-gray-700"
                      />
                    </div>

                    {/* Icon */}
                    <div className={`flex-shrink-0 p-2 bg-gradient-to-br rounded-lg ${getPriorityColor(notification.priority)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-white mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.actions && notification.actions.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {notification.actions.map((action: any) => (
                                <button
                                  key={action.id}
                                  className={`px-3 py-1 text-xs rounded-lg ${
                                    action.style === 'primary'
                                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  } transition-colors`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.created_at)}
                          </span>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}