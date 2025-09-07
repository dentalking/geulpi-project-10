'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Lock, Save, Eye, EyeOff, Check, X, Edit } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  created_at?: string;
}

export default function ProfilePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authType, setAuthType] = useState<'google' | 'email' | null>(null);
  
  // Profile form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  
  // Password change states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setIsAuthenticated(true);
        setUser(data.user);
        setAuthType(data.authType || null);
        setProfileForm({
          name: data.user.name || '',
          email: data.user.email || ''
        });
      } else {
        router.push(`/${locale}/login`);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push(`/${locale}/login`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });

      const data = await response.json();

      if (response.ok) {
        setProfileSuccess(true);
        setIsEditing(false);
        setUser(prev => prev ? { ...prev, ...profileForm } : null);
        setTimeout(() => setProfileSuccess(false), 3000);
      } else {
        setProfileError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      setProfileError('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess(true);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError('Network error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe-bottom" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ background: 'var(--effect-purple)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000" style={{ background: 'var(--effect-pink)' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href={`/${locale}/dashboard`}
                className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--text-tertiary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <Logo size={32} />
                <h1 className="text-2xl font-bold">Profile</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 mb-20 md:mb-0">
        {/* User Info Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-2xl backdrop-blur-sm"
          style={{ background: 'var(--surface-primary)', border: '1px solid var(--glass-border)' }}
        >
          <div className="flex items-center gap-4">
            {user?.picture ? (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-semibold">{user?.name}</h2>
              <p style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 rounded-2xl backdrop-blur-sm"
            style={{ background: 'var(--surface-primary)', border: '1px solid var(--glass-border)' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </h3>
              {!isEditing && authType === 'email' && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 rounded-lg transition-all"
                  style={{ color: 'var(--accent-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>

            {profileSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
              >
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-green-500 text-sm">Profile updated successfully!</span>
              </motion.div>
            )}

            {profileError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                <X className="h-5 w-5 text-red-500" />
                <span className="text-red-500 text-sm">{profileError}</span>
              </motion.div>
            )}

            {authType === 'google' && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Your profile information is managed through your Google account and cannot be edited here.
                </p>
              </div>
            )}
            
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: isEditing ? 'var(--input-bg)' : 'var(--surface-secondary)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  disabled={!isEditing}
                  className="w-full px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: isEditing ? 'var(--input-bg)' : 'var(--surface-secondary)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              {isEditing && (
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                    style={{
                      background: 'var(--btn-primary-bg)',
                      color: 'var(--btn-primary-text)'
                    }}
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--btn-primary-text)' }}></div>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setProfileForm({
                        name: user?.name || '',
                        email: user?.email || ''
                      });
                      setProfileError(null);
                    }}
                    className="px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: 'var(--surface-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </motion.div>

          {/* Change Password - Only show for email auth */}
          {authType === 'email' ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 rounded-2xl backdrop-blur-sm"
              style={{ background: 'var(--surface-primary)', border: '1px solid var(--glass-border)' }}
            >
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
              </h3>

            {passwordSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
              >
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-green-500 text-sm">Password changed successfully!</span>
              </motion.div>
            )}

            {passwordError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                <X className="h-5 w-5 text-red-500" />
                <span className="text-red-500 text-sm">{passwordError}</span>
              </motion.div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 rounded-xl transition-all"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 rounded-xl transition-all"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)'
                    }}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-3 pr-12 rounded-xl transition-all"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                style={{
                  background: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)'
                }}
              >
                {isChangingPassword ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--btn-primary-text)' }}></div>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Change Password
                  </>
                )}
              </button>
            </form>
          </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 rounded-2xl backdrop-blur-sm"
              style={{ background: 'var(--surface-primary)', border: '1px solid var(--glass-border)' }}
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Password Management
              </h3>
              <div className="p-4 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>
                  You are signed in with Google. Password management is handled through your Google account.
                </p>
                <a 
                  href="https://myaccount.google.com/security" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 text-sm"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Manage Google Account Security →
                </a>
              </div>
            </motion.div>
          )}
        </div>

        {/* Account Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 p-6 rounded-2xl backdrop-blur-sm"
          style={{ background: 'var(--surface-primary)', border: '1px solid var(--glass-border)' }}
        >
          <h3 className="text-xl font-semibold mb-4">Account Actions</h3>
          <div className="flex flex-wrap gap-4">
            <Link
              href={`/${locale}/dashboard`}
              className="px-6 py-3 rounded-xl transition-all"
              style={{
                background: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)'
              }}
            >
              Back to Dashboard
            </Link>
            <a
              href="/api/auth/logout"
              className="px-6 py-3 rounded-xl transition-all"
              style={{
                background: 'var(--surface-secondary)',
                color: 'var(--accent-danger)'
              }}
            >
              Sign Out
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}