import { NextRequest, NextResponse } from 'next/server';
import { 
  validatePasswordResetToken, 
  resetPasswordWithToken 
} from '@/lib/auth/password-reset';
import { sessionManager } from '@/lib/auth/session-manager';

// GET: Validate token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }
    
    const validation = await validatePasswordResetToken(token);
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Invalid or expired reset token' 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      valid: true,
      email: validation.email
    });
  } catch (error: any) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    );
  }
}

// POST: Reset password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword, confirmPassword } = body;
    
    // Validate input
    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }
    
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, and numbers' },
        { status: 400 }
      );
    }
    
    // First validate the token to get the email
    const validation = await validatePasswordResetToken(token);
    
    if (!validation.valid || !validation.email) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }
    
    // Reset the password
    const result = await resetPasswordWithToken(token, newPassword);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to reset password' },
        { status: 400 }
      );
    }
    
    // Revoke all existing sessions for this user (security measure)
    // Note: We'd need to get userId from email, skipping for now
    // await sessionManager.revokeAllUserSessions(userId);
    
    // Log for security audit
    console.log(`Password reset completed for: ${validation.email.substring(0, 3)}***`);
    
    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}