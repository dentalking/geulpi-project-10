import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { cookies } from 'next/headers';
import { sessionManager } from '@/lib/auth/session-manager';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh-token')?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
    }
    
    // Attempt to refresh the access token
    const tokens = await sessionManager.refreshAccessToken(refreshToken);
    
    if (!tokens) {
      // Refresh token is invalid or expired
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }
    
    // Update access token cookie
    cookieStore.set('auth-token', tokens.accessToken, {
      httpOnly: true,
      secure: env.isProduction(),
      sameSite: 'lax',
      maxAge: tokens.expiresIn,
      path: '/'
    });
    
    return NextResponse.json({
      success: true,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn
    });
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}