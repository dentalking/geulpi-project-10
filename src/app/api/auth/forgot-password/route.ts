import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { 
  createPasswordResetToken, 
  isRateLimited,
  getPasswordResetEmailHtml,
  MockEmailService
} from '@/lib/auth/password-reset';

const emailService = new MockEmailService(); // Replace with real email service in production

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Check global rate limit
    try {
      await checkRateLimit('auth.password-reset', ip);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Too many reset attempts. Please try again later.' },
        { status: 429 }
      );
    }
    
    const body = await request.json();
    const { email } = body;
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }
    
    // Check per-email rate limit (3 per hour)
    if (isRateLimited(email)) {
      return NextResponse.json(
        { error: 'Too many reset attempts for this email. Please try again in an hour.' },
        { status: 429 }
      );
    }
    
    try {
      // Create reset token
      const { token, expiresAt } = await createPasswordResetToken(email);
      
      // Generate reset link
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                     (process.env.NODE_ENV === 'production' 
                       ? 'https://geulpi-project-10.vercel.app' 
                       : 'http://localhost:3000');
      
      const resetLink = `${baseUrl}/en/reset-password?token=${token}`;
      
      // Send email (in dev mode, this will log to console)
      await emailService.sendPasswordResetEmail(email, resetLink);
      
      // Log for monitoring (without sensitive data)
      console.log(`Password reset requested for: ${email.substring(0, 3)}***@${email.split('@')[1]}`);
      
      // Always return success (don't reveal if email exists)
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, we\'ve sent password reset instructions.'
      });
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      // Still return success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, we\'ve sent password reset instructions.'
      });
    }
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}