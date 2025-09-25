import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { issueBillingKey } from '@/lib/toss-payments';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { apiSuccess, ApiErrors, validateBody, withErrorHandling } from '@/lib/api-utils';

// GET billing key info
export const GET = withErrorHandling(async (request: NextRequest) => {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  const billingKey = cookieStore.get('billing_key')?.value;
  const customerKey = cookieStore.get('customer_key')?.value;

  if (!authToken) {
    logger.warn('Billing key access attempted without authentication');
    return ApiErrors.unauthorized();
  }

  logger.debug('Fetching billing key information');
  return apiSuccess({
    hasBillingKey: !!billingKey,
    customerKey: customerKey || null
  }, 'Billing information retrieved');
});

// POST - Issue new billing key
export const POST = withErrorHandling(async (request: NextRequest) => {
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  const accessToken = cookieStore.get('access_token')?.value;

  // Check authentication
  if (!authToken && !accessToken) {
    logger.warn('Billing key registration attempted without authentication');
    return ApiErrors.unauthorized();
  }

  // Get user info
  let userId: string;
  if (authToken) {
    const user = await verifyToken(authToken);
    if (!user) {
      logger.warn('Invalid auth token for billing key registration');
      return ApiErrors.unauthorized('Invalid authentication token');
    }
    userId = user.id;
  } else {
    // For Google OAuth users, we need to get user info from session
    // This is simplified - you may need to implement proper session management
    userId = 'google_user_' + Date.now();
  }

  const body = await request.json();
  const {
    cardNumber,
    cardExpiryYear,
    cardExpiryMonth,
    cardPassword,
    birthOrBusinessNumber,
  } = body;

  // Validate required fields
  const requiredFields = ['cardNumber', 'cardExpiryYear', 'cardExpiryMonth', 'cardPassword', 'birthOrBusinessNumber'];
  const validation = validateBody(body, requiredFields as any);
  if (!validation.valid) {
    return ApiErrors.validationError(validation.errors);
  }

  // Generate customer key (unique identifier for the user)
  const customerKey = `customer_${userId}_${Date.now()}`;

  logger.debug('Attempting to issue billing key', { userId, customerKey });

  try {
    // Issue billing key from Toss Payments
    const billingKeyData = await issueBillingKey(
      customerKey,
      cardNumber,
      cardExpiryYear,
      cardExpiryMonth,
      cardPassword,
      birthOrBusinessNumber
    );

    const isProduction = env.isProduction();

    // Store billing key in database (you'll need to implement this)
    // For now, we'll store it in cookies (not recommended for production)
    cookieStore.set('billing_key', billingKeyData.billingKey, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    cookieStore.set('customer_key', customerKey, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    logger.info('Billing key issued successfully', { userId, customerKey });

    return apiSuccess({
      billingKey: billingKeyData.billingKey,
      cardNumber: billingKeyData.card.number, // Masked card number
      cardCompany: billingKeyData.card.company,
    }, 'Billing key issued successfully');
  } catch (error: any) {
    logger.error('Billing key issuance failed', error, { context: 'PAYMENT' });
    return ApiErrors.badRequest(error.message || 'Failed to register card');
  }
});