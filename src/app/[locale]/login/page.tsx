'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Check, X, AlertTriangle, Lock, Shield } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSelector from '@/components/LanguageSelector';
import { EmailField, PasswordField } from '@/components/ui';
import { ScrollAnimation } from '@/components/ScrollAnimation';

export default function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planFromUrl = searchParams?.get('plan') || null;
  const registered = searchParams?.get('registered') === 'true';
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Security state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const isFormValid = emailValid && passwordValid;

  useEffect(() => {
    if (registered) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    }
    
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
  }, [searchParams, registered]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    window.location.href = '/api/auth/login';
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      setEmailTouched(true);
      setPasswordTouched(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setFailedAttempts(0);
        setShowSecurityWarning(false);
        setTimeout(() => {
          router.push(`/${locale}/dashboard`);
        }, 1000);
      } else if (response.ok && data.requires2FA) {
        // 2FA required - redirect to verification page
        router.push(`/${locale}/verify-2fa?token=${data.pendingToken}`);
        return;
      } else {
        // Handle different error scenarios
        if (response.status === 423) {
          // Account locked
          setIsAccountLocked(true);
          const lockMinutes = parseInt(data.error.match(/\d+/)?.[0] || '15');
          setLockTimeRemaining(lockMinutes);
          setError(data.error);
        } else if (response.status === 429) {
          // Rate limited
          setShowSecurityWarning(true);
          setError(data.error);
        } else {
          // Invalid credentials
          setFailedAttempts(prev => prev + 1);
          setError(data.error || t('auth.invalidCredentials'));
          
          // Show warning after 3 failed attempts
          if (failedAttempts >= 2) {
            setShowSecurityWarning(true);
          }
        }
      }
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full filter blur-3xl" style={{ background: 'var(--effect-gradient)' }}></div>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full filter blur-3xl" style={{ background: 'var(--effect-purple)' }}></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full filter blur-3xl" style={{ background: 'var(--effect-pink)' }}></div>
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
              {t('login.title.login')}
            </motion.h1>
            <p className="text-xl font-light" style={{ color: 'var(--text-tertiary)' }}>
              {t('login.subtitle.loginAccount')}
            </p>
          </div>

          {/* Login Card with scroll animation */}
          <ScrollAnimation animation="fadeUp" delay={0.2}>
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
            {/* Account Locked Warning */}
            {isAccountLocked && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 rounded-xl"
                style={{ 
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <div className="flex items-start gap-3">
                  <Lock className="h-6 w-6 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-500 mb-1">Account Temporarily Locked</h4>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Your account has been locked due to multiple failed login attempts.
                      Please wait {lockTimeRemaining} minutes before trying again.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Security Warning */}
            {showSecurityWarning && !isAccountLocked && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-3 rounded-xl"
                style={{ 
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)'
                }}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {failedAttempts >= 3 
                      ? `Warning: ${5 - failedAttempts} attempts remaining before account lock`
                      : 'Multiple login attempts detected. Your account will be locked after 5 failed attempts.'}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Success Message */}
            {(success || registered) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-3 rounded-xl flex items-center gap-2"
                style={{ 
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}
              >
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-green-500 text-sm">
                  {registered ? 'Account created! Please login.' : 'Login successful! Redirecting...'}
                </span>
              </motion.div>
            )}
            
            {/* Error Message */}
            {error && !isAccountLocked && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-3 rounded-xl flex items-center gap-2"
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}
              >
                <X className="h-5 w-5 text-red-500" />
                <span className="text-red-500 text-sm">{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
              {/* Enhanced Email Field with validation */}
              <EmailField
                name="email"
                label=""
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  setError(null);
                }}
                helper=""
                showSuccessState
                className="w-full"
              />

              {/* Enhanced Password Field with validation */}
              <PasswordField
                name="password"
                label=""
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  setError(null);
                }}
                helper=""
                className="w-full"
              />

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-2 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                    style={{
                      borderColor: 'var(--border-default)',
                      backgroundColor: rememberMe ? 'var(--accent-primary)' : 'transparent'
                    }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Remember me for 30 days
                  </span>
                </label>
                
                <Link 
                  href={`/${locale}/forgot-password`}
                  className="text-sm hover:underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || (emailTouched && passwordTouched && !isFormValid)}
                className="w-full py-4 font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isFormValid || (!emailTouched && !passwordTouched) ? 'var(--btn-primary-bg)' : 'var(--border-default)',
                  color: isFormValid || (!emailTouched && !passwordTouched) ? 'var(--btn-primary-text)' : 'var(--text-tertiary)'
                }}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 mx-auto" 
                       style={{ borderColor: 'var(--btn-primary-text)' }}></div>
                ) : (
                  t('login.loginButton')
                )}
              </button>

              {/* Forgot Password */}
              <div className="text-center">
                <a href="#" className="text-sm hover:opacity-100 transition-opacity" 
                   style={{ color: 'var(--text-tertiary)' }}>
                  {t('login.forgotPassword')}
                </a>
              </div>

              {/* Sign Up Link */}
              <div className="text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {t('login.noAccount')}{' '}
                <Link 
                  href={`/${locale}/register`}
                  className="hover:opacity-100 transition-opacity underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t('login.signUp')}
                </Link>
              </div>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--border-default)' }}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 backdrop-blur-sm rounded-full" 
                      style={{ background: 'var(--surface-primary)', color: 'var(--text-tertiary)' }}>
                  {t('login.or')}
                </span>
              </div>
            </div>

            {/* Social Login Buttons */}
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
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2" 
                       style={{ borderColor: 'var(--text-primary)' }}></div>
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
          </div>
          </ScrollAnimation>

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