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
    // Vercel 환경에서는 HTTPS가 보장되므로 secure를 true로 설정
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';
    
    cookies().set('access_token', tokens.access_token || '', {
      httpOnly: true,
      secure: isProduction || isVercel, // Vercel은 항상 HTTPS
      sameSite: 'lax',
      path: '/', // 모든 경로에서 접근 가능
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    if (tokens.refresh_token) {
      cookies().set('refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: isProduction || isVercel, // Vercel은 항상 HTTPS
        sameSite: 'lax',
        path: '/', // 모든 경로에서 접근 가능
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }

    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Token exchange failed:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
