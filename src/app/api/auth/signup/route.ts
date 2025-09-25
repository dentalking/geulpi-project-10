import { NextRequest } from 'next/server';
import { registerUser } from '@/lib/auth/supabase-auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { apiSuccess, ApiErrors, validateBody, withErrorHandling } from '@/lib/api-utils';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  // Check rate limit
  try {
    await checkRateLimit('auth.signup', ip);
  } catch (error: any) {
    logger.warn('Rate limit exceeded for signup', { ip });
    return ApiErrors.rateLimitExceeded(error.message || 'Too many signup attempts. Please try again later.');
  }

  const body = await request.json();
  const { email, password, name } = body;

  // Validate required fields
  const validation = validateBody(body, ['email', 'password']);
  if (!validation.valid) {
    return ApiErrors.validationError(validation.errors);
  }

  // Validate password length
  if (password.length < 6) {
    return ApiErrors.validationError(['Password must be at least 6 characters']);
  }

  logger.debug('Signup attempt', { email, ip });

  try {
    const user = await registerUser(email, password, name);

    logger.info('User registered successfully', { userId: user.id, email });
    return apiSuccess({ user }, 'Account created successfully');
  } catch (error: any) {
    if (error.message === 'User already exists') {
      logger.warn('Signup attempt for existing user', { email });
      return ApiErrors.conflict('User already exists');
    }
    throw error; // Let withErrorHandling catch other errors
  }
})