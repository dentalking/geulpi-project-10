/**
 * 실시간 Quick Actions 클릭 트래킹 API
 *
 * Phase 5: 실시간 학습 시스템의 핵심 컴포넌트
 * - 클릭 즉시 데이터베이스에 저장
 * - 패턴 분석 및 학습 데이터 수집
 * - AI 제안 품질 개선을 위한 피드백 루프
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { getServiceRoleSupabase } from '@/lib/supabase-server';
import { successResponse, errorResponse, ApiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/middleware/rateLimiter';
import { getUserPatternService } from '@/services/ai/UserPatternLearningService';
import type { UserInteraction } from '@/types/suggestions';

interface TrackClickRequest {
  suggestionText: string;
  category: string;
  priority: number;
  locale: 'ko' | 'en';
  sessionId: string;
  contextInfo?: {
    timeOfDay: string;
    hasEvents: boolean;
    lastAIResponse?: string;
    position: number;
  };
  action: 'clicked' | 'dismissed' | 'useful' | 'not_useful';
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await checkRateLimit(request, 'tracking');
    if (rateLimitResponse) return rateLimitResponse;

    const body: TrackClickRequest = await request.json();
    const {
      suggestionText,
      category,
      priority,
      locale,
      sessionId,
      contextInfo,
      action = 'clicked'
    } = body;

    // 인증 확인
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    let userId: string | null = null;

    if (authToken) {
      const user = await verifyToken(authToken);
      if (user) {
        userId = user.id;
      }
    }

    const supabase = getServiceRoleSupabase();
    const now = new Date();

    // 1. 데이터베이스에 클릭 기록 저장

    const { error: dbError } = await supabase
      .from('user_action_logs')
      .insert({
        user_id: userId, // Fixed: Now properly matches TEXT type after schema migration
        session_id: sessionId,
        action_type: action,
        suggestion_text: suggestionText,
        suggestion_category: category,
        suggestion_position: contextInfo?.position || 1,
        locale: locale,
        time_of_day: contextInfo?.timeOfDay || 'afternoon',
        day_of_week: now.getDay(),
        event_count: contextInfo?.hasEvents ? 1 : 0,
        last_ai_response: contextInfo?.lastAIResponse?.substring(0, 200),
        action_timestamp: now.toISOString(),
        created_at: now.toISOString()
      });

    if (dbError) {
      logger.error('[Click Tracking] Failed to save to database', dbError);
      // 데이터베이스 저장 실패해도 패턴 학습은 계속 진행
    } else {
      logger.info('[Click Tracking] Successfully saved click data', {
        userId,
        sessionId,
        suggestionText: suggestionText.substring(0, 20),
        action
      });
    }

    // 2. 실시간 패턴 학습 (사용자가 인증된 경우만)
    if (userId && action === 'clicked') {
      try {
        const patternService = getUserPatternService();
        const interaction: UserInteraction = {
          suggestionId: `${userId}-${sessionId}-${Date.now()}`,
          suggestionType: category as any,
          action: 'accepted',
          timestamp: now,
          timeOfDay: (contextInfo?.timeOfDay || 'afternoon') as any,
          context: {
            locale,
            hasLastAIResponse: !!contextInfo?.lastAIResponse,
            position: contextInfo?.position || 1,
            priority,
            hasEvents: contextInfo?.hasEvents
          }
        };

        patternService.recordInteraction(interaction);

        logger.info('[Real-time Learning] Pattern updated', {
          userId,
          suggestionType: category,
          timeOfDay: contextInfo?.timeOfDay
        });
      } catch (patternError) {
        logger.error('[Real-time Learning] Failed to update patterns', patternError);
        // 패턴 학습 실패해도 API는 성공으로 처리
      }
    }

    return successResponse({
      tracked: true,
      userId: userId || 'anonymous',
      sessionId,
      timestamp: now.toISOString(),
      patternLearningEnabled: !!userId,
      action,
      realTimeLearning: userId && action === 'clicked'
    });

  } catch (error) {
    logger.error('[Click Tracking] Unexpected error', error);
    return errorResponse(new ApiError(500, 'INTERNAL_ERROR', 'Failed to track suggestion click'));
  }
}

/**
 * 학습 품질 분석 API
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    if (!authToken) {
      return errorResponse(new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication required'));
    }

    const user = await verifyToken(authToken);
    if (!user) {
      return errorResponse(new ApiError(401, 'INVALID_AUTHENTICATION', 'Invalid authentication'));
    }

    const supabase = getServiceRoleSupabase();

    // 사용자의 최근 클릭 통계 조회
    const { data: recentClicks, error } = await supabase
      .from('user_action_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('[Learning Analysis] Failed to fetch data', error);
      return errorResponse(new ApiError(500, 'FETCH_ERROR', 'Failed to fetch learning data'));
    }

    // 학습 품질 분석
    const analysis = analyzeLearningQuality(recentClicks || []);

    return successResponse(analysis);

  } catch (error) {
    logger.error('[Learning Analysis] Unexpected error', error);
    return errorResponse(new ApiError(500, 'ANALYSIS_ERROR', 'Failed to analyze learning data'));
  }
}

/**
 * 학습 품질 분석 함수
 */
function analyzeLearningQuality(clicks: any[]) {
  const totalClicks = clicks.length;
  const last7Days = clicks.filter(c => {
    const clickDate = new Date(c.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return clickDate >= weekAgo;
  });

  // 카테고리별 분석
  const categoryStats = new Map<string, { count: number; recent: number }>();
  clicks.forEach(click => {
    const category = click.suggestion_category || 'unknown';
    const current = categoryStats.get(category) || { count: 0, recent: 0 };
    current.count += 1;

    if (last7Days.some(recent => recent.id === click.id)) {
      current.recent += 1;
    }

    categoryStats.set(category, current);
  });

  // 시간대별 분석 (개별 컬럼 사용)
  const timeStats = new Map<string, number>();
  clicks.forEach(click => {
    const timeOfDay = click.time_of_day || 'unknown'; // context_data → time_of_day 컬럼으로 수정
    timeStats.set(timeOfDay, (timeStats.get(timeOfDay) || 0) + 1);
  });

  return {
    overview: {
      totalClicks,
      last7Days: last7Days.length,
      learningActive: totalClicks > 10,
      qualityScore: Math.min(100, Math.floor((last7Days.length / Math.max(1, totalClicks)) * 100))
    },
    categoryBreakdown: Array.from(categoryStats.entries()).map(([category, stats]) => ({
      category,
      totalClicks: stats.count,
      recentClicks: stats.recent,
      percentage: Math.round((stats.count / totalClicks) * 100)
    })),
    timeDistribution: Array.from(timeStats.entries()).map(([time, count]) => ({
      timeOfDay: time,
      clicks: count,
      percentage: Math.round((count / totalClicks) * 100)
    })),
    recommendations: generateLearningRecommendations(clicks, categoryStats, timeStats)
  };
}

/**
 * 학습 개선 권장사항 생성
 */
function generateLearningRecommendations(
  clicks: any[],
  categoryStats: Map<string, any>,
  timeStats: Map<string, number>
): string[] {
  const recommendations: string[] = [];

  if (clicks.length < 10) {
    recommendations.push('더 많은 Quick Actions을 사용해보세요. AI가 학습할 데이터가 부족합니다.');
  }

  // 가장 많이 사용하는 카테고리
  const topCategory = Array.from(categoryStats.entries())
    .sort((a, b) => b[1].count - a[1].count)[0];

  if (topCategory && topCategory[1].count > clicks.length * 0.7) {
    recommendations.push(`다양한 유형의 기능을 시도해보세요. ${topCategory[0]} 기능만 주로 사용하고 있습니다.`);
  }

  // 시간대 분석
  const activeTime = Array.from(timeStats.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (activeTime) {
    recommendations.push(`${activeTime[0]} 시간대에 가장 활발히 사용하시네요. 이 시간대 맞춤 제안이 개선되고 있습니다.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('학습이 잘 진행되고 있습니다. AI 제안 품질이 지속적으로 개선됩니다.');
  }

  return recommendations;
}