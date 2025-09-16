import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
];

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/landing',
  '/terms',
  '/privacy',
  '/support',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Get auth token from Authorization header or cookies
  const authHeader = request.headers.get('authorization');
  let authToken = request.cookies.get('auth-token')?.value;

  // Check Authorization header if no cookie token
  if (!authToken && authHeader) {
    if (authHeader.startsWith('auth-token ')) {
      authToken = authHeader.substring(11);
    } else if (authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7);
    }
  }

  const userId = request.cookies.get('user-id')?.value;

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );
  const isProtectedApiRoute = protectedApiRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Handle locale prefixes (e.g., /en/dashboard, /ko/dashboard)
  const pathWithoutLocale = pathname.replace(/^\/(en|ko)/, '');
  const isProtectedWithLocale = protectedRoutes.some(route =>
    pathWithoutLocale.startsWith(route)
  );

  if (isProtectedRoute || isProtectedApiRoute || isProtectedWithLocale) {
    // No token, redirect to login
    if (!authToken) {
      if (isProtectedApiRoute) {
        return NextResponse.json(
          { error: '인증이 필요합니다', code: 'AUTH_ERROR' },
          { status: 401 }
        );
      }

      const url = request.nextUrl.clone();
      // Extract locale from pathname or use default
      const localeMatch = pathname.match(/^\/(ko|en)/);
      const locale = localeMatch ? localeMatch[1] : 'ko';
      url.pathname = `/${locale}/login`;
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Verify token (simple check - full verification should be done in API routes)
    try {
      // For middleware, we just check if token exists and is not expired
      // Detailed verification happens in API routes
      const decoded = jwt.decode(authToken) as any;

      if (!decoded || !decoded.userId) {
        throw new Error('Invalid token');
      }

      // Check token expiration
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }

      // Add user ID to headers for API routes
      if (isProtectedApiRoute) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', decoded.userId);

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    } catch (error) {
      // Invalid token, clear cookies and redirect to login
      const response = isProtectedApiRoute
        ? NextResponse.json(
            { error: '인증이 만료되었습니다', code: 'AUTH_EXPIRED' },
            { status: 401 }
          )
        : NextResponse.redirect(new URL('/login', request.url));

      response.cookies.delete('auth-token');
      response.cookies.delete('user-id');
      response.cookies.delete('google_access_token');
      response.cookies.delete('google_refresh_token');

      return response;
    }
  }

  // For public routes, if user is already authenticated, redirect to dashboard
  const isPublicAuthRoute = ['/login', '/register'].some(route =>
    pathname.includes(route)
  );

  if (isPublicAuthRoute && authToken) {
    try {
      const decoded = jwt.decode(authToken) as any;
      if (decoded && decoded.userId && decoded.exp * 1000 > Date.now()) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      // Invalid token, let them proceed to login
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};