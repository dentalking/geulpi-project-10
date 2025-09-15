'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import { ErrorTestButton } from '@/components/ErrorTestButton';

function AuthChecker() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('common');

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.authenticated) {
          router.push(`/${locale}/dashboard`);
        } else {
          router.push(`/${locale}/landing`);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push(`/${locale}/landing`);
      }
    };

    checkAuthAndRedirect();
  }, [router, locale]);

  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-primary, #000000)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background gradient animation */}
      <motion.div 
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(ellipse 800px 400px at 50% -30%, rgba(139, 92, 246, 0.1), transparent)',
            'radial-gradient(ellipse 800px 400px at 60% -20%, rgba(139, 92, 246, 0.15), transparent)',
            'radial-gradient(ellipse 800px 400px at 40% -25%, rgba(236, 72, 153, 0.1), transparent)',
            'radial-gradient(ellipse 800px 400px at 50% -30%, rgba(139, 92, 246, 0.1), transparent)',
          ]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      <div className="text-center relative z-10">
        {/* Logo with optimized animation */}
        <motion.div 
          className="mb-6 flex justify-center"
          initial={{ scale: 1, rotate: 0 }}
          animate={{ 
            rotate: [0, 3, -3, 0],
            scale: [1, 1.02, 1]
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: 'easeInOut',
            repeatType: 'loop'
          }}
          style={{ transform: 'translateZ(0)' }}
        >
          <Logo size={64} color="currentColor" className="drop-shadow-2xl" />
        </motion.div>

        {/* Loading indicator */}
        <motion.div className="mb-4">
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ background: 'var(--text-primary)' }}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut'
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Loading text with improved contrast */}
        <motion.p 
          className="text-white/90 text-sm font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          role="status"
          aria-live="polite"
        >
          {t('loading')}
        </motion.p>

        {/* Subtle subtext */}
        <motion.p 
          className="text-xs mt-2"
          style={{ color: 'var(--text-quaternary)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          AI Calendar Assistant
        </motion.p>
      </div>
    </motion.div>
  );
}

export default function Home() {
  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary, #000000)' }}>
          <div className="text-center">
            <Logo size={64} color="white" className="mb-6 mx-auto opacity-50" />
            <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          </div>
        </div>
      }>
        <AuthChecker />
      </Suspense>
      <ErrorTestButton />
    </>
  );
}