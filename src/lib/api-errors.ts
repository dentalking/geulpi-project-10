// lib/api-errors.ts

import { NextResponse } from 'next/server';

export class ApiError extends Error {
    constructor(
        message: string,
        public statusCode: number = 500,
        public code?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export class AuthError extends ApiError {
    constructor(message: string = '인증이 필요합니다') {
        super(message, 401, 'AUTH_ERROR');
    }
}

export class ValidationError extends ApiError {
    constructor(message: string) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

export class NotFoundError extends ApiError {
    constructor(message: string = '리소스를 찾을 수 없습니다') {
        super(message, 404, 'NOT_FOUND');
    }
}

export class RateLimitError extends ApiError {
    constructor(message: string = '요청이 너무 많습니다') {
        super(message, 429, 'RATE_LIMIT');
    }
}

export class QuotaExceededError extends ApiError {
    constructor(message: string = '할당량을 초과했습니다') {
        super(message, 403, 'QUOTA_EXCEEDED');
    }
}

export function handleApiError(error: unknown): NextResponse {
    console.error('[API Error]:', error);

    // ApiError 인스턴스 처리
    if (error instanceof ApiError) {
        return NextResponse.json(
            {
                error: error.message,
                code: error.code,
                timestamp: new Date().toISOString()
            },
            { status: error.statusCode }
        );
    }

    // Google API 에러 처리
    if (error && typeof error === 'object' && 'code' in error) {
        const googleError = error as any;

        // 권한 에러
        if (googleError.code === 403) {
            return NextResponse.json(
                {
                    error: '권한이 없습니다',
                    code: 'PERMISSION_DENIED',
                    message: googleError.message
                },
                { status: 403 }
            );
        }

        // 리소스 없음
        if (googleError.code === 404) {
            return NextResponse.json(
                {
                    error: '일정을 찾을 수 없습니다',
                    code: 'NOT_FOUND',
                    message: googleError.message
                },
                { status: 404 }
            );
        }

        // 할당량 초과
        if (googleError.code === 429) {
            return NextResponse.json(
                {
                    error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요',
                    code: 'QUOTA_EXCEEDED',
                    message: googleError.message
                },
                { status: 429 }
            );
        }
    }

    // 일반 Error 인스턴스 처리
    if (error instanceof Error) {
        return NextResponse.json(
            {
                error: '서버 오류가 발생했습니다',
                message: error.message,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }

    // 알 수 없는 에러
    return NextResponse.json(
        {
            error: '알 수 없는 오류가 발생했습니다',
            code: 'UNKNOWN_ERROR',
            timestamp: new Date().toISOString()
        },
        { status: 500 }
    );
}

// 에러 로깅 유틸리티
export function logError(
    error: unknown,
    context: {
        userId?: string;
        action?: string;
        metadata?: Record<string, any>;
    }
) {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        ...context,
        error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : error
    };

    // 프로덕션에서는 실제 로깅 서비스 사용
    if (process.env.NODE_ENV === 'production') {
        // Sentry, LogRocket 등으로 전송
        console.error('[Production Error]:', errorInfo);
    } else {
        console.error('[Development Error]:', errorInfo);
    }
}