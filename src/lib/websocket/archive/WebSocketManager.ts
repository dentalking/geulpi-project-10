import { WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

interface WebSocketConnection {
  id: string;
  userId: string;
  socket: WebSocket;
  platform: 'web' | 'mobile';
  lastActivity: Date;
  isAlive: boolean;
}

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  priority: number;
  timestamp: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

class WebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> Set<connectionId>
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 5분마다 비활성 연결 정리
    setInterval(() => {
      this.cleanupInactiveConnections();
    }, 5 * 60 * 1000);

    // 30초마다 ping 전송
    setInterval(() => {
      this.sendPingToAll();
    }, 30 * 1000);
  }

  /**
   * 새로운 WebSocket 연결 처리
   */
  async handleConnection(socket: WebSocket, request: any) {
    try {
      // URL에서 토큰 추출
      const url = new URL(request.url!, 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        socket.close(1008, 'Authentication required');
        return;
      }

      // 토큰 검증
      const userId = await this.verifyToken(token);
      if (!userId) {
        socket.close(1008, 'Invalid token');
        return;
      }

      // 연결 등록
      const connectionId = this.generateConnectionId();
      const connection: WebSocketConnection = {
        id: connectionId,
        userId,
        socket,
        platform: 'web',
        lastActivity: new Date(),
        isAlive: true
      };

      this.connections.set(connectionId, connection);

      // 사용자별 연결 맵 업데이트
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);

      // 이벤트 리스너 설정
      this.setupSocketEventListeners(connection);

      // 연결 확인 메시지 전송
      this.sendToConnection(connectionId, {
        id: this.generateMessageId(),
        type: 'connection_established',
        title: '연결됨',
        message: '실시간 알림이 활성화되었습니다.',
        data: { connectionId, userId },
        priority: 1,
        timestamp: new Date().toISOString()
      });

      // 데이터베이스에 세션 기록
      await this.createSession(userId, connectionId);

      console.log(`[WebSocket] User ${userId} connected (${connectionId})`);

    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      socket.close(1011, 'Internal server error');
    }
  }

  /**
   * 소켓 이벤트 리스너 설정
   */
  private setupSocketEventListeners(connection: WebSocketConnection) {
    const { socket, id: connectionId, userId } = connection;

    // 메시지 수신
    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleClientMessage(connectionId, message);
        this.updateLastActivity(connectionId);
      } catch (error) {
        console.error('[WebSocket] Message parsing error:', error);
      }
    });

    // Pong 응답 (연결 상태 확인)
    socket.on('pong', () => {
      connection.isAlive = true;
      this.updateLastActivity(connectionId);
    });

    // 연결 종료
    socket.on('close', async () => {
      await this.handleDisconnection(connectionId);
    });

    // 오류 처리
    socket.on('error', (error) => {
      console.error(`[WebSocket] Socket error for ${connectionId}:`, error);
    });
  }

  /**
   * 클라이언트 메시지 처리
   */
  private async handleClientMessage(connectionId: string, message: any) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    switch (message.type) {
      case 'ping':
        this.sendToConnection(connectionId, {
          id: this.generateMessageId(),
          type: 'pong',
          title: '',
          message: '',
          data: {},
          priority: 1,
          timestamp: new Date().toISOString()
        });
        break;

      case 'mark_notification_read':
        await this.markNotificationAsRead(connection.userId, message.notificationId);
        break;

      case 'subscribe_to_meeting':
        await this.subscribeToMeeting(connectionId, message.meetingId);
        break;

      case 'unsubscribe_from_meeting':
        await this.unsubscribeFromMeeting(connectionId, message.meetingId);
        break;

      default:
        console.warn(`[WebSocket] Unknown message type: ${message.type}`);
    }
  }

  /**
   * 연결 해제 처리
   */
  private async handleDisconnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { userId } = connection;

    // 연결 맵에서 제거
    this.connections.delete(connectionId);

    // 사용자별 연결 맵 업데이트
    const userConnections = this.userConnections.get(userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // 데이터베이스 세션 업데이트
    await this.endSession(connectionId);

    console.log(`[WebSocket] User ${userId} disconnected (${connectionId})`);
  }

  /**
   * 특정 사용자에게 알림 전송
   */
  async sendNotificationToUser(userId: string, notification: NotificationPayload) {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      console.log(`[WebSocket] No active connections for user ${userId}`);
      return false;
    }

    let sentCount = 0;
    for (const connectionId of userConnections) {
      if (this.sendToConnection(connectionId, notification)) {
        sentCount++;
      }
    }

    console.log(`[WebSocket] Sent notification to ${sentCount}/${userConnections.size} connections for user ${userId}`);
    return sentCount > 0;
  }

  /**
   * 특정 연결에 메시지 전송
   */
  private sendToConnection(connectionId: string, payload: NotificationPayload): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      connection.socket.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error(`[WebSocket] Send error for ${connectionId}:`, error);
      this.handleDisconnection(connectionId);
      return false;
    }
  }

  /**
   * 모든 연결에 ping 전송
   */
  private sendPingToAll() {
    for (const [connectionId, connection] of this.connections) {
      if (connection.socket.readyState === WebSocket.OPEN) {
        connection.isAlive = false;
        connection.socket.ping();
      }
    }
  }

  /**
   * 비활성 연결 정리
   */
  private cleanupInactiveConnections() {
    const now = new Date();
    const inactiveConnections: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      // 10분 이상 비활성이거나 ping에 응답하지 않는 연결
      const inactiveTime = now.getTime() - connection.lastActivity.getTime();
      if (inactiveTime > 10 * 60 * 1000 || !connection.isAlive) {
        inactiveConnections.push(connectionId);
      }
    }

    for (const connectionId of inactiveConnections) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.socket.terminate();
        this.handleDisconnection(connectionId);
      }
    }

    if (inactiveConnections.length > 0) {
      console.log(`[WebSocket] Cleaned up ${inactiveConnections.length} inactive connections`);
    }
  }

  /**
   * 토큰 검증
   */
  private async verifyToken(token: string): Promise<string | null> {
    try {
      // Supabase JWT 토큰 검증
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        return null;
      }

      return user.id;
    } catch (error) {
      console.error('[WebSocket] Token verification error:', error);
      return null;
    }
  }

  /**
   * 마지막 활동 시간 업데이트
   */
  private updateLastActivity(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * 데이터베이스에 세션 생성
   */
  private async createSession(userId: string, connectionId: string) {
    try {
      await this.supabase
        .from('realtime_sessions')
        .insert({
          user_id: userId,
          session_type: 'web',
          session_id: connectionId,
          platform_data: { userAgent: 'WebSocket' },
          is_active: true
        });
    } catch (error) {
      console.error('[WebSocket] Session creation error:', error);
    }
  }

  /**
   * 세션 종료
   */
  private async endSession(connectionId: string) {
    try {
      await this.supabase
        .from('realtime_sessions')
        .update({
          is_active: false,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', connectionId);
    } catch (error) {
      console.error('[WebSocket] Session end error:', error);
    }
  }

  /**
   * 알림을 읽음 처리
   */
  private async markNotificationAsRead(userId: string, notificationId: string) {
    try {
      await this.supabase
        .from('notification_queue')
        .update({
          status: 'read',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('recipient_id', userId);
    } catch (error) {
      console.error('[WebSocket] Mark notification read error:', error);
    }
  }

  /**
   * 미팅 구독
   */
  private async subscribeToMeeting(connectionId: string, meetingId: string) {
    // 실제 구현에서는 Redis나 메모리에 구독 정보 저장
    console.log(`[WebSocket] ${connectionId} subscribed to meeting ${meetingId}`);
  }

  /**
   * 미팅 구독 해제
   */
  private async unsubscribeFromMeeting(connectionId: string, meetingId: string) {
    console.log(`[WebSocket] ${connectionId} unsubscribed from meeting ${meetingId}`);
  }

  /**
   * 연결 ID 생성
   */
  private generateConnectionId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 메시지 ID 생성
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 연결 통계 조회
   */
  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      activeUsers: this.userConnections.size,
      connectionsPerUser: Array.from(this.userConnections.values()).map(s => s.size)
    };
  }

  /**
   * 특정 사용자의 온라인 상태 확인
   */
  isUserOnline(userId: string): boolean {
    return this.userConnections.has(userId);
  }

  /**
   * 전체 연결 종료 (서버 종료 시)
   */
  async shutdown() {
    console.log('[WebSocket] Shutting down WebSocket manager...');

    for (const [connectionId, connection] of this.connections) {
      connection.socket.close(1001, 'Server shutting down');
      await this.endSession(connectionId);
    }

    this.connections.clear();
    this.userConnections.clear();
  }
}

export default WebSocketManager;