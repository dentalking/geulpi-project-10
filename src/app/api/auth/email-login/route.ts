import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth/supabase-auth';
import { cookies } from 'next/headers';
import { checkRateLimit } from '@/lib/rate-limiter';
import { checkAccountSecurity, recordLoginAttempt } from '@/lib/auth/account-security';
import { sessionManager, parseDeviceInfo } from '@/lib/auth/session-manager';
import { check2FAEnabled } from '@/lib/auth/two-factor-auth';
import crypto from 'crypto';

// Temporary store for pending 2FA logins (in production, use Redis)
const pending2FALogins = new Map<string, {
  userId: string;
  email: string;
  rememberMe: boolean;
  timestamp: number;
  deviceInfo: any;
  ip: string;
}>();

// Clean up expired pending logins every 10 minutes
setInterval(() => {
  const now = Date.now();
  const EXPIRY = 10 * 60 * 1000; // 10 minutes
  
  for (const [token, data] of pending2FALogins.entries()) {
    if (now - data.timestamp > EXPIRY) {
      pending2FALogins.delete(token);
    }
  }
}, 10 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Check rate limit
    try {
      await checkRateLimit('auth.login', ip);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, rememberMe = false } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if account is locked
    try {
      await checkAccountSecurity(email);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 423 } // Locked status
      );
    }

    let result;
    try {
      result = await loginUser(email, password);
      
      // Record successful login
      await recordLoginAttempt(email, ip, true);
    } catch (loginError: any) {
      // Record failed login attempt
      await recordLoginAttempt(email, ip, false);
      throw loginError;
    }
    
    // Check if user has 2FA enabled
    const has2FA = await check2FAEnabled(result.user.id);
    
    if (has2FA) {
      // Generate pending token for 2FA verification
      const pendingToken = crypto.randomBytes(32).toString('hex');
      
      // Store device info for later session creation
      const userAgent = request.headers.get('user-agent') || 'Unknown';
      const deviceInfo = parseDeviceInfo(userAgent, ip);
      
      // Store pending login data
      pending2FALogins.set(pendingToken, {
        userId: result.user.id,
        email: result.user.email,
        rememberMe,
        timestamp: Date.now(),
        deviceInfo,
        ip
      });
      
      // Return 2FA required response
      return NextResponse.json({
        success: false,
        requires2FA: true,
        pendingToken,
        message: 'Two-factor authentication required'
      }, { status: 200 });
    }
    
    // Create session with device info (no 2FA required)
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const deviceInfo = parseDeviceInfo(userAgent, ip);
    
    const { session, tokens } = await sessionManager.createSession(
      result.user.id,
      result.user.email,
      deviceInfo,
      rememberMe
    );
    
    // Set cookies
    const cookieStore = await cookies();
    
    // Access token cookie
    cookieStore.set('auth-token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60, // 7 days or 24 hours
      path: '/'
    });
    
    // Refresh token cookie (longer expiry)
    cookieStore.set('refresh-token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60, // 30 days or 7 days
      path: '/'
    });
    
    // Session ID cookie (for tracking)
    cookieStore.set('session-id', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
      path: '/'
    });

    return NextResponse.json({
      success: true,
      user: result.user,
      session: {
        id: session.id,
        expiresIn: tokens.expiresIn,
        rememberMe
      }
    });
  } catch (error: any) {
    if (error.message === 'User not found' || error.message === 'Invalid password') {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    console.error('Email login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}

// Export functions for 2FA integration
export function getPending2FALogin(pendingToken: string) {
  return pending2FALogins.get(pendingToken);
}

export function removePending2FALogin(pendingToken: string) {
  pending2FALogins.delete(pendingToken);
}