'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Check, AlertCircle, Lock } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';
import { ScrollAnimation } from '@/components/ScrollAnimation';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailValid) {
      setError('Please enter a valid email address');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.status === 429) {
        // Rate limited
        setRateLimited(true);
        setError('Too many reset attempts. Please try again later.');
      } else if (response.ok) {
        // Always show success even if email doesn't exist (security)
        setSubmitted(true);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (submitted) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" 
           style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full filter blur-3xl" 
               style={{ background: 'var(--effect-gradient)' }}></div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full mx-4"
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
              <Mail className="w-10 h-10 text-green-500" />
            </div>
            
            <h2 className="text-2xl font-semibold mb-4">Check Your Email</h2>
            
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              We've sent password reset instructions to:
            </p>
            
            <div className="p-3 rounded-xl mb-6 font-medium"
                 style={{ 
                   background: 'var(--bg-tertiary)',
                   color: 'var(--text-primary)'
                 }}>
              {email}
            </div>
            
            <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>
              The link will expire in 15 minutes for security reasons.
            </p>
            
            <div className="p-4 rounded-xl mb-6"
                 style={{ 
                   background: 'rgba(59, 130, 246, 0.05)',
                   border: '1px solid rgba(59, 130, 246, 0.2)'
                 }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail('');
                  }}
                  className="underline font-medium"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  try again
                </button>
              </p>
            </div>
            
            <Link
              href={`/${locale}/login`}
              className="inline-flex items-center gap-2 text-sm"
              style={{ color: 'var(--accent-primary)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen relative overflow-hidden" 
         style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href={`/${locale}/login`} className="flex items-center gap-3 group">
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm">Back to login</span>
          </Link>
        </div>
      </nav>
      
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full filter blur-3xl" 
             style={{ background: 'var(--effect-gradient)' }}></div>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full filter blur-3xl" 
             style={{ background: 'var(--effect-purple)' }}></div>
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
            <h1 className="text-3xl font-bold mb-2">Forgot Password?</h1>
            <p className="text-lg" style={{ color: 'var(--text-tertiary)' }}>
              No worries, we'll send you reset instructions
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
              
              {/* Rate Limit Warning */}
              {rateLimited && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-3 rounded-xl flex items-center gap-2"
                  style={{ 
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)'
                  }}
                >
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Too many reset attempts. Please try again in an hour.
                  </span>
                </motion.div>
              )}
              
              {/* Error Message */}
              {error && !rateLimited && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-3 rounded-xl flex items-center gap-2"
                  style={{ 
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-500 text-sm">{error}</span>
                </motion.div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label className="block text-sm font-medium mb-2" 
                         style={{ color: 'var(--text-secondary)' }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-4 py-3 pl-11 rounded-xl transition-all"
                      style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                      disabled={isLoading}
                      required
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
                          style={{ color: 'var(--text-tertiary)' }} />
                    {emailValid && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !emailValid || rateLimited}
                  className="w-full py-4 font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: emailValid && !rateLimited ? 'var(--btn-primary-bg)' : 'var(--border-default)',
                    color: emailValid && !rateLimited ? 'var(--btn-primary-text)' : 'var(--text-tertiary)'
                  }}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 mx-auto" 
                         style={{ borderColor: 'var(--btn-primary-text)' }}></div>
                  ) : (
                    'Send Reset Instructions'
                  )}
                </button>
                
                {/* Security Note */}
                <div className="p-3 rounded-xl"
                     style={{ 
                       background: 'rgba(59, 130, 246, 0.05)',
                       border: '1px solid rgba(59, 130, 246, 0.1)'
                     }}>
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 mt-0.5" style={{ color: 'var(--accent-primary)' }} />
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      For security, we'll send a password reset link that expires in 15 minutes.
                      You can only request 3 reset emails per hour.
                    </p>
                  </div>
                </div>
              </form>
            </div>
          </ScrollAnimation>
          
          {/* Back to Login */}
          <div className="mt-6 text-center">
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Remember your password?{' '}
            </span>
            <Link href={`/${locale}/login`} 
                  className="text-sm font-medium hover:underline"
                  style={{ color: 'var(--accent-primary)' }}>
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}