// middleware.ts

import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/api-errors';

// 보호된 라우트 목록
const PROTECTED_ROUTES = [
    '/api/calendar',
    '/api/assistant',
    '/api/briefing',
];

// 공개 라우트 목록
const PUBLIC_ROUTES = [
    '/api/auth/login',
    '/api/auth/callback',
    '/api/auth/status',
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 공개 라우트는 통과
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // 보호된 라우트 확인
    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

    if (isProtectedRoute) {
        const accessToken = request.cookies.get('access_token')?.value;

        if (!accessToken) {
            return NextResponse.json(
                {
                    error: '인증이 필요합니다',
                    code: 'AUTH_REQUIRED'
                },
                { status: 401 }
            );
        }

        // 토큰 만료 확인 (간단한 체크)
        try {
            // JWT 디코딩 (실제로는 jose 등 라이브러리 사용 권장)
            const tokenParts = accessToken.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(
                    Buffer.from(tokenParts[1], 'base64').toString()
                );

                // 만료 시간 확인
                if (payload.exp && payload.exp * 1000 < Date.now()) {
                    // 토큰 만료 - 리프레시 시도
                    const refreshToken = request.cookies.get('refresh_token')?.value;

                    if (refreshToken) {
                        // 리프레시 토큰으로 새 액세스 토큰 발급
                        // (실제 구현 필요)
                        console.log('Token expired, need refresh');
                    }

                    return NextResponse.json(
                        {
                            error: '인증이 만료되었습니다',
                            code: 'AUTH_EXPIRED'
                        },
                        { status: 401 }
                    );
                }
            }
        } catch (error) {
            console.error('Token validation error:', error);
            return NextResponse.json(
                {
                    error: '유효하지 않은 인증입니다',
                    code: 'AUTH_INVALID'
                },
                { status: 401 }
            );
        }

        // CORS 헤더 추가
        const response = NextResponse.next();

        // 보안 헤더 추가
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // CORS 설정 (필요한 경우)
        if (process.env.NODE_ENV === 'production') {
            const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
            const origin = request.headers.get('origin');

            if (origin && allowedOrigins.includes(origin)) {
                response.headers.set('Access-Control-Allow-Origin', origin);
                response.headers.set('Access-Control-Allow-Credentials', 'true');
                response.headers.set(
                    'Access-Control-Allow-Methods',
                    'GET, POST, PUT, DELETE, OPTIONS'
                );
                response.headers.set(
                    'Access-Control-Allow-Headers',
                    'Content-Type, Authorization'
                );
            }
        }

        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // API 라우트에만 적용
        '/api/:path*',
        // 정적 파일과 이미지 제외
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};