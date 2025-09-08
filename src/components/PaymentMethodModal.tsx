'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Lock, AlertCircle } from 'lucide-react';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  locale?: string;
}

export function PaymentMethodModal({ isOpen, onClose, onSuccess, locale = 'ko' }: PaymentMethodModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardExpiryMonth: '',
    cardExpiryYear: '',
    cardPassword: '',
    birthDate: '',
  });

  const messages = {
    ko: {
      title: '카드 등록',
      subtitle: '구독 결제를 위한 카드를 등록해주세요',
      cardNumber: '카드 번호',
      cardNumberPlaceholder: '0000 0000 0000 0000',
      expiry: '유효기간',
      expiryPlaceholder: 'MM/YY',
      password: '카드 비밀번호 앞 2자리',
      passwordPlaceholder: '••',
      birthDate: '생년월일 (6자리)',
      birthDatePlaceholder: 'YYMMDD',
      businessNumber: '또는 사업자번호',
      secure: '안전한 결제',
      secureDesc: '카드 정보는 암호화되어 안전하게 보관됩니다',
      register: '카드 등록',
      cancel: '취소',
      processing: '처리 중...',
    },
    en: {
      title: 'Add Payment Method',
      subtitle: 'Register your card for subscription payments',
      cardNumber: 'Card Number',
      cardNumberPlaceholder: '0000 0000 0000 0000',
      expiry: 'Expiry Date',
      expiryPlaceholder: 'MM/YY',
      password: 'Card Password (First 2 digits)',
      passwordPlaceholder: '••',
      birthDate: 'Birth Date (YYMMDD)',
      birthDatePlaceholder: 'YYMMDD',
      businessNumber: 'Or Business Number',
      secure: 'Secure Payment',
      secureDesc: 'Your card information is encrypted and stored securely',
      register: 'Register Card',
      cancel: 'Cancel',
      processing: 'Processing...',
    }
  };

  const t = messages[locale as keyof typeof messages] || messages.ko;

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substring(0, 19);
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
    }
    return cleaned;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'cardNumber') {
      formattedValue = formatCardNumber(value);
    } else if (name === 'expiry') {
      formattedValue = formatExpiry(value);
      const [month, year] = formattedValue.split('/');
      setFormData(prev => ({
        ...prev,
        cardExpiryMonth: month || '',
        cardExpiryYear: year ? `20${year}` : '',
      }));
      return;
    } else if (name === 'cardPassword') {
      formattedValue = value.substring(0, 2);
    } else if (name === 'birthDate') {
      formattedValue = value.replace(/\D/g, '').substring(0, 6);
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/payments/billing-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardNumber: formData.cardNumber.replace(/\s/g, ''),
          cardExpiryMonth: formData.cardExpiryMonth,
          cardExpiryYear: formData.cardExpiryYear,
          cardPassword: formData.cardPassword,
          birthOrBusinessNumber: formData.birthDate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.data);
        onClose();
      } else {
        setError(data.message || 'Failed to register card');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl z-50 w-full max-w-md p-6"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold">{t.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.cardNumber}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                    placeholder={t.cardNumberPlaceholder}
                    className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.expiry}
                  </label>
                  <input
                    type="text"
                    name="expiry"
                    value={formData.cardExpiryMonth && formData.cardExpiryYear ? 
                      `${formData.cardExpiryMonth}/${formData.cardExpiryYear.substring(2)}` : ''
                    }
                    onChange={handleInputChange}
                    placeholder={t.expiryPlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t.password}
                  </label>
                  <input
                    type="password"
                    name="cardPassword"
                    value={formData.cardPassword}
                    onChange={handleInputChange}
                    placeholder={t.passwordPlaceholder}
                    maxLength={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.birthDate}
                </label>
                <input
                  type="text"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  placeholder={t.birthDatePlaceholder}
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{t.businessNumber}</p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Lock className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{t.secure}</p>
                  <p className="text-xs text-gray-500">{t.secureDesc}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? t.processing : t.register}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}