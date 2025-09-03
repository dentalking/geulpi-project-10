import { socketClient } from '@/lib/socket';
import type { CalendarEvent, AIMessage, SmartSuggestion, PatternInsight } from '@/types';

export interface SyncOptions {
  debounceMs?: number;
  retryAttempts?: number;
  batchSize?: number;
}

export class RealtimeSync {
  private userId: string | null = null;
  private syncQueue: Map<string, any> = new Map();
  private syncTimer: NodeJS.Timeout | null = null;
  private options: Required<SyncOptions>;

  constructor(options: SyncOptions = {}) {
    this.options = {
      debounceMs: options.debounceMs || 500,
      retryAttempts: options.retryAttempts || 3,
      batchSize: options.batchSize || 10,
    };

    this.setupListeners();
  }

  private setupListeners() {
    // 시스템 이벤트 리스너
    socketClient.on('system:connected', () => {
      this.processSyncQueue();
    });

    socketClient.on('system:error', (error: any) => {
      console.error('Realtime sync error:', error);
    });
  }

  async initialize(userId: string) {
    this.userId = userId;
    
    // Socket 연결 및 인증
    const socket = socketClient.connect();
    if (socket) {
      socketClient.emit('auth', { userId });
    }

    return this;
  }

  // 캘린더 이벤트 동기화
  syncCalendarEvent(event: CalendarEvent, action: 'create' | 'update' | 'delete') {
    if (!this.userId) {
      console.warn('RealtimeSync not initialized with userId');
      return;
    }

    const key = `calendar:${action}:${event.id}`;
    this.syncQueue.set(key, {
      type: `calendar:${action}`,
      data: action === 'delete' ? { eventId: event.id } : { event },
      userId: this.userId,
      timestamp: new Date(),
    });

    this.scheduleSyncFlush();
  }

  // AI 메시지 동기화
  syncAIMessage(message: AIMessage) {
    if (!this.userId) return;

    const key = `ai:message:${message.id}`;
    this.syncQueue.set(key, {
      type: 'ai:message',
      data: { message },
      userId: this.userId,
      timestamp: new Date(),
    });

    this.scheduleSyncFlush();
  }

  // AI 제안 동기화
  syncAISuggestion(suggestions: SmartSuggestion[]) {
    if (!this.userId) return;

    socketClient.emit('ai:suggestion', {
      userId: this.userId,
      suggestion: suggestions,
      timestamp: new Date(),
    });
  }

  // AI 인사이트 동기화
  syncAIInsight(insights: PatternInsight[]) {
    if (!this.userId) return;

    socketClient.emit('ai:insight', {
      userId: this.userId,
      insight: insights,
      timestamp: new Date(),
    });
  }

  // 전체 캘린더 동기화 요청
  async requestFullSync() {
    if (!this.userId) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync timeout'));
      }, 30000);

      socketClient.emit('sync:request', {
        userId: this.userId,
        type: 'full',
      });

      socketClient.on('sync:complete', (result: any) => {
        clearTimeout(timeout);
        resolve(result);
      });
    });
  }

  // 부분 동기화 (특정 날짜 범위)
  async requestPartialSync(startDate: Date, endDate: Date) {
    if (!this.userId) return;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync timeout'));
      }, 15000);

      socketClient.emit('sync:request', {
        userId: this.userId,
        type: 'partial',
        startDate,
        endDate,
      });

      socketClient.on('sync:complete', (result: any) => {
        clearTimeout(timeout);
        resolve(result);
      });
    });
  }

  // 동기화 큐 처리
  private scheduleSyncFlush() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(() => {
      this.processSyncQueue();
    }, this.options.debounceMs);
  }

  private async processSyncQueue() {
    if (this.syncQueue.size === 0) return;

    const batch = Array.from(this.syncQueue.entries()).slice(0, this.options.batchSize);
    
    for (const [key, item] of batch) {
      try {
        await this.sendSyncItem(item);
        this.syncQueue.delete(key);
      } catch (error) {
        console.error(`Failed to sync ${key}:`, error);
        // 재시도 로직 구현
        this.handleSyncError(key, item);
      }
    }

    // 남은 항목이 있으면 계속 처리
    if (this.syncQueue.size > 0) {
      this.scheduleSyncFlush();
    }
  }

  private async sendSyncItem(item: any) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync item timeout'));
      }, 5000);

      const ackEvent = `${item.type}:ack`;
      
      socketClient.on(ackEvent, (ack: any) => {
        clearTimeout(timeout);
        resolve(ack);
      });

      socketClient.emit(item.type, {
        userId: item.userId,
        ...item.data,
      });
    });
  }

  private handleSyncError(key: string, item: any) {
    const retryCount = (item.retryCount || 0) + 1;
    
    if (retryCount <= this.options.retryAttempts) {
      // 재시도 큐에 추가
      this.syncQueue.set(key, {
        ...item,
        retryCount,
      });
      
      // 지수 백오프로 재시도
      setTimeout(() => {
        this.scheduleSyncFlush();
      }, Math.pow(2, retryCount) * 1000);
    } else {
      // 최대 재시도 횟수 초과
      console.error(`Max retries exceeded for ${key}`);
      this.syncQueue.delete(key);
      
      // 오프라인 큐에 저장 (localStorage)
      this.saveToOfflineQueue(key, item);
    }
  }

  private saveToOfflineQueue(key: string, item: any) {
    try {
      const offlineQueue = JSON.parse(
        localStorage.getItem('realtimeSync:offlineQueue') || '[]'
      );
      
      offlineQueue.push({
        key,
        item,
        timestamp: new Date().toISOString(),
      });
      
      // 최대 100개 항목만 유지
      if (offlineQueue.length > 100) {
        offlineQueue.shift();
      }
      
      localStorage.setItem('realtimeSync:offlineQueue', JSON.stringify(offlineQueue));
    } catch (error) {
      console.error('Failed to save to offline queue:', error);
    }
  }

  // 오프라인 큐 처리
  async processOfflineQueue() {
    try {
      const offlineQueue = JSON.parse(
        localStorage.getItem('realtimeSync:offlineQueue') || '[]'
      );
      
      if (offlineQueue.length === 0) return;
      
      for (const { key, item } of offlineQueue) {
        this.syncQueue.set(key, item);
      }
      
      localStorage.removeItem('realtimeSync:offlineQueue');
      this.scheduleSyncFlush();
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }

  // 정리
  dispose() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    this.syncQueue.clear();
    socketClient.disconnect();
  }
}

// 싱글톤 인스턴스
let realtimeSyncInstance: RealtimeSync | null = null;

export function getRealtimeSync(options?: SyncOptions): RealtimeSync {
  if (!realtimeSyncInstance) {
    realtimeSyncInstance = new RealtimeSync(options);
  }
  return realtimeSyncInstance;
}