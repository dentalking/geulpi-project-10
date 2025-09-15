import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';

export async function POST(request: NextRequest) {
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
    
    const planId = cookieStore.get('subscription_plan')?.value;
    
    if (!planId || planId === 'free') {
      return NextResponse.json(
        { success: false, message: 'No active subscription found' },
        { status: 400 }
      );
    }
    
    // In production, you would:
    // 1. Update database to mark subscription as cancelled
    // 2. Set cancelAtPeriodEnd = true to cancel at the end of billing period
    // 3. Stop future automatic payments
    
    // For now, we'll just clear the cookies
    cookieStore.delete('subscription_plan');
    cookieStore.delete('subscription_cycle');
    cookieStore.delete('billing_key');
    cookieStore.delete('customer_key');
    
    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully. You will have access until the end of the current billing period.',
      data: {
        cancelledAt: new Date().toISOString(),
        accessUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
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

// DELETE endpoint to remove payment method
export async function DELETE(request: NextRequest) {
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
    
    const billingKey = cookieStore.get('billing_key')?.value;
    
    if (!billingKey) {
      return NextResponse.json(
        { success: false, message: 'No payment method found' },
        { status: 400 }
      );
    }
    
    // In production, you would:
    // 1. Call Toss Payments API to revoke the billing key
    // 2. Remove billing key from database
    
    // Clear billing key cookies
    cookieStore.delete('billing_key');
    cookieStore.delete('customer_key');
    
    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}