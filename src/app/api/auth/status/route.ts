import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCalendarClient } from '@/lib/google-auth';

export async function GET() {
  const accessToken = cookies().get('access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    // 토큰 유효성 검증
    const calendar = getCalendarClient(accessToken);
    await calendar.events.list({
      calendarId: 'primary',
      maxResults: 1
    });

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Token validation failed:', error);
    // 토큰이 만료되었거나 유효하지 않은 경우 쿠키 삭제
    cookies().delete('access_token');
    cookies().delete('refresh_token');
    return NextResponse.json({ authenticated: false });
  }
}