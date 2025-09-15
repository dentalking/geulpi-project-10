'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  QrCode, 
  Smartphone, 
  Copy, 
  Check, 
  ArrowLeft, 
  AlertCircle, 
  Download,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';
import { ScrollAnimation } from '@/components/ScrollAnimation';
import { EnhancedToast } from '@/components/ui/EnhancedToast';

interface Setup2FAData {
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
  secret: string;
}

export default function Setup2FAPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  
  const [step, setStep] = useState<'loading' | 'setup' | 'verify' | 'backup' | 'complete'>('loading');
  const [setupData, setSetupData] = useState<Setup2FAData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    initiate2FASetup();
  }, []);

  const initiate2FASetup = async () => {
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSetupData(data.setup);
        setStep('setup');
      } else {
        setError(data.error || 'Failed to initialize 2FA setup');
      }
    } catch (error) {
      console.error('2FA setup error:', error);
      setError('Failed to load 2FA setup');
    }
  };

  const copyToClipboard = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set([...prev, item]));
      setToastMessage('Copied to clipboard!');
      setShowToast(true);
      
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
          secret: setupData?.secret
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('backup');
      } else {
        setError(data.error || 'Invalid verification code');
        setVerificationCode('');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const finalize2FA = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: setupData?.secret,
          backupCodes: setupData?.backupCodes
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('complete');
        setTimeout(() => {
          router.push(`/${locale}/settings`);
        }, 3000);
      } else {
        setError(data.error || 'Failed to enable 2FA');
      }
    } catch (error) {
      console.error('Enable 2FA error:', error);
      setError('Failed to enable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;
    
    const content = `Geulpi Calendar - Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleDateString()}

Save these codes in a safe place. Each code can only be used once.

${setupData.backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

⚠️  IMPORTANT:
- Keep these codes secure and private
- Each code can only be used once
- Use these if you lose access to your authenticator app
- Generate new codes if you suspect they are compromised`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geulpi-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToastMessage('Backup codes downloaded!');
    setShowToast(true);
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" 
           style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
               style={{ borderColor: 'var(--accent-primary)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Setting up Two-Factor Authentication...</p>
        </div>
      </div>
    );
  }

  if (error && !setupData) {
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
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-4">Setup Failed</h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button
              onClick={() => router.push(`/${locale}/settings`)}
              className="px-6 py-3 rounded-full"
              style={{
                background: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)'
              }}
            >
              Back to Settings
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" 
         style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full filter blur-3xl" 
             style={{ background: 'var(--effect-gradient)' }}></div>
      </div>

      {/* Navigation */}
      <nav className="absolute top-0 w-full z-50 px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push(`/${locale}/settings`)}
            className="flex items-center gap-3 group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm">Back to Settings</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Step {step === 'setup' ? '1' : step === 'verify' ? '2' : step === 'backup' ? '3' : '4'} of 4
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen p-8 relative z-10">
        <AnimatePresence mode="wait">
          {step === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                     style={{ background: 'var(--accent-primary)' }}>
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Set Up 2FA</h1>
                <p className="text-lg" style={{ color: 'var(--text-tertiary)' }}>
                  Secure your account with Two-Factor Authentication
                </p>
              </div>

              <ScrollAnimation animation="fadeUp" delay={0.2}>
                <div className="p-8 rounded-3xl space-y-6"
                     style={{
                       background: 'var(--glass-bg)',
                       backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                       WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                       border: '1px solid var(--glass-border)',
                       boxShadow: 'var(--glass-shadow)'
                     }}>
                  
                  {/* Step 1: Install App */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <Smartphone className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <h3 className="font-semibold mb-2">1. Install Authenticator App</h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      Download Google Authenticator, Authy, or similar TOTP app
                    </p>
                  </div>

                  {/* Step 2: Scan QR Code */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <QrCode className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <h3 className="font-semibold mb-4">2. Scan QR Code</h3>
                    
                    {setupData?.qrCodeUrl && (
                      <div className="p-4 rounded-2xl mb-4" style={{ background: 'white' }}>
                        <img 
                          src={setupData.qrCodeUrl} 
                          alt="2FA QR Code" 
                          className="w-48 h-48 mx-auto"
                        />
                      </div>
                    )}

                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                      Can't scan? Enter this key manually:
                    </p>
                    
                    <div className="p-3 rounded-xl mb-2 font-mono text-sm break-all"
                         style={{ 
                           background: 'var(--bg-tertiary)',
                           border: '1px solid var(--border-default)'
                         }}>
                      {setupData?.manualEntryKey}
                    </div>
                    
                    <button
                      onClick={() => setupData?.manualEntryKey && copyToClipboard(setupData.manualEntryKey, 'manual-key')}
                      className="text-sm flex items-center gap-1 mx-auto"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {copiedItems.has('manual-key') ? (
                        <><Check className="w-4 h-4" /> Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4" /> Copy Key</>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => setStep('verify')}
                    className="w-full py-4 font-medium rounded-full"
                    style={{
                      background: 'var(--btn-primary-bg)',
                      color: 'var(--btn-primary-text)'
                    }}
                  >
                    I've Added the Account
                  </button>
                </div>
              </ScrollAnimation>
            </motion.div>
          )}

          {step === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                     style={{ background: 'var(--accent-primary)' }}>
                  <KeyRound className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Verify Setup</h1>
                <p className="text-lg" style={{ color: 'var(--text-tertiary)' }}>
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="p-8 rounded-3xl"
                   style={{
                     background: 'var(--glass-bg)',
                     backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                     WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                     border: '1px solid var(--glass-border)',
                     boxShadow: 'var(--glass-shadow)'
                   }}>
                
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
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-500 text-sm">{error}</span>
                  </motion.div>
                )}

                <div className="space-y-4">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-4 text-center text-2xl font-mono rounded-xl tracking-widest"
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                    maxLength={6}
                  />

                  <button
                    onClick={verifyCode}
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full py-4 font-medium rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: verificationCode.length === 6 ? 'var(--btn-primary-bg)' : 'var(--border-default)',
                      color: verificationCode.length === 6 ? 'var(--btn-primary-text)' : 'var(--text-tertiary)'
                    }}
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 mx-auto" 
                           style={{ borderColor: 'var(--btn-primary-text)' }}></div>
                    ) : (
                      'Verify Code'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'backup' && setupData && (
            <motion.div
              key="backup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                     style={{ background: 'rgba(251, 191, 36, 0.2)' }}>
                  <Download className="w-8 h-8 text-yellow-500" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Backup Codes</h1>
                <p className="text-lg" style={{ color: 'var(--text-tertiary)' }}>
                  Save these codes in a safe place
                </p>
              </div>

              <div className="p-8 rounded-3xl"
                   style={{
                     background: 'var(--glass-bg)',
                     backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                     WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                     border: '1px solid var(--glass-border)',
                     boxShadow: 'var(--glass-shadow)'
                   }}>
                
                <div className="mb-6">
                  <div className="p-4 rounded-xl mb-4"
                       style={{ 
                         background: 'rgba(251, 191, 36, 0.1)',
                         border: '1px solid rgba(251, 191, 36, 0.3)'
                       }}>
                    <p className="text-sm text-yellow-700">
                      <strong>Important:</strong> These backup codes can be used to access your account if you lose your authenticator device. Each code can only be used once.
                    </p>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Backup Codes</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowBackupCodes(!showBackupCodes)}
                        className="p-2 rounded-lg"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {showBackupCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={downloadBackupCodes}
                        className="p-2 rounded-lg"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {setupData.backupCodes.map((code, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg text-center font-mono text-sm cursor-pointer transition-colors hover:bg-opacity-80"
                        style={{ 
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-default)'
                        }}
                        onClick={() => copyToClipboard(code, `backup-${index}`)}
                      >
                        {showBackupCodes ? code : '••••-••••'}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const allCodes = setupData.backupCodes.join('\n');
                        copyToClipboard(allCodes, 'all-codes');
                      }}
                      className="flex-1 py-2 px-4 rounded-lg text-sm border"
                      style={{
                        color: 'var(--accent-primary)',
                        borderColor: 'var(--accent-primary)'
                      }}
                    >
                      {copiedItems.has('all-codes') ? (
                        <><Check className="w-4 h-4 inline mr-1" /> Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4 inline mr-1" /> Copy All</>
                      )}
                    </button>
                    <button
                      onClick={downloadBackupCodes}
                      className="flex-1 py-2 px-4 rounded-lg text-sm"
                      style={{
                        background: 'var(--accent-primary)',
                        color: 'white'
                      }}
                    >
                      <Download className="w-4 h-4 inline mr-1" /> Download
                    </button>
                  </div>
                </div>

                <button
                  onClick={finalize2FA}
                  disabled={loading}
                  className="w-full py-4 font-medium rounded-full"
                  style={{
                    background: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)'
                  }}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 mx-auto" 
                         style={{ borderColor: 'var(--btn-primary-text)' }}></div>
                  ) : (
                    'Complete Setup'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md"
            >
              <div className="p-8 rounded-3xl text-center"
                   style={{
                     background: 'var(--glass-bg)',
                     backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                     WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                     border: '1px solid var(--glass-border)',
                     boxShadow: 'var(--glass-shadow)'
                   }}>
                
                <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                     style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                  <Check className="w-10 h-10 text-green-500" />
                </div>

                <h2 className="text-2xl font-semibold mb-4">2FA Enabled!</h2>
                
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Your account is now secured with Two-Factor Authentication. You'll need to enter a code from your authenticator app when signing in.
                </p>

                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Redirecting to settings...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <EnhancedToast
          id={`2fa-toast-${Date.now()}`}
          title="Success"
          message={toastMessage}
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}