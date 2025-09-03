'use client';

import { useState, useEffect } from 'react';
import { useCalendarStore } from '@/store/calendarStore';
import { useAIStore } from '@/store/aiStore';
import { useSocketContext } from '@/providers/SocketProvider';
import type { CalendarEvent } from '@/types';

export default function DemoPage() {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Store hooks
  const { 
    events, 
    currentView, 
    addEvent, 
    deleteEvent,
    setCurrentView,
    navigateToday,
    navigatePrevious,
    navigateNext,
    currentDate
  } = useCalendarStore();
  
  const { 
    messages, 
    suggestions,
    addMessage,
    setTyping,
    isTyping
  } = useAIStore();
  
  // Socket context
  const { connected, emit } = useSocketContext();

  // 데모 이벤트 추가
  useEffect(() => {
    // 초기 데모 이벤트 추가
    if (events.length === 0) {
      const demoEvents: CalendarEvent[] = [
        {
          id: 'demo-1',
          summary: '팀 미팅',
          start: { dateTime: new Date().toISOString() },
          end: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
          description: '주간 팀 미팅'
        },
        {
          id: 'demo-2',
          summary: '점심 약속',
          start: { dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
          end: { dateTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() },
          location: '강남역'
        },
        {
          id: 'demo-3',
          summary: '프로젝트 리뷰',
          start: { dateTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() },
          end: { dateTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() },
          description: '분기별 프로젝트 리뷰'
        }
      ];
      
      demoEvents.forEach(event => addEvent(event));
    }
  }, []);

  // AI 메시지 처리
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    setTyping(true);
    
    // 사용자 메시지 추가
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: inputText,
      timestamp: new Date(),
      type: 'text' as const
    };
    addMessage(userMessage);
    
    // AI 응답 시뮬레이션
    setTimeout(() => {
      const aiResponse = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant' as const,
        content: `"${inputText}"에 대한 AI 응답입니다. 일정을 분석하고 처리 중입니다...`,
        timestamp: new Date(),
        type: 'text' as const
      };
      addMessage(aiResponse);
      setTyping(false);
      setIsProcessing(false);
      
      // 실시간 이벤트 전송 (Socket.io 테스트)
      if (connected) {
        emit('ai:message', { message: aiResponse });
      }
    }, 1500);
    
    setInputText('');
  };

  // 이벤트 추가
  const handleAddEvent = () => {
    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      summary: '새로운 일정',
      start: { dateTime: new Date().toISOString() },
      end: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
      description: '테스트 일정입니다'
    };
    
    addEvent(newEvent);
    
    // Socket.io로 실시간 동기화
    if (connected) {
      emit('calendar:create', { event: newEvent });
    }
  };

  // 날짜 포맷
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              AI Calendar Demo
            </h1>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm ${
                connected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {connected ? '🟢 연결됨' : '🔴 연결 끊김'}
              </span>
              <button
                onClick={() => window.location.href = '/'}
                className="text-gray-600 hover:text-gray-900"
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 캘린더 뷰 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">캘린더</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={navigatePrevious}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  ◀
                </button>
                <button
                  onClick={navigateToday}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  오늘
                </button>
                <button
                  onClick={navigateNext}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  ▶
                </button>
              </div>
            </div>
            
            {/* 현재 날짜 표시 */}
            <div className="mb-4 text-center text-lg font-medium">
              {formatDate(currentDate)}
            </div>

            {/* 뷰 선택 */}
            <div className="flex gap-2 mb-6">
              {(['month', 'week', 'day'] as const).map(view => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`px-4 py-2 rounded ${
                    currentView === view
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {view === 'month' ? '월' : view === 'week' ? '주' : '일'}
                </button>
              ))}
            </div>

            {/* 이벤트 목록 */}
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">오늘의 일정</h3>
                <button
                  onClick={handleAddEvent}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                >
                  + 일정 추가
                </button>
              </div>
              
              {events.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  일정이 없습니다
                </p>
              ) : (
                events.map(event => (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {event.summary}
                        </h4>
                        {event.start?.dateTime && (
                          <p className="text-sm text-gray-600 mt-1">
                            {formatTime(event.start.dateTime)}
                            {event.end?.dateTime && ` - ${formatTime(event.end.dateTime)}`}
                          </p>
                        )}
                        {event.location && (
                          <p className="text-sm text-gray-600 mt-1">
                            📍 {event.location}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-sm text-gray-500 mt-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => event.id && deleteEvent(event.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI 채팅 인터페이스 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6">AI 어시스턴트</h2>
            
            {/* 제안 */}
            {suggestions.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  AI 제안
                </p>
                {suggestions.map(suggestion => (
                  <div key={suggestion.id} className="text-sm text-blue-700">
                    {suggestion.title}
                  </div>
                ))}
              </div>
            )}

            {/* 메시지 목록 */}
            <div className="h-96 overflow-y-auto mb-4 space-y-3 border rounded-lg p-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>AI 어시스턴트와 대화를 시작하세요</p>
                  <p className="text-sm mt-2">
                    예: "내일 오후 2시에 미팅 추가해줘"
                  </p>
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-100 ml-auto max-w-[80%]'
                        : 'bg-gray-100 mr-auto max-w-[80%]'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString('ko-KR')}
                    </p>
                  </div>
                ))
              )}
              
              {isTyping && (
                <div className="bg-gray-100 p-3 rounded-lg mr-auto max-w-[80%]">
                  <p className="text-sm text-gray-600">입력 중...</p>
                </div>
              )}
            </div>

            {/* 입력 필드 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              />
              <button
                onClick={handleSendMessage}
                disabled={isProcessing || !inputText.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}