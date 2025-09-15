import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth/supabase-auth';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Check rate limit
    try {
      await checkRateLimit('auth.signup', ip);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const user = await registerUser(email, password, name);
    
    return NextResponse.json({
      success: true,
      user
    });
  } catch (error: any) {
    if (error.message === 'User already exists') {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }
    
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}