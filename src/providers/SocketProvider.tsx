'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { socketClient, useSocket } from '@/lib/socket';
import { useCalendarStore } from '@/store/calendarStore';
import { useAIStore } from '@/store/aiStore';

interface SocketContextValue {
  connected: boolean;
  emit: (event: string, data: any) => void;
  subscribe: (event: string, handler: Function) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const [connected, setConnected] = React.useState(false);
  
  // Store actions
  const { addEvent, updateEvent, deleteEvent, setSchedulingSuggestions } = useCalendarStore();
  const { setSuggestions, setInsights, addMessage } = useAIStore();

  useEffect(() => {
    // 연결 상태 구독
    const unsubConnect = socket.subscribe('system:connected', () => {
      setConnected(true);
      // 연결 시 사용자 인증
      const userId = localStorage.getItem('userId'); // 실제로는 auth에서 가져옴
      if (userId) {
        socket.emit('auth', { userId });
      }
    });

    const unsubDisconnect = socket.subscribe('system:disconnected', () => {
      setConnected(false);
    });

    // 캘린더 이벤트 구독
    const unsubCalendarUpdate = socket.onCalendarUpdate((event) => {
      updateEvent(event.id, event);
    });

    const unsubCalendarCreate = socket.onCalendarCreate((event) => {
      addEvent(event);
    });

    const unsubCalendarDelete = socket.onCalendarDelete((eventId) => {
      deleteEvent(eventId);
    });

    // AI 이벤트 구독
    const unsubAISuggestion = socket.onAISuggestion((suggestion) => {
      setSuggestions(suggestion);
    });

    const unsubAIInsight = socket.onAIInsight((insight) => {
      setInsights(insight);
    });

    // AI 메시지 스트리밍
    const unsubAIMessage = socket.subscribe('ai:message', (message: any) => {
      addMessage(message);
    });

    // 동기화 이벤트 구독
    const unsubSyncComplete = socket.onSyncComplete((result) => {
      if (result.type === 'calendar') {
        // 캘린더 동기화 완료 처리
        console.log('Calendar sync completed:', result);
      }
    });

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubCalendarUpdate();
      unsubCalendarCreate();
      unsubCalendarDelete();
      unsubAISuggestion();
      unsubAIInsight();
      unsubAIMessage();
      unsubSyncComplete();
    };
  }, []);

  const contextValue: SocketContextValue = {
    connected,
    emit: socket.emit,
    subscribe: socket.subscribe,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within SocketProvider');
  }
  return context;
}