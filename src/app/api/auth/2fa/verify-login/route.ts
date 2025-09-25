import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { twoFactorAuth } from '@/lib/auth/two-factor-auth';
import { rateLimit } from '@/lib/auth/rate-limit';
import { sessionManager } from '@/lib/auth/session-manager';
import { cookies } from 'next/headers';
import { pending2FAStore } from '@/lib/auth/pending-2fa-store';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Rate limiting: 10 attempts per 5 minutes per IP
    const rateLimitResult = await rateLimit(
      `2fa-login-${ip}`,
      10,
      5 * 60 * 1000
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many verification attempts. Please try again later.',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    // Parse request body
    const { token, backupCode, pendingToken } = await request.json();

    if (!pendingToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid verification session' },
        { status: 400 }
      );
    }

    // Validate that either token or backup code is provided
    if (!token && !backupCode) {
      return NextResponse.json(
        { success: false, error: 'Either TOTP token or backup code is required' },
        { status: 400 }
      );
    }

    // Get pending login data
    const pendingLogin = await pending2FAStore.get(pendingToken);
    if (!pendingLogin) {
      return NextResponse.json(
        { success: false, error: 'Verification session expired or invalid' },
        { status: 400 }
      );
    }

    // Expiry is already checked in pending2FAStore.get()

    let verification;

    // Verify TOTP token
    if (token) {
      if (!/^\d{6}$/.test(token)) {
        return NextResponse.json(
          { success: false, error: 'Token must be 6 digits' },
          { status: 400 }
        );
      }

      verification = await twoFactorAuth.verifyUserToken(
        pendingLogin.userId,
        token
      );
    }
    
    // Verify backup code
    if (backupCode && (!verification || !verification.isValid)) {
      verification = await twoFactorAuth.verifyBackupCode(
        pendingLogin.userId,
        backupCode
      );
    }

    if (!verification || !verification.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: verification?.error || 'Invalid verification code' 
        },
        { status: 400 }
      );
    }

    // Remove pending login token
    await pending2FAStore.remove(pendingToken);

    // Create session (successful 2FA verification)
    const { session, tokens } = await sessionManager.createSession(
      pendingLogin.userId,
      pendingLogin.email,
      pendingLogin.deviceInfo,
      pendingLogin.rememberMe
    );
    
    // Set cookies
    const cookieStore = await cookies();
    
    // Access token cookie
    cookieStore.set('auth-token', tokens.accessToken, {
      httpOnly: true,
      secure: env.isProduction(),
      sameSite: 'lax',
      maxAge: pendingLogin.rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60, // 7 days or 24 hours
      path: '/'
    });
    
    // Refresh token cookie (longer expiry)
    cookieStore.set('refresh-token', tokens.refreshToken, {
      httpOnly: true,
      secure: env.isProduction(),
      sameSite: 'lax',
      maxAge: pendingLogin.rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days or 7 days
      path: '/'
    });
    
    // Session ID cookie (for tracking)
    cookieStore.set('session-id', session.id, {
      httpOnly: true,
      secure: env.isProduction(),
      sameSite: 'lax',
      maxAge: pendingLogin.rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
      path: '/'
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: pendingLogin.userId,
        email: pendingLogin.email
      },
      session: {
        id: session.id,
        expiresIn: tokens.expiresIn,
        rememberMe: pendingLogin.rememberMe
      }
    });

  } catch (error: any) {
    logger.error('2FA login verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify 2FA code' 
      },
      { status: 500 }
    );
  }
}

