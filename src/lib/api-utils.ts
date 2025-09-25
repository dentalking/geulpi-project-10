/**
 * Standardized API response utilities
 * Ensures consistent response format across all API routes
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Standard API response types
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  metadata?: {
    timestamp: string;
    version?: string;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    path?: string;
    method?: string;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Error codes enum for consistency
export enum ApiErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Generic
  BAD_REQUEST = 'BAD_REQUEST',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED'
}

/**
 * Create a successful API response
 */
export function apiSuccess<T = any>(
  data: T,
  message?: string,
  metadata?: Record<string, any>
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };

  return NextResponse.json(response, { status: 200 });
}

/**
 * Create an error API response
 */
export function apiError(
  code: ApiErrorCode | string,
  message: string,
  status: number = 500,
  details?: any,
  metadata?: Record<string, any>
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    },
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };

  // Log errors for monitoring
  if (status >= 500) {
    logger.error(`API Error: ${code}`, { message, details, metadata });
  } else {
    logger.warn(`API Warning: ${code}`, { message, details, metadata });
  }

  return NextResponse.json(response, { status });
}

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: (message = 'Authentication required') =>
    apiError(ApiErrorCode.UNAUTHORIZED, message, 401),

  forbidden: (message = 'Access denied') =>
    apiError(ApiErrorCode.FORBIDDEN, message, 403),

  notFound: (resource = 'Resource') =>
    apiError(ApiErrorCode.NOT_FOUND, `${resource} not found`, 404),

  validationError: (details: any) =>
    apiError(ApiErrorCode.VALIDATION_ERROR, 'Validation failed', 400, details),

  badRequest: (message = 'Bad request') =>
    apiError(ApiErrorCode.BAD_REQUEST, message, 400),

  conflict: (message = 'Resource conflict') =>
    apiError(ApiErrorCode.CONFLICT, message, 409),

  internalError: (message = 'Internal server error', details?: any) =>
    apiError(ApiErrorCode.INTERNAL_ERROR, message, 500, details),

  databaseError: (message = 'Database operation failed', details?: any) =>
    apiError(ApiErrorCode.DATABASE_ERROR, message, 500, details),

  rateLimitExceeded: (message = 'Too many requests') =>
    apiError(ApiErrorCode.RATE_LIMIT_EXCEEDED, message, 429),

  methodNotAllowed: (method: string) =>
    apiError(ApiErrorCode.METHOD_NOT_ALLOWED, `Method ${method} not allowed`, 405)
};

/**
 * Validate request body against a schema
 */
export function validateBody<T>(
  body: any,
  requiredFields: (keyof T)[]
): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      errors.push(`Missing required field: ${String(field)}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Parse request body safely
 */
export async function parseBody<T = any>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    logger.warn('Failed to parse request body', { error });
    return null;
  }
}

/**
 * Create paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number,
  message?: string
) {
  const totalPages = Math.ceil(total / pageSize);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return apiSuccess(
    {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    },
    message,
    {
      type: 'paginated_response'
    }
  );
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: any): NextResponse<ApiErrorResponse> {
  logger.error('API Error Handler', error);

  // Handle known error types
  if (error?.message?.includes('Authentication')) {
    return ApiErrors.unauthorized();
  }

  if (error?.message?.includes('not found')) {
    return ApiErrors.notFound();
  }

  if (error?.code === 'PGRST116') {
    return ApiErrors.notFound('Record');
  }

  if (error?.code === '23505') {
    return ApiErrors.conflict('Resource already exists');
  }

  // Default to internal error
  return ApiErrors.internalError(
    'An unexpected error occurred',
    process.env.NODE_ENV === 'development' ? error?.message : undefined
  );
}

/**
 * Wrap async API handlers with error handling
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>
) {
  return async (...args: T): Promise<NextResponse<ApiResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}