import { NextRequest, NextResponse } from 'next/server';
import { enable2FAForUser, verify2FAToken } from '@/lib/auth/two-factor-auth';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/auth/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Rate limiting: 5 attempts per 10 minutes per IP
    const rateLimitResult = await rateLimit(
      `2fa-enable-${ip}`,
      5,
      10 * 60 * 1000
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many enable attempts. Please try again later.',
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
    const { token, secret, backupCodes } = await request.json();

    if (!token || !secret || !backupCodes) {
      return NextResponse.json(
        { success: false, error: 'Token, secret, and backup codes are required' },
        { status: 400 }
      );
    }

    // Validate token format (6 digits)
    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { success: false, error: 'Token must be 6 digits' },
        { status: 400 }
      );
    }

    // Validate backup codes array
    if (!Array.isArray(backupCodes) || backupCodes.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid backup codes' },
        { status: 400 }
      );
    }

    // Final verification of the TOTP token before enabling
    const verification = verify2FAToken(secret, token);

    if (!verification.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: verification.error || 'Invalid verification code' 
        },
        { status: 400 }
      );
    }

    // Enable 2FA for the user
    const result = await enable2FAForUser(
      session.user.id,
      secret,
      backupCodes
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to enable 2FA' 
        },
        { status: 500 }
      );
    }

    // Success - 2FA is now enabled
    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been successfully enabled'
    });

  } catch (error: any) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to enable 2FA' 
      },
      { status: 500 }
    );
  }
}