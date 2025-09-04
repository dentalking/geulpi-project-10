'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  MapPin,
  Sparkles,
  Command,
  ArrowRight,
  Check,
  X,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import { useToastContext } from '@/providers/ToastProvider';
import type { CalendarEvent } from '@/types';

interface UniversalCommandBarProps {
  events: CalendarEvent[];
  onEventSync: () => void;
  sessionId: string;
}

type CommandIntent = 'search' | 'create' | 'update' | 'delete' | 'question' | 'unknown';

interface Suggestion {
  type: CommandIntent;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function UniversalCommandBar({ 
  events, 
  onEventSync, 
  sessionId 
}: UniversalCommandBarProps) {
  const { toast } = useToastContext();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commandResult, setCommandResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 의도 파악 함수
  const detectIntent = (text: string): CommandIntent => {
    const lowerText = text.toLowerCase();
    
    // 생성 키워드
    if (lowerText.includes('추가') || lowerText.includes('만들') || 
        lowerText.includes('생성') || lowerText.includes('예약')) {
      return 'create';
    }
    
    // 수정 키워드
    if (lowerText.includes('변경') || lowerText.includes('수정') || 
        lowerText.includes('바꾸') || lowerText.includes('이동')) {
      return 'update';
    }
    
    // 삭제 키워드
    if (lowerText.includes('삭제') || lowerText.includes('취소') || 
        lowerText.includes('제거') || lowerText.includes('지우')) {
      return 'delete';
    }
    
    // 질문 키워드
    if (lowerText.includes('몇') || lowerText.includes('언제') || 
        lowerText.includes('어디') || lowerText.includes('?')) {
      return 'question';
    }
    
    // 기본적으로 검색으로 처리
    return 'search';
  };

  // 제안 생성
  const generateSuggestions = useCallback((text: string) => {
    if (!text.trim()) {
      // 빈 입력일 때 기본 제안
      setSuggestions([
        {
          type: 'create',
          label: '새 일정 만들기',
          description: '예: "내일 3시 회의 추가"',
          icon: <Plus className="w-4 h-4" />,
          action: () => {}
        },
        {
          type: 'search',
          label: '일정 검색',
          description: '예: "이번 주 미팅"',
          icon: <Search className="w-4 h-4" />,
          action: () => {}
        }
      ]);
      return;
    }

    const intent = detectIntent(text);
    const newSuggestions: Suggestion[] = [];

    // 의도에 따른 제안 생성
    switch (intent) {
      case 'create':
        newSuggestions.push({
          type: 'create',
          label: `"${text}" 일정 추가`,
          icon: <Plus className="w-4 h-4 text-green-400" />,
          action: () => handleCreateEvent(text)
        });
        break;
      
      case 'search':
        // 실제 검색 결과
        const searchResults = events.filter(event => 
          event.summary?.toLowerCase().includes(text.toLowerCase())
        ).slice(0, 3);
        
        searchResults.forEach(event => {
          newSuggestions.push({
            type: 'search',
            label: event.summary || '제목 없음',
            description: formatEventTime(event),
            icon: <Calendar className="w-4 h-4 text-blue-400" />,
            action: () => handleSelectEvent(event)
          });
        });

        if (searchResults.length === 0) {
          newSuggestions.push({
            type: 'search',
            label: '검색 결과 없음',
            description: '다른 키워드로 검색해보세요',
            icon: <Search className="w-4 h-4 text-gray-400" />,
            action: () => {}
          });
        }
        break;
      
      case 'update':
        newSuggestions.push({
          type: 'update',
          label: `일정 수정: "${text}"`,
          icon: <Edit className="w-4 h-4 text-yellow-400" />,
          action: () => handleUpdateEvent(text)
        });
        break;
      
      case 'delete':
        newSuggestions.push({
          type: 'delete',
          label: `일정 삭제: "${text}"`,
          icon: <Trash2 className="w-4 h-4 text-red-400" />,
          action: () => handleDeleteEvent(text)
        });
        break;
      
      case 'question':
        newSuggestions.push({
          type: 'question',
          label: `AI에게 질문: "${text}"`,
          icon: <Sparkles className="w-4 h-4 text-purple-400" />,
          action: () => handleAIQuestion(text)
        });
        break;
    }

    // AI 추천 추가
    if (newSuggestions.length < 3) {
      newSuggestions.push({
        type: 'unknown',
        label: 'AI 도우미에게 물어보기',
        description: '자연어로 대화하듯 입력하세요',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
        action: () => handleAIChat(text)
      });
    }

    setSuggestions(newSuggestions);
  }, [events]);

  // 이벤트 핸들러들
  const handleCreateEvent = async (text: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `다음 내용으로 일정을 만들어줘: ${text}`,
          sessionId
        })
      });
      
      const data = await response.json();
      if (data.type === 'action' && data.action === 'event_created') {
        toast.success('일정 생성 완료', data.message);
        onEventSync();
        setCommandResult({
          type: 'success',
          message: data.message,
          event: data.data
        });
        setQuery('');
        setIsOpen(false);
      } else if (data.type === 'error') {
        toast.error('오류', data.message);
      }
    } catch (error) {
      toast.error('오류', '일정 생성에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEvent = async (text: string) => {
    // 수정 로직 구현
    toast.info('수정 모드', '수정할 일정을 선택해주세요');
  };

  const handleDeleteEvent = async (text: string) => {
    // 삭제 로직 구현
    toast.warning('삭제 확인', '정말 삭제하시겠습니까?');
  };

  const handleAIQuestion = async (text: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId
        })
      });
      
      const data = await response.json();
      setCommandResult({
        type: 'answer',
        message: data.message
      });
    } catch (error) {
      toast.error('오류', '답변을 가져올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIChat = async (text: string) => {
    await handleAIQuestion(text);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    toast.info('일정 선택', event.summary || '');
    setCommandResult({
      type: 'event',
      event
    });
  };

  const formatEventTime = (event: CalendarEvent): string => {
    const startTime = event.start?.dateTime || event.start?.date;
    if (!startTime) return '';
    
    const date = new Date(startTime);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          suggestions[selectedIndex].action();
        }
        break;
      
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  // 입력 변화 감지
  useEffect(() => {
    const timer = setTimeout(() => {
      generateSuggestions(query);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, generateSuggestions]);

  // 포커스 관리
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K로 열기
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="relative flex-1 max-w-2xl mx-auto">
      <div className="relative">
        {/* 입력 필드 */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Search className="w-5 h-5 text-white/40" />
            {isLoading && (
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
            )}
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="일정 검색 또는 명령어 입력... (Cmd+K)"
            className="w-full pl-10 pr-12 py-3 bg-white/5 backdrop-blur-sm 
                     border border-white/10 rounded-xl text-white 
                     placeholder:text-white/40 focus:outline-none 
                     focus:border-purple-500/50 focus:bg-white/10 
                     transition-all text-sm"
          />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs text-white/60">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* 드롭다운 결과 */}
        <AnimatePresence>
          {isOpen && (query || suggestions.length > 0) && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-full bg-black/90 backdrop-blur-xl 
                       border border-white/10 rounded-xl overflow-hidden 
                       shadow-2xl shadow-purple-500/10 z-50"
            >
              {/* 제안 목록 */}
              <div className="py-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => suggestion.action()}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-3 flex items-center gap-3 
                              transition-colors text-left
                              ${selectedIndex === index 
                                ? 'bg-purple-500/20 text-white' 
                                : 'text-white/80 hover:bg-white/5'}`}
                  >
                    <div className="flex-shrink-0">
                      {suggestion.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {suggestion.label}
                      </div>
                      {suggestion.description && (
                        <div className="text-xs text-white/50 mt-0.5">
                          {suggestion.description}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                  </button>
                ))}
              </div>

              {/* 결과 표시 영역 */}
              {commandResult && (
                <div className="border-t border-white/10 p-4 bg-white/5">
                  {commandResult.type === 'success' && (
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-green-400">
                          {commandResult.message}
                        </p>
                        {commandResult.event && (
                          <p className="text-xs text-white/60 mt-1">
                            {commandResult.event.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {commandResult.type === 'answer' && (
                    <div className="text-sm text-white/80 space-y-2">
                      <div className="flex items-center gap-2 text-purple-400 mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="font-medium">AI 답변</span>
                      </div>
                      <p>{commandResult.message}</p>
                    </div>
                  )}
                  
                  {commandResult.type === 'event' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          {commandResult.event.summary}
                        </h4>
                        <div className="flex gap-2">
                          <button className="p-1 hover:bg-white/10 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 hover:bg-white/10 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {commandResult.event.location && (
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          <MapPin className="w-3 h-3" />
                          <span>{commandResult.event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <Clock className="w-3 h-3" />
                        <span>{formatEventTime(commandResult.event)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 팁 표시 */}
              <div className="px-4 py-2 bg-purple-500/10 border-t border-purple-500/20">
                <p className="text-xs text-purple-200">
                  💡 자연어로 입력하세요: "내일 오후 2시 팀 미팅 추가"
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}