'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Check, X, AlertCircle, Shield, KeyRound } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';
import { ScrollAnimation } from '@/components/ScrollAnimation';

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
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
  
  let color = '#ef4444'; // red
  if (score >= 4) color = '#22c55e'; // green
  else if (score >= 3) color = '#eab308'; // yellow
  else if (score >= 2) color = '#f97316'; // orange
  
  return { score, feedback, color };
}

export default function ResetPasswordPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const passwordStrength = checkPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && password !== '';
  const isFormValid = passwordStrength.score >= 3 && passwordsMatch;
  
  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenError('No reset token provided');
      setIsValidating(false);
      return;
    }
    
    validateToken();
  }, [token]);
  
  const validateToken = async () => {
    try {
      const response = await fetch(`/api/auth/reset-password?token=${token}`);
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setTokenValid(true);
        setEmail(data.email || '');
      } else {
        setTokenError(data.error || 'Invalid or expired reset token');
      }
    } catch (error) {
      setTokenError('Failed to validate reset token');
    } finally {
      setIsValidating(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: password,
          confirmPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/${locale}/login`);
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center" 
           style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
               style={{ borderColor: 'var(--accent-primary)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Validating reset token...</p>
        </div>
      </div>
    );
  }
  
  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center" 
           style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4"
        >
          <div className="p-8 rounded-3xl text-center"
               style={{
                 background: 'var(--glass-bg)',
                 backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                 WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                 border: '1px solid var(--glass-border)',
                 boxShadow: 'var(--glass-shadow)'
               }}>
            
            {/* Error Icon */}
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                 style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            
            <h2 className="text-2xl font-semibold mb-4">Invalid Reset Link</h2>
            
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              {tokenError || 'This password reset link is invalid or has expired.'}
            </p>
            
            <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
              Password reset links expire after 15 minutes for security reasons.
            </p>
            
            <Link
              href={`/${locale}/forgot-password`}
              className="inline-block px-6 py-3 rounded-full font-medium mb-4"
              style={{
                background: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)'
              }}
            >
              Request New Reset Link
            </Link>
            
            <div className="mt-4">
              <Link
                href={`/${locale}/login`}
                className="text-sm"
                style={{ color: 'var(--accent-primary)' }}
              >
                Back to login
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }
  
  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" 
           style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4"
        >
          <div className="p-8 rounded-3xl text-center"
               style={{
                 background: 'var(--glass-bg)',
                 backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                 WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                 border: '1px solid var(--glass-border)',
                 boxShadow: 'var(--glass-shadow)'
               }}>
            
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                 style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
              <Check className="w-10 h-10 text-green-500" />
            </div>
            
            <h2 className="text-2xl font-semibold mb-4">Password Reset Successful!</h2>
            
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              Your password has been reset successfully. You can now login with your new password.
            </p>
            
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Redirecting to login page...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }
  
  // Reset form
  return (
    <div className="min-h-screen relative overflow-hidden" 
         style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
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
            <h1 className="text-3xl font-bold mb-2">Create New Password</h1>
            <p className="text-lg" style={{ color: 'var(--text-tertiary)' }}>
              Your new password must be different from previous ones
            </p>
          </div>
          
          {/* Reset Card */}
          <ScrollAnimation animation="fadeUp" delay={0.2}>
            <div className="p-8 rounded-3xl"
                 style={{
                   background: 'var(--glass-bg)',
                   backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                   WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                   border: '1px solid var(--glass-border)',
                   boxShadow: 'var(--glass-shadow)'
                 }}>
              
              {/* Email Display */}
              {email && (
                <div className="mb-6 p-3 rounded-xl text-center"
                     style={{ 
                       background: 'var(--bg-tertiary)',
                       border: '1px solid var(--border-default)'
                     }}>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    Resetting password for
                  </p>
                  <p className="font-medium">{email}</p>
                </div>
              )}
              
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
                {/* New Password Field */}
                <div>
                  <label className="block text-sm font-medium mb-2" 
                         style={{ color: 'var(--text-secondary)' }}>
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 pl-11 pr-11 rounded-xl transition-all"
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                      required
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
                          style={{ color: 'var(--text-tertiary)' }} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
                      ) : (
                        <Eye className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
                      )}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                          <div 
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${(passwordStrength.score / 5) * 100}%`,
                              background: passwordStrength.color
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: passwordStrength.color }}>
                          {passwordStrength.score === 5 ? 'Strong' :
                           passwordStrength.score >= 3 ? 'Good' : 'Weak'}
                        </span>
                      </div>
                      {passwordStrength.feedback.length > 0 && (
                        <ul className="text-xs space-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
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
                  <label className="block text-sm font-medium mb-2" 
                         style={{ color: 'var(--text-secondary)' }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 pl-11 pr-11 rounded-xl transition-all"
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: confirmPassword && !passwordsMatch 
                          ? '1px solid var(--error-color)' 
                          : '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                      required
                    />
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
                              style={{ color: 'var(--text-tertiary)' }} />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
                      ) : (
                        <Eye className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
                      )}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                  )}
                  {confirmPassword && passwordsMatch && (
                    <p className="mt-1 text-xs text-green-500 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Passwords match
                    </p>
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
                    'Reset Password'
                  )}
                </button>
                
                {/* Security Note */}
                <div className="p-3 rounded-xl"
                     style={{ 
                       background: 'rgba(59, 130, 246, 0.05)',
                       border: '1px solid rgba(59, 130, 246, 0.1)'
                     }}>
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 mt-0.5" style={{ color: 'var(--accent-primary)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      After resetting your password, all existing sessions will be logged out for security.
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </ScrollAnimation>
          
          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link href={`/${locale}/login`} 
                  className="text-sm"
                  style={{ color: 'var(--accent-primary)' }}>
              Back to login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}