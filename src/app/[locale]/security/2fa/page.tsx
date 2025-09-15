'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Container } from '@/components/ui';
import { Card, Stack } from '@/components/ui/Layout';
import { FormField } from '@/components/ui/FormField';
import { 
  Shield, 
  ShieldCheck, 
  ShieldOff, 
  Settings, 
  Key, 
  AlertCircle, 
  CheckCircle2, 
  Smartphone, 
  RefreshCw,
  Trash2,
  Lock
} from 'lucide-react';

interface TwoFAStatus {
  enabled: boolean;
  enabledAt?: string;
  backupCodesCount?: number;
}

export default function TwoFAManagementPage() {
  const router = useRouter();

  const [status, setStatus] = useState<TwoFAStatus>({ enabled: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Disable 2FA states
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [disableBackupCode, setDisableBackupCode] = useState('');
  const [useBackupCodeForDisable, setUseBackupCodeForDisable] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // Load 2FA status
  useEffect(() => {
    loadTwoFAStatus();
  }, []);

  const loadTwoFAStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/2fa/status');
      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
      } else {
        setError('Failed to load 2FA status');
      }
    } catch (error) {
      setError('Network error loading 2FA status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable2FA = () => {
    router.push('/setup-2fa');
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      setError('Current password is required');
      return;
    }

    if (!disableToken && !disableBackupCode) {
      setError('Either TOTP token or backup code is required');
      return;
    }

    setIsDisabling(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: disablePassword,
          token: useBackupCodeForDisable ? undefined : disableToken,
          backupCode: useBackupCodeForDisable ? disableBackupCode : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Two-factor authentication has been disabled');
        setShowDisableModal(false);
        setDisablePassword('');
        setDisableToken('');
        setDisableBackupCode('');
        await loadTwoFAStatus();
      } else {
        setError(data.error || 'Failed to disable 2FA');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsDisabling(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card variant="elevated" padding="lg">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading 2FA settings...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Container size="lg">
        <Stack spacing="lg">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-600" />
                Two-Factor Authentication
              </h1>
              <p className="text-gray-600 mt-1">
                Secure your account with an additional layer of protection
              </p>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-green-800 text-sm">{success}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          )}

          {/* Current Status Card */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {status.enabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldOff className="h-5 w-5 text-gray-400" />
              )}
              Current Status
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${status.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                    {status.enabled ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Two-Factor Authentication
                    </h3>
                    <p className="text-sm text-gray-600">
                      {status.enabled 
                        ? `Enabled on ${formatDate(status.enabledAt)}` 
                        : 'Not enabled - your account is less secure'}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status.enabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {status.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              {status.enabled && (
                <Stack direction="horizontal" spacing="md">
                  <div className="p-4 rounded-lg border flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-gray-900">Backup Codes</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {status.backupCodesCount || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Remaining codes for account recovery
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg border flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-gray-900">Authenticator App</span>
                    </div>
                    <p className="text-sm text-green-600 font-medium">Connected</p>
                    <p className="text-xs text-gray-500 mt-1">
                      TOTP codes generated every 30 seconds
                    </p>
                  </div>
                </Stack>
              )}
            </div>
          </Card>

          {/* Actions Card */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-700" />
              Manage 2FA
            </h2>
            
            <div className="space-y-4">
              {!status.enabled ? (
                <div className="text-center py-8">
                  <ShieldOff className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Enable Two-Factor Authentication
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Add an extra layer of security to your account with TOTP authentication
                  </p>
                  <Button onClick={handleEnable2FA}>
                    <Shield className="h-4 w-4 mr-2" />
                    Enable 2FA
                  </Button>
                </div>
              ) : (
                <Stack spacing="md">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Settings className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Reconfigure 2FA</h4>
                        <p className="text-sm text-gray-600">
                          Set up a new authenticator app or regenerate QR code
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={handleEnable2FA}>
                      Configure
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-full">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Disable 2FA</h4>
                        <p className="text-sm text-gray-600">
                          Remove two-factor authentication from your account
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setShowDisableModal(true)}
                    >
                      Disable
                    </Button>
                  </div>
                </Stack>
              )}
            </div>
          </Card>

          {/* Security Tips Card */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-yellow-600" />
              Security Tips
            </h2>
            
            <Stack spacing="md">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700 font-medium">
                    Keep your backup codes secure
                  </p>
                  <p className="text-xs text-gray-600">
                    Store them in a password manager or safe location
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700 font-medium">
                    Use a trusted authenticator app
                  </p>
                  <p className="text-xs text-gray-600">
                    Google Authenticator, Authy, or 1Password are recommended
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700 font-medium">
                    Don't share your codes
                  </p>
                  <p className="text-xs text-gray-600">
                    TOTP codes and backup codes should never be shared
                  </p>
                </div>
              </div>
            </Stack>
          </Card>
        </Stack>

        {/* Disable 2FA Modal */}
        {showDisableModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card variant="elevated" padding="lg" className="w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Disable Two-Factor Authentication
              </h2>
              
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-800">
                    Disabling 2FA will make your account less secure. You'll need to provide your password and verify with 2FA one last time.
                  </p>
                </div>

                <FormField
                  name="password"
                  label="Current Password"
                  type="password"
                  value={disablePassword}
                  onChange={setDisablePassword}
                  placeholder="Enter your current password"
                />

                {!useBackupCodeForDisable ? (
                  <FormField
                    name="token"
                    label="TOTP Code"
                    value={disableToken}
                    onChange={(value) => setDisableToken(value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-lg tracking-widest font-mono"
                  />
                ) : (
                  <FormField
                    name="backupCode"
                    label="Backup Code"
                    value={disableBackupCode}
                    onChange={(value) => {
                      const cleaned = value.replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
                      const formatted = cleaned.length > 4 
                        ? `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`
                        : cleaned;
                      setDisableBackupCode(formatted);
                    }}
                    placeholder="XXXX-XXXX"
                    className="text-center text-lg tracking-wider font-mono"
                  />
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setUseBackupCodeForDisable(!useBackupCodeForDisable)}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {useBackupCodeForDisable 
                      ? 'Use authenticator code instead' 
                      : 'Use backup code instead'}
                  </button>
                </div>

                <Stack direction="horizontal" spacing="md">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDisableModal(false);
                      setDisablePassword('');
                      setDisableToken('');
                      setDisableBackupCode('');
                      setError('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDisable2FA}
                    disabled={isDisabling || !disablePassword || (!disableToken && !disableBackupCode)}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {isDisabling ? 'Disabling...' : 'Disable 2FA'}
                  </Button>
                </Stack>
              </div>
            </Card>
          </div>
        )}
      </Container>
    </div>
  );
}