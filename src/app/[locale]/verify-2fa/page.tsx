'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button, Container } from '@/components/ui';
import { Card } from '@/components/ui/Layout';
import { FormField } from '@/components/ui/FormField';
import { Loader2, Shield, Key, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Verify2FAPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const pendingToken = searchParams?.get('token') || null;

  const [token, setToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  // Countdown timer
  useEffect(() => {
    if (!pendingToken) {
      router.push('/login');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingToken, router]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pendingToken) {
      setError('Invalid verification session');
      return;
    }

    if (!token && !backupCode) {
      setError('Please enter a verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pendingToken,
          token: useBackupCode ? undefined : token,
          backupCode: useBackupCode ? backupCode : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Successfully verified, redirect to dashboard
        router.push(`/${locale}/dashboard`);
      } else {
        setError(data.error || 'Verification failed');
        // Clear the input
        if (useBackupCode) {
          setBackupCode('');
        } else {
          setToken('');
        }
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setToken(cleanValue);
    setError('');
  };

  const handleBackupCodeChange = (value: string) => {
    // Format backup code as XXXX-XXXX
    const cleanValue = value.replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
    if (cleanValue.length <= 8) {
      const formatted = cleanValue.length > 4 
        ? `${cleanValue.slice(0, 4)}-${cleanValue.slice(4)}`
        : cleanValue;
      setBackupCode(formatted);
    }
    setError('');
  };

  if (!pendingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Container size="sm">
          <Card variant="elevated" padding="lg">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Invalid Session
              </h2>
              <p className="text-gray-600 mb-4">
                Your verification session is invalid or has expired.
              </p>
              <Button onClick={() => router.push('/login')}>
                Return to Sign In
              </Button>
            </div>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Container size="sm">
        <Card variant="elevated" padding="lg">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">
              Two-Factor Authentication
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Enter the 6-digit code from your authenticator app
            </p>
            <div className="text-xs text-gray-500 mt-2">
              Session expires in: <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            {!useBackupCode ? (
              <FormField
                name="token"
                label="Verification Code"
                value={token}
                onChange={handleTokenChange}
                placeholder="000000"
                autoComplete="one-time-code"
                autoFocus
                disabled={isLoading}
                className="text-center text-2xl tracking-widest font-mono"
              />
            ) : (
              <FormField
                name="backupCode"
                label="Backup Code"
                value={backupCode}
                onChange={handleBackupCodeChange}
                placeholder="XXXX-XXXX"
                autoComplete="one-time-code"
                autoFocus
                disabled={isLoading}
                helper="Enter one of your backup codes (this will be permanently used)"
                className="text-center text-lg tracking-wider font-mono"
              />
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || (!token && !backupCode)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Verify & Continue
                </>
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setToken('');
                  setBackupCode('');
                  setError('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                {useBackupCode ? (
                  <>
                    <Key className="h-4 w-4 inline mr-1" />
                    Use authenticator app instead
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 inline mr-1" />
                    Use backup code instead
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-4 border-t">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to sign in
              </button>
            </div>
          </form>
        </Card>
      </Container>
    </div>
  );
}