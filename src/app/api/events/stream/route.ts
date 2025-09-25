/**
 * Server-Sent Events API for real-time event streaming
 * Vercel Edge Runtime compatible
 */

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/db';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { logger } from '@/lib/logger';

// Using Node.js runtime for jsonwebtoken compatibility
// export const runtime = 'edge';

// SSE 헤더 설정
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type'
};

interface StreamClient {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
}

// Edge Runtime에서는 전역 변수 사용 제한
// 대신 WeakMap 사용으로 메모리 누수 방지
const clients = new Map<string, StreamClient>();

// 정리 작업을 위한 타이머
let cleanupInterval: NodeJS.Timeout | null = null;

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get('authorization');
    const authToken = authHeader?.replace('Bearer ', '') ||
                     request.cookies.get('auth-token')?.value;

    if (!authToken) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await verifyToken(authToken);
    if (!user) {
      return new Response('Invalid token', { status: 401 });
    }

    const userId = user.id;
    const clientId = `${userId}-${Date.now()}`;

    logger.info('[SSE] New client connected:', { userId, clientId });

    // ReadableStream 생성
    const stream = new ReadableStream({
      start(controller) {
        // 클라이언트 등록
        const client: StreamClient = {
          id: clientId,
          userId,
          controller,
          lastPing: Date.now()
        };
        clients.set(clientId, client);

        // 초기 연결 확인 메시지
        sendSSE(controller, 'connected', {
          clientId,
          timestamp: new Date().toISOString(),
          message: 'SSE connection established'
        });

        // 주기적 ping (30초마다)
        const pingInterval = setInterval(() => {
          try {
            if (clients.has(clientId)) {
              const client = clients.get(clientId)!;
              client.lastPing = Date.now();
              sendSSE(controller, 'ping', { timestamp: new Date().toISOString() });
            } else {
              clearInterval(pingInterval);
            }
          } catch (error) {
            logger.error('[SSE] Ping failed:', error);
            clearInterval(pingInterval);
            clients.delete(clientId);
          }
        }, 30000);

        // 클라이언트 정리 함수
        const cleanup = () => {
          clearInterval(pingInterval);
          clients.delete(clientId);
          logger.info('[SSE] Client disconnected:', { userId, clientId });
        };

        // 연결 종료 시 정리
        request.signal.addEventListener('abort', cleanup);

        // 정리 타이머 시작 (5분마다 비활성 클라이언트 정리)
        if (!cleanupInterval) {
          cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [id, client] of clients.entries()) {
              // 2분 이상 비활성 클라이언트 제거
              if (now - client.lastPing > 2 * 60 * 1000) {
                try {
                  client.controller.close();
                } catch (e) {
                  // 이미 닫힌 연결
                }
                clients.delete(id);
                logger.info('[SSE] Removed inactive client', { clientId: id });
              }
            }

            // 클라이언트가 없으면 정리 타이머 중지
            if (clients.size === 0 && cleanupInterval) {
              clearInterval(cleanupInterval);
              cleanupInterval = null;
            }
          }, 5 * 60 * 1000);
        }
      },

      cancel() {
        clients.delete(clientId);
        logger.info('[SSE] Stream cancelled:', { userId, clientId });
      }
    });

    return new Response(stream, {
      headers: SSE_HEADERS
    });

  } catch (error) {
    logger.error('[SSE] Connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// SSE 메시지 전송 헬퍼
function sendSSE(
  controller: ReadableStreamDefaultController,
  event: string,
  data: any
) {
  try {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
  } catch (error) {
    logger.error('[SSE] Failed to send message:', error);
    throw error;
  }
}

// 모든 클라이언트에게 이벤트 브로드캐스트
function broadcastToClients(event: string, data: any, targetUserId?: string) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encodedMessage = new TextEncoder().encode(message);

  for (const [clientId, client] of clients.entries()) {
    // 특정 사용자에게만 보내거나 모든 사용자에게 보내기
    if (!targetUserId || client.userId === targetUserId) {
      try {
        client.controller.enqueue(encodedMessage);
        client.lastPing = Date.now();
      } catch (error) {
        logger.error('[SSE] Failed to broadcast to client:', clientId, error);
        // 실패한 클라이언트 제거
        clients.delete(clientId);
      }
    }
  }
}

// 특정 사용자에게 이벤트 전송
export function sendToUser(userId: string, event: string, data: any) {
  broadcastToClients(event, data, userId);
}

// 클라이언트 수 조회 (모니터링용)
export function getClientCount(userId?: string): number {
  if (userId) {
    return Array.from(clients.values()).filter(c => c.userId === userId).length;
  }
  return clients.size;
}