import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCalendarClient, refreshAccessToken } from '@/lib/google-auth';
import { verifyToken } from '@/lib/auth/supabase-auth';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;
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
  if (accessToken || refreshToken) {
    let currentAccessToken = accessToken;
    
    try {
      // 먼저 현재 access token으로 시도
      if (currentAccessToken) {
        const calendar = getCalendarClient(currentAccessToken, refreshToken);
        await calendar.events.list({
          calendarId: 'primary',
          maxResults: 1
        });
      } else {
        throw new Error('No access token');
      }
    } catch (error) {
      // Access token이 만료된 경우 refresh token으로 갱신 시도
      if (refreshToken) {
        console.log('Access token expired, attempting to refresh...');
        try {
          const newTokens = await refreshAccessToken(refreshToken);
          
          // 새로운 토큰을 쿠키에 저장
          cookieStore.set('access_token', newTokens.access_token!, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7일
            path: '/'
          });
          
          if (newTokens.refresh_token) {
            cookieStore.set('refresh_token', newTokens.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30, // 30일
              path: '/'
            });
          }
          
          currentAccessToken = newTokens.access_token!;
          console.log('Token refreshed successfully');
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          // Refresh도 실패한 경우 쿠키 삭제
          cookieStore.delete('access_token');
          cookieStore.delete('refresh_token');
          return NextResponse.json({ authenticated: false });
        }
      } else {
        // Refresh token이 없는 경우
        console.error('No refresh token available');
        cookieStore.delete('access_token');
        return NextResponse.json({ authenticated: false });
      }
    }

    // 유효한 토큰으로 사용자 정보 가져오기
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`
        }
      });

      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        return NextResponse.json({ 
          authenticated: true,
          authType: 'google',
          user: {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
          }
        });
      }

      return NextResponse.json({ 
        authenticated: true,
        authType: 'google'
      });
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      return NextResponse.json({ 
        authenticated: true,
        authType: 'google'
      });
    }
  }

  return NextResponse.json({ authenticated: false });
}