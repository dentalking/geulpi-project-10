import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { WebSocketServer } from 'ws';
import WebSocketManager from '@/lib/websocket/WebSocketManager';

// Global WebSocket manager instance
let wsManager: WebSocketManager;
let wss: WebSocketServer;

if (!global.wsManager) {
  global.wsManager = new WebSocketManager();
  wsManager = global.wsManager;
} else {
  wsManager = global.wsManager;
}

// WebSocket 서버 초기화 (개발 환경에서만)
if (env.isDevelopment() && !global.wss) {
  wss = new WebSocketServer({ port: 8080 });
  global.wss = wss;

  wss.on('connection', (socket, request) => {
    wsManager.handleConnection(socket, request);
  });

  logger.debug('[WebSocket] Server started on port 8080');
} else if (global.wss) {
  wss = global.wss;
}

// GET 요청 처리 (WebSocket 업그레이드용)
export async function GET(request: NextRequest) {
  // 개발 환경에서는 별도 포트(8080) 사용 안내
  if (env.isDevelopment()) {
    return new Response(
      JSON.stringify({
        message: 'WebSocket server is running on port 8080',
        endpoint: 'ws://localhost:8080',
        usage: 'Connect with authentication token as query parameter: ws://localhost:8080?token=YOUR_JWT_TOKEN'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Production 환경에서는 다른 WebSocket 서비스 사용 권장
  return new Response(
    JSON.stringify({
      error: 'WebSocket not available in this environment',
      message: 'Use a dedicated WebSocket service like Pusher or Socket.IO for production'
    }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// POST 요청 처리 (알림 전송용)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, notification } = body;

    if (!userId || !notification) {
      return new Response(
        JSON.stringify({ error: 'userId and notification are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 알림 전송
    const sent = await wsManager.sendNotificationToUser(userId, {
      id: `notification_${Date.now()}`,
      ...notification,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        message: sent ? 'Notification sent successfully' : 'User not connected'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    logger.error('[WebSocket API] Send notification error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send notification' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// WebSocket 연결 상태 조회
export async function OPTIONS(request: NextRequest) {
  const stats = wsManager.getConnectionStats();

  return new Response(
    JSON.stringify({
      status: 'WebSocket manager active',
      stats,
      environment: env.get('NODE_ENV'),
      endpoint: env.isDevelopment() ? 'ws://localhost:8080' : null
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// 전역 변수 타입 선언
declare global {
  var wsManager: WebSocketManager;
  var wss: WebSocketServer;
}