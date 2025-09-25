'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Clock, MapPin, Users, Bell, FileText,
  Edit3, Trash2, Share2, Copy, Brain, CheckSquare, Lightbulb,
  MessageSquare, Loader2, ChevronDown, ChevronUp, Star, StarOff
} from 'lucide-react';
import type { CalendarEvent } from '@/types';
import { usePerformanceMonitor } from '@/utils/performanceMonitor';

interface UnifiedEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  onShare?: (event: CalendarEvent) => void;
  onChat?: (event: CalendarEvent) => void;
  locale: string;
  enableAI?: boolean;
}

interface TabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  content: (event: CalendarEvent) => React.ReactNode;
}

// AI 분석 Hook (lazy loading)
const useAIAnalysis = (event: CalendarEvent | null, enabled: boolean) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!event || !enabled) return;

    const loadAnalysis = async () => {
      setLoading(true);
      setError(null);

      try {
        // AI 분석 API 호출 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1000));

        setAnalysis({
          summary: "중요한 비즈니스 미팅",
          insights: [
            "의제를 미리 준비하세요",
            "참석자들에게 자료를 공유하세요",
            "회의실 예약을 확인하세요"
          ],
          checklist: [
            { id: 1, text: "의제 준비", done: false },
            { id: 2, text: "자료 공유", done: false },
            { id: 3, text: "회의실 예약", done: true }
          ]
        });
      } catch (err) {
        setError('AI 분석을 로드할 수 없습니다');
      } finally {
        setLoading(false);
      }
    };

    loadAnalysis();
  }, [event, enabled]);

  return { analysis, loading, error };
};

export const UnifiedEventModal: React.FC<UnifiedEventModalProps> = React.memo(({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  onShare,
  onChat,
  locale,
  enableAI = false
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { analysis, loading: aiLoading } = useAIAnalysis(event, enableAI && activeTab === 'ai');

  // Performance monitoring
  usePerformanceMonitor('UnifiedEventModal', event ? 1 : 0);

  // 날짜 포맷팅 함수들 (메모이제이션)
  const formatters = useMemo(() => ({
    dateTime: (dateTime: string | undefined) => {
      if (!dateTime) return '';
      return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: 'numeric',
        minute: '2-digit'
      }).format(new Date(dateTime));
    },
    time: (dateTime: string | undefined) => {
      if (!dateTime) return '';
      return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
        hour: 'numeric',
        minute: '2-digit'
      }).format(new Date(dateTime));
    },
    duration: (start: string | undefined, end: string | undefined) => {
      if (!start || !end) return '';
      const diff = new Date(end).getTime() - new Date(start).getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        return `${hours}시간 ${minutes > 0 ? `${minutes}분` : ''}`;
      }
      return `${minutes}분`;
    }
  }), [locale]);

  // 탭 구성 (AI 기능 조건부 포함)
  const tabs: TabConfig[] = useMemo(() => {
    const baseTabs: TabConfig[] = [
      {
        id: 'details',
        label: '상세정보',
        icon: FileText,
        content: (event) => (
          <div className="space-y-4">
            {/* 시간 정보 */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium">
                  {formatters.dateTime(event.start?.dateTime)}
                </div>
                <div className="text-sm text-gray-500">
                  {formatters.duration(event.start?.dateTime, event.end?.dateTime)}
                </div>
              </div>
            </div>

            {/* 위치 정보 */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="font-medium">{event.location}</div>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    지도에서 보기
                  </a>
                </div>
              </div>
            )}

            {/* 설명 */}
            {event.description && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {event.description}
                  </div>
                </div>
              </div>
            )}

            {/* 참석자 */}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium mb-2">참석자 ({event.attendees.length}명)</div>
                  <div className="space-y-1">
                    {event.attendees.map((attendee, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                          {(attendee.displayName || attendee.email || '?')[0].toUpperCase()}
                        </div>
                        <span>{attendee.displayName || attendee.email}</span>
                        {attendee.responseStatus && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            attendee.responseStatus === 'accepted' ? 'bg-green-100 text-green-700' :
                            attendee.responseStatus === 'declined' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {attendee.responseStatus === 'accepted' ? '참석' :
                             attendee.responseStatus === 'declined' ? '불참' : '대기중'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      }
    ];

    // AI 탭 조건부 추가
    if (enableAI) {
      baseTabs.push({
        id: 'ai',
        label: 'AI 분석',
        icon: Brain,
        content: (event) => (
          <div className="space-y-4">
            {aiLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : analysis ? (
              <>
                {/* AI 요약 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    AI 요약
                  </h4>
                  <p className="text-sm text-blue-800">{analysis.summary}</p>
                </div>

                {/* 체크리스트 */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    준비사항
                  </h4>
                  <div className="space-y-2">
                    {analysis.checklist.map((item: any) => (
                      <label
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={item.done}
                          className="rounded text-blue-500"
                        />
                        <span className="text-sm">{item.text}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 인사이트 */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    추천사항
                  </h4>
                  <ul className="space-y-2">
                    {analysis.insights.map((insight: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                AI 분석을 사용할 수 없습니다
              </div>
            )}
          </div>
        )
      });
    }

    return baseTabs;
  }, [enableAI, formatters, aiLoading, analysis]);

  // 액션 핸들러
  const handleDelete = useCallback(() => {
    if (event && onDelete) {
      onDelete(event);
      onClose();
      setShowDeleteConfirm(false);
    }
  }, [event, onDelete, onClose]);

  const handleShare = useCallback(async () => {
    if (!event) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.summary || 'Event',
          text: `${event.summary}\\n${formatters.dateTime(event.start?.dateTime)}`,
          url: window.location.href
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else if (onShare) {
      onShare(event);
    }
  }, [event, onShare, formatters]);

  if (!event) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 백드롭 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl z-50 max-h-[85vh] overflow-hidden"
          >
            {/* 헤더 */}
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {event.summary || 'Untitled Event'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatters.dateTime(event.start?.dateTime)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Toggle favorite"
                  >
                    {isFavorite ? (
                      <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    ) : (
                      <StarOff className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* 탭 네비게이션 */}
              <div className="flex gap-1 mt-4">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-500 text-white'
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 컨텐츠 */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {tabs.find(t => t.id === activeTab)?.content(event)}
            </div>

            {/* 액션 버튼 */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(event)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      수정
                    </button>
                  )}
                  {onChat && (
                    <button
                      onClick={() => onChat(event)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      AI 채팅
                    </button>
                  )}
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    공유
                  </button>
                </div>

                {onDelete && (
                  showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-600">정말 삭제하시겠습니까?</span>
                      <button
                        onClick={handleDelete}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                      >
                        삭제
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </button>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

UnifiedEventModal.displayName = 'UnifiedEventModal';