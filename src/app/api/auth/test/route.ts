import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAuthUrl } from '@/lib/google-auth';

export async function GET() {
  try {
    const authUrl = getAuthUrl();
    return NextResponse.json({ authUrl });
  } catch (error) {
    logger.error('Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
