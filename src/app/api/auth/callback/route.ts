import { NextResponse } from 'next/server';
import { getTokenFromCode } from '@/lib/google-auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    const tokens = await getTokenFromCode(code);
    
    // 실제 프로덕션에서는 보안을 위해 토큰을 암호화하여 저장
    cookies().set('access_token', tokens.access_token || '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    if (tokens.refresh_token) {
      cookies().set('refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }

    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Token exchange failed:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
