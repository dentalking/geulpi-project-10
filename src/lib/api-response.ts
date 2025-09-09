/**
 * Standardized API Response Utilities
 * 일관된 API 응답 형식을 위한 유틸리티
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}

export class ApiError extends Error {
  public suggestions?: string[];
  
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 성공 응답 생성
 */
export function successResponse<T>(data: T, statusCode = 200): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  };
  
  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

/**
 * 에러 응답 생성
 */
export function errorResponse(
  error: ApiError | Error,
  statusCode = 500
): Response {
  const isApiError = error instanceof ApiError;
  
  const response: ApiResponse = {
    success: false,
    error: {
      code: isApiError ? error.code : 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : error.message,
      details: isApiError && process.env.NODE_ENV !== 'production' 
        ? error.details 
        : undefined
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  };
  
  return new Response(JSON.stringify(response), {
    status: isApiError ? error.statusCode : statusCode,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

/**
 * API 핸들러 래퍼 - 에러 처리 자동화
 */
export function withErrorHandler(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (error) {
      console.error('[API Error]', error);
      
      if (error instanceof ApiError) {
        return errorResponse(error);
      }
      
      // 기본 에러 처리
      return errorResponse(
        new Error('Internal server error'),
        500
      );
    }
  };
}

/**
 * 공통 에러 코드
 */
export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  UNAUTHENTICATED: 'AUTH_UNAUTHENTICATED',
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  
  // Validation
  INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
  MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  
  // Resource
  NOT_FOUND: 'RESOURCE_NOT_FOUND',
  ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  
  // Rate Limiting
  TOO_MANY_REQUESTS: 'RATE_LIMIT_EXCEEDED',
  
  // System
  INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE',
} as const;