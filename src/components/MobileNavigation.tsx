'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Calendar,
  Plus,
  Bell,
  User,
  Menu,
  X,
  Settings,
  LogOut,
  Search,
  ChevronRight
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface MobileNavigationProps {
  notificationCount?: number;
  onAddEvent?: () => void;
}

export function MobileBottomNav({ notificationCount = 0, onAddEvent }: MobileNavigationProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations();
  
  const navItems = [
    { icon: Home, label: 'Home', href: `/${locale}/landing` },
    { icon: Calendar, label: 'Calendar', href: `/${locale}/dashboard` },
    { icon: Plus, label: 'Add', action: onAddEvent, isAction: true },
    { icon: Bell, label: 'Alerts', href: `/${locale}/notifications`, badge: notificationCount },
    { icon: User, label: 'Profile', href: `/${locale}/profile` }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div 
        className="backdrop-blur-xl border-t px-2 py-2 safe-area-bottom"
        style={{ 
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)' 
        }}
      >
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            if (item.isAction) {
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="relative p-3 rounded-full transition-all transform active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                  }}
                  aria-label={item.label}
                >
                  <Icon className="w-6 h-6 text-white" />
                </button>
              );
            }
            
            return (
              <Link
                key={item.label}
                href={item.href || '#'}
                className={`relative flex flex-col items-center min-w-[64px] min-h-[56px] justify-center rounded-lg transition-all ${
                  isActive ? 'text-purple-400' : 'text-gray-400'
                }`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const t = useTranslations();
  
  return (
    <header className="sticky top-0 z-50 md:hidden">
      <div 
        className="backdrop-blur-xl border-b px-4 py-3"
        style={{ 
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)' 
        }}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg transition-all touch-manipulation"
            style={{ minWidth: '44px', minHeight: '44px' }}
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            Geulpi
          </h1>
          
          <button
            className="p-2 rounded-lg transition-all touch-manipulation"
            style={{ minWidth: '44px', minHeight: '44px' }}
            aria-label="Search"
          >
            <Search className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function MobileSideMenu({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations();
  
  const menuItems = [
    { icon: Home, label: t('navigation.home'), href: `/${locale}/landing` },
    { icon: Calendar, label: t('navigation.calendar'), href: `/${locale}/dashboard` },
    { icon: Bell, label: t('navigation.notifications'), href: `/${locale}/notifications` },
    { icon: Settings, label: t('navigation.settings'), href: `/${locale}/settings` },
    { divider: true },
    { icon: LogOut, label: t('auth.logout'), href: '/api/auth/logout', isLogout: true }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
          
          {/* Side Menu */}
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-72 z-50 overflow-y-auto md:hidden"
            style={{ background: 'var(--bg-primary)' }}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Menu</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg transition-all touch-manipulation"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Menu Items */}
              <nav className="space-y-1">
                {menuItems.map((item, index) => {
                  if (item.divider) {
                    return (
                      <div 
                        key={index} 
                        className="my-2 border-t" 
                        style={{ borderColor: 'var(--border-default)' }}
                      />
                    );
                  }
                  
                  const Icon = item.icon;
                  if (!Icon) return null;
                  
                  return (
                    <Link
                      key={item.label}
                      href={item.href || '#'}
                      onClick={item.isLogout ? undefined : onClose}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all touch-manipulation"
                      style={{
                        minHeight: '48px',
                        color: item.isLogout ? 'var(--accent-danger)' : 'var(--text-primary)'
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex-1">{item.label}</span>
                      {!item.isLogout && <ChevronRight className="w-4 h-4 opacity-50" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Responsive Typography Hook
export function useResponsiveTypography() {
  return {
    heading: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl',
    subheading: 'text-xl sm:text-2xl md:text-3xl',
    body: 'text-sm sm:text-base md:text-lg',
    small: 'text-xs sm:text-sm',
    button: 'text-sm sm:text-base font-medium'
  };
}