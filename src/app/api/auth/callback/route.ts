import { NextResponse } from 'next/server';
import { getTokenFromCode, getGoogleAuthClient } from '@/lib/google-auth';
import { findOrCreateOAuthUser } from '@/lib/auth/oauth-handler';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokenFromCode(code);

    // Get user info from Google
    const oauth2Client = getGoogleAuthClient();
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.id || !userInfo.email) {
      throw new Error('Failed to get user information from Google');
    }

    // Create or update user in database
    const user = await findOrCreateOAuthUser(
      userInfo.id,
      userInfo.email,
      userInfo.name || userInfo.email.split('@')[0]
    );

    // Generate JWT token for our app
    const appToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';

    const cookieStore = await cookies();

    // Our app's JWT token
    cookieStore.set('auth-token', appToken, {
      httpOnly: true,
      secure: isProduction || isVercel,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Google access token (for Calendar API)
    cookieStore.set('google_access_token', tokens.access_token || '', {
      httpOnly: true,
      secure: isProduction || isVercel,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 // 1 hour (Google tokens expire)
    });

    // Google refresh token (for refreshing access token)
    if (tokens.refresh_token) {
      cookieStore.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: isProduction || isVercel,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }

    // Store user ID
    cookieStore.set('user-id', user.id, {
      httpOnly: true,
      secure: isProduction || isVercel,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    // Get locale from cookie or default to 'ko'
    const locale = cookieStore.get('NEXT_LOCALE')?.value || 'ko';

    // Redirect to dashboard with locale
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  } catch (error) {
    console.error('Token exchange failed:', error);

    // Get locale from cookie or default to 'ko'
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value || 'ko';

    return NextResponse.redirect(new URL(`/${locale}/login?error=auth_failed`, request.url));
  }
}