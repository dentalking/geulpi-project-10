import { NextResponse } from 'next/server';
import { getTokenFromCode, getGoogleAuthClient } from '@/lib/google-auth';
import { findOrCreateOAuthUser } from '@/lib/auth/oauth-handler';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    logger.warn('OAuth callback called without code parameter');
    return NextResponse.redirect(new URL('/en/login?error=no_code', request.url));
  }

  const JWT_SECRET = env.get('JWT_SECRET') || env.get('NEXTAUTH_SECRET') || 'your-secret-key-change-in-production';
    // Exchange code for tokens
    const tokens = await getTokenFromCode(code);

    // Get user info from Google
    const oauth2Client = getGoogleAuthClient();
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.id || !userInfo.email) {
      throw new Error('Failed to get user information from Google');
    }

    // Create or update user in database
    const user = await findOrCreateOAuthUser(
      userInfo.id,
      userInfo.email,
      userInfo.name || userInfo.email.split('@')[0]
    );

    logger.info('OAuth user authenticated', { userId: user.id, email: user.email });

    // Generate JWT token for our app
    const appToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.debug('JWT token generated for user', { userId: user.id });

    // Set cookies
    const isProduction = env.isProduction();
    const isVercel = !!env.get('VERCEL');

    const cookieStore = await cookies();

    // Our app's JWT token
    cookieStore.set('auth-token', appToken, {
      httpOnly: true,
      secure: isProduction || isVercel,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    logger.debug('Auth token cookie set');

    // Google access token (for Calendar API)
    cookieStore.set('google_access_token', tokens.access_token || '', {
      httpOnly: true,
      secure: isProduction || isVercel,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 // 1 hour (Google tokens typically expire in 1 hour)
    });

    logger.debug('Google access token cookie set');

    // Google refresh token (for refreshing access token)
    if (tokens.refresh_token) {
      cookieStore.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: isProduction || isVercel,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      logger.debug('Google refresh token cookie set');
    }

    // Google token expiry time
    if (tokens.expiry_date) {
      cookieStore.set('google_token_expiry', tokens.expiry_date.toString(), {
        httpOnly: true,
        secure: isProduction || isVercel,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 // 1 hour
      });
      logger.debug('Google token expiry cookie set', { expiry: new Date(tokens.expiry_date).toISOString() });
    }

    // Store user ID
    cookieStore.set('user-id', user.id, {
      httpOnly: true,
      secure: isProduction || isVercel,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Get locale from referrer or default to 'en'
    const referrer = request.headers.get('referer');
    let locale = 'en'; // Default to English

    if (referrer) {
      const referrerUrl = new URL(referrer);
      const pathSegments = referrerUrl.pathname.split('/');
      if (pathSegments.length > 1 && (pathSegments[1] === 'ko' || pathSegments[1] === 'en')) {
        locale = pathSegments[1];
      }
    }

    logger.info('OAuth login successful, redirecting to dashboard', { userId: user.id, locale });
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
})