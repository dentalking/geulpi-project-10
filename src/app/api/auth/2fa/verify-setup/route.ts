import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { verify2FAToken } from '@/lib/auth/two-factor-auth';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/auth/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Rate limiting: 10 attempts per 5 minutes per IP
    const rateLimitResult = await rateLimit(
      `2fa-verify-${ip}`,
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

    // Get authenticated user
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const { token, secret } = await request.json();

    if (!token || !secret) {
      return NextResponse.json(
        { success: false, error: 'Token and secret are required' },
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

    // Verify the TOTP token
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

    // Successful verification
    return NextResponse.json({
      success: true,
      message: 'Verification code is valid'
    });

  } catch (error: any) {
    logger.error('2FA verify setup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to verify code' 
      },
      { status: 500 }
    );
  }
}