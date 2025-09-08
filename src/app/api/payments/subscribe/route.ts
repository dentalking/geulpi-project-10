import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { executePayment, SUBSCRIPTION_PLANS, type PlanId, type BillingCycle } from '@/lib/toss-payments';
import { verifyToken } from '@/lib/auth/email-auth';

// Generate unique order ID
function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `ORDER_${timestamp}_${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const accessToken = cookieStore.get('access_token')?.value;
    const billingKey = cookieStore.get('billing_key')?.value;
    const customerKey = cookieStore.get('customer_key')?.value;
    
    // Check authentication
    if (!authToken && !accessToken) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check billing key
    if (!billingKey || !customerKey) {
      return NextResponse.json(
        { success: false, message: 'No payment method registered. Please add a card first.' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { planId, billingCycle }: { planId: PlanId; billingCycle: BillingCycle } = body;
    
    // Validate plan
    if (!SUBSCRIPTION_PLANS[planId]) {
      return NextResponse.json(
        { success: false, message: 'Invalid plan selected' },
        { status: 400 }
      );
    }
    
    const plan = SUBSCRIPTION_PLANS[planId];
    const amount = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    
    // Skip payment for free plan
    if (amount === 0) {
      // Update user's subscription status (implement database update)
      return NextResponse.json({
        success: true,
        message: 'Successfully subscribed to Free plan',
        data: {
          planId,
          billingCycle,
          amount: 0,
          nextBillingDate: null,
        },
      });
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
      
      // Store subscription info (you'll need to implement database storage)
      // For now, we'll store in cookies (not recommended for production)
      cookieStore.set('subscription_plan', planId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
      
      cookieStore.set('subscription_cycle', billingCycle, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
      
      return NextResponse.json({
        success: true,
        message: `Successfully subscribed to ${plan.name} plan`,
        data: {
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
        },
      });
    } catch (error: any) {
      console.error('Payment execution failed:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: error.message || 'Payment failed',
          code: error.code 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check subscription status
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const accessToken = cookieStore.get('access_token')?.value;
    
    // Check authentication
    if (!authToken && !accessToken) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get subscription info from cookies (in production, get from database)
    const planId = cookieStore.get('subscription_plan')?.value || 'free';
    const billingCycle = cookieStore.get('subscription_cycle')?.value || 'monthly';
    const billingKey = cookieStore.get('billing_key')?.value;
    
    const plan = SUBSCRIPTION_PLANS[planId as PlanId];
    
    return NextResponse.json({
      success: true,
      data: {
        planId,
        planName: plan?.name || 'Free',
        billingCycle,
        hasPaymentMethod: !!billingKey,
        features: plan?.features || SUBSCRIPTION_PLANS.free.features,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}