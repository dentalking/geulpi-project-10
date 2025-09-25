import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google-auth';
import { logger } from '@/lib/logger';
import { ApiErrors, withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async () => {
  const authUrl = getAuthUrl();
  logger.info('Generated Google OAuth URL for login');
  return NextResponse.redirect(authUrl);
})
