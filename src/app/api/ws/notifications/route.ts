/**
 * WebSocket endpoint is deprecated
 * Using Supabase Realtime instead for notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// WebSocket functionality has been replaced by Supabase Realtime

// GET 요청 처리 - WebSocket 대신 Supabase Realtime 사용 안내
export async function GET(request: NextRequest) {
  logger.info('WebSocket endpoint accessed - redirecting to Supabase Realtime');
  return NextResponse.json({
    message: 'WebSocket endpoint is deprecated',
    alternative: 'Use Supabase Realtime for real-time notifications',
    documentation: 'https://supabase.io/docs/guides/realtime'
  });
}

// POST 요청 처리 - Deprecated
export async function POST(request: NextRequest) {
  logger.info('WebSocket POST endpoint accessed - deprecated');
  return NextResponse.json(
    {
      error: 'WebSocket endpoint is deprecated',
      message: 'Use Supabase Realtime for real-time notifications'
    },
    { status: 501 }
  );
}

// OPTIONS 요청 처리 - Deprecated
export async function OPTIONS(request: NextRequest) {
  logger.info('WebSocket OPTIONS endpoint accessed - deprecated');
  return NextResponse.json({
    status: 'Deprecated',
    message: 'WebSocket functionality has been replaced by Supabase Realtime',
    documentation: 'https://supabase.io/docs/guides/realtime'
  });
}