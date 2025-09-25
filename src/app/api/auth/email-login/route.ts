import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth/supabase-auth';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { apiSuccess, ApiErrors, validateBody, withErrorHandling } from '@/lib/api-utils';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { email, password, rememberMe } = body;

  // Validate required fields
  const validation = validateBody(body, ['email', 'password']);
  if (!validation.valid) {
    return ApiErrors.validationError(validation.errors);
  }

  logger.debug('Email login attempt', { email });

  // Login user and check 2FA
  const result = await loginUser(email, password, rememberMe);

  // If 2FA is required, return pending token
  if (result.requires2FA) {
    logger.info('2FA required for login', { email });
    return apiSuccess({
      requires2FA: true,
      pendingToken: result.pendingToken
    }, 'Please enter your 2FA code to complete login');
  }

  // Create response with auth token in cookie if login successful
  const response = apiSuccess({
    user: result.user,
    token: result.token
  }, 'Login successful');

  if (result.token) {
    const isProduction = env.isProduction();
    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
      path: '/'
    });
  }

  logger.info('Email login successful', { userId: result.user?.id, email });
  return response;
})