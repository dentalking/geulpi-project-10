import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth/supabase-auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Login user and check 2FA
    const result = await loginUser(email, password, rememberMe);

    // If 2FA is required, return pending token
    if (result.requires2FA) {
      return NextResponse.json({
        success: false,
        requires2FA: true,
        pendingToken: result.pendingToken,
        message: 'Please enter your 2FA code to complete login'
      });
    }

    // Set auth token in cookie if login successful
    if (result.token) {
      const cookieStore = await cookies();
      cookieStore.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
        path: '/'
      });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token
    });
  } catch (error: any) {
    if (error.message === 'Invalid email or password') {
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