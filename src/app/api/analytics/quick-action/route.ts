import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceRoleSupabase } from '@/lib/supabase-server';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { logger } from '@/lib/logger';

interface QuickActionLog {
  suggestionText: string;
  suggestionCategory?: string;
  suggestionPosition?: number;
  actionType: 'clicked' | 'ignored' | 'displayed';
  responseTimeMs?: number;
  context?: {
    timeOfDay?: string;
    eventCount?: number;
    lastAIResponse?: string;
    locale?: string;
  };
  deviceInfo?: {
    deviceType?: string;
    browser?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceRoleSupabase();
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const sessionId = cookieStore.get('session-id')?.value || 'anonymous';

    // 사용자 인증 확인
    let userId: string | null = null;
    if (authToken) {
      try {
        const user = await verifyToken(authToken);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        logger.warn('Failed to verify auth token for analytics', error);
      }
    }

    const body: QuickActionLog = await request.json();
    const {
      suggestionText,
      suggestionCategory,
      suggestionPosition,
      actionType,
      responseTimeMs,
      context = {},
      deviceInfo = {}
    } = body;

    // 필수 필드 검증
    if (!suggestionText || !actionType) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Missing required fields: suggestionText and actionType'
      );
    }

    // 현재 시간 정보 계산
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const dayOfWeek = now.getDay();

    // 로그 데이터 준비
    const logData = {
      user_id: userId,
      session_id: sessionId,
      suggestion_text: suggestionText,
      suggestion_category: suggestionCategory || null,
      suggestion_position: suggestionPosition || null,
      action_type: actionType,
      response_time_ms: responseTimeMs || null,
      time_of_day: context.timeOfDay || timeOfDay,
      day_of_week: dayOfWeek,
      event_count: context.eventCount || 0,
      last_ai_response: context.lastAIResponse || null,
      locale: context.locale || 'ko',
      device_type: deviceInfo.deviceType || detectDeviceType(request),
      browser: deviceInfo.browser || detectBrowser(request)
    };

    // Supabase에 로그 저장
    const { data, error } = await supabase
      .from('user_action_logs')
      .insert([logData])
      .select()
      .single();

    if (error) {
      logger.error('Failed to insert action log', { error, logData });
      return errorResponse(
        500,
        'DATABASE_ERROR',
        'Failed to save action log'
      );
    }

    logger.info('Quick action logged successfully', {
      userId,
      actionType,
      suggestionText,
      logId: data.id
    });

    // 사용자 선호도 분석 (비동기로 처리)
    if (userId && actionType === 'clicked') {
      analyzeUserPreferences(userId, suggestionText).catch(err => {
        logger.error('Failed to analyze user preferences', err);
      });
    }

    return successResponse({
      success: true,
      logId: data.id
    });

  } catch (error) {
    logger.error('Unexpected error in quick action analytics', error);
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Failed to process analytics request'
    );
  }
}

// 배치로 여러 로그를 한 번에 전송
export async function PUT(request: NextRequest) {
  try {
    const supabase = getServiceRoleSupabase();
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const sessionId = cookieStore.get('session-id')?.value || 'anonymous';

    let userId: string | null = null;
    if (authToken) {
      try {
        const user = await verifyToken(authToken);
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        logger.warn('Failed to verify auth token for batch analytics', error);
      }
    }

    const { logs }: { logs: QuickActionLog[] } = await request.json();

    if (!Array.isArray(logs) || logs.length === 0) {
      return errorResponse(
        400,
        'INVALID_REQUEST',
        'Logs array is required'
      );
    }

    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const dayOfWeek = now.getDay();

    // 배치 로그 데이터 준비
    const batchData = logs.map(log => ({
      user_id: userId,
      session_id: sessionId,
      suggestion_text: log.suggestionText,
      suggestion_category: log.suggestionCategory || null,
      suggestion_position: log.suggestionPosition || null,
      action_type: log.actionType,
      response_time_ms: log.responseTimeMs || null,
      time_of_day: log.context?.timeOfDay || timeOfDay,
      day_of_week: dayOfWeek,
      event_count: log.context?.eventCount || 0,
      last_ai_response: log.context?.lastAIResponse || null,
      locale: log.context?.locale || 'ko',
      device_type: log.deviceInfo?.deviceType || detectDeviceType(request),
      browser: log.deviceInfo?.browser || detectBrowser(request)
    }));

    const { data, error } = await supabase
      .from('user_action_logs')
      .insert(batchData)
      .select();

    if (error) {
      logger.error('Failed to insert batch action logs', { error, count: logs.length });
      return errorResponse(
        500,
        'DATABASE_ERROR',
        'Failed to save batch action logs'
      );
    }

    logger.info('Batch quick actions logged successfully', {
      userId,
      count: data.length
    });

    return successResponse({
      success: true,
      count: data.length,
      logIds: data.map(d => d.id)
    });

  } catch (error) {
    logger.error('Unexpected error in batch quick action analytics', error);
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Failed to process batch analytics request'
    );
  }
}

// 사용자 선호도 분석 (백그라운드 태스크)
async function analyzeUserPreferences(userId: string, clickedSuggestion: string) {
  try {
    const supabase = getServiceRoleSupabase();

    // 최근 30일간의 클릭 데이터 분석
    const { data: preferences } = await supabase
      .rpc('get_user_preferences', { p_user_id: userId });

    if (preferences && preferences.length > 0) {
      const pref = preferences[0];

      // 캐시에 저장 (Redis가 없으므로 메모리 캐시 사용)
      // 실제 프로덕션에서는 Redis 사용 권장
      global.userPreferences = global.userPreferences || {};
      global.userPreferences[userId] = {
        preferredCategory: pref.preferred_category,
        preferredTimeOfDay: pref.preferred_time_of_day,
        mostClickedSuggestions: pref.most_clicked_suggestions,
        avgResponseTimeMs: pref.avg_response_time_ms,
        lastUpdated: new Date()
      };

      logger.info('User preferences updated', {
        userId,
        preferences: pref
      });
    }
  } catch (error) {
    logger.error('Failed to analyze user preferences', { error, userId });
  }
}

// 디바이스 타입 감지
function detectDeviceType(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  if (userAgent.includes('mobile')) return 'mobile';
  if (userAgent.includes('tablet')) return 'tablet';
  return 'desktop';
}

// 브라우저 감지
function detectBrowser(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  if (userAgent.includes('chrome')) return 'chrome';
  if (userAgent.includes('firefox')) return 'firefox';
  if (userAgent.includes('safari')) return 'safari';
  if (userAgent.includes('edge')) return 'edge';
  return 'unknown';
}

// 전역 타입 선언
declare global {
  var userPreferences: Record<string, any>;
}