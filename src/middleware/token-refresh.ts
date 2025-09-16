import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshAccessToken } from '@/lib/google-auth';

/**
 * Centralized Google OAuth token refresh middleware
 * Automatically refreshes Google access tokens when they're about to expire
 */

export interface TokenValidationResult {
  isValid: boolean;
  accessToken?: string;
  needsRefresh: boolean;
  error?: string;
}

/**
 * Check if Google access token is valid and refresh if needed
 */
export async function validateAndRefreshGoogleToken(): Promise<TokenValidationResult> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('google_access_token')?.value;
    const refreshToken = cookieStore.get('google_refresh_token')?.value;
    const tokenExpiry = cookieStore.get('google_token_expiry')?.value;

    // No tokens available
    if (!accessToken && !refreshToken) {
      return {
        isValid: false,
        needsRefresh: false,
        error: 'No Google tokens available'
      };
    }

    // No refresh token available
    if (!refreshToken) {
      return {
        isValid: !!accessToken,
        needsRefresh: false,
        accessToken,
        error: !accessToken ? 'No refresh token available' : undefined
      };
    }

    // Check if token is expired or will expire in next 5 minutes
    const now = Date.now();
    const expiryTime = tokenExpiry ? parseInt(tokenExpiry) : 0;
    const fiveMinutesFromNow = now + (5 * 60 * 1000);

    const needsRefresh = !accessToken || expiryTime <= fiveMinutesFromNow;

    if (needsRefresh) {
      try {
        console.log('Refreshing Google access token...');
        const newTokens = await refreshAccessToken(refreshToken);

        if (newTokens.access_token) {
          // Calculate new expiry time - use expiry_date if available, otherwise default to 1 hour
          const expiresInSeconds = newTokens.expiry_date ?
            Math.floor((newTokens.expiry_date - now) / 1000) : 3600;
          const newExpiry = newTokens.expiry_date || (now + (3600 * 1000));

          // Update cookies with new tokens
          const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/',
          };

          cookieStore.set('google_access_token', newTokens.access_token, {
            ...cookieOptions,
            maxAge: expiresInSeconds
          });

          cookieStore.set('google_token_expiry', newExpiry.toString(), {
            ...cookieOptions,
            maxAge: expiresInSeconds
          });

          // Update refresh token if provided
          if (newTokens.refresh_token) {
            cookieStore.set('google_refresh_token', newTokens.refresh_token, {
              ...cookieOptions,
              maxAge: 30 * 24 * 60 * 60 // 30 days
            });
          }

          console.log('Google access token refreshed successfully');

          return {
            isValid: true,
            accessToken: newTokens.access_token,
            needsRefresh: false
          };
        } else {
          return {
            isValid: false,
            needsRefresh: true,
            error: 'Failed to refresh token - no access token returned'
          };
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return {
          isValid: false,
          needsRefresh: true,
          error: `Token refresh failed: ${refreshError}`
        };
      }
    }

    // Token is still valid
    return {
      isValid: true,
      accessToken,
      needsRefresh: false
    };

  } catch (error) {
    console.error('Token validation error:', error);
    return {
      isValid: false,
      needsRefresh: false,
      error: `Token validation error: ${error}`
    };
  }
}

/**
 * Middleware function to validate and refresh Google tokens for API routes
 */
export async function withGoogleTokenRefresh(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Skip token refresh for non-Google Calendar related endpoints
    const url = new URL(request.url);
    const isGoogleCalendarEndpoint =
      url.pathname.includes('/calendar/') ||
      url.pathname.includes('/ai/chat') ||
      url.pathname.includes('/calendar/sync');

    if (!isGoogleCalendarEndpoint) {
      return handler(request);
    }

    try {
      const tokenResult = await validateAndRefreshGoogleToken();

      // If token validation failed and no valid token available
      if (!tokenResult.isValid && tokenResult.error && !tokenResult.needsRefresh) {
        console.warn(`Google token validation failed for ${url.pathname}:`, tokenResult.error);
        // Continue with handler - let individual endpoints handle auth
      }

      // If refresh was needed but failed
      if (tokenResult.needsRefresh && tokenResult.error) {
        console.error(`Google token refresh failed for ${url.pathname}:`, tokenResult.error);
        // Continue with handler - let individual endpoints handle auth failure
      }

      return handler(request);
    } catch (error) {
      console.error('Token refresh middleware error:', error);
      // Continue with handler - don't break the request flow
      return handler(request);
    }
  };
}

/**
 * Helper function for API routes to get valid Google tokens
 */
export async function getValidGoogleTokens(): Promise<{
  accessToken?: string;
  refreshToken?: string;
  isValid: boolean;
  error?: string;
}> {
  const tokenResult = await validateAndRefreshGoogleToken();
  const cookieStore = await cookies();

  return {
    accessToken: tokenResult.accessToken,
    refreshToken: cookieStore.get('google_refresh_token')?.value,
    isValid: tokenResult.isValid,
    error: tokenResult.error
  };
}

/**
 * Check if tokens will expire soon (within 5 minutes)
 */
export function willTokenExpireSoon(): boolean {
  try {
    const tokenExpiry = document.cookie
      .split('; ')
      .find(row => row.startsWith('google_token_expiry='))
      ?.split('=')[1];

    if (!tokenExpiry) return true; // Assume expired if no expiry info

    const expiryTime = parseInt(tokenExpiry);
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);

    return expiryTime <= fiveMinutesFromNow;
  } catch {
    return true; // Assume expired on any error
  }
}