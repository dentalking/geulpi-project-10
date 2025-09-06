import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export function getGoogleAuthClient() {
  // 프로덕션 환경에서는 Vercel URL 사용, 로컬에서는 localhost 사용
  const redirectUri = process.env.NODE_ENV === 'production' 
    ? 'https://geulpi-project-10.vercel.app/api/auth/callback'
    : (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback');

  console.log('Google OAuth Config:', {
    clientId: process.env.GOOGLE_CLIENT_ID ? '***' : 'MISSING',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '***' : 'MISSING',
    redirectUri: redirectUri,
    env: process.env.NODE_ENV
  });

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID?.trim(),
    process.env.GOOGLE_CLIENT_SECRET?.trim(),
    redirectUri
  );

  return oauth2Client;
}

export function getAuthUrl() {
  const oauth2Client = getGoogleAuthClient();
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  return url;
}

export async function getTokenFromCode(code: string) {
  const oauth2Client = getGoogleAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function getCalendarClient(accessToken: string, refreshToken?: string) {
  const oauth2Client = getGoogleAuthClient();
  oauth2Client.setCredentials({ 
    access_token: accessToken,
    refresh_token: refreshToken 
  });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  return calendar;
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const oauth2Client = getGoogleAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log('[Google Auth] Token refreshed successfully');
    
    return {
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || refreshToken,
      expiry_date: credentials.expiry_date
    };
  } catch (error) {
    console.error('[Google Auth] Token refresh failed:', error);
    throw error;
  }
}
