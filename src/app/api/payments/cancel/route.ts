import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { logger } from '@/lib/logger';
import { apiSuccess, ApiErrors, withErrorHandling } from '@/lib/api-utils';

// POST - Cancel subscription
export const POST = withErrorHandling(async (request: NextRequest) => {
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  const accessToken = cookieStore.get('access_token')?.value;

  // Check authentication
  if (!authToken && !accessToken) {
    logger.warn('Subscription cancellation attempted without authentication');
    return ApiErrors.unauthorized();
  }

  const planId = cookieStore.get('subscription_plan')?.value;

  if (!planId || planId === 'free') {
    logger.warn('Cancellation attempted with no active subscription');
    return ApiErrors.badRequest('No active subscription found');
  }

  logger.debug('Processing subscription cancellation', { planId });

  // In production, you would:
  // 1. Update database to mark subscription as cancelled
  // 2. Set cancelAtPeriodEnd = true to cancel at the end of billing period
  // 3. Stop future automatic payments

  // For now, we'll just clear the cookies
  cookieStore.delete('subscription_plan');
  cookieStore.delete('subscription_cycle');
  cookieStore.delete('billing_key');
  cookieStore.delete('customer_key');

  logger.info('Subscription cancelled', { planId });

  return apiSuccess({
    cancelledAt: new Date().toISOString(),
    accessUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  }, 'Subscription cancelled successfully. You will have access until the end of the current billing period.');
});

// DELETE - Remove payment method
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  const accessToken = cookieStore.get('access_token')?.value;

  // Check authentication
  if (!authToken && !accessToken) {
    logger.warn('Payment method removal attempted without authentication');
    return ApiErrors.unauthorized();
  }

  const billingKey = cookieStore.get('billing_key')?.value;

  if (!billingKey) {
    logger.warn('Payment method removal attempted with no billing key');
    return ApiErrors.badRequest('No payment method found');
  }

  logger.debug('Removing payment method');

  // In production, you would:
  // 1. Call Toss Payments API to revoke the billing key
  // 2. Remove billing key from database

  // Clear billing key cookies
  cookieStore.delete('billing_key');
  cookieStore.delete('customer_key');

  logger.info('Payment method removed successfully');

  return apiSuccess(
    { success: true },
    'Payment method removed successfully'
  );
});