'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSelector from '@/components/LanguageSelector';

interface PasswordStrength {
  score: number;
  feedback: string[];
}

function checkPasswordStrength(password: string): PasswordStrength {
  const feedback = [];
  let score = 0;
  
  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('At least 8 characters');
  }
  
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('Include uppercase letter');
  }
  
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push('Include lowercase letter');
  }
  
  if (/[0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('Include a number');
  }
  
  if (/[^A-Za-z0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('Include special character');
  }
  
  return { score, feedback };
}

export default function RegisterPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  
  const passwordStrength = checkPasswordStrength(password);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordsMatch = password === confirmPassword && password !== '';
  const isFormValid = emailValid && passwordStrength.score >= 3 && passwordsMatch && name.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Register user
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      
      const signupData = await signupResponse.json();
      
      if (!signupResponse.ok) {
        throw new Error(signupData.error || 'Registration failed');
      }
      
      // Auto-login after successful registration
      const loginResponse = await fetch('/api/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const loginData = await loginResponse.json();
      
      if (loginResponse.ok && loginData.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${locale}/dashboard`);
        }, 1500);
      } else {
        // Registration successful but login failed
        router.push(`/${locale}/login?registered=true`);
      }
    } catch (err: any) {
      setError(err.message);
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
            <Logo size={32} className="transition-transform group-hover:scale-110" />
            <span className="text-2xl font-medium">GEULPI</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <Link href={`/${locale}/login`} className="text-sm hover:opacity-100 transition-opacity opacity-80">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full filter blur-3xl" 
             style={{ background: 'var(--effect-gradient)' }}></div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="mb-8 text-center">
            <Logo size={56} className="mx-auto mb-4" />
            <h1 className="text-4xl font-light mb-2">Create Account</h1>
            <p className="text-lg" style={{ color: 'var(--text-tertiary)' }}>
              Start managing your time intelligently
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-2xl flex items-center gap-3"
              style={{ 
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}
            >
              <Check className="text-green-500" />
              <span className="text-green-500">Account created successfully! Redirecting...</span>
            </motion.div>
          )}

          {/* Registration Card */}
          <div className="p-8 rounded-3xl relative" 
               style={{
                 background: 'var(--glass-bg)',
                 backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                 WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                 border: '1px solid var(--glass-border)',
                 boxShadow: 'var(--glass-shadow)'
               }}>
            
            {/* Error Message */}
            {error && (
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field */}
              <div>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-6 py-4 rounded-full transition-all"
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              {/* Email Field */}
              <div>
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  className="w-full px-6 py-4 rounded-full transition-all"
                  style={{
                    background: 'var(--input-bg)',
                    border: emailTouched && !emailValid ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
                {emailTouched && !emailValid && email && (
                  <p className="text-xs text-red-500 mt-2 ml-4">Please enter a valid email address</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password *"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    className="w-full px-6 py-4 rounded-full pr-14 transition-all"
                    style={{
                      background: 'var(--input-bg)',
                      border: passwordTouched && passwordStrength.score < 3 ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--input-border)',
                      color: 'var(--text-primary)'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-3 px-4">
                    <div className="flex gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all"
                          style={{
                            background: i < passwordStrength.score 
                              ? passwordStrength.score <= 2 ? '#ef4444' 
                              : passwordStrength.score <= 3 ? '#f59e0b' 
                              : '#22c55e'
                              : 'var(--border-default)'
                          }}
                        />
                      ))}
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <ul className="text-xs space-y-1" style={{ color: 'var(--text-tertiary)' }}>
                        {passwordStrength.feedback.slice(0, 2).map((item, idx) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm Password *"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setConfirmPasswordTouched(true)}
                    className="w-full px-6 py-4 rounded-full pr-14 transition-all"
                    style={{
                      background: 'var(--input-bg)',
                      border: confirmPasswordTouched && !passwordsMatch ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--input-border)',
                      color: 'var(--text-primary)'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {confirmPasswordTouched && !passwordsMatch && confirmPassword && (
                  <p className="text-xs text-red-500 mt-2 ml-4">Passwords do not match</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full py-4 font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isFormValid ? 'var(--btn-primary-bg)' : 'var(--border-default)',
                  color: isFormValid ? 'var(--btn-primary-text)' : 'var(--text-tertiary)'
                }}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 mx-auto" 
                       style={{ borderColor: 'var(--btn-primary-text)' }}></div>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Sign In Link */}
              <div className="text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Already have an account?{' '}
                <Link href={`/${locale}/login`} className="underline hover:opacity-100 transition-opacity">
                  Sign in
                </Link>
              </div>
            </form>
          </div>

          {/* Terms */}
          <div className="mt-6 text-center text-xs" style={{ color: 'var(--text-quaternary)' }}>
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline">Terms of Service</Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline">Privacy Policy</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}