/**
 * 로그인/대시보드 접속 시 알림 조회 API
 * POST /api/notifications/login
 */

import { NextRequest, NextResponse } from 'next/server';
import SimpleNotificationService from '@/services/notification/SimpleNotificationService';
import { requireAuth } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const user = await requireAuth();

    const body = await req.json();
    const { events = [] } = body;

    // 간단한 알림 서비스 사용
    const notificationService = new SimpleNotificationService();
    const notifications = await notificationService.getLoginNotifications(
      user.id,
      events
    );

    // 캐시 헤더 설정 (5분간 캐싱)
    return NextResponse.json(notifications, {
      headers: {
        'Cache-Control': 'private, max-age=300'
      }
    });
  } catch (error) {
    console.error('Login notifications error:', error);

    // 에러가 나도 빈 객체 반환 (사용자 경험 우선)
    return NextResponse.json({
      brief: null,
      conflicts: [],
      suggestions: [],
      friendUpdates: []
    });
  }
}