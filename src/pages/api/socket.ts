import { NextApiRequest } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { NextApiResponseServerIO } from '@/lib/socket';

const handler = async (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...');

    const io = new SocketIOServer(res.socket.server as any, {
      path: '/api/socket',
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
      // 실시간 기능을 위한 설정
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // 연결 이벤트 처리
    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // 사용자 인증 및 룸 조인
      socket.on('auth', async (data) => {
        const { userId } = data;
        if (userId) {
          // 사용자별 룸에 조인
          socket.join(`user:${userId}`);
          console.log(`User ${userId} joined room`);
          
          socket.emit('auth:success', { 
            userId, 
            socketId: socket.id,
            timestamp: new Date() 
          });
        }
      });

      // 캘린더 이벤트 처리
      socket.on('calendar:update', async (data) => {
        const { userId, event } = data;
        // 같은 사용자의 다른 세션에 브로드캐스트
        socket.to(`user:${userId}`).emit('calendar:update', event);
        
        // 업데이트 확인
        socket.emit('calendar:update:ack', { 
          eventId: event.id, 
          timestamp: new Date() 
        });
      });

      socket.on('calendar:create', async (data) => {
        const { userId, event } = data;
        socket.to(`user:${userId}`).emit('calendar:create', event);
        socket.emit('calendar:create:ack', { 
          eventId: event.id, 
          timestamp: new Date() 
        });
      });

      socket.on('calendar:delete', async (data) => {
        const { userId, eventId } = data;
        socket.to(`user:${userId}`).emit('calendar:delete', eventId);
        socket.emit('calendar:delete:ack', { 
          eventId, 
          timestamp: new Date() 
        });
      });

      // AI 관련 이벤트 처리
      socket.on('ai:request', async (data) => {
        const { userId, request } = data;
        
        // AI 처리 시작 알림
        socket.emit('ai:processing', { 
          requestId: request.id,
          timestamp: new Date() 
        });

        // 실제 AI 처리는 별도 서비스에서 수행
        // 여기서는 이벤트 전달만 담당
        io.to(`user:${userId}`).emit('ai:request', request);
      });

      socket.on('ai:suggestion', async (data) => {
        const { userId, suggestion } = data;
        io.to(`user:${userId}`).emit('ai:suggestion', suggestion);
      });

      socket.on('ai:insight', async (data) => {
        const { userId, insight } = data;
        io.to(`user:${userId}`).emit('ai:insight', insight);
      });

      // 동기화 이벤트 처리
      socket.on('sync:request', async (data) => {
        const { userId, type } = data;
        
        socket.emit('sync:start', { 
          type, 
          timestamp: new Date() 
        });

        // 동기화 처리 (여기서는 이벤트만 전달)
        io.to(`user:${userId}`).emit('sync:request', { type });
      });

      socket.on('sync:complete', async (data) => {
        const { userId, result } = data;
        io.to(`user:${userId}`).emit('sync:complete', result);
      });

      // 연결 해제 처리
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });

      // 에러 처리
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
};

export default handler;