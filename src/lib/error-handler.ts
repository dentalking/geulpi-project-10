/**
 * 에러 처리 및 복구 메커니즘
 */

import { NextResponse } from 'next/server';

// 에러 타입 정의
export enum ErrorCode {
  // 인증 관련
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // 캘린더 관련
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  EVENT_CONFLICT = 'EVENT_CONFLICT',
  INVALID_EVENT_DATA = 'INVALID_EVENT_DATA',
  
  // API 관련
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // 일반
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

// 커스텀 에러 클래스
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 재시도 가능한 에러 판별
const isRetryableError = (error: any): boolean => {
  if (error instanceof AppError) {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT,
      ErrorCode.SERVICE_UNAVAILABLE,
      ErrorCode.RATE_LIMIT
    ].includes(error.code);
  }
  
  // HTTP 상태 코드 기반 판별
  const statusCode = error?.response?.status || error?.statusCode;
  return statusCode === 429 || statusCode === 503 || statusCode === 504;
};

// 지수 백오프 재시도 로직
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !isRetryableError(error)) {
        throw error;
      }

      // 지수 백오프 계산
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      
      if (onRetry) {
        onRetry(attempt, error);
      }

      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// 에러 응답 생성
export function createErrorResponse(error: any): NextResponse {
  console.error('Error occurred:', error);

  // AppError 처리
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      },
      { status: error.statusCode }
    );
  }

  // Google API 에러 처리
  if (error?.response?.data?.error) {
    const googleError = error.response.data.error;
    
    // 토큰 만료
    if (googleError.code === 401) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.TOKEN_EXPIRED,
            message: '인증이 만료되었습니다. 다시 로그인해주세요.',
            action: 'REAUTHENTICATE'
          }
        },
        { status: 401 }
      );
    }

    // 할당량 초과
    if (googleError.code === 429) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.RATE_LIMIT,
            message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
            retryAfter: googleError.retryAfter || 60
          }
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: googleError.message || '캘린더 서비스 오류가 발생했습니다.',
          details: googleError
        }
      },
      { status: googleError.code || 500 }
    );
  }

  // 네트워크 에러
  if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
    return NextResponse.json(
      {
        error: {
          code: ErrorCode.NETWORK_ERROR,
          message: '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.'
        }
      },
      { status: 503 }
    );
  }

  // 기본 에러
  return NextResponse.json(
    {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: error?.message || '알 수 없는 오류가 발생했습니다.',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      }
    },
    { status: 500 }
  );
}

// 에러 로깅
export function logError(error: any, context?: any): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    },
    context
  };

  // 프로덕션에서는 외부 로깅 서비스로 전송
  if (process.env.NODE_ENV === 'production') {
    // TODO: Sentry, LogRocket 등으로 전송
    console.error('[ERROR]', JSON.stringify(errorInfo));
  } else {
    console.error('[ERROR]', errorInfo);
  }
}

// 입력 검증 헬퍼
export function validateRequired(
  data: any,
  requiredFields: string[]
): string[] {
  const missing = requiredFields.filter(field => !data[field]);
  return missing;
}

// 날짜 검증 헬퍼
export function validateDateRange(
  start: string | Date,
  end: string | Date
): boolean {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false;
  }
  
  return startDate < endDate;
}

// Circuit Breaker 패턴 구현
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1분
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Circuit이 열려있으면 즉시 실패
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new AppError(
          ErrorCode.SERVICE_UNAVAILABLE,
          '서비스가 일시적으로 사용 불가능합니다.',
          503
        );
      }
    }

    try {
      const result = await fn();
      
      // 성공하면 circuit 초기화
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.error(`Circuit breaker opened after ${this.failures} failures`);
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    
    const now = new Date();
    const timeSinceLastFailure = now.getTime() - this.lastFailureTime.getTime();
    
    return timeSinceLastFailure >= this.timeout;
  }

  private reset(): void {
    this.failures = 0;
    this.lastFailureTime = undefined;
    this.state = 'CLOSED';
    console.log('Circuit breaker reset');
  }
}

// 전역 Circuit Breaker 인스턴스
export const calendarApiBreaker = new CircuitBreaker(5, 60000);
export const aiApiBreaker = new CircuitBreaker(3, 30000);