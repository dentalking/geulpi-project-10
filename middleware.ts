import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/config';
import jwt from 'jsonwebtoken';
import { env } from './src/lib/env';

const intlMiddleware = createIntlMiddleware(routing);

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/settings',
  '/profile',
  '/calendar',
  '/search',
];

// API routes that require authentication
const protectedApiRoutes = [
  '/api/calendar',
  '/api/profile',
  '/api/friends',
  '/api/search',
  '/api/payments',
  '/api/ai',
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    console.log('[Middleware] Processing request:', pathname);

    // Skip API routes for intl processing
    if (pathname.startsWith('/api/')) {
        console.log('[Middleware] API route detected:', pathname);

        // Handle auth for protected API routes
        const isProtectedApiRoute = protectedApiRoutes.some(route =>
            pathname.startsWith(route)
        );

        console.log('[Middleware] Is protected API route:', isProtectedApiRoute);

        if (isProtectedApiRoute) {
            const authHeader = request.headers.get('authorization');
            let authToken = request.cookies.get('auth-token')?.value;

            if (!authToken && authHeader) {
                if (authHeader.startsWith('auth-token ')) {
                    authToken = authHeader.substring(11);
                } else if (authHeader.startsWith('Bearer ')) {
                    authToken = authHeader.substring(7);
                }
            }

            if (!authToken) {
                return NextResponse.json(
                    { error: '인증이 필요합니다', code: 'AUTH_ERROR' },
                    { status: 401 }
                );
            }

            try {
                const JWT_SECRET = env.get('JWT_SECRET') || env.get('NEXTAUTH_SECRET') || 'your-secret-key-change-in-production';
                const decoded = jwt.verify(authToken, JWT_SECRET) as any;
                if (!decoded || !decoded.userId) {
                    throw new Error('Invalid token');
                }

                const requestHeaders = new Headers(request.headers);
                requestHeaders.set('x-user-id', decoded.userId);

                return NextResponse.next({
                    request: {
                        headers: requestHeaders,
                    },
                });
            } catch (error) {
                const response = NextResponse.json(
                    { error: '인증이 만료되었습니다', code: 'AUTH_EXPIRED' },
                    { status: 401 }
                );
                response.cookies.delete('auth-token');
                response.cookies.delete('user-id');
                response.cookies.delete('access_token');
                response.cookies.delete('refresh_token');
                return response;
            }
        }

        return NextResponse.next();
    }

    // Get auth token for page routes
    let authToken = request.cookies.get('auth-token')?.value;

    // Check if the route is protected
    const pathWithoutLocale = pathname.replace(/^\/(en|ko)/, '');
    const isProtectedWithLocale = protectedRoutes.some(route =>
        pathWithoutLocale.startsWith(route)
    );

    if (isProtectedWithLocale) {
        if (!authToken) {
            const localeMatch = pathname.match(/^\/(ko|en)/);
            const locale = localeMatch ? localeMatch[1] : 'ko';
            const url = request.nextUrl.clone();
            url.pathname = `/${locale}/login`;
            url.searchParams.set('redirect', pathname);
            return NextResponse.redirect(url);
        }

        try {
            const JWT_SECRET = env.get('JWT_SECRET') || env.get('NEXTAUTH_SECRET') || 'your-secret-key-change-in-production';
            const decoded = jwt.verify(authToken, JWT_SECRET) as any;
            if (!decoded || !decoded.userId) {
                throw new Error('Invalid token');
            }
        } catch (error) {
            const localeMatch = pathname.match(/^\/(ko|en)/);
            const locale = localeMatch ? localeMatch[1] : 'ko';
            const response = NextResponse.redirect(new URL(`/${locale}/login`, request.url));
            response.cookies.delete('auth-token');
            response.cookies.delete('user-id');
            response.cookies.delete('access_token');
            response.cookies.delete('refresh_token');
            return response;
        }
    }

    // Check if path is missing locale
    const pathnameIsMissingLocale = routing.locales.every(
        (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
    );

    // If missing locale, redirect to default locale
    if (pathnameIsMissingLocale && pathname !== '/') {
        return NextResponse.redirect(
            new URL(`/${routing.defaultLocale}${pathname}${request.nextUrl.search}`, request.url)
        );
    }

    // Use next-intl for all other routes
    return intlMiddleware(request);
}

export const config = {
    matcher: [
        // Include all paths except _next and static files, but include API routes
        '/((?!_next|.*\\..*).*)',
    ]
};