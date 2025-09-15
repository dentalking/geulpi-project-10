import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { issueBillingKey } from '@/lib/toss-payments';
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
    
    // Get user info
    let userId: string;
    if (authToken) {
      const user = await verifyToken(authToken);
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Invalid authentication token' },
          { status: 401 }
        );
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
    
    // Validate input
    if (!cardNumber || !cardExpiryYear || !cardExpiryMonth || !cardPassword || !birthOrBusinessNumber) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Generate customer key (unique identifier for the user)
    const customerKey = `customer_${userId}_${Date.now()}`;
    
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
      
      // Store billing key in database (you'll need to implement this)
      // For now, we'll store it in cookies (not recommended for production)
      cookieStore.set('billing_key', billingKeyData.billingKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      
      cookieStore.set('customer_key', customerKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      
      return NextResponse.json({
        success: true,
        message: 'Billing key issued successfully',
        data: {
          billingKey: billingKeyData.billingKey,
          cardNumber: billingKeyData.card.number, // Masked card number
          cardCompany: billingKeyData.card.company,
        },
      });
    } catch (error: any) {
      console.error('Billing key issuance failed:', error);
      return NextResponse.json(
        { 
          success: false, 
          message: error.message || 'Failed to register card',
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