'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon,
  Moon,
  Sun,
  Globe,
  Bell,
  Shield,
  Palette,
  ArrowLeft,
  ChevronRight,
  LogOut,
  User,
  Mail,
  Calendar,
  Monitor,
  Key
} from 'lucide-react';
import Link from 'next/link';
import { useToastContext } from '@/providers/ToastProvider';
import { MobileHeader, MobileBottomNav } from '@/components/MobileNavigation';
import { SessionManager } from '@/components/SessionManager';

interface SettingItem {
  icon: any;
  label: string;
  value: string;
  action: () => void;
  toggle?: boolean;
  checked?: boolean;
  danger?: boolean;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

export default function SettingsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToastContext();
  
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState(locale);
  const [notifications, setNotifications] = useState({
    events: true,
    reminders: true,
    updates: false
  });
  const [showSessions, setShowSessions] = useState(false);

  const settingsSections: SettingSection[] = [
    {
      title: t('settings.account'),
      items: [
        {
          icon: User,
          label: t('settings.profile'),
          value: t('settings.editProfile'),
          action: () => router.push(`/${locale}/profile`)
        },
        {
          icon: Mail,
          label: t('settings.email'),
          value: 'user@example.com',
          action: () => toast.info(t('settings.comingSoon'))
        }
      ]
    },
    {
      title: t('settings.preferences'),
      items: [
        {
          icon: theme === 'dark' ? Moon : Sun,
          label: t('settings.theme'),
          value: t(`settings.theme.${theme}`),
          action: () => {
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
            document.documentElement.setAttribute('data-theme', newTheme);
            toast.success(t('settings.themeChanged'));
          }
        },
        {
          icon: Globe,
          label: t('settings.language'),
          value: language === 'ko' ? '한국어' : 'English',
          action: () => {
            const newLang = language === 'ko' ? 'en' : 'ko';
            setLanguage(newLang);
            router.push(`/${newLang}/settings`);
          }
        },
        {
          icon: Palette,
          label: t('settings.appearance'),
          value: t('settings.customize'),
          action: () => toast.info(t('settings.comingSoon'))
        }
      ]
    },
    {
      title: t('settings.notifications'),
      items: [
        {
          icon: Bell,
          label: t('settings.eventNotifications'),
          value: notifications.events ? t('common.on') : t('common.off'),
          toggle: true,
          checked: notifications.events,
          action: () => {
            setNotifications(prev => ({ ...prev, events: !prev.events }));
            toast.success(t('settings.notificationUpdated'));
          }
        },
        {
          icon: Calendar,
          label: t('settings.reminders'),
          value: notifications.reminders ? t('common.on') : t('common.off'),
          toggle: true,
          checked: notifications.reminders,
          action: () => {
            setNotifications(prev => ({ ...prev, reminders: !prev.reminders }));
            toast.success(t('settings.notificationUpdated'));
          }
        }
      ]
    },
    {
      title: t('settings.security'),
      items: [
        {
          icon: Monitor,
          label: 'Active Sessions',
          value: 'Manage devices',
          action: () => setShowSessions(!showSessions)
        },
        {
          icon: Key,
          label: 'Password',
          value: 'Change password',
          action: () => toast.info(t('settings.comingSoon'))
        },
        {
          icon: Shield,
          label: t('settings.privacy'),
          value: t('settings.manage'),
          action: () => toast.info(t('settings.comingSoon'))
        },
        {
          icon: LogOut,
          label: t('auth.logout'),
          value: '',
          danger: true,
          action: () => {
            if (confirm(t('auth.logoutConfirm'))) {
              window.location.href = '/api/auth/logout';
            }
          }
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen pb-safe-bottom" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse" 
             style={{ background: 'var(--effect-purple)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 rounded-full blur-3xl animate-pulse delay-1000" 
             style={{ background: 'var(--effect-pink)' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b"
              style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg transition-all md:hidden"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label={t('common.back')}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              {t('settings.title')}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 mb-20 md:mb-0">
        <div className="space-y-6">
          {settingsSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
            >
              <h2 className="text-sm font-semibold mb-3 px-2" 
                  style={{ color: 'var(--text-secondary)' }}>
                {section.title}
              </h2>
              
              <div className="backdrop-blur-xl rounded-xl border overflow-hidden"
                   style={{ background: 'var(--surface-primary)', borderColor: 'var(--glass-border)' }}>
                {section.items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full px-4 py-3 flex items-center gap-3 transition-all hover:bg-white/5"
                      style={{
                        borderBottom: index < section.items.length - 1 ? '1px solid var(--border-default)' : 'none',
                        color: item.danger ? 'var(--accent-error)' : 'var(--text-primary)'
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex-1 text-left">{item.label}</span>
                      
                      {item.toggle ? (
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => {}}
                            className="sr-only"
                          />
                          <div 
                            className="w-10 h-6 rounded-full transition-all"
                            style={{ 
                              background: item.checked ? 'var(--accent-primary)' : 'var(--surface-secondary)'
                            }}
                          >
                            <div 
                              className="w-4 h-4 bg-white rounded-full transition-transform"
                              style={{ 
                                transform: item.checked ? 'translate(20px, 4px)' : 'translate(4px, 4px)'
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          {item.value && (
                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                              {item.value}
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
          
          {/* Session Manager Modal/Section */}
          {showSessions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-6"
            >
              <h2 className="text-sm font-semibold mb-3 px-2" 
                  style={{ color: 'var(--text-secondary)' }}>
                Active Sessions
              </h2>
              <SessionManager />
            </motion.div>
          )}
        </div>

        {/* App Version */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Geulpi Calendar v1.0.0
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
            © 2025 Geulpi. All rights reserved.
          </p>
        </motion.div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}