import { loadTossPayments } from '@tosspayments/payment-sdk';

// Toss Payments SDK 초기화
export const getTossPayments = async () => {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  
  if (!clientKey) {
    throw new Error('Toss Payments client key is not configured');
  }
  
  return await loadTossPayments(clientKey);
};

// 결제 금액 포맷팅
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
};

// 구독 플랜 정보
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    features: {
      maxEvents: 50,
      maxOCR: 10,
      teamMembers: 1,
      apiAccess: false,
      prioritySupport: false,
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 9900,
    priceYearly: 99000,
    features: {
      maxEvents: -1, // unlimited
      maxOCR: 500,
      teamMembers: 1,
      apiAccess: false,
      prioritySupport: true,
    }
  },
  team: {
    id: 'team',
    name: 'Team',
    priceMonthly: 29900,
    priceYearly: 299000,
    features: {
      maxEvents: -1, // unlimited
      maxOCR: -1, // unlimited
      teamMembers: -1, // unlimited
      apiAccess: true,
      prioritySupport: true,
    }
  }
} as const;

export type PlanId = keyof typeof SUBSCRIPTION_PLANS;
export type BillingCycle = 'monthly' | 'yearly';

// 빌링키 저장을 위한 인터페이스
export interface BillingKey {
  customerKey: string;
  billingKey: string;
  cardNumber: string; // 마스킹된 카드 번호
  cardCompany: string;
  createdAt: Date;
}

// 구독 정보 인터페이스
export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  billingCycle: BillingCycle;
  billingKey: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 결제 내역 인터페이스
export interface PaymentHistory {
  id: string;
  subscriptionId: string;
  orderId: string;
  paymentKey: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PENDING';
  failureReason?: string;
  paidAt?: Date;
  createdAt: Date;
}

// 에러 메시지
export const PAYMENT_ERROR_MESSAGES = {
  ko: {
    INVALID_CARD_NUMBER: '올바른 카드 번호를 입력해주세요.',
    INVALID_CARD_EXPIRY: '카드 유효기간을 확인해주세요.',
    INVALID_BIRTH_DATE: '생년월일을 확인해주세요.',
    CARD_DECLINED: '카드 승인이 거절되었습니다. 다른 카드를 시도해주세요.',
    INSUFFICIENT_BALANCE: '잔액이 부족합니다.',
    PAYMENT_FAILED: '결제에 실패했습니다. 잠시 후 다시 시도해주세요.',
    BILLING_KEY_FAILED: '카드 등록에 실패했습니다.',
    NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
    SUBSCRIPTION_ACTIVE: '이미 구독 중입니다.',
    NO_SUBSCRIPTION: '구독 정보를 찾을 수 없습니다.',
  },
  en: {
    INVALID_CARD_NUMBER: 'Please enter a valid card number.',
    INVALID_CARD_EXPIRY: 'Please check the card expiry date.',
    INVALID_BIRTH_DATE: 'Please check the birth date.',
    CARD_DECLINED: 'Card was declined. Please try another card.',
    INSUFFICIENT_BALANCE: 'Insufficient balance.',
    PAYMENT_FAILED: 'Payment failed. Please try again later.',
    BILLING_KEY_FAILED: 'Failed to register card.',
    NETWORK_ERROR: 'Network error occurred.',
    SUBSCRIPTION_ACTIVE: 'Already subscribed.',
    NO_SUBSCRIPTION: 'No subscription found.',
  }
} as const;

// 결제 상태 체크
export const checkPaymentStatus = async (paymentKey: string): Promise<any> => {
  const secretKey = process.env.TOSS_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('Toss Payments secret key is not configured');
  }
  
  const base64Credentials = Buffer.from(`${secretKey}:`).toString('base64');
  
  const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${base64Credentials}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to check payment status');
  }
  
  return response.json();
};

// 빌링키 발급
export const issueBillingKey = async (
  customerKey: string,
  cardNumber: string,
  cardExpiryYear: string,
  cardExpiryMonth: string,
  cardPassword: string,
  birthOrBusinessNumber: string
): Promise<any> => {
  const secretKey = process.env.TOSS_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('Toss Payments secret key is not configured');
  }
  
  const base64Credentials = Buffer.from(`${secretKey}:`).toString('base64');
  
  const response = await fetch('https://api.tosspayments.com/v1/billing/authorizations/card', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${base64Credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerKey,
      cardNumber,
      cardExpiryYear,
      cardExpiryMonth,
      cardPassword,
      customerIdentityNumber: birthOrBusinessNumber,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to issue billing key');
  }
  
  return response.json();
};

// 자동 결제 실행
export const executePayment = async (
  billingKey: string,
  customerKey: string,
  amount: number,
  orderId: string,
  orderName: string
): Promise<any> => {
  const secretKey = process.env.TOSS_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('Toss Payments secret key is not configured');
  }
  
  const base64Credentials = Buffer.from(`${secretKey}:`).toString('base64');
  
  const response = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${base64Credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerKey,
      amount,
      orderId,
      orderName,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Payment execution failed');
  }
  
  return response.json();
};