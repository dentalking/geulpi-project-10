/**
 * Simple in-memory rate limiter
 * 프로덕션에서는 Redis 기반 구현 권장
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store: Map<string, RequestRecord> = new Map();
  
  constructor(private config: RateLimitConfig) {
    // 주기적으로 만료된 엔트리 정리
    setInterval(() => this.cleanup(), 60000); // 1분마다
  }
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const record = this.store.get(identifier);
    
    if (!record || now > record.resetTime) {
      // 새 윈도우 시작
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }
    
    if (record.count >= this.config.maxRequests) {
      return false;
    }
    
    record.count++;
    return true;
  }
  
  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
  
  getRemainingRequests(identifier: string): number {
    const record = this.store.get(identifier);
    if (!record) return this.config.maxRequests;
    
    const now = Date.now();
    if (now > record.resetTime) return this.config.maxRequests;
    
    return Math.max(0, this.config.maxRequests - record.count);
  }
  
  getResetTime(identifier: string): number {
    const record = this.store.get(identifier);
    return record ? record.resetTime : Date.now() + this.config.windowMs;
  }
}

// Rate limiter 인스턴스들
const limiters = {
  // 일반 API: 분당 60 요청
  general: new InMemoryRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60
  }),
  
  // AI API: 분당 10 요청 (비용 절감)
  ai: new InMemoryRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10
  }),
  
  // 인증 API: 시간당 5 요청 (브루트포스 방지)
  auth: new InMemoryRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5
  })
};

export type LimiterType = keyof typeof limiters;

/**
 * Rate limiting 미들웨어
 */
export function rateLimitMiddleware(
  type: LimiterType = 'general'
) {
  return async function middleware(
    req: NextRequest
  ): Promise<NextResponse | null> {
    // IP 주소 또는 사용자 ID를 식별자로 사용
    const identifier = req.ip || 
                      req.headers.get('x-forwarded-for') || 
                      'anonymous';
    
    const limiter = limiters[type];
    
    if (!limiter.isAllowed(identifier)) {
      const resetTime = limiter.getResetTime(identifier);
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
          }
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limiter['config'].maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetTime).toISOString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }
    
    // Rate limit 정보를 헤더에 추가
    const response = NextResponse.next();
    response.headers.set(
      'X-RateLimit-Limit', 
      limiter['config'].maxRequests.toString()
    );
    response.headers.set(
      'X-RateLimit-Remaining', 
      limiter.getRemainingRequests(identifier).toString()
    );
    
    return null; // 통과
  };
}

/**
 * API 라우트에서 사용하는 헬퍼 함수
 */
export async function checkRateLimit(
  req: NextRequest,
  type: LimiterType = 'general'
): Promise<Response | null> {
  const middleware = rateLimitMiddleware(type);
  const response = await middleware(req);
  
  if (response) {
    return response;
  }
  
  return null;
}