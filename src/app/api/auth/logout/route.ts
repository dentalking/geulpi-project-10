import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  
  // Clear Google OAuth tokens
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  
  // Clear Supabase auth token
  cookieStore.delete('auth-token');
  
  return NextResponse.redirect(new URL('/', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
}
