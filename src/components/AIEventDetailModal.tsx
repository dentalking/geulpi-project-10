'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useModalKeyboard } from '@/hooks/useModalKeyboard';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Bell, 
  FileText,
  Edit3,
  Trash2,
  Share2,
  Copy,
  CheckCircle,
  Repeat,
  Video,
  Link as LinkIcon,
  ChevronLeft,
  MoreVertical,
  Star,
  StarOff,
  Brain,
  CheckSquare,
  Lightbulb,
  MessageSquare,
  Cloud,
  Car,
  TrendingUp,
  AlertCircle,
  Network
} from 'lucide-react';
import type { CalendarEvent } from '@/types';
import { useToastContext } from '@/providers/ToastProvider';

interface AIEventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  locale: string;
  onChatAboutEvent?: (event: CalendarEvent) => void;
  onShareEvent?: (event: CalendarEvent) => void;
}

interface EventAnalysis {
  importance: 'high' | 'medium' | 'low';
  estimatedDuration: string;
  travelTime?: string;
  weatherImpact?: string;
  conflictRisk: boolean;
  preparation: string[];
}

interface SmartChecklist {
  category: string;
  items: {
    id: string;
    text: string;
    completed: boolean;
    priority: 'high' | 'medium' | 'low';
  }[];
}

interface EventInsight {
  type: 'tip' | 'warning' | 'suggestion';
  title: string;
  description: string;
  actionable?: {
    label: string;
    action: () => void;
  };
}

export function AIEventDetailModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  locale,
  onChatAboutEvent,
  onShareEvent
}: AIEventDetailModalProps) {
  const { toast } = useToastContext();
  const modalRef = useModalKeyboard({ isOpen, onClose });
  const [activeTab, setActiveTab] = useState<'details' | 'ai-analysis' | 'checklist' | 'insights' | 'chat'>('details');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  
  // AI Features State
  const [analysis, setAnalysis] = useState<EventAnalysis | null>(null);
  const [checklist, setChecklist] = useState<SmartChecklist | null>(null);
  const [insights, setInsights] = useState<EventInsight[]>([]);
  const [relatedEvents, setRelatedEvents] = useState<CalendarEvent[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setShowMoreMenu(false);
      setShowDeleteConfirm(false);
      setActiveTab('details');
      loadAIFeatures();
    }
  }, [isOpen, event, locale]);

  const loadAIFeatures = async () => {
    if (!event) return;
    
    setLoadingAI(true);
    try {
      // Simulate AI analysis loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock AI analysis based on event type
      const mockAnalysis: EventAnalysis = {
        importance: determineImportance(event),
        estimatedDuration: estimateDuration(event),
        travelTime: event.location ? '30 minutes' : undefined,
        weatherImpact: event.location && !event.location.includes('온라인') ? 'Clear weather expected' : undefined,
        conflictRisk: false,
        preparation: generatePreparationTips(event)
      };
      setAnalysis(mockAnalysis);
      
      // Generate smart checklist
      const mockChecklist: SmartChecklist = generateSmartChecklist(event, locale);
      setChecklist(mockChecklist);
      
      // Generate insights
      const mockInsights: EventInsight[] = generateInsights(event, locale);
      setInsights(mockInsights);
      
    } catch (error) {
      console.error('Failed to load AI features:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  const determineImportance = (event: CalendarEvent): 'high' | 'medium' | 'low' => {
    const title = event.summary?.toLowerCase() || '';
    if (title.includes('면접') || title.includes('interview') || title.includes('중요') || title.includes('important')) {
      return 'high';
    }
    if (event.attendees && event.attendees.length > 5) {
      return 'high';
    }
    if (event.attendees && event.attendees.length > 0) {
      return 'medium';
    }
    return 'low';
  };

  const estimateDuration = (event: CalendarEvent): string => {
    if (event.start?.dateTime && event.end?.dateTime) {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      return `${hours} ${locale === 'ko' ? '시간' : 'hours'}`;
    }
    return locale === 'ko' ? '1시간 (예상)' : '1 hour (estimated)';
  };

  const generatePreparationTips = (event: CalendarEvent): string[] => {
    const tips: string[] = [];
    const title = event.summary?.toLowerCase() || '';
    
    if (title.includes('회의') || title.includes('meeting')) {
      tips.push('Review previous meeting notes');
      tips.push('Prepare agenda items');
      tips.push('Check required documents');
    }
    if (title.includes('면접') || title.includes('interview')) {
      tips.push('Research company background');
      tips.push('Prepare questions to ask');
      tips.push('Review your resume');
      tips.push('Plan your outfit');
    }
    if (event.location && !event.location.includes('온라인')) {
      tips.push('Check transportation route');
      tips.push('Leave 15 minutes early');
    }
    
    return tips;
  };

  const generateSmartChecklist = (event: CalendarEvent, locale: string): SmartChecklist => {
    const title = event.summary?.toLowerCase() || '';
    let category = locale === 'ko' ? '일반 준비사항' : 'General Preparation';
    let items = [];
    
    if (title.includes('회의') || title.includes('meeting')) {
      category = locale === 'ko' ? '회의 준비' : 'Meeting Preparation';
      items = [
        { id: '1', text: locale === 'ko' ? '의제 검토' : 'Review agenda', completed: false, priority: 'high' as const },
        { id: '2', text: locale === 'ko' ? '자료 준비' : 'Prepare materials', completed: false, priority: 'high' as const },
        { id: '3', text: locale === 'ko' ? '이전 회의록 확인' : 'Check previous notes', completed: false, priority: 'medium' as const },
        { id: '4', text: locale === 'ko' ? '질문 목록 작성' : 'Prepare questions', completed: false, priority: 'medium' as const }
      ];
    } else if (title.includes('면접') || title.includes('interview')) {
      category = locale === 'ko' ? '면접 준비' : 'Interview Preparation';
      items = [
        { id: '1', text: locale === 'ko' ? '회사 조사' : 'Research company', completed: false, priority: 'high' as const },
        { id: '2', text: locale === 'ko' ? '자기소개 준비' : 'Prepare introduction', completed: false, priority: 'high' as const },
        { id: '3', text: locale === 'ko' ? '포트폴리오 확인' : 'Review portfolio', completed: false, priority: 'high' as const },
        { id: '4', text: locale === 'ko' ? '복장 준비' : 'Prepare outfit', completed: false, priority: 'medium' as const },
        { id: '5', text: locale === 'ko' ? '길찾기 확인' : 'Check directions', completed: false, priority: 'medium' as const }
      ];
    } else {
      items = [
        { id: '1', text: locale === 'ko' ? '일정 확인' : 'Confirm schedule', completed: false, priority: 'high' as const },
        { id: '2', text: locale === 'ko' ? '필요 자료 준비' : 'Prepare materials', completed: false, priority: 'medium' as const },
        { id: '3', text: locale === 'ko' ? '참석자 확인' : 'Confirm attendees', completed: false, priority: 'low' as const }
      ];
    }
    
    return { category, items };
  };

  const generateInsights = (event: CalendarEvent, locale: string): EventInsight[] => {
    const insights: EventInsight[] = [];
    const title = event.summary?.toLowerCase() || '';
    
    // Time-based insights
    if (event.start?.dateTime) {
      const eventDate = new Date(event.start.dateTime);
      const now = new Date();
      const hoursUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntil < 24 && hoursUntil > 0) {
        insights.push({
          type: 'warning',
          title: locale === 'ko' ? '곧 시작되는 일정' : 'Event starting soon',
          description: locale === 'ko' 
            ? `${Math.round(hoursUntil)}시간 후 시작됩니다`
            : `Starting in ${Math.round(hoursUntil)} hours`
        });
      }
    }
    
    // Location-based insights
    if (event.location && !event.location.includes('온라인')) {
      insights.push({
        type: 'tip',
        title: locale === 'ko' ? '교통 체크' : 'Check transportation',
        description: locale === 'ko'
          ? '현재 교통 상황을 확인하고 여유있게 출발하세요'
          : 'Check current traffic conditions and leave early',
        actionable: {
          label: locale === 'ko' ? '지도 열기' : 'Open maps',
          action: () => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(event.location!)}`)
        }
      });
    }
    
    // Meeting-specific insights
    if (title.includes('회의') || title.includes('meeting')) {
      insights.push({
        type: 'suggestion',
        title: locale === 'ko' ? 'AI 회의록 작성' : 'AI Meeting Notes',
        description: locale === 'ko'
          ? 'AI가 회의 내용을 요약하고 액션 아이템을 정리해드립니다'
          : 'Let AI summarize your meeting and track action items'
      });
    }
    
    return insights;
  };

  const toggleChecklistItem = (itemId: string) => {
    if (!checklist) return;
    
    setChecklist({
      ...checklist,
      items: checklist.items.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    });
  };

  if (!event) return null;

  const formatDateTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatTime = (dateTime: string | undefined) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleShare = async () => {
    // Use the friend sharing functionality if available
    if (onShareEvent) {
      onShareEvent(event);
      return;
    }

    // Fallback to traditional sharing
    const shareData = {
      title: event.summary || 'Event',
      text: `${event.summary}\n${formatDateTime(event.start?.dateTime || event.start?.date)}`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${event.summary}\n${formatDateTime(event.start?.dateTime || event.start?.date)}\n${event.location || ''}`
        );
        toast.success(locale === 'ko' ? '클립보드에 복사되었습니다' : 'Copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  type TabId = 'details' | 'ai-analysis' | 'checklist' | 'insights' | 'chat';
  
  const tabs: Array<{id: TabId; label: string; icon: any}> = [
    { id: 'details', label: locale === 'ko' ? '상세정보' : 'Details', icon: FileText },
    { id: 'ai-analysis', label: locale === 'ko' ? 'AI 분석' : 'AI Analysis', icon: Brain },
    { id: 'checklist', label: locale === 'ko' ? '체크리스트' : 'Checklist', icon: CheckSquare },
    { id: 'insights', label: locale === 'ko' ? '인사이트' : 'Insights', icon: Lightbulb },
    { id: 'chat', label: locale === 'ko' ? 'AI 대화' : 'AI Chat', icon: MessageSquare }
  ];

  return (
    <AnimatePresence>
      {isOpen && event && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-2 bottom-2 md:inset-0 md:flex md:items-center md:justify-center z-50 w-[calc(100vw-1rem)] md:w-auto md:p-8"
          >
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-4rem)] md:max-h-[90vh] md:w-[700px] lg:w-[800px] xl:w-[900px] md:max-w-[90vw]">
              {/* Header with AI Badge */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20" />
                <div className="relative p-4 md:p-6 pb-3 md:pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <button
                      onClick={onClose}
                      className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors"
                      aria-label="Close"
                    >
                      <ChevronLeft className="w-5 h-5 text-white/70" />
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {/* AI Enhanced Badge */}
                      <div className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full border border-purple-500/30">
                        <span className="text-xs font-medium text-purple-300 flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          AI Enhanced
                        </span>
                      </div>
                      
                      <button
                        onClick={() => setIsFavorite(!isFavorite)}
                        className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                      >
                        {isFavorite ? (
                          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        ) : (
                          <StarOff className="w-5 h-5 text-white/70" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Event Title */}
                  <h2 id="modal-title" className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-3 line-clamp-2">
                    {event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled Event')}
                  </h2>
                  
                  {/* Tab Navigation - Scrollable on mobile */}
                  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="flex gap-1 bg-gray-800/50 rounded-xl p-1 min-w-max md:min-w-0">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabId)}
                            className={`flex-1 md:flex-1 flex items-center justify-center gap-1 md:gap-2 py-2 px-2 md:px-3 rounded-lg transition-all whitespace-nowrap ${
                              activeTab === tab.id
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                            }`}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="text-xs md:text-sm font-medium">
                              {tab.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Area - Flexible height */}
              <div className="px-4 md:px-6 py-4 flex-1 overflow-y-auto min-h-0">
                <AnimatePresence mode="wait">
                  {/* Details Tab */}
                  {activeTab === 'details' && (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-3 md:space-y-4"
                    >
                      {/* Date & Time */}
                      <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-3 md:p-4">
                        <div className="flex items-center gap-4">
                          <Clock className="w-5 h-5 text-purple-400" />
                          <div>
                            <p className="text-white font-medium">
                              {formatDateTime(event.start?.dateTime || event.start?.date)}
                            </p>
                            {event.end?.dateTime && (
                              <p className="text-gray-400 text-sm">
                                {locale === 'ko' ? '종료: ' : 'Ends: '}
                                {formatTime(event.end.dateTime)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      {event.location && (
                        <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-3 md:p-4">
                          <div className="flex items-center gap-4">
                            <MapPin className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="text-white">{event.location}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Attendees */}
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-3 md:p-4">
                          <div className="flex items-center gap-4">
                            <Users className="w-5 h-5 text-green-400" />
                            <div>
                              <p className="text-gray-400 text-sm mb-2">
                                {event.attendees.length} {locale === 'ko' ? '명 참석' : 'attendees'}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {event.attendees.slice(0, 3).map((attendee, i) => (
                                  <span key={i} className="text-xs bg-gray-700 px-2 py-1 rounded text-white">
                                    {attendee.email?.split('@')[0]}
                                  </span>
                                ))}
                                {event.attendees.length > 3 && (
                                  <span className="text-xs text-gray-400">
                                    +{event.attendees.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {event.description && (
                        <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-3 md:p-4">
                          <div className="flex items-start gap-4">
                            <FileText className="w-5 h-5 text-orange-400 mt-1" />
                            <div>
                              <p className="text-gray-400 text-sm mb-1">{locale === 'ko' ? '설명' : 'Description'}</p>
                              <p className="text-white whitespace-pre-wrap">{event.description}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* AI Analysis Tab */}
                  {activeTab === 'ai-analysis' && (
                    <motion.div
                      key="ai-analysis"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-3 md:space-y-4"
                    >
                      {loadingAI ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : analysis ? (
                        <>
                          {/* Importance Level */}
                          <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-3 md:p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">{locale === 'ko' ? '중요도' : 'Importance'}</span>
                              <div className={`px-3 py-1 rounded-lg font-medium ${
                                analysis.importance === 'high' ? 'bg-red-500/20 text-red-400' :
                                analysis.importance === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {analysis.importance === 'high' ? (locale === 'ko' ? '높음' : 'High') :
                                 analysis.importance === 'medium' ? (locale === 'ko' ? '중간' : 'Medium') :
                                 (locale === 'ko' ? '낮음' : 'Low')}
                              </div>
                            </div>
                          </div>

                          {/* Duration Estimate */}
                          <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-3 md:p-4">
                            <div className="flex items-center gap-4">
                              <Clock className="w-5 h-5 text-purple-400" />
                              <div>
                                <p className="text-gray-400 text-sm">{locale === 'ko' ? '예상 소요시간' : 'Estimated Duration'}</p>
                                <p className="text-white font-medium">{analysis.estimatedDuration}</p>
                              </div>
                            </div>
                          </div>

                          {/* Travel Time */}
                          {analysis.travelTime && (
                            <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-3 md:p-4">
                              <div className="flex items-center gap-4">
                                <Car className="w-5 h-5 text-blue-400" />
                                <div>
                                  <p className="text-gray-400 text-sm">{locale === 'ko' ? '이동 시간' : 'Travel Time'}</p>
                                  <p className="text-white font-medium">{analysis.travelTime}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Weather Impact */}
                          {analysis.weatherImpact && (
                            <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-3 md:p-4">
                              <div className="flex items-center gap-4">
                                <Cloud className="w-5 h-5 text-cyan-400" />
                                <div>
                                  <p className="text-gray-400 text-sm">{locale === 'ko' ? '날씨' : 'Weather'}</p>
                                  <p className="text-white">{analysis.weatherImpact}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Preparation Tips */}
                          {analysis.preparation.length > 0 && (
                            <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-3 md:p-4">
                              <p className="text-gray-400 text-sm mb-3">{locale === 'ko' ? '준비 사항' : 'Preparation Tips'}</p>
                              <ul className="space-y-2">
                                {analysis.preparation.map((tip, i) => (
                                  <li key={i} className="flex items-start gap-2 text-white">
                                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                                    <span className="text-sm">{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-4 text-center">
                          <p className="text-gray-400">{locale === 'ko' ? 'AI 분석을 생성 중입니다...' : 'Generating AI analysis...'}</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Checklist Tab */}
                  {activeTab === 'checklist' && (
                    <motion.div
                      key="checklist"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-3 md:space-y-4"
                    >
                      {loadingAI ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : checklist ? (
                        <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-3 md:p-4">
                          <h3 className="text-white font-medium mb-4">{checklist.category}</h3>
                          <div className="space-y-2">
                            {checklist.items.map(item => (
                              <label
                                key={item.id}
                                className="flex items-center gap-2 md:gap-3 p-2.5 md:p-2 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer active:bg-gray-700/70"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={() => toggleChecklistItem(item.id)}
                                  className="w-5 h-5 md:w-4 md:h-4 rounded border-gray-600 bg-gray-700 text-purple-500 focus:ring-purple-500 flex-shrink-0"
                                />
                                <span className={`flex-1 text-sm md:text-base ${item.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                                  {item.text}
                                </span>
                                <span className={`text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded ${
                                  item.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                  item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>
                                  {item.priority === 'high' ? (locale === 'ko' ? '높음' : 'High') :
                                   item.priority === 'medium' ? (locale === 'ko' ? '중간' : 'Medium') :
                                   (locale === 'ko' ? '낮음' : 'Low')}
                                </span>
                              </label>
                            ))}
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">
                                {locale === 'ko' ? '완료율' : 'Completion'}
                              </span>
                              <span className="text-white font-medium">
                                {Math.round((checklist.items.filter(i => i.completed).length / checklist.items.length) * 100)}%
                              </span>
                            </div>
                            <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
                                style={{
                                  width: `${(checklist.items.filter(i => i.completed).length / checklist.items.length) * 100}%`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-4 text-center">
                          <p className="text-gray-400">{locale === 'ko' ? 'AI 분석을 생성 중입니다...' : 'Generating AI analysis...'}</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Insights Tab */}
                  {activeTab === 'insights' && (
                    <motion.div
                      key="insights"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-3 md:space-y-4"
                    >
                      {loadingAI ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : insights.length > 0 ? (
                        insights.map((insight, i) => (
                          <div key={i} className="bg-gray-800/50 rounded-xl md:rounded-2xl p-3 md:p-4">
                            <div className="flex items-start gap-2 md:gap-3">
                              <div className={`p-1.5 md:p-2 rounded-lg flex-shrink-0 ${
                                insight.type === 'warning' ? 'bg-yellow-500/20' :
                                insight.type === 'tip' ? 'bg-blue-500/20' :
                                'bg-purple-500/20'
                              }`}>
                                {insight.type === 'warning' ? (
                                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                                ) : insight.type === 'tip' ? (
                                  <Lightbulb className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                                ) : (
                                  <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium mb-1 text-sm md:text-base">{insight.title}</h4>
                                <p className="text-gray-400 text-xs md:text-sm break-words">{insight.description}</p>
                                {insight.actionable && (
                                  <button
                                    onClick={insight.actionable.action}
                                    className="mt-2 text-xs md:text-sm text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1"
                                  >
                                    {insight.actionable.label}
                                    <span className="text-xs">→</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          {locale === 'ko' ? '인사이트를 생성 중입니다...' : 'Generating insights...'}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Chat Tab */}
                  {activeTab === 'chat' && (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-3 md:space-y-4"
                    >
                      <div className="bg-gray-800/50 rounded-xl md:rounded-2xl p-4 md:p-6 text-center">
                        <MessageSquare className="w-10 h-10 md:w-12 md:h-12 text-purple-400 mx-auto mb-3 md:mb-4" />
                        <h3 className="text-white font-medium mb-2 text-base md:text-lg">
                          {locale === 'ko' ? '이 일정에 대해 AI와 대화하기' : 'Chat about this event with AI'}
                        </h3>
                        <p className="text-gray-400 text-xs md:text-sm mb-4 px-2">
                          {locale === 'ko' 
                            ? 'AI가 이 일정에 대한 질문에 답하고 도움을 드립니다'
                            : 'AI can answer questions and help you with this event'}
                        </p>
                        <button
                          onClick={() => onChatAboutEvent?.(event)}
                          className="px-4 md:px-5 py-2 md:py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg md:rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all font-medium text-sm md:text-base"
                        >
                          {locale === 'ko' ? 'AI 대화 시작' : 'Start AI Chat'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions - Fixed at bottom */}
              <div className="p-4 md:p-6 pt-3 md:pt-4 border-t border-gray-800 bg-gradient-to-t from-gray-950 to-transparent flex-shrink-0">
                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={() => onEdit(event)}
                    className="flex-1 py-2.5 md:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg md:rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all font-medium text-sm md:text-base"
                  >
                    <Edit3 className="w-4 h-4" />
                    {locale === 'ko' ? '편집' : 'Edit'}
                  </button>
                  
                  <button
                    onClick={handleShare}
                    className="px-3 md:px-4 py-2.5 md:py-3 bg-gray-800 text-white rounded-lg md:rounded-xl hover:bg-gray-700 transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}