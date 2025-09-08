'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  X, Save, User, MapPin, Briefcase, Clock, 
  Calendar, Heart, Target, Info, Home, 
  Building, ChevronRight, Loader2, Check,
  Plus, Trash2, Edit2
} from 'lucide-react';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id?: string;
  user_id?: string;
  full_name?: string;
  nickname?: string;
  date_of_birth?: string;
  occupation?: string;
  bio?: string;
  home_address?: string;
  home_latitude?: number;
  home_longitude?: number;
  work_address?: string;
  work_latitude?: number;
  work_longitude?: number;
  work_start_time?: string;
  work_end_time?: string;
  working_days?: string[];
  preferred_language?: string;
  timezone?: string;
  wake_up_time?: string;
  sleep_time?: string;
  life_context?: any;
  interests?: string[];
  goals?: string[];
  important_dates?: any[];
  family_members?: any[];
  emergency_contact?: any;
  allergies?: string[];
  dietary_preferences?: string[];
  exercise_routine?: string;
}

export function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
  const t = useTranslations();
  const [profile, setProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 새로운 입력 상태
  const [newInterest, setNewInterest] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [newDietaryPref, setNewDietaryPref] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile');
      const data = await response.json();
      
      if (data.success && data.profile) {
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      const data = await response.json();
      
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const addToArray = (field: string, value: string) => {
    if (value.trim()) {
      const currentArray = profile[field as keyof UserProfile] as string[] || [];
      updateField(field, [...currentArray, value.trim()]);
    }
  };

  const removeFromArray = (field: string, index: number) => {
    const currentArray = profile[field as keyof UserProfile] as string[] || [];
    updateField(field, currentArray.filter((_, i) => i !== index));
  };

  const tabs = [
    { id: 'basic', label: '기본 정보', icon: User },
    { id: 'location', label: '위치 정보', icon: MapPin },
    { id: 'schedule', label: '일정/시간', icon: Clock },
    { id: 'personal', label: '개인 맥락', icon: Heart },
    { id: 'health', label: '건강 정보', icon: Info }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">프로필 관리</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                AI가 당신을 더 잘 이해할 수 있도록 개인 맥락을 설정하세요
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 border-r p-4 space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                        activeTab === tab.id 
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                      {activeTab === tab.id && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === 'basic' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">이름</label>
                      <input
                        type="text"
                        value={profile.full_name || ''}
                        onChange={(e) => updateField('full_name', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="홍길동"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">닉네임</label>
                      <input
                        type="text"
                        value={profile.nickname || ''}
                        onChange={(e) => updateField('nickname', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="길동이"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">생년월일</label>
                      <input
                        type="date"
                        value={profile.date_of_birth || ''}
                        onChange={(e) => updateField('date_of_birth', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">직업</label>
                      <input
                        type="text"
                        value={profile.occupation || ''}
                        onChange={(e) => updateField('occupation', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="소프트웨어 엔지니어"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">자기소개</label>
                      <textarea
                        value={profile.bio || ''}
                        onChange={(e) => updateField('bio', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={4}
                        placeholder="간단한 자기소개를 작성해주세요..."
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'location' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Home className="w-4 h-4 inline mr-1" />
                        집 주소
                      </label>
                      <input
                        type="text"
                        value={profile.home_address || ''}
                        onChange={(e) => updateField('home_address', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="서울시 강남구..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Building className="w-4 h-4 inline mr-1" />
                        직장/학교 주소
                      </label>
                      <input
                        type="text"
                        value={profile.work_address || ''}
                        onChange={(e) => updateField('work_address', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="서울시 서초구..."
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'schedule' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">출근 시간</label>
                        <input
                          type="time"
                          value={profile.work_start_time || ''}
                          onChange={(e) => updateField('work_start_time', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">퇴근 시간</label>
                        <input
                          type="time"
                          value={profile.work_end_time || ''}
                          onChange={(e) => updateField('work_end_time', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">기상 시간</label>
                        <input
                          type="time"
                          value={profile.wake_up_time || ''}
                          onChange={(e) => updateField('wake_up_time', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">취침 시간</label>
                        <input
                          type="time"
                          value={profile.sleep_time || ''}
                          onChange={(e) => updateField('sleep_time', e.target.value)}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">근무일</label>
                      <div className="flex flex-wrap gap-2">
                        {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => {
                          const dayMap = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                          const isSelected = profile.working_days?.includes(dayMap[index]);
                          
                          return (
                            <button
                              key={day}
                              onClick={() => {
                                const currentDays = profile.working_days || [];
                                if (isSelected) {
                                  updateField('working_days', currentDays.filter(d => d !== dayMap[index]));
                                } else {
                                  updateField('working_days', [...currentDays, dayMap[index]]);
                                }
                              }}
                              className={`px-4 py-2 rounded-lg transition-all ${
                                isSelected 
                                  ? 'bg-purple-500 text-white' 
                                  : 'bg-gray-100 dark:bg-gray-700'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'personal' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">관심사</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addToArray('interests', newInterest);
                              setNewInterest('');
                            }
                          }}
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="예: 여행, 독서, 요리..."
                        />
                        <button
                          onClick={() => {
                            addToArray('interests', newInterest);
                            setNewInterest('');
                          }}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests?.map((interest, index) => (
                          <div key={index} className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                            <span className="text-sm">{interest}</span>
                            <button
                              onClick={() => removeFromArray('interests', index)}
                              className="p-0.5 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">목표</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newGoal}
                          onChange={(e) => setNewGoal(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addToArray('goals', newGoal);
                              setNewGoal('');
                            }
                          }}
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="예: 체중 감량, 영어 공부..."
                        />
                        <button
                          onClick={() => {
                            addToArray('goals', newGoal);
                            setNewGoal('');
                          }}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {profile.goals?.map((goal, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-purple-500" />
                              {goal}
                            </span>
                            <button
                              onClick={() => removeFromArray('goals', index)}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'health' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">알레르기</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newAllergy}
                          onChange={(e) => setNewAllergy(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addToArray('allergies', newAllergy);
                              setNewAllergy('');
                            }
                          }}
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="예: 땅콩, 새우..."
                        />
                        <button
                          onClick={() => {
                            addToArray('allergies', newAllergy);
                            setNewAllergy('');
                          }}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.allergies?.map((allergy, index) => (
                          <div key={index} className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <span className="text-sm">{allergy}</span>
                            <button
                              onClick={() => removeFromArray('allergies', index)}
                              className="p-0.5 hover:bg-red-200 dark:hover:bg-red-800 rounded-full transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">식단 선호</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newDietaryPref}
                          onChange={(e) => setNewDietaryPref(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addToArray('dietary_preferences', newDietaryPref);
                              setNewDietaryPref('');
                            }
                          }}
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="예: 채식주의, 글루텐프리..."
                        />
                        <button
                          onClick={() => {
                            addToArray('dietary_preferences', newDietaryPref);
                            setNewDietaryPref('');
                          }}
                          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.dietary_preferences?.map((pref, index) => (
                          <div key={index} className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <span className="text-sm">{pref}</span>
                            <button
                              onClick={() => removeFromArray('dietary_preferences', index)}
                              className="p-0.5 hover:bg-green-200 dark:hover:bg-green-800 rounded-full transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">운동 루틴</label>
                      <textarea
                        value={profile.exercise_routine || ''}
                        onChange={(e) => updateField('exercise_routine', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={3}
                        placeholder="예: 월/수/금 아침 7시 헬스장, 주말 등산..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="p-6 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              이 정보는 AI가 더 나은 서비스를 제공하는 데 사용됩니다
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saveSuccess ? '저장됨' : '저장'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}