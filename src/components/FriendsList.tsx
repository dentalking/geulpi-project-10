'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, UserPlus, Check, X, Calendar, Clock, MapPin } from 'lucide-react';
import { useToastContext } from '@/providers/ToastProvider';

interface Friend {
  id: string;
  friendId: string;
  email: string;
  name: string;
  picture?: string;
  nickname?: string;
  relationshipType?: string;
  notes?: string;
  meetingFrequency?: number;
  lastMeetingDate?: string;
  friendSince: string;
}

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  user: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

export function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addFriendEmail, setAddFriendEmail] = useState('');
  const [addFriendNickname, setAddFriendNickname] = useState('');
  const [addFriendRelation, setAddFriendRelation] = useState('friend');
  const [addFriendNotes, setAddFriendNotes] = useState('');
  const { toast } = useToastContext();

  // 친구 목록 불러오기
  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      const data = await response.json();
      
      if (data.success) {
        setFriends(data.friends);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
      toast.error('친구 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // 받은 친구 요청 불러오기
  const fetchPendingRequests = async () => {
    try {
      const response = await fetch('/api/friends/requests');
      const data = await response.json();
      
      if (data.success) {
        setPendingRequests(data.requests);
      }
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    }
  };

  // 친구 추가
  const handleAddFriend = async () => {
    if (!addFriendEmail) {
      toast.error('이메일을 입력해주세요');
      return;
    }

    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          friendEmail: addFriendEmail,
          nickname: addFriendNickname,
          relationshipType: addFriendRelation,
          notes: addFriendNotes
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('친구 요청을 보냈습니다');
        setShowAddModal(false);
        setAddFriendEmail('');
        setAddFriendNickname('');
        setAddFriendNotes('');
        fetchFriends();
      } else {
        toast.error(data.error || '친구 추가에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to add friend:', error);
      toast.error('친구 추가에 실패했습니다');
    }
  };

  // 친구 요청 수락/거절
  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch('/api/friends', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          friendshipId: requestId,
          action
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(action === 'accept' ? '친구 요청을 수락했습니다' : '친구 요청을 거절했습니다');
        fetchFriends();
        fetchPendingRequests();
      } else {
        toast.error('요청 처리에 실패했습니다');
      }
    } catch (error) {
      console.error('Failed to handle friend request:', error);
      toast.error('요청 처리에 실패했습니다');
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-semibold">친구 목록</h2>
          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
            {friends.length}
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          친구 추가
        </button>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h3 className="text-sm font-semibold mb-3 text-yellow-800 dark:text-yellow-200">
            받은 친구 요청 ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                    {request.user.name?.[0] || request.user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{request.user.name || request.user.email}</p>
                    <p className="text-xs text-gray-500">{request.user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFriendRequest(request.id, 'accept')}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleFriendRequest(request.id, 'reject')}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      {(friends || []).length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">아직 친구가 없습니다</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">친구를 추가하고 일정을 공유해보세요!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(friends || []).map(friend => (
            <motion.div
              key={friend.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {friend.picture ? (
                    <img 
                      src={friend.picture} 
                      alt={friend.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                      {friend.name[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{friend.nickname || friend.name}</h3>
                    <p className="text-xs text-gray-500">{friend.email}</p>
                  </div>
                </div>
              </div>
              
              {friend.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {friend.notes}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>친구 {new Date(friend.friendSince).toLocaleDateString('ko-KR')}</span>
                </div>
                {friend.meetingFrequency && friend.meetingFrequency > 0 && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{friend.meetingFrequency}번 만남</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <button className="flex-1 py-1.5 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                  일정 공유
                </button>
                <button className="flex-1 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  프로필 보기
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">친구 추가</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">이메일 *</label>
                  <input
                    type="email"
                    value={addFriendEmail}
                    onChange={(e) => setAddFriendEmail(e.target.value)}
                    placeholder="friend@example.com"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">닉네임</label>
                  <input
                    type="text"
                    value={addFriendNickname}
                    onChange={(e) => setAddFriendNickname(e.target.value)}
                    placeholder="친구 닉네임"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">관계</label>
                  <select
                    value={addFriendRelation}
                    onChange={(e) => setAddFriendRelation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
                  >
                    <option value="friend">친구</option>
                    <option value="family">가족</option>
                    <option value="colleague">동료</option>
                    <option value="teammate">팀원</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">메모</label>
                  <textarea
                    value={addFriendNotes}
                    onChange={(e) => setAddFriendNotes(e.target.value)}
                    placeholder="대학 동기, 프로젝트 팀원 등"
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  style={{ borderColor: 'var(--border-primary)' }}
                >
                  취소
                </button>
                <button
                  onClick={handleAddFriend}
                  className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  친구 추가
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}