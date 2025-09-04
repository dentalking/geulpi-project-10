'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSelector from '@/components/LanguageSelector';

export default function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planFromUrl = searchParams?.get('plan') || null;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const errorParam = searchParams?.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'auth_failed':
          setError(t('auth.authFailed'));
          break;
        case 'session_expired':
          setError(t('auth.sessionExpired'));
          break;
        default:
          setError(t('common.error'));
      }
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    // 실제 Google OAuth 로그인
    window.location.href = '/api/auth/login';
  };

  const handleEmailContinue = () => {
    if (!email) {
      setError(t('auth.emailRequired'));
      return;
    }
    if (!email.includes('@')) {
      setError(t('auth.emailInvalid'));
      return;
    }
    setError(null);
    setShowEmailLogin(true);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError(t('auth.passwordRequired'));
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // Email login logic here
      console.log('Email login:', email, password);
    } catch (error) {
      console.error('Email login error:', error);
      setError(t('auth.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href={`/${locale}/landing`} className="flex items-center gap-3 group">
            <div className="relative">
              <Logo size={32} className="transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-xl opacity-0 group-hover:opacity-50 transition-opacity" />
            </div>
            <span className="text-2xl font-medium" style={{ color: 'var(--text-primary)' }}>GEULPI</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <Link
              href={`/${locale}/landing`}
              className="text-sm hover:opacity-100 transition-opacity opacity-80"
            >
              {t('landing.navigation.serviceIntro')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full filter blur-3xl dark:from-purple-500/10 dark:to-pink-500/10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl dark:bg-purple-500/5"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/10 rounded-full filter blur-3xl dark:bg-pink-500/5"></div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Plan Selection Indicator */}
          {planFromUrl && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-2xl mb-6 text-center text-sm"
              style={{ color: 'var(--text-on-accent)' }}
            >
              {planFromUrl === 'pro' && t('login.planSelected.pro')}
              {planFromUrl === 'team' && t('login.planSelected.team')}
              {planFromUrl === 'free' && t('login.planSelected.free')}
            </motion.div>
          )}

          {/* Header */}
          <div className="mb-12 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center justify-center gap-3 mb-6"
            >
              <Logo size={56} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="text-5xl font-light mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              {showEmailLogin ? t('login.title.login') : t('login.title.getStarted')}
            </motion.h1>
            <p className="text-xl font-light" style={{ color: 'var(--text-tertiary)' }}>
              {showEmailLogin ? t('login.subtitle.loginAccount') : t('login.subtitle.newTimeManagement')}
            </p>
          </div>

          {/* Login Card */}
          <div
            className="p-8 rounded-3xl relative"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
              WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
              border: '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-3 text-sm text-red-400 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                {error}
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {!showEmailLogin ? (
                <motion.div
                  key="email-input"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <input
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleEmailContinue()}
                    className="w-full px-6 py-4 rounded-full mb-4 transition-all"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)'
                    }}
                  />

                  <button
                    onClick={handleEmailContinue}
                    className="w-full py-4 font-medium rounded-full transition-all duration-200 mb-4"
                    style={{
                      background: 'var(--btn-primary-bg)',
                      color: 'var(--btn-primary-text)'
                    }}
                  >
                    {t('login.continue')}
                  </button>

                  <div className="text-center text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
                    {t('login.noAccount')}{' '}
                    <a href="#" className="hover:opacity-100 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
                      {t('login.signUp')}
                    </a>
                  </div>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" style={{ borderColor: 'var(--border-default)' }}></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 backdrop-blur-sm rounded-full" style={{ background: 'var(--surface-primary)', color: 'var(--text-tertiary)' }}>{t('login.or')}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center py-4 px-6 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      style={{
                        background: 'var(--surface-primary)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--text-primary)' }}></div>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          {t('login.continueWithGoogle')}
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      disabled
                      className="w-full flex items-center justify-center py-4 px-6 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      style={{
                        background: 'var(--surface-primary)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      {t('login.continueWithApple')}
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      disabled
                      className="w-full flex items-center justify-center py-4 px-6 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      style={{
                        background: 'var(--surface-primary)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 16 16">
                        <path fill="currentColor" d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
                      </svg>
                      {t('login.continueWithMicrosoft')}
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="password-input"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleEmailLogin}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailLogin(false);
                      setPassword('');
                      setError(null);
                    }}
                    className="flex items-center gap-2 text-sm mb-6 hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t('login.changeEmail')}
                  </button>

                  <div className="mb-6 p-4 rounded-2xl" style={{ background: 'var(--surface-primary)', border: '1px solid var(--glass-border)' }}>
                    <p className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>{t('login.loginEmail')}</p>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{email}</p>
                  </div>

                  <div className="relative mb-6">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('login.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-6 py-4 rounded-full pr-14 transition-all"
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--input-border)',
                        color: 'var(--text-primary)'
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                    style={{
                      background: 'var(--btn-primary-bg)',
                      color: 'var(--btn-primary-text)'
                    }}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 mx-auto" style={{ borderColor: 'var(--btn-primary-text)' }}></div>
                    ) : (
                      t('login.loginButton')
                    )}
                  </button>

                  <div className="text-center">
                    <a href="#" className="text-sm hover:opacity-100 transition-opacity" style={{ color: 'var(--text-tertiary)' }}>
                      {t('login.forgotPassword')}
                    </a>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Terms */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-8 text-center text-xs"
            style={{ color: 'var(--text-quaternary)' }}
          >
            <div className="flex items-center justify-center gap-4">
              <Link href="/terms" className="hover:opacity-80 transition-opacity">
                {t('login.termsOfService')}
              </Link>
              <span>·</span>
              <Link href="/privacy" className="hover:opacity-80 transition-opacity">
                {t('login.privacyPolicy')}
              </Link>
              <span>·</span>
              <Link href="/support" className="hover:opacity-80 transition-opacity">
                {t('login.help')}
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Security Badge */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-quaternary)' }}>
        <span>🔒</span>
        <span>{t('login.sslProtection')}</span>
      </div>
    </div>
  );
}