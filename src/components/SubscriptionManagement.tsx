'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, Crown, Check, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/toss-payments';
import { PaymentMethodModal } from './PaymentMethodModal';
import { useToastContext } from '@/providers/ToastProvider';

interface SubscriptionManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionManagement({ isOpen, onClose }: SubscriptionManagementProps) {
  const t = useTranslations();
  const { toast } = useToastContext();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSubscriptionStatus();
      checkPaymentMethod();
    }
  }, [isOpen]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/payments/subscription-status');
      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.plan || 'free');
        setBillingCycle(data.billingCycle || 'monthly');
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    }
  };

  const checkPaymentMethod = () => {
    const billingKey = document.cookie
      .split('; ')
      .find(row => row.startsWith('billingKey='))
      ?.split('=')[1];
    setHasPaymentMethod(!!billingKey);
  };

  const handleSubscribe = async (planId: string) => {
    if (!hasPaymentMethod) {
      setShowPaymentModal(true);
      return;
    }

    setLoading(true);
    try {
      const billingKey = document.cookie
        .split('; ')
        .find(row => row.startsWith('billingKey='))
        ?.split('=')[1];

      const response = await fetch('/api/payments/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          billingKey
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('subscription.upgraded'));
        setCurrentPlan(planId);
        onClose();
      } else {
        toast.error(data.message || t('subscription.upgradeFailed'));
      }
    } catch (error) {
      toast.error(t('subscription.upgradeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm(t('subscription.cancelConfirm'))) return;

    setCancelling(true);
    try {
      const response = await fetch('/api/payments/cancel', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t('subscription.cancelled'));
        setCurrentPlan('free');
        onClose();
      } else {
        toast.error(data.message || t('subscription.cancelFailed'));
      }
    } catch (error) {
      toast.error(t('subscription.cancelFailed'));
    } finally {
      setCancelling(false);
    }
  };

  if (!isOpen) return null;

  const plans = Object.values(SUBSCRIPTION_PLANS);
  const features = {
    free: [
      t('subscription.features.basicCalendar'),
      t('subscription.features.limitedAI'),
      t('subscription.features.5EventsPerMonth')
    ],
    pro: [
      t('subscription.features.unlimitedEvents'),
      t('subscription.features.advancedAI'),
      t('subscription.features.prioritySupport'),
      t('subscription.features.customReminders'),
      t('subscription.features.teamSharing')
    ],
    team: [
      t('subscription.features.everything'),
      t('subscription.features.teamManagement'),
      t('subscription.features.analytics'),
      t('subscription.features.apiAccess'),
      t('subscription.features.dedicatedSupport')
    ]
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        
        <div 
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
          style={{ background: 'var(--bg-primary)' }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 backdrop-blur-xl border-b p-6"
               style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-yellow-500" />
                <h2 className="text-2xl font-bold">{t('subscription.managePlan')}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="p-6 border-b" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  billingCycle === 'monthly' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {t('subscription.monthly')}
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  billingCycle === 'yearly' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {t('subscription.yearly')}
                <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">
                  -17%
                </span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrentPlan = plan.id === currentPlan;
                const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
                const monthlyPrice = billingCycle === 'yearly' ? Math.floor(plan.priceYearly / 12) : plan.priceMonthly;
                
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-xl border-2 p-6 transition-all ${
                      isCurrentPlan 
                        ? 'border-blue-500 shadow-lg scale-105' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    style={{ background: 'var(--surface-primary)' }}
                  >
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
                          {t('subscription.currentPlan')}
                        </span>
                      </div>
                    )}
                    
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <div className="text-3xl font-bold">
                        {price === 0 ? (
                          t('subscription.free')
                        ) : (
                          <>
                            ₩{monthlyPrice.toLocaleString()}
                            <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
                              /{t('subscription.month')}
                            </span>
                          </>
                        )}
                      </div>
                      {billingCycle === 'yearly' && price > 0 && (
                        <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                          ₩{price.toLocaleString()} {t('subscription.billedYearly')}
                        </div>
                      )}
                    </div>
                    
                    <ul className="space-y-3 mb-6">
                      {features[plan.id as keyof typeof features]?.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {!isCurrentPlan && plan.id !== 'free' && (
                      <button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={loading}
                        className="w-full py-3 rounded-lg font-medium transition-all bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                      >
                        {loading ? t('common.loading') : t('subscription.upgrade')}
                      </button>
                    )}
                    
                    {isCurrentPlan && plan.id !== 'free' && (
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="w-full py-3 rounded-lg font-medium transition-all border border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        {cancelling ? t('common.loading') : t('subscription.cancel')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Method Section */}
          {!hasPaymentMethod && (
            <div className="p-6 border-t" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm">{t('subscription.noPaymentMethod')}</span>
                </div>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all"
                >
                  {t('subscription.addPaymentMethod')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Method Modal */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          checkPaymentMethod();
        }}
        onSuccess={() => {
          setShowPaymentModal(false);
          checkPaymentMethod();
          toast.success(t('subscription.paymentMethodAdded'));
        }}
      />
    </>
  );
}