'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Check,
  X,
  MessageCircle,
  Calendar,
  Clock,
  MapPin,
  MoreVertical,
  Settings,
  Bell,
  BellOff
} from 'lucide-react';
import { useToastContext } from '@/providers/ToastProvider';

// 플랫폼 아이콘 컴포넌트들
const KakaoIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.95 5.35 4.85 6.65-.2-.71-.37-1.85-.1-2.65.25-.7 1.6-6.8 1.6-6.8s-.4-.8-.4-1.95c0-1.85 1.05-3.2 2.4-3.2 1.1 0 1.65.85 1.65 1.85 0 1.1-.7 2.8-1.05 4.35-.3 1.25.65 2.25 1.9 2.25 2.3 0 4.05-2.4 4.05-5.9 0-3.1-2.2-5.25-5.35-5.25-3.65 0-5.8 2.7-5.8 5.5 0 1.1.4 2.25.95 2.9.1.1.1.2.1.3-.1.4-.3 1.3-.35 1.5-.05.2-.2.25-.45.15-1.65-.75-2.7-3.1-2.7-5 0-4.05 2.95-7.8 8.5-7.8 4.45 0 7.9 3.15 7.9 7.35 0 4.4-2.75 7.9-6.6 7.9-1.3 0-2.5-.65-2.9-1.45 0 0-.65 2.45-.8 3.05-.3 1.15-1.1 2.6-1.65 3.5C9.65 20.9 10.8 21 12 21c5.52 0 10-4.48 10-10S17.52 3 12 3z"/>
  </svg>
);

const DiscordIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const WebIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <MessageCircle className={className} />
);

// 플랫폼 설정
const PLATFORMS = {
  kakao: {
    name: '카카오톡',
    icon: KakaoIcon,
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200'
  },
  discord: {
    name: '디스코드',
    icon: DiscordIcon,
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200'
  },
  web: {
    name: '웹/이메일',
    icon: WebIcon,
    color: 'bg-gray-500',
    lightColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200'
  }
} as const;

interface MessengerIntegration {
  platform: 'kakao' | 'discord' | 'web';
  platformUserId: string;
  isActive: boolean;
  lastActiveAt?: string;
}

interface Friend {
  id: string;
  friendId: string;
  email: string;
  name: string;
  nickname?: string;
  picture?: string;
  relationshipType?: string;
  notes?: string;
  meetingFrequency?: number;
  lastMeetingDate?: string;
  friendSince: string;
  messengerIntegrations?: MessengerIntegration[];
}

interface FriendRequest {
  id: string;
  type: 'received' | 'sent';
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  status: string;
  createdAt: string;
  platform?: 'kakao' | 'discord' | 'web';
}

type FilterType = 'all' | 'kakao' | 'discord' | 'web';

export function IntegratedFriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToastContext();

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, []);

  // 친구 목록 불러오기 (메신저 통합 정보 포함)
  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends/integrated');
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

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch('/api/friends/requests/integrated');
      const data = await response.json();

      if (data.success) {
        setFriendRequests(data.requests);
      }
    } catch (error) {
      console.error('Failed to fetch friend requests:', error);
    }
  };

  // 친구 필터링
  const filteredFriends = friends.filter(friend => {
    const matchesSearch =
      friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friend.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friend.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;

    return friend.messengerIntegrations?.some(
      integration => integration.platform === activeFilter && integration.isActive
    );
  });

  // 플랫폼별 친구 수 계산
  const getFilterCounts = () => {
    const counts = {
      all: friends.length,
      kakao: 0,
      discord: 0,
      web: 0
    };

    friends.forEach(friend => {
      friend.messengerIntegrations?.forEach(integration => {
        if (integration.isActive) {
          counts[integration.platform]++;
        }
      });

      // 메신저 통합이 없는 친구는 웹으로 분류
      if (!friend.messengerIntegrations?.length) {
        counts.web++;
      }
    });

    return counts;
  };

  const filterCounts = getFilterCounts();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">통합 친구 목록</h1>
          <p className="text-gray-600 mt-1">
            카카오톡, 디스코드, 웹에서 연결된 모든 친구들을 한 곳에서 관리하세요
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          친구 추가
        </button>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* 검색 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="친구 이름, 닉네임, 이메일로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 플랫폼 필터 */}
        <div className="flex gap-2">
          {(Object.keys(PLATFORMS) as Array<keyof typeof PLATFORMS>).map(platform => {
            const config = PLATFORMS[platform];
            const IconComponent = config.icon;
            const count = filterCounts[platform];

            return (
              <button
                key={platform}
                onClick={() => setActiveFilter(platform)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  activeFilter === platform
                    ? `${config.color} text-white`
                    : `${config.lightColor} ${config.textColor} hover:${config.color} hover:text-white`
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{config.name}</span>
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                  {count}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setActiveFilter('all')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              activeFilter === 'all'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">전체</span>
            <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
              {filterCounts.all}
            </span>
          </button>
        </div>
      </div>

      {/* 친구 요청 알림 */}
      {friendRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">
                새로운 친구 요청 {friendRequests.length}개
              </h3>
              <p className="text-sm text-blue-700">
                확인하지 않은 친구 요청이 있습니다.
              </p>
            </div>
            <button className="ml-auto text-blue-600 hover:text-blue-800 font-medium">
              확인하기
            </button>
          </div>
        </motion.div>
      )}

      {/* 친구 목록 */}
      <div className="grid gap-4">
        {loading ? (
          // 스켈레톤 로딩
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))
        ) : filteredFriends.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? '검색 결과가 없습니다' : '아직 친구가 없습니다'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? '다른 검색어를 시도해보세요'
                : '새로운 친구를 추가해보세요'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4" />
                첫 번째 친구 추가하기
              </button>
            )}
          </div>
        ) : (
          filteredFriends.map((friend, index) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              index={index}
              onUpdate={fetchFriends}
            />
          ))
        )}
      </div>

      {/* 친구 추가 모달 */}
      <AnimatePresence>
        {showAddModal && (
          <AddFriendModal
            onClose={() => setShowAddModal(false)}
            onSuccess={fetchFriends}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// 친구 카드 컴포넌트
function FriendCard({
  friend,
  index,
  onUpdate
}: {
  friend: Friend;
  index: number;
  onUpdate: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors p-4"
    >
      <div className="flex items-center gap-4">
        {/* 프로필 이미지 */}
        <div className="relative">
          {friend.picture ? (
            <img
              src={friend.picture}
              alt={friend.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-medium">
                {friend.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* 온라인 상태 표시 */}
          {friend.messengerIntegrations?.some(i => i.isActive) && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>

        {/* 친구 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 truncate">
              {friend.nickname || friend.name}
            </h3>
            {friend.nickname && (
              <span className="text-sm text-gray-500">({friend.name})</span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">{friend.email}</span>
            {friend.relationshipType && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-sm text-gray-500">{friend.relationshipType}</span>
              </>
            )}
          </div>

          {/* 플랫폼 연동 상태 */}
          <div className="flex items-center gap-2">
            {friend.messengerIntegrations?.map((integration, idx) => {
              const platform = PLATFORMS[integration.platform];
              const IconComponent = platform.icon;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    integration.isActive
                      ? `${platform.color} text-white`
                      : `${platform.lightColor} ${platform.textColor}`
                  }`}
                  title={`${platform.name} ${integration.isActive ? '연결됨' : '연결 끊김'}`}
                >
                  <IconComponent className="w-3 h-3" />
                  <span>{platform.name}</span>
                </div>
              );
            })}

            {!friend.messengerIntegrations?.length && (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                <WebIcon className="w-3 h-3" />
                <span>웹</span>
              </div>
            )}
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="일정 잡기"
          >
            <Calendar className="w-4 h-4" />
          </button>

          <button
            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="메시지 보내기"
          >
            <MessageCircle className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActions && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                  프로필 보기
                </button>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                  편집
                </button>
                <button className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                  친구 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// 친구 추가 모달 컴포넌트 (플랫폼별)
function AddFriendModal({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<'email' | 'kakao' | 'discord'>('email');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToastContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('이메일을 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          nickname,
          platform: selectedPlatform
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('친구 요청을 보냈습니다');
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || '친구 요청 실패');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">친구 추가</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 플랫폼 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              추가 방식
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'email', label: '이메일', icon: WebIcon },
                { key: 'kakao', label: '카카오톡', icon: KakaoIcon },
                { key: 'discord', label: '디스코드', icon: DiscordIcon }
              ].map(({ key, label, icon: IconComponent }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPlatform(key as any)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                    selectedPlatform === key
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 이메일 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일 주소
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* 닉네임 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              닉네임 (선택사항)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="친구에게 표시될 이름"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 설명 텍스트 */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            {selectedPlatform === 'email' && (
              <p>이메일로 친구 요청을 보냅니다. 상대방이 수락하면 친구가 됩니다.</p>
            )}
            {selectedPlatform === 'kakao' && (
              <p>카카오톡 연동 후 자동으로 친구가 추가됩니다. (베타 기능)</p>
            )}
            {selectedPlatform === 'discord' && (
              <p>디스코드 연동 후 자동으로 친구가 추가됩니다. (베타 기능)</p>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '요청 중...' : '친구 요청 보내기'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}