/**
 * 개선된 API 라우트 예시
 * 에러 처리, Rate Limiting, 입력 검증 포함
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, errorResponse, ApiError, ErrorCodes } from '@/lib/api-response';
import { checkRateLimit } from '@/middleware/rateLimiter';

// 입력 검증 스키마
const requestSchema = z.object({
  message: z.string().min(1).max(1000),
  userId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting 체크
    const rateLimitResponse = await checkRateLimit(request, 'ai');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // 2. 인증 체크
    const token = request.cookies.get('access_token');
    if (!token) {
      throw new ApiError(
        401,
        ErrorCodes.UNAUTHORIZED,
        'Authentication required'
      );
    }
    
    // 3. 입력 검증
    const body = await request.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      throw new ApiError(
        400,
        ErrorCodes.INVALID_INPUT,
        'Invalid request data',
        validation.error.flatten()
      );
    }
    
    const { message, userId, metadata } = validation.data;
    
    // 4. 비즈니스 로직
    try {
      // 실제 작업 수행
      const result = await processMessage(message, userId, metadata);
      
      // 5. 성공 응답
      return successResponse({
        id: result.id,
        message: 'Message processed successfully',
        data: result
      });
      
    } catch (dbError: any) {
      // 데이터베이스 에러 처리
      console.error('[DB Error]', dbError);
      
      throw new ApiError(
        503,
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Database service temporarily unavailable'
      );
    }
    
  } catch (error) {
    // 6. 에러 응답
    if (error instanceof ApiError) {
      return errorResponse(error);
    }
    
    // 예상치 못한 에러
    console.error('[Unexpected Error]', error);
    return errorResponse(
      new ApiError(
        500,
        ErrorCodes.INTERNAL_ERROR,
        'An unexpected error occurred'
      )
    );
  }
}

// 예시 비즈니스 로직
async function processMessage(
  message: string,
  userId?: string,
  metadata?: Record<string, any>
) {
  // 실제 구현
  return {
    id: 'msg_' + Date.now(),
    message,
    userId,
    metadata,
    processedAt: new Date().toISOString()
  };
}