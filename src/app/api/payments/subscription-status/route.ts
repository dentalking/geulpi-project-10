import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { apiSuccess, withErrorHandling } from '@/lib/api-utils';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // In a real app, this would fetch from a database
  // For now, we'll use cookies as a simple storage
  const cookieStore = cookies();
  const subscriptionData = cookieStore.get('subscription');

  const defaultSubscription = {
    plan: 'free',
    billingCycle: null,
    nextBillingDate: null,
    status: 'active'
  };

  if (!subscriptionData) {
    logger.debug('No subscription data found, returning free plan');
    return apiSuccess(defaultSubscription, 'Subscription status retrieved');
  }

  try {
    const subscription = JSON.parse(subscriptionData.value);
    logger.debug('Subscription data found', { plan: subscription.plan });

    return apiSuccess({
      plan: subscription.plan || 'free',
      billingCycle: subscription.billingCycle || null,
      nextBillingDate: subscription.nextBillingDate || null,
      status: subscription.status || 'active'
    }, 'Subscription status retrieved');
  } catch (error) {
    logger.warn('Failed to parse subscription data', { error });
    return apiSuccess(defaultSubscription, 'Subscription status retrieved');
  }
})