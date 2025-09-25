import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { supabase } from '@/lib/db';

// Cache for 60 seconds to reduce DB load
export const revalidate = 60;

export async function GET() {
  const startTime = Date.now();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.get('NODE_ENV') || 'development',
    services: {
      api: 'operational',
      database: 'checking...',
      authentication: 'checking...',
    },
    responseTime: 0
  };
  
  // Database 연결 체크
  try {
    const dbStart = Date.now();
    const { error } = await supabase
      .from('chat_sessions')
      .select('count')
      .limit(1)
      .single();
    
    const dbTime = Date.now() - dbStart;
    
    if (error) {
      // count가 없어도 연결은 됨
      if (error.code === 'PGRST116') {
        health.services.database = 'operational';
      } else {
        health.services.database = 'degraded';
        health.status = 'degraded';
      }
    } else {
      health.services.database = 'operational';
    }
    
    // DB 응답 시간 추가
    health.services = {
      ...health.services,
      database: `${health.services.database} (${dbTime}ms)`
    };
  } catch (error) {
    health.services.database = 'down';
    health.status = 'unhealthy';
    logger.error('Health check - Database error:', error);
  }
  
  // Authentication 서비스 체크 (Google OAuth)
  try {
    // 간단히 환경 변수 존재 여부만 체크
    if (env.get('GOOGLE_CLIENT_ID') && env.get('GOOGLE_CLIENT_SECRET')) {
      health.services.authentication = 'operational';
    } else {
      health.services.authentication = 'misconfigured';
      health.status = health.status === 'healthy' ? 'degraded' : health.status;
    }
  } catch (error) {
    health.services.authentication = 'error';
    logger.error('Health check - Auth check error:', error);
  }
  
  // 전체 응답 시간
  health.responseTime = Date.now() - startTime;
  
  // 상태 코드 결정
  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;
  
  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300'
    }
  });
}