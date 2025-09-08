'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Crown, CreditCard, ChevronRight, Check } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/toss-payments';

interface SubscriptionStatusProps {
  onManageClick: () => void;
  compact?: boolean;
}

export function SubscriptionStatus({ onManageClick, compact = false }: SubscriptionStatusProps) {
  const t = useTranslations();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | null>(null);
  const [nextBillingDate, setNextBillingDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/payments/subscription-status');
      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.plan || 'free');
        setBillingCycle(data.billingCycle || null);
        setNextBillingDate(data.nextBillingDate ? new Date(data.nextBillingDate) : null);
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const planInfo = SUBSCRIPTION_PLANS[currentPlan as keyof typeof SUBSCRIPTION_PLANS];
  const isPro = currentPlan !== 'free';

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={onManageClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
          isPro 
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        <Crown className={`w-4 h-4 ${isPro ? 'text-yellow-300' : ''}`} />
        <span className="text-sm font-medium">
          {planInfo?.name || 'Free'}
        </span>
        <ChevronRight className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div 
      className="p-4 rounded-xl border backdrop-blur-xl cursor-pointer transition-all hover:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      onClick={onManageClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Crown className={`w-5 h-5 ${isPro ? 'text-yellow-500' : 'text-gray-400'}`} />
            <h3 className="font-semibold text-lg">
              {planInfo?.name || 'Free'} {t('subscription.plan')}
            </h3>
          </div>
          
          {isPro && billingCycle && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="mb-1">
                {billingCycle === 'monthly' ? t('subscription.monthly') : t('subscription.yearly')}
              </p>
              {nextBillingDate && (
                <p>
                  {t('subscription.nextBilling')}: {nextBillingDate.toLocaleDateString()}
                </p>
              )}
            </div>
          )}
          
          {!isPro && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('subscription.upgradeToPro')}
            </p>
          )}
        </div>
        
        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
      </div>
      
      {isPro && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Check className="w-4 h-4 text-green-500" />
            <span>{t('subscription.features.unlimited')}</span>
          </div>
        </div>
      )}
    </div>
  );
}