import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { cookies } from 'next/headers';
import { verifyToken, updateUserProfile } from '@/lib/auth/supabase-auth';
import { getCalendarClient } from '@/lib/google-auth';

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const accessToken = cookieStore.get('access_token')?.value;

    let userId: string | null = null;
    let authType: 'email' | 'google' | null = null;

    // Check for email auth first
    if (authToken) {
      const user = await verifyToken(authToken);
      if (user) {
        userId = user.id;
        authType = 'email';
      } else {
        logger.warn('User profile API - Email auth token verification returned null');
      }
    }
    
    // Check for Google OAuth if not email auth
    if (!userId && accessToken) {
      try {
        // Verify Google token is valid
        const calendar = getCalendarClient(accessToken);
        await calendar.events.list({
          calendarId: 'primary',
          maxResults: 1
        });
        
        // For Google OAuth users, we can't update profile in database
        // but we can return success since they're authenticated
        authType = 'google';
      } catch (error) {
        // Google token is invalid
      }
    }

    if (!authType) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // For Google OAuth users, we can't update their profile
    if (authType === 'google') {
      return NextResponse.json({
        success: true,
        message: 'Google account profiles cannot be updated here. Please update through Google Account settings.',
        user: { name, email }
      });
    }

    // For email auth users, update the profile
    if (authType === 'email' && userId) {
      const updatedUser = await updateUserProfile(userId, { name, email });
      
      return NextResponse.json({
        success: true,
        user: updatedUser
      });
    }

    return NextResponse.json(
      { error: 'Unable to update profile' },
      { status: 400 }
    );

  } catch (error: any) {
    logger.error('Profile update error:', error);
    
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}