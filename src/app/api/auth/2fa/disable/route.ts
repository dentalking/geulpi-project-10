import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { disable2FAForUser, twoFactorAuth } from '@/lib/auth/two-factor-auth';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/auth/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Rate limiting: 3 attempts per 15 minutes per IP
    const rateLimitResult = await rateLimit(
      `2fa-disable-${ip}`,
      3,
      15 * 60 * 1000
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many disable attempts. Please try again later.',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    // Get authenticated user
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const { password, token, backupCode } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Current password is required' },
        { status: 400 }
      );
    }

    // Require either TOTP token OR backup code for additional security
    if (!token && !backupCode) {
      return NextResponse.json(
        { success: false, error: 'Either TOTP token or backup code is required' },
        { status: 400 }
      );
    }

    // TODO: Verify current password (you'll need to implement password verification)
    // This is a security requirement for disabling 2FA
    
    // If TOTP token is provided, verify it
    if (token) {
      const verification = await twoFactorAuth.verifyUserToken(
        session.user.id,
        token
      );

      if (!verification.isValid) {
        return NextResponse.json(
          { 
            success: false, 
            error: verification.error || 'Invalid TOTP token' 
          },
          { status: 400 }
        );
      }
    }

    // If backup code is provided, verify it
    if (backupCode) {
      const verification = await twoFactorAuth.verifyBackupCode(
        session.user.id,
        backupCode
      );

      if (!verification.isValid) {
        return NextResponse.json(
          { 
            success: false, 
            error: verification.error || 'Invalid backup code' 
          },
          { status: 400 }
        );
      }
    }

    // Disable 2FA for the user
    const result = await disable2FAForUser(session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to disable 2FA' 
        },
        { status: 500 }
      );
    }

    // Success - 2FA is now disabled
    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been successfully disabled'
    });

  } catch (error: any) {
    logger.error('2FA disable error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to disable 2FA' 
      },
      { status: 500 }
    );
  }
}