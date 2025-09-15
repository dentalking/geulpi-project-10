'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  RefreshCw,
  MessageSquare,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Users,
  Calendar,
  Brain,
  Edit3,
  Share2,
  Trash2,
  ChevronDown,
  Loader2,
  BarChart,
  Target,
  Zap
} from 'lucide-react';
import type { CalendarEvent } from '@/types';
import { useToastContext } from '@/providers/ToastProvider';
import ReactMarkdown from 'react-markdown';

interface AIEventReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  locale: string;
}

interface EventReport {
  summary: string;
  insights: string[];
  recommendations: string[];
  risks: string[];
  preparation: string[];
  followUp: string[];
  contextualInfo: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  estimatedFocus: number; // 1-10 scale
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

export function AIEventReportModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  locale
}: AIEventReportModalProps) {
  const { toast } = useToastContext();
  const [report, setReport] = useState<EventReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeView, setActiveView] = useState<'report' | 'chat'>('report');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && event) {
      generateEventReport();
      initializeChatWithContext();
    }
  }, [isOpen, event]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const generateEventReport = async () => {
    if (!event) return;

    setIsLoading(true);
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockReport: EventReport = {
        summary: generateSummary(event, locale),
        insights: generateInsights(event, locale),
        recommendations: generateRecommendations(event, locale),
        risks: identifyRisks(event, locale),
        preparation: generatePreparation(event, locale),
        followUp: generateFollowUp(event, locale),
        contextualInfo: generateContextualInfo(event, locale),
        importance: determineImportance(event),
        estimatedFocus: calculateFocusLevel(event)
      };

      setReport(mockReport);
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error(locale === 'ko' ? '보고서 생성 실패' : 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = (event: CalendarEvent, locale: string): string => {
    const title = event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled');
    const date = new Date(event.start?.dateTime || event.start?.date || '');
    const dateStr = date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    if (locale === 'ko') {
      return `**${title}** 일정이 ${dateStr}에 예정되어 있습니다. ${
        event.attendees && event.attendees.length > 0
          ? `${event.attendees.length}명의 참석자와 함께하는 ${
              event.attendees.length > 5 ? '중요한 ' : ''
            }미팅입니다.`
          : '개인 일정입니다.'
      } ${
        event.location
          ? event.location.includes('온라인') || event.location.includes('meet') || event.location.includes('zoom')
            ? '온라인으로 진행됩니다.'
            : `${event.location}에서 진행됩니다.`
          : ''
      }`;
    }

    return `You have **${title}** scheduled for ${dateStr}. ${
      event.attendees && event.attendees.length > 0
        ? `This is ${event.attendees.length > 5 ? 'an important ' : 'a '}meeting with ${event.attendees.length} attendee${event.attendees.length > 1 ? 's' : ''}.`
        : 'This is a personal event.'
    } ${
      event.location
        ? event.location.includes('online') || event.location.includes('meet') || event.location.includes('zoom')
          ? 'It will be held online.'
          : `It will take place at ${event.location}.`
        : ''
    }`;
  };

  const generateInsights = (event: CalendarEvent, locale: string): string[] => {
    const insights = [];
    const title = event.summary?.toLowerCase() || '';

    if (event.attendees && event.attendees.length > 10) {
      insights.push(
        locale === 'ko'
          ? '📊 대규모 미팅입니다. 효율적인 진행을 위해 명확한 의제가 필요합니다.'
          : '📊 Large meeting detected. Clear agenda needed for efficiency.'
      );
    }

    if (title.includes('interview') || title.includes('면접')) {
      insights.push(
        locale === 'ko'
          ? '💼 면접 일정입니다. 충분한 준비 시간을 확보하세요.'
          : '💼 Interview scheduled. Ensure adequate preparation time.'
      );
    }

    if (event.recurrence && event.recurrence.length > 0) {
      insights.push(
        locale === 'ko'
          ? '🔄 반복 일정입니다. 정기적인 참여가 중요합니다.'
          : '🔄 Recurring event. Regular attendance is important.'
      );
    }

    const startTime = event.start?.dateTime ? new Date(event.start.dateTime) : null;
    if (startTime) {
      const hour = startTime.getHours();
      if (hour < 9) {
        insights.push(
          locale === 'ko'
            ? '🌅 이른 아침 일정입니다. 전날 충분한 휴식을 취하세요.'
            : '🌅 Early morning event. Ensure adequate rest the night before.'
        );
      } else if (hour >= 18) {
        insights.push(
          locale === 'ko'
            ? '🌙 저녁 일정입니다. 에너지 관리에 신경쓰세요.'
            : '🌙 Evening event. Mind your energy levels.'
        );
      }
    }

    return insights;
  };

  const generateRecommendations = (event: CalendarEvent, locale: string): string[] => {
    const recommendations = [];
    const title = event.summary?.toLowerCase() || '';

    if (title.includes('meeting') || title.includes('회의')) {
      recommendations.push(
        locale === 'ko'
          ? '📝 회의 자료를 미리 검토하고 질문을 준비하세요'
          : '📝 Review meeting materials and prepare questions'
      );
    }

    if (event.location && !event.location.includes('online')) {
      recommendations.push(
        locale === 'ko'
          ? '🗺️ 교통 상황을 확인하고 15분 일찍 출발하세요'
          : '🗺️ Check traffic conditions and leave 15 minutes early'
      );
    }

    if (event.attendees && event.attendees.length > 0) {
      recommendations.push(
        locale === 'ko'
          ? '👥 참석자 프로필을 미리 확인하세요'
          : '👥 Review attendee profiles beforehand'
      );
    }

    return recommendations;
  };

  const identifyRisks = (event: CalendarEvent, locale: string): string[] => {
    const risks = [];

    // Check for conflicts (mock)
    if (Math.random() > 0.7) {
      risks.push(
        locale === 'ko'
          ? '⚠️ 다른 일정과 시간이 겹칠 가능성이 있습니다'
          : '⚠️ Potential time conflict with another event'
      );
    }

    if (event.location && event.location.includes('airport')) {
      risks.push(
        locale === 'ko'
          ? '✈️ 공항 일정입니다. 체크인 시간을 고려하세요'
          : '✈️ Airport event. Consider check-in time'
      );
    }

    return risks;
  };

  const generatePreparation = (event: CalendarEvent, locale: string): string[] => {
    const prep = [];
    const title = event.summary?.toLowerCase() || '';

    if (title.includes('presentation') || title.includes('발표')) {
      prep.push(
        locale === 'ko'
          ? '🎤 발표 자료 최종 점검'
          : '🎤 Final check of presentation materials'
      );
      prep.push(
        locale === 'ko'
          ? '🔋 노트북 충전 확인'
          : '🔋 Ensure laptop is charged'
      );
    }

    if (event.location && event.location.includes('restaurant')) {
      prep.push(
        locale === 'ko'
          ? '🍽️ 레스토랑 예약 확인'
          : '🍽️ Confirm restaurant reservation'
      );
    }

    return prep;
  };

  const generateFollowUp = (event: CalendarEvent, locale: string): string[] => {
    const followUp = [];

    if (event.attendees && event.attendees.length > 0) {
      followUp.push(
        locale === 'ko'
          ? '📧 회의록을 참석자들에게 공유'
          : '📧 Share meeting notes with attendees'
      );
      followUp.push(
        locale === 'ko'
          ? '✅ 액션 아이템 정리 및 할당'
          : '✅ Organize and assign action items'
      );
    }

    return followUp;
  };

  const generateContextualInfo = (event: CalendarEvent, locale: string): string => {
    const contexts = [];

    if (event.creator?.email) {
      contexts.push(
        locale === 'ko'
          ? `생성자: ${event.creator.email}`
          : `Created by: ${event.creator.email}`
      );
    }

    if (event.updated) {
      const updateDate = new Date(event.updated);
      const daysAgo = Math.floor((Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysAgo < 7) {
        contexts.push(
          locale === 'ko'
            ? `${daysAgo}일 전에 업데이트됨`
            : `Updated ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`
        );
      }
    }

    return contexts.join(' • ');
  };

  const determineImportance = (event: CalendarEvent): 'critical' | 'high' | 'medium' | 'low' => {
    const title = event.summary?.toLowerCase() || '';

    if (title.includes('urgent') || title.includes('긴급') || title.includes('critical')) {
      return 'critical';
    }
    if (event.attendees && event.attendees.length > 10) {
      return 'high';
    }
    if (event.attendees && event.attendees.length > 3) {
      return 'medium';
    }
    return 'low';
  };

  const calculateFocusLevel = (event: CalendarEvent): number => {
    let focus = 5;

    if (event.attendees) {
      focus += Math.min(event.attendees.length / 2, 3);
    }

    const title = event.summary?.toLowerCase() || '';
    if (title.includes('important') || title.includes('중요')) {
      focus += 2;
    }

    return Math.min(Math.round(focus), 10);
  };

  const initializeChatWithContext = () => {
    if (!event) return;

    const initialMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: locale === 'ko'
        ? `안녕하세요! "${event.summary}" 일정에 대해 궁금한 점이 있으신가요? 제가 도와드릴 수 있는 것들:\n\n• 일정 세부사항 분석\n• 준비사항 체크리스트\n• 관련 일정 찾기\n• 최적화 제안\n\n무엇을 도와드릴까요?`
        : `Hello! I'm here to help with your "${event.summary}" event. I can assist with:\n\n• Detailed analysis\n• Preparation checklist\n• Finding related events\n• Optimization suggestions\n\nWhat would you like to know?`,
      timestamp: new Date()
    };

    setChatMessages([initialMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateAIResponse(userMessage.content, event!, locale),
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  const generateAIResponse = (question: string, event: CalendarEvent, locale: string): string => {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('prepare') || lowerQuestion.includes('준비')) {
      return locale === 'ko'
        ? `이 일정을 위한 준비사항입니다:\n\n1. **사전 준비** (D-1)\n   • 관련 자료 검토\n   • 참석자 정보 확인\n   • 질문 리스트 작성\n\n2. **당일 준비** (D-Day)\n   • 30분 전 장비 점검\n   • 자료 최종 확인\n   • 마음가짐 정리\n\n3. **필수 체크리스트**\n   ✅ 노트북/태블릿 충전\n   ✅ 필기도구 준비\n   ✅ 명함 지참 (오프라인)\n   ✅ 카메라/마이크 테스트 (온라인)`
        : `Here's your preparation plan:\n\n1. **Pre-meeting** (Day before)\n   • Review relevant materials\n   • Check attendee profiles\n   • Prepare questions\n\n2. **Day of** (30 min before)\n   • Test equipment\n   • Final review\n   • Mental preparation\n\n3. **Checklist**\n   ✅ Charge devices\n   ✅ Prepare notes\n   ✅ Business cards (offline)\n   ✅ Test camera/mic (online)`;
    }

    if (lowerQuestion.includes('reschedule') || lowerQuestion.includes('일정 변경') || lowerQuestion.includes('다시')) {
      return locale === 'ko'
        ? `일정 변경을 고려하시는군요. 다음 옵션들을 제안드립니다:\n\n📅 **대체 시간대**\n• 오늘 오후 3-4시 (비어있음)\n• 내일 오전 10-11시 (추천)\n• 이번 주 금요일 2-3시\n\n변경하시려면 참석자들에게 미리 알려야 합니다. 제가 변경 요청 메시지 초안을 작성해드릴까요?`
        : `Looking to reschedule? Here are some options:\n\n📅 **Alternative slots**\n• Today 3-4 PM (available)\n• Tomorrow 10-11 AM (recommended)\n• Friday 2-3 PM\n\nRemember to notify attendees in advance. Would you like me to draft a rescheduling message?`;
    }

    if (lowerQuestion.includes('important') || lowerQuestion.includes('중요')) {
      return locale === 'ko'
        ? `이 일정의 중요도를 분석했습니다:\n\n**중요도: ${report?.importance === 'high' ? '높음' : '보통'} (${report?.estimatedFocus}/10)**\n\n주요 포인트:\n${report?.insights.join('\n')}\n\n이 일정은 ${event.attendees ? `${event.attendees.length}명이 참석하는` : '개인'} 일정으로, 충분한 준비가 필요합니다.`
        : `Event importance analysis:\n\n**Priority: ${report?.importance || 'medium'} (Focus: ${report?.estimatedFocus}/10)**\n\nKey points:\n${report?.insights.join('\n')}\n\nThis ${event.attendees ? `involves ${event.attendees.length} attendees` : 'is a personal event'} and requires adequate preparation.`;
    }

    // Default response
    return locale === 'ko'
      ? `"${question}"에 대해 더 자세히 알려드리겠습니다. 구체적으로 어떤 부분이 궁금하신가요?\n\n• 시간/장소 변경\n• 참석자 관리\n• 준비사항\n• 관련 일정\n\n원하시는 항목을 선택해주세요.`
      : `I'll help you with "${question}". What specifically would you like to know?\n\n• Time/location changes\n• Attendee management\n• Preparation tips\n• Related events\n\nPlease let me know which aspect interests you.`;
  };

  const importanceColors = {
    critical: 'from-red-600 to-orange-600',
    high: 'from-orange-500 to-yellow-500',
    medium: 'from-blue-500 to-purple-500',
    low: 'from-gray-500 to-gray-600'
  };

  const importanceIcons = {
    critical: '🔴',
    high: '🟠',
    medium: '🔵',
    low: '⚪'
  };

  const handleRefreshReport = () => {
    generateEventReport();
    toast.success(locale === 'ko' ? '보고서를 새로고침했습니다' : 'Report refreshed');
  };

  const handleQuickAction = (action: string) => {
    const message = locale === 'ko'
      ? action === 'optimize' ? '이 일정을 최적화하는 방법을 알려주세요'
      : action === 'prepare' ? '준비사항을 자세히 알려주세요'
      : action === 'related' ? '관련된 다른 일정을 찾아주세요'
      : '위험 요소를 분석해주세요'
      : action === 'optimize' ? 'How can I optimize this event?'
      : action === 'prepare' ? 'What should I prepare?'
      : action === 'related' ? 'Find related events'
      : 'Analyze potential risks';

    setInputMessage(message);
    setActiveView('chat');
  };

  if (!event) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal Container - Safe Centered */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 md:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl shadow-2xl overflow-hidden"
                style={{ maxHeight: 'min(90vh, 900px)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col h-full max-h-[90vh]">
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl bg-gradient-to-r ${report ? importanceColors[report.importance] : 'from-gray-600 to-gray-700'}`}>
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {locale === 'ko' ? 'AI 일정 분석 보고서' : 'AI Event Analysis Report'}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {event.summary || (locale === 'ko' ? '제목 없음' : 'Untitled')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* View Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveView('report')}
                    className={`flex-1 py-2 px-4 rounded-xl transition-all ${
                      activeView === 'report'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    {locale === 'ko' ? '분석 보고서' : 'Analysis Report'}
                  </button>
                  <button
                    onClick={() => setActiveView('chat')}
                    className={`flex-1 py-2 px-4 rounded-xl transition-all ${
                      activeView === 'chat'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    {locale === 'ko' ? 'AI 대화' : 'AI Chat'}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                      <p className="text-gray-400">
                        {locale === 'ko' ? 'AI가 일정을 분석하고 있습니다...' : 'AI is analyzing your event...'}
                      </p>
                    </div>
                  </div>
                ) : activeView === 'report' && report ? (
                  <div className="p-6 space-y-6">
                    {/* Executive Summary */}
                    <section className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl p-6">
                      <div className="flex items-start gap-4">
                        <Sparkles className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-3">
                            {locale === 'ko' ? '요약' : 'Executive Summary'}
                          </h3>
                          <div className="text-gray-300 prose prose-invert max-w-none">
                            <ReactMarkdown>{report.summary}</ReactMarkdown>
                          </div>

                          {/* Importance & Focus Level */}
                          <div className="flex items-center gap-6 mt-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-400">
                                {locale === 'ko' ? '중요도:' : 'Importance:'}
                              </span>
                              <span className={`px-3 py-1 rounded-lg text-sm font-medium bg-gradient-to-r ${importanceColors[report.importance]} text-white`}>
                                {importanceIcons[report.importance]} {report.importance.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-400">
                                {locale === 'ko' ? '집중도:' : 'Focus:'}
                              </span>
                              <div className="flex items-center gap-1">
                                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                                    style={{ width: `${report.estimatedFocus * 10}%` }}
                                  />
                                </div>
                                <span className="text-sm text-white font-medium ml-2">
                                  {report.estimatedFocus}/10
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Insights & Recommendations Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Key Insights */}
                      {report.insights.length > 0 && (
                        <section className="bg-gray-800/30 rounded-2xl p-5">
                          <h3 className="flex items-center gap-2 text-white font-semibold mb-3">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            {locale === 'ko' ? '주요 인사이트' : 'Key Insights'}
                          </h3>
                          <ul className="space-y-2">
                            {report.insights.map((insight, index) => (
                              <li key={index} className="text-gray-300 text-sm">
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      {/* Recommendations */}
                      {report.recommendations.length > 0 && (
                        <section className="bg-gray-800/30 rounded-2xl p-5">
                          <h3 className="flex items-center gap-2 text-white font-semibold mb-3">
                            <Target className="w-5 h-5 text-green-400" />
                            {locale === 'ko' ? '추천사항' : 'Recommendations'}
                          </h3>
                          <ul className="space-y-2">
                            {report.recommendations.map((rec, index) => (
                              <li key={index} className="text-gray-300 text-sm">
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>

                    {/* Risks & Preparation */}
                    {(report.risks.length > 0 || report.preparation.length > 0) && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* Risks */}
                        {report.risks.length > 0 && (
                          <section className="bg-red-900/20 border border-red-800/30 rounded-2xl p-5">
                            <h3 className="flex items-center gap-2 text-white font-semibold mb-3">
                              <AlertCircle className="w-5 h-5 text-red-400" />
                              {locale === 'ko' ? '주의사항' : 'Risk Factors'}
                            </h3>
                            <ul className="space-y-2">
                              {report.risks.map((risk, index) => (
                                <li key={index} className="text-gray-300 text-sm">
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {/* Preparation */}
                        {report.preparation.length > 0 && (
                          <section className="bg-green-900/20 border border-green-800/30 rounded-2xl p-5">
                            <h3 className="flex items-center gap-2 text-white font-semibold mb-3">
                              <CheckCircle className="w-5 h-5 text-green-400" />
                              {locale === 'ko' ? '준비사항' : 'Preparation'}
                            </h3>
                            <ul className="space-y-2">
                              {report.preparation.map((prep, index) => (
                                <li key={index} className="text-gray-300 text-sm">
                                  {prep}
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}
                      </div>
                    )}

                    {/* Follow-up Actions */}
                    {report.followUp.length > 0 && (
                      <section className="bg-purple-900/20 border border-purple-800/30 rounded-2xl p-5">
                        <h3 className="flex items-center gap-2 text-white font-semibold mb-3">
                          <Zap className="w-5 h-5 text-purple-400" />
                          {locale === 'ko' ? '후속 조치' : 'Follow-up Actions'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {report.followUp.map((action, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-purple-400">{index + 1}</span>
                              </div>
                              <span className="text-gray-300 text-sm">{action}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Contextual Info */}
                    {report.contextualInfo && (
                      <div className="text-center text-sm text-gray-500 pt-2">
                        {report.contextualInfo}
                      </div>
                    )}
                  </div>
                ) : activeView === 'chat' ? (
                  <div className="flex flex-col h-full">
                    {/* Chat Messages */}
                    <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                      {chatMessages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[70%] ${
                            message.role === 'user'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-800 text-gray-300'
                          } rounded-2xl px-4 py-3`}>
                            <div className="prose prose-invert max-w-none text-sm">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                            <p className="text-xs opacity-70 mt-2">
                              {message.timestamp.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-gray-800 text-gray-400 rounded-2xl px-4 py-3">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Quick Action Chips */}
                    <div className="px-6 pb-3">
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { id: 'optimize', icon: BarChart, label: locale === 'ko' ? '최적화' : 'Optimize' },
                          { id: 'prepare', icon: CheckSquare, label: locale === 'ko' ? '준비' : 'Prepare' },
                          { id: 'related', icon: Calendar, label: locale === 'ko' ? '관련 일정' : 'Related' },
                          { id: 'risks', icon: AlertCircle, label: locale === 'ko' ? '위험 분석' : 'Risks' }
                        ].map((action) => (
                          <button
                            key={action.id}
                            onClick={() => handleQuickAction(action.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                          >
                            <action.icon className="w-4 h-4" />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chat Input */}
                    <div className="p-6 pt-3 border-t border-gray-800">
                      <div className="flex gap-3">
                        <input
                          ref={inputRef}
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder={locale === 'ko' ? 'AI에게 질문하세요...' : 'Ask AI anything...'}
                          className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-500"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!inputMessage.trim() || isTyping}
                          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Actions Footer */}
              <div className="p-4 md:p-6 pt-4 border-t border-gray-800 bg-gradient-to-t from-gray-950 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={handleRefreshReport}
                      className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
                      title={locale === 'ko' ? '보고서 새로고침' : 'Refresh report'}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => event && onEdit(event)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      {locale === 'ko' ? '편집' : 'Edit'}
                    </button>
                    <button
                      onClick={() => toast.info(locale === 'ko' ? '공유 기능 준비 중' : 'Share feature coming soon')}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      {locale === 'ko' ? '공유' : 'Share'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(locale === 'ko' ? '이 일정을 삭제하시겠습니까?' : 'Delete this event?')) {
                          onDelete(event);
                          onClose();
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {locale === 'ko' ? '삭제' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}