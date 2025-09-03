import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';

export async function GET() {
  try {
    const authUrl = getAuthUrl();
    console.log('Generated auth URL:', authUrl);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
  }
}
