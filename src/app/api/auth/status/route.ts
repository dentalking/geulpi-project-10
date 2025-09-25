import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCalendarClient, refreshAccessToken } from '@/lib/google-auth';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { apiSuccess, withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const cookieStore = await cookies();
  const authHeader = request.headers.get('authorization');

  // Get tokens from cookies or headers (support both old and new cookie names)
  const accessToken = cookieStore.get('google_access_token')?.value || cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('google_refresh_token')?.value || cookieStore.get('refresh_token')?.value;

  // Check for JWT token in Authorization header or cookies
  let authToken: string | null = null;
  if (authHeader?.startsWith('auth-token ')) {
    authToken = authHeader.substring(11);
  } else {
    authToken = cookieStore.get('auth-token')?.value || null;
  }

  // Check email auth token first
  if (authToken) {
    logger.debug('Found auth token, attempting verification', { tokenLength: authToken.length });
    try {
      const user = await verifyToken(authToken);
      if (user) {
        logger.debug('Email auth status check successful', { userId: user.id });
        return apiSuccess({
          authenticated: true,
          authType: 'email',
          user
        });
      } else {
        logger.debug('Token verification returned null/undefined user');
      }
    } catch (error) {
      logger.debug('Email token validation failed', { error: error.message || error });
      cookieStore.delete('auth-token');
    }
  } else {
    logger.debug('No auth token found in cookies or headers');
  }

  // Check Google OAuth token
  if (accessToken || refreshToken) {
    let currentAccessToken = accessToken;

    try {
      // First try with current access token
      if (currentAccessToken) {
        const calendar = getCalendarClient(currentAccessToken, refreshToken);
        await calendar.events.list({
          calendarId: 'primary',
          maxResults: 1
        });
      } else {
        throw new Error('No access token');
      }
    } catch (error) {
      // Access token expired, try to refresh
      if (refreshToken) {
        logger.debug('Access token expired, attempting to refresh');
        try {
          const newTokens = await refreshAccessToken(refreshToken);
          const isProduction = env.isProduction();

          // Save new tokens to cookies
          cookieStore.set('google_access_token', newTokens.access_token!, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 60 * 60, // 1 hour
            path: '/'
          });

          if (newTokens.refresh_token) {
            cookieStore.set('google_refresh_token', newTokens.refresh_token, {
              httpOnly: true,
              secure: isProduction,
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/'
            });
          }

          // Store token expiry time
          if (newTokens.expiry_date) {
            cookieStore.set('google_token_expiry', newTokens.expiry_date.toString(), {
              httpOnly: true,
              secure: isProduction,
              sameSite: 'lax',
              maxAge: 60 * 60, // 1 hour
              path: '/'
            });
          }

          currentAccessToken = newTokens.access_token!;
          logger.info('Google token refreshed successfully');
        } catch (refreshError) {
          logger.error('Failed to refresh Google token', refreshError, { context: 'AUTH' });
          // Clean up cookies on refresh failure (both old and new names)
          cookieStore.delete('google_access_token');
          cookieStore.delete('google_refresh_token');
          cookieStore.delete('google_token_expiry');
          cookieStore.delete('access_token');
          cookieStore.delete('refresh_token');
          return apiSuccess({ authenticated: false });
        }
      } else {
        // No refresh token available
        logger.debug('No refresh token available');
        cookieStore.delete('google_access_token');
        cookieStore.delete('access_token');
        return apiSuccess({ authenticated: false });
      }
    }

    // Get user info with valid token
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`
        }
      });

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        logger.debug('Google auth status check successful', { userId: userInfo.id });
        return apiSuccess({
          authenticated: true,
          authType: 'google',
          user: {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
          }
        });
      }

      return apiSuccess({
        authenticated: true,
        authType: 'google'
      });
    } catch (error) {
      logger.error('Failed to fetch Google user info', error, { context: 'AUTH' });
      return apiSuccess({
        authenticated: true,
        authType: 'google'
      });
    }
  }

  return apiSuccess({ authenticated: false });
})