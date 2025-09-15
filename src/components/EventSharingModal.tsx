'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, 
  X, 
  Users, 
  Check, 
  Eye, 
  Edit,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  UserX
} from 'lucide-react';
import type { CalendarEvent } from '@/types';
import { useToastContext } from '@/providers/ToastProvider';

interface Friend {
  id: string;
  friendId: string;
  email: string;
  name: string;
  nickname?: string;
}

// Using the global CalendarEvent type from @/types

interface EventSharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEventUpdated?: () => void;
}

export function EventSharingModal({
  isOpen,
  onClose,
  event,
  onEventUpdated
}: EventSharingModalProps) {
  const { toast } = useToastContext();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      if (event) {
        setSelectedFriends(event.shared_with || []);
        setSharePermission((event.share_permission === 'owner' ? 'edit' : event.share_permission) || 'view');
      }
    }
  }, [isOpen, event]);

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      const data = await response.json();
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleShare = async () => {
    if (!event || selectedFriends.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/events/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          friendIds: selectedFriends,
          permission: sharePermission
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || '일정이 공유되었습니다');
        onEventUpdated?.();
        onClose();
      } else {
        toast.error(data.error || '일정 공유에 실패했습니다');
      }
    } catch (error) {
      console.error('Error sharing event:', error);
      toast.error('일정 공유 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleUnshare = async (friendIds: string[]) => {
    if (!event || friendIds.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/events/share', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          friendIds
        })
      });

      const data = await response.json();
      if (data.success) {
        setSelectedFriends(prev => prev.filter(id => !friendIds.includes(id)));
        toast.success('공유가 해제되었습니다');
        onEventUpdated?.();
      } else {
        toast.error(data.error || '공유 해제에 실패했습니다');
      }
    } catch (error) {
      console.error('Error unsharing event:', error);
      toast.error('공유 해제 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTime?: string, date?: string) => {
    if (dateTime) {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(dateTime));
    }
    if (date) {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(date));
    }
    return '';
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (friend.nickname && friend.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const currentlySharedFriends = friends.filter(friend => 
    event?.shared_with?.includes(friend.friendId)
  );

  if (!isOpen || !event) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              일정 공유
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Event Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{event.summary}</h3>
                {event.description && (
                  <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDateTime(event.start?.dateTime, event.start?.date)}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Currently Shared With */}
          {currentlySharedFriends.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">현재 공유 중인 친구들</h4>
              <div className="space-y-2">
                {currentlySharedFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between bg-green-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-sm">
                        {friend.name?.[0] || friend.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {friend.nickname || friend.name || friend.email}
                        </p>
                        <p className="text-xs text-gray-600">{friend.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnshare([friend.friendId])}
                      disabled={loading}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="공유 해제"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share Permission */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">공유 권한</h4>
            <div className="flex gap-3">
              <button
                onClick={() => setSharePermission('view')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  sharePermission === 'view'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Eye className="w-4 h-4" />
                보기만
              </button>
              <button
                onClick={() => setSharePermission('edit')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  sharePermission === 'edit'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Edit className="w-4 h-4" />
                편집 가능
              </button>
            </div>
          </div>

          {/* Friend Selection */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">공유할 친구 선택</h4>
            
            {/* Search */}
            <input
              type="text"
              placeholder="친구 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />

            {/* Friend List */}
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedFriends.includes(friend.friendId)
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleFriendToggle(friend.friendId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                      {friend.name?.[0] || friend.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {friend.nickname || friend.name || friend.email}
                      </p>
                      <p className="text-xs text-gray-600">{friend.email}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedFriends.includes(friend.friendId)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedFriends.includes(friend.friendId) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredFriends.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>친구가 없습니다.</p>
                <p className="text-sm">먼저 친구를 추가해주세요.</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleShare}
              disabled={selectedFriends.length === 0 || loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? '공유 중...' : `${selectedFriends.length}명과 공유하기`}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}