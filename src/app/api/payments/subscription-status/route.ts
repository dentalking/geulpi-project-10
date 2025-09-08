import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // In a real app, this would fetch from a database
    // For now, we'll use cookies as a simple storage
    const cookieStore = cookies();
    const subscriptionData = cookieStore.get('subscription');
    
    if (!subscriptionData) {
      return NextResponse.json({
        plan: 'free',
        billingCycle: null,
        nextBillingDate: null,
        status: 'active'
      });
    }

    const subscription = JSON.parse(subscriptionData.value);
    
    return NextResponse.json({
      plan: subscription.plan || 'free',
      billingCycle: subscription.billingCycle || null,
      nextBillingDate: subscription.nextBillingDate || null,
      status: subscription.status || 'active'
    });
  } catch (error) {
    console.error('Failed to get subscription status:', error);
    return NextResponse.json({
      plan: 'free',
      billingCycle: null,
      nextBillingDate: null,
      status: 'active'
    });
  }
}