import { ChatSession, AIMessage } from '@/types';

// Supabase API 기반 채팅 스토리지
export class ChatStorage {
  private static ACTIVE_CHAT_KEY = 'geulpi_active_chat'; // 활성 세션 ID만 localStorage에 저장

  /**
   * 모든 채팅 세션 목록 가져오기
   */
  static async getAllSessions(userId?: string): Promise<ChatSession[]> {
    try {
      const params = new URLSearchParams();
      if (userId) params.set('userId', userId);
      params.set('limit', '100'); // 최대 100개 세션

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/chat/sessions?${params}`);
      const result = await response.json();

      if (!result.success) {
        console.error('Failed to fetch sessions:', result.error);
        return [];
      }

      // Date 문자열을 Date 객체로 변환
      const sessions = (result.data || []).map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages?.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })) || []
      }));

      return sessions;
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      return [];
    }
  }

  /**
   * 특정 채팅 세션 가져오기
   */
  static async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      console.log('ChatStorage getSession called with ID:', sessionId);
      
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/chat/sessions?sessionId=${sessionId}`);
      const result = await response.json();
      
      if (!result.success) {
        console.error('Failed to fetch session:', result.error);
        return null;
      }
      
      if (!result.data) {
        console.log('Session not found:', sessionId);
        return null;
      }
      
      // Date 문자열을 Date 객체로 변환
      const session = {
        ...result.data,
        createdAt: new Date(result.data.createdAt),
        updatedAt: new Date(result.data.updatedAt),
        messages: result.data.messages?.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })) || []
      };
      
      console.log('Found specific session:', session);
      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * 새로운 채팅 세션 생성
   */
  static async createSession(title: string = '새 채팅', userId?: string): Promise<ChatSession | null> {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/chat/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          userId,
          metadata: {
            totalMessages: 0,
            lastActivity: new Date().toISOString(),
            tags: []
          }
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error('Failed to create session:', result.error);
        return null;
      }

      // Date 문자열을 Date 객체로 변환
      if (result.data) {
        return {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
          messages: result.data.messages?.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })) || []
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  }

  /**
   * 채팅 세션에 메시지 추가
   */
  static async addMessage(sessionId: string, message: AIMessage): Promise<ChatSession | null> {
    try {
      // 1. 메시지를 데이터베이스에 추가
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const messageResponse = await fetch(`${baseUrl}/api/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          role: message.role,
          content: message.content,
          messageType: message.type || 'text',
          data: message.data || {},
          metadata: message.metadata || {}
        }),
      });

      const messageResult = await messageResponse.json();

      if (!messageResult.success) {
        console.error('Failed to add message:', messageResult.error);
        return null;
      }

      // 2. 세션 제목 업데이트 (첫 번째 사용자 메시지인 경우)
      const session = await this.getSession(sessionId);
      if (session && session.title === '새 채팅' && message.role === 'user') {
        const newTitle = this.generateTitle(message.content);
        await this.updateSession(sessionId, { title: newTitle });
      }

      // 3. 업데이트된 세션 반환
      return await this.getSession(sessionId);
    } catch (error) {
      console.error('Failed to add message:', error);
      return null;
    }
  }

  /**
   * 채팅 세션 업데이트
   */
  static async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | null> {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/chat/sessions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          ...updates
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error('Failed to update session:', result.error);
        return null;
      }

      // Date 문자열을 Date 객체로 변환
      if (result.data) {
        return {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
          messages: result.data.messages?.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })) || []
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to update session:', error);
      return null;
    }
  }

  /**
   * 채팅 세션 삭제
   */
  static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/chat/sessions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error('Failed to delete session:', result.error);
        return false;
      }

      // 활성 채팅이 삭제된 경우 클리어
      if (this.getActiveSessionId() === sessionId) {
        this.clearActiveSession();
      }

      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  /**
   * 활성 채팅 세션 ID 가져오기
   */
  static getActiveSessionId(): string | null {
    try {
      return localStorage.getItem(this.ACTIVE_CHAT_KEY);
    } catch (error) {
      return null;
    }
  }

  /**
   * 활성 채팅 세션 설정
   */
  static async setActiveSession(sessionId: string): Promise<void> {
    try {
      localStorage.setItem(this.ACTIVE_CHAT_KEY, sessionId);
      
      // TODO: 데이터베이스의 isActive 플래그도 업데이트할 수 있지만, 
      // 현재는 클라이언트 측에서만 관리
    } catch (error) {
      console.error('Failed to set active session:', error);
    }
  }

  /**
   * 활성 채팅 세션 클리어
   */
  static clearActiveSession(): void {
    try {
      localStorage.removeItem(this.ACTIVE_CHAT_KEY);
    } catch (error) {
      console.error('Failed to clear active session:', error);
    }
  }

  /**
   * 최근 채팅 세션들 가져오기 (제한된 수)
   */
  static async getRecentSessions(limit: number = 10): Promise<ChatSession[]> {
    try {
      const sessions = await this.getAllSessions();
      return sessions
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get recent sessions:', error);
      return [];
    }
  }

  /**
   * 모든 채팅 데이터 초기화 (개발용)
   */
  static async clearAll(): Promise<void> {
    try {
      // localStorage에서 활성 세션 정보 삭제
      localStorage.removeItem(this.ACTIVE_CHAT_KEY);
      
      // 데이터베이스에서 모든 세션 삭제 (개발용 - 프로덕션에서는 사용 금지)
      console.warn('clearAll() is for development only - removes all chat data');
    } catch (error) {
      console.error('Failed to clear chat data:', error);
    }
  }

  // Private helper methods
  
  private static generateTitle(content: string): string {
    // 첫 번째 메시지의 처음 30자로 제목 생성
    const title = content.trim().slice(0, 30);
    return title.length < content.length ? `${title}...` : title;
  }
}

// 편의를 위한 단축 함수들 (Supabase API 기반)
export const chatStorage = {
  getAllSessions: (userId?: string) => ChatStorage.getAllSessions(userId),
  getSession: (id: string) => ChatStorage.getSession(id),
  createSession: (title?: string, userId?: string) => ChatStorage.createSession(title, userId),
  addMessage: (sessionId: string, message: AIMessage) => ChatStorage.addMessage(sessionId, message),
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => ChatStorage.updateSession(sessionId, updates),
  deleteSession: (sessionId: string) => ChatStorage.deleteSession(sessionId),
  getActiveSessionId: () => ChatStorage.getActiveSessionId(), // 이것만 동기
  setActiveSession: (sessionId: string) => ChatStorage.setActiveSession(sessionId),
  clearActiveSession: () => ChatStorage.clearActiveSession(), // 이것만 동기
  getRecentSessions: (limit?: number) => ChatStorage.getRecentSessions(limit),
  clearAll: () => ChatStorage.clearAll()
};