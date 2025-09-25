import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { executePayment, SUBSCRIPTION_PLANS, type PlanId, type BillingCycle } from '@/lib/toss-payments';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { apiSuccess, ApiErrors, validateBody, withErrorHandling } from '@/lib/api-utils';

// Generate unique order ID
function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `ORDER_${timestamp}_${random}`;
}

// POST - Create subscription
export const POST = withErrorHandling(async (request: NextRequest) => {
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  const accessToken = cookieStore.get('access_token')?.value;
  const billingKey = cookieStore.get('billing_key')?.value;
  const customerKey = cookieStore.get('customer_key')?.value;

  // Check authentication
  if (!authToken && !accessToken) {
    logger.warn('Subscription attempted without authentication');
    return ApiErrors.unauthorized();
  }

  // Check billing key
  if (!billingKey || !customerKey) {
    logger.warn('Subscription attempted without payment method');
    return ApiErrors.badRequest('No payment method registered. Please add a card first.');
  }

  const body = await request.json();
  const { planId, billingCycle }: { planId: PlanId; billingCycle: BillingCycle } = body;

  // Validate required fields
  const validation = validateBody(body, ['planId', 'billingCycle']);
  if (!validation.valid) {
    return ApiErrors.validationError(validation.errors);
  }

  // Validate plan
  if (!SUBSCRIPTION_PLANS[planId]) {
    logger.warn('Invalid plan selected', { planId });
    return ApiErrors.badRequest('Invalid plan selected');
  }

  const plan = SUBSCRIPTION_PLANS[planId];
  const amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

  logger.debug('Processing subscription', { planId, billingCycle, amount });

  // Skip payment for free plan
  if (amount === 0) {
    logger.info('User subscribed to free plan', { planId });
    return apiSuccess({
      planId,
      billingCycle,
      amount: 0,
      nextBillingDate: null,
    }, 'Successfully subscribed to Free plan');
  }

  // Generate order details
  const orderId = generateOrderId();
  const orderName = `${plan.name} 플랜 (${billingCycle === 'yearly' ? '연간' : '월간'}) 구독`;

  try {
    // Execute payment
    const paymentResult = await executePayment(
      billingKey,
      customerKey,
      amount,
      orderId,
      orderName
    );

    // Calculate next billing date
    const currentDate = new Date();
    const nextBillingDate = new Date();
    if (billingCycle === 'yearly') {
      nextBillingDate.setFullYear(currentDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(currentDate.getMonth() + 1);
    }

    const isProduction = env.isProduction();

    // Store subscription info (you'll need to implement database storage)
    // For now, we'll store in cookies (not recommended for production)
    cookieStore.set('subscription_plan', planId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    cookieStore.set('subscription_cycle', billingCycle, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    logger.info('Subscription successful', { planId, billingCycle, orderId });

    return apiSuccess({
      planId,
      billingCycle,
      amount,
      orderId,
      paymentKey: paymentResult.paymentKey,
      nextBillingDate: nextBillingDate.toISOString(),
      subscription: {
        status: 'active',
        currentPeriodStart: currentDate.toISOString(),
        currentPeriodEnd: nextBillingDate.toISOString(),
      },
    }, `Successfully subscribed to ${plan.name} plan`);
  } catch (error: any) {
    logger.error('Payment execution failed', error, { context: 'PAYMENT' });
    return ApiErrors.badRequest(error.message || 'Payment failed');
  }
});

// GET - Check subscription status
export const GET = withErrorHandling(async (request: NextRequest) => {
  const cookieStore = cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  const accessToken = cookieStore.get('access_token')?.value;

  // Check authentication
  if (!authToken && !accessToken) {
    logger.warn('Subscription status check without authentication');
    return ApiErrors.unauthorized();
  }

  // Get subscription info from cookies (in production, get from database)
  const planId = cookieStore.get('subscription_plan')?.value || 'free';
  const billingCycle = cookieStore.get('subscription_cycle')?.value || 'monthly';
  const billingKey = cookieStore.get('billing_key')?.value;

  const plan = SUBSCRIPTION_PLANS[planId as PlanId];

  logger.debug('Fetching subscription status', { planId, billingCycle });

  return apiSuccess({
    planId,
    planName: plan?.name || 'Free',
    billingCycle,
    hasPaymentMethod: !!billingKey,
    features: plan?.features || SUBSCRIPTION_PLANS.free.features,
  }, 'Subscription status retrieved');
});