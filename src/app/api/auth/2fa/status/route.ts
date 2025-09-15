import { NextRequest, NextResponse } from 'next/server';
import { get2FAUserStatus } from '@/lib/auth/two-factor-auth';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user's 2FA status
    const status = await get2FAUserStatus(session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        enabled: status.enabled,
        enabledAt: status.enabledAt?.toISOString(),
        backupCodesCount: status.backupCodesCount || 0
      }
    });

  } catch (error: any) {
    console.error('2FA status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get 2FA status' 
      },
      { status: 500 }
    );
  }
}