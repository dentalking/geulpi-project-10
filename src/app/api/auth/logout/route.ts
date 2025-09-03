import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  cookies().delete('access_token');
  cookies().delete('refresh_token');
  return NextResponse.redirect(new URL('/', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
}
