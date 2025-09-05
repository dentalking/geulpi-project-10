import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCalendarClient } from '@/lib/google-auth';
import { verifyToken } from '@/lib/auth/supabase-auth';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const authToken = cookieStore.get('auth-token')?.value;

  // Check email auth token first
  if (authToken) {
    try {
      const user = await verifyToken(authToken);
      if (user) {
        return NextResponse.json({ 
          authenticated: true,
          authType: 'email',
          user 
        });
      }
    } catch (error) {
      console.error('Email token validation failed:', error);
      cookieStore.delete('auth-token');
    }
  }

  // Check Google OAuth token
  if (accessToken) {
    try {
      // 토큰 유효성 검증
      const calendar = getCalendarClient(accessToken);
      await calendar.events.list({
        calendarId: 'primary',
        maxResults: 1
      });

      return NextResponse.json({ 
        authenticated: true,
        authType: 'google'
      });
    } catch (error) {
      console.error('Google token validation failed:', error);
      // 토큰이 만료되었거나 유효하지 않은 경우 쿠키 삭제
      cookieStore.delete('access_token');
      cookieStore.delete('refresh_token');
    }
  }

  return NextResponse.json({ authenticated: false });
}