import { Server as NetServer, Socket } from 'net';
import { NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io: SocketIOServer;
    };
  };
};

export type SocketEvent = {
  type: 'calendar:update' | 'calendar:create' | 'calendar:delete' | 
        'ai:suggestion' | 'ai:insight' | 'sync:start' | 'sync:complete';
  payload: any;
  userId?: string;
  timestamp: Date;
};

class SocketClient {
  private socket: ClientSocket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    const socketPath = process.env.NEXT_PUBLIC_SOCKET_PATH || '/api/socket';
    
    this.socket = ClientIO({
      path: socketPath,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.emit('system:connected', { timestamp: new Date() });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.emit('system:disconnected', { timestamp: new Date() });
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('system:error', { error, timestamp: new Date() });
    });

    // 일반 이벤트 리스너
    this.socket.on('event', (event: SocketEvent) => {
      this.handleEvent(event);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(handler);

    // Socket.io 이벤트도 등록
    if (this.socket) {
      this.socket.on(event, handler as any);
    }
  }

  off(event: string, handler: Function) {
    this.listeners.get(event)?.delete(handler);
    
    if (this.socket) {
      this.socket.off(event, handler as any);
    }
  }

  emit(event: string, data: any) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, queuing event:', event);
      return;
    }
    this.socket.emit(event, data);
  }

  private handleEvent(event: SocketEvent) {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }

  // 캘린더 이벤트 전용 메서드
  onCalendarUpdate(handler: (event: any) => void) {
    this.on('calendar:update', handler);
    return () => this.off('calendar:update', handler);
  }

  onCalendarCreate(handler: (event: any) => void) {
    this.on('calendar:create', handler);
    return () => this.off('calendar:create', handler);
  }

  onCalendarDelete(handler: (id: string) => void) {
    this.on('calendar:delete', handler);
    return () => this.off('calendar:delete', handler);
  }

  // AI 이벤트 전용 메서드
  onAISuggestion(handler: (suggestion: any) => void) {
    this.on('ai:suggestion', handler);
    return () => this.off('ai:suggestion', handler);
  }

  onAIInsight(handler: (insight: any) => void) {
    this.on('ai:insight', handler);
    return () => this.off('ai:insight', handler);
  }

  // 동기화 이벤트 전용 메서드
  onSyncStart(handler: () => void) {
    this.on('sync:start', handler);
    return () => this.off('sync:start', handler);
  }

  onSyncComplete(handler: (result: any) => void) {
    this.on('sync:complete', handler);
    return () => this.off('sync:complete', handler);
  }
}

// 싱글톤 인스턴스
export const socketClient = new SocketClient();

// React Hook for Socket.io
import { useEffect, useCallback } from 'react';

export function useSocket() {
  useEffect(() => {
    const socket = socketClient.connect();
    
    return () => {
      // 컴포넌트 언마운트 시 연결 유지 (앱 전체에서 사용)
      // socketClient.disconnect();
    };
  }, []);

  const subscribe = useCallback((event: string, handler: Function) => {
    socketClient.on(event, handler);
    
    return () => {
      socketClient.off(event, handler);
    };
  }, []);

  const emit = useCallback((event: string, data: any) => {
    socketClient.emit(event, data);
  }, []);

  return {
    subscribe,
    emit,
    onCalendarUpdate: socketClient.onCalendarUpdate.bind(socketClient),
    onCalendarCreate: socketClient.onCalendarCreate.bind(socketClient),
    onCalendarDelete: socketClient.onCalendarDelete.bind(socketClient),
    onAISuggestion: socketClient.onAISuggestion.bind(socketClient),
    onAIInsight: socketClient.onAIInsight.bind(socketClient),
    onSyncStart: socketClient.onSyncStart.bind(socketClient),
    onSyncComplete: socketClient.onSyncComplete.bind(socketClient),
  };
}