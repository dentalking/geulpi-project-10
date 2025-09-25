import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { cookies } from 'next/headers';
import { sessionManager } from '@/lib/auth/session-manager';

export async function GET() {
  const cookieStore = await cookies();
  
  // Get current session ID to revoke it
  const sessionId = cookieStore.get('session-id')?.value;
  
  if (sessionId) {
    // Revoke the session on server side
    await sessionManager.revokeSession(sessionId);
  }
  
  // Clear all auth-related cookies
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  cookieStore.delete('auth-token');
  cookieStore.delete('refresh-token'); 
  cookieStore.delete('session-id');
  
  return NextResponse.redirect(new URL('/', env.get('NEXTAUTH_URL') || 'http://localhost:3000'));
}
