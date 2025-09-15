import { NextRequest, NextResponse } from 'next/server';
import { generate2FASetup } from '@/lib/auth/two-factor-auth';
import { rateLimit } from '@/lib/auth/rate-limit';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Rate limiting: 3 attempts per 10 minutes per IP
    const rateLimitResult = await rateLimit(
      `2fa-setup-${ip}`,
      3,
      10 * 60 * 1000
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many setup attempts. Please try again later.',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    // Get authenticated user
    const session = await auth();
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Generate 2FA setup data
    const setupData = await generate2FASetup(
      session.user.id,
      session.user.email
    );

    // Return setup data (don't store in database yet)
    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: setupData.qrCodeUrl,
        manualEntryKey: setupData.manualEntryKey,
        backupCodes: setupData.backupCodes
      },
      // Include secret in response for verification (temporary)
      secret: setupData.secret
    });

  } catch (error: any) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate 2FA setup data' 
      },
      { status: 500 }
    );
  }
}