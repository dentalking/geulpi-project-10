'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserPlus, 
  Users, 
  Mail, 
  Check, 
  X, 
  Search, 
  Settings,
  Share2,
  UserMinus,
  MessageCircle
} from 'lucide-react';

interface Friend {
  id: string;
  friendId: string;
  email: string;
  name: string;
  nickname?: string;
  relationshipType?: string;
  notes?: string;
  meetingFrequency?: number;
  lastMeetingDate?: string;
  friendSince: string;
  picture?: string;
}

interface FriendRequest {
  id: string;
  type: 'received' | 'sent';
  user: {
    id: string;
    email: string;
    name: string;
  };
  relationshipType?: string;
  nickname?: string;
  notes?: string;
  status: string;
  createdAt: string;
  canRespond: boolean;
}

interface FriendsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FriendsManager({ isOpen, onClose }: FriendsManagerProps) {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Add friend form
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [newFriendNickname, setNewFriendNickname] = useState('');
  const [newFriendNotes, setNewFriendNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
      fetchFriendRequests();
    }
  }, [isOpen]);

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

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch('/api/friends/requests?type=all');
      const data = await response.json();
      if (data.success) {
        setFriendRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!newFriendEmail) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendEmail: newFriendEmail,
          nickname: newFriendNickname,
          notes: newFriendNotes
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setNewFriendEmail('');
        setNewFriendNickname('');
        setNewFriendNotes('');
        setActiveTab('requests');
        fetchFriendRequests();
      } else {
        alert(data.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const respondToFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch('/api/friends', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendshipId: requestId,
          action
        })
      });
      
      const data = await response.json();
      if (data.success) {
        fetchFriendRequests();
        if (action === 'accept') {
          fetchFriends();
        }
      } else {
        alert(data.error || `Failed to ${action} friend request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
      alert(`Failed to ${action} friend request`);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (friend.nickname && friend.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const receivedRequests = friendRequests.filter(req => req.type === 'received');
  const sentRequests = friendRequests.filter(req => req.type === 'sent');

  if (!isOpen) return null;

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
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6" />
              친구 관리
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            {[
              { key: 'friends', label: '친구 목록', icon: Users },
              { key: 'requests', label: '친구 요청', icon: Mail },
              { key: 'add', label: '친구 추가', icon: UserPlus }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === key
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {key === 'requests' && receivedRequests.length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                    {receivedRequests.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <AnimatePresence mode="wait">
            {activeTab === 'friends' && (
              <motion.div
                key="friends"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Search */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="친구 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Friends List */}
                <div className="space-y-3">
                  {filteredFriends.length > 0 ? (
                    filteredFriends.map((friend) => (
                      <motion.div
                        key={friend.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {friend.name?.[0] || friend.email[0].toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {friend.nickname || friend.name || friend.email}
                              </h3>
                              <p className="text-sm text-gray-600">{friend.email}</p>
                              {friend.notes && (
                                <p className="text-xs text-gray-500 mt-1">{friend.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="일정 공유"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                              title="메시지 보내기"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="친구 삭제"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>아직 친구가 없습니다.</p>
                      <p className="text-sm">친구를 추가해서 일정을 공유해보세요!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="space-y-6">
                  {/* Received Requests */}
                  {receivedRequests.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">받은 친구 요청</h3>
                      <div className="space-y-3">
                        {receivedRequests.map((request) => (
                          <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                  {request.user.name?.[0] || request.user.email[0].toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {request.user.name || request.user.email}
                                  </h4>
                                  <p className="text-sm text-gray-600">{request.user.email}</p>
                                  {request.notes && (
                                    <p className="text-xs text-gray-500 mt-1">"{request.notes}"</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => respondToFriendRequest(request.id, 'accept')}
                                  className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                  수락
                                </button>
                                <button
                                  onClick={() => respondToFriendRequest(request.id, 'reject')}
                                  className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                  거절
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sent Requests */}
                  {sentRequests.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">보낸 친구 요청</h3>
                      <div className="space-y-3">
                        {sentRequests.map((request) => (
                          <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gray-50 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center text-white font-semibold">
                                  {request.user.name?.[0] || request.user.email[0].toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {request.user.name || request.user.email}
                                  </h4>
                                  <p className="text-sm text-gray-600">{request.user.email}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(request.createdAt).toLocaleDateString()} 에 요청됨
                                  </p>
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                                대기중
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {friendRequests.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p>친구 요청이 없습니다.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'add' && (
              <motion.div
                key="add"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="max-w-md mx-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">새 친구 추가</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        이메일 주소 *
                      </label>
                      <input
                        type="email"
                        value={newFriendEmail}
                        onChange={(e) => setNewFriendEmail(e.target.value)}
                        placeholder="friend@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        별명 (선택)
                      </label>
                      <input
                        type="text"
                        value={newFriendNickname}
                        onChange={(e) => setNewFriendNickname(e.target.value)}
                        placeholder="친구의 별명"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        메모 (선택)
                      </label>
                      <textarea
                        value={newFriendNotes}
                        onChange={(e) => setNewFriendNotes(e.target.value)}
                        placeholder="친구에 대한 간단한 메모..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        disabled={loading}
                      />
                    </div>

                    <button
                      onClick={sendFriendRequest}
                      disabled={!newFriendEmail || loading}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {loading ? '요청 중...' : '친구 요청 보내기'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}