import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export function getGoogleAuthClient() {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
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

export function getCalendarClient(accessToken: string) {
  const oauth2Client = getGoogleAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  return calendar;
}
