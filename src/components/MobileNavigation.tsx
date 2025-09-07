'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
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
  onAddEvent?: () => void;
}

export function MobileBottomNav({ onAddEvent }: MobileNavigationProps) {
  return (
    <>
      {/* FAB Style AI Chat Button */}
      <button
        onClick={onAddEvent}
        className="fixed bottom-6 right-6 z-40 md:hidden w-14 h-14 rounded-full shadow-lg transition-all transform active:scale-95 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
          boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)'
        }}
        aria-label="AI Chat"
      >
        <Plus className="w-7 h-7 text-white mx-auto" />
      </button>
    </>
  );
}

export function MobileHeader({ 
  onMenuClick,
  onSearchClick 
}: { 
  onMenuClick: () => void;
  onSearchClick?: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  
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
            onClick={onSearchClick || (() => router.push(`/${locale}/search`))}
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
  onClose,
  onSettingsClick,
  onSearchClick,
  onProfileClick
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSettingsClick?: () => void;
  onSearchClick?: () => void;
  onProfileClick?: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations();
  
  const menuItems = [
    { icon: Calendar, label: 'Today', href: `/${locale}/dashboard` },
    { icon: Search, label: 'Search', onClick: onSearchClick, href: onSearchClick ? undefined : `/${locale}/search` },
    { icon: User, label: 'Profile', onClick: onProfileClick, href: onProfileClick ? undefined : `/${locale}/profile` },
    { icon: Settings, label: 'Settings', onClick: onSettingsClick, href: onSettingsClick ? undefined : `/${locale}/settings` },
    { divider: true },
    { icon: LogOut, label: 'Logout', href: '/api/auth/logout', isLogout: true }
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
                  
                  const Component = item.onClick ? 'button' : Link;
                  const props = item.onClick 
                    ? { 
                        onClick: () => {
                          item.onClick?.();
                          onClose();
                        },
                        type: 'button' as const
                      }
                    : { 
                        href: item.href || '#',
                        onClick: item.isLogout ? undefined : onClose
                      };
                  
                  return (
                    <Component
                      key={item.label}
                      {...props as any}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all touch-manipulation w-full text-left"
                      style={{
                        minHeight: '48px',
                        color: item.isLogout ? 'var(--accent-danger)' : 'var(--text-primary)'
                      }}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex-1">{item.label}</span>
                      {!item.isLogout && <ChevronRight className="w-4 h-4 opacity-50" />}
                    </Component>
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