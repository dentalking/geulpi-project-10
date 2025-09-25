'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  User,
  Users,
  Menu,
  X,
  Settings,
  LogOut,
  Search,
  ChevronRight,
  Crown,
  CreditCard,
  Bell,
  MessageSquare,
  Home,
  Layout,
  ChevronDown,
  Clock
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Logo } from '@/components/Logo';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { chatStorage } from '@/utils/chatStorage';

interface UnifiedSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsClick?: () => void;
  onSearchClick?: () => void;
  onProfileClick?: () => void;
  onSubscriptionClick?: () => void;
  onFriendsClick?: () => void;
  onAIChatClick?: () => void;
  onChatClick?: (chatId: string) => void; // 특정 채팅 클릭 시 콜백
  isMobile?: boolean;
  userInfo?: {
    email?: string;
    name?: string;
    picture?: string;
  } | null;
}

export function UnifiedSidebar({ 
  isOpen, 
  onClose,
  onSettingsClick,
  onSearchClick,
  onProfileClick,
  onSubscriptionClick,
  onFriendsClick,
  onAIChatClick,
  onChatClick,
  isMobile = false,
  userInfo
}: UnifiedSidebarProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations();
  const router = useRouter();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [chatHistory, setChatHistory] = useState<{id: string, title: string, timestamp: Date}[]>([]);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef(false);

  // Load chat history asynchronously
  useEffect(() => {
    const loadChatHistory = async (showLoading: boolean = false) => {
      // Prevent concurrent loading
      if (loadingRef.current) {
        console.log('[UnifiedSidebar] Chat history loading already in progress, skipping');
        return;
      }

      try {
        loadingRef.current = true;

        // Only show loading on first load
        if (showLoading) {
          setChatHistoryLoading(true);
        }

        const sessions = await chatStorage.getRecentSessions(5);
        const historyData = sessions.map(session => ({
          id: session.id,
          title: session.title,
          timestamp: new Date(session.updatedAt)
        }));

        // Only update if data has changed to prevent unnecessary re-renders
        setChatHistory(prev => {
          const hasChanged = prev.length !== historyData.length ||
            prev.some((item, idx) => item.id !== historyData[idx]?.id);
          return hasChanged ? historyData : prev;
        });

        console.log('[UnifiedSidebar] Chat history loaded:', historyData.length, 'sessions');
      } catch (error) {
        console.error('[UnifiedSidebar] Failed to load chat history:', error);
        if (showLoading) {
          setChatHistory([]);
        }
      } finally {
        loadingRef.current = false;
        if (showLoading) {
          setChatHistoryLoading(false);
          setIsFirstLoad(false);
        }
      }
    };

    // Initial load when sidebar opens (only once per open)
    if (isOpen && isFirstLoad) {
      console.log('[UnifiedSidebar] Loading chat history for first time');
      loadChatHistory(true);
    }

    // Set up periodic refresh only when sidebar is open (30 seconds interval instead of 3)
    if (isOpen && !isFirstLoad) {
      console.log('[UnifiedSidebar] Setting up periodic chat refresh');
      intervalRef.current = setInterval(() => {
        console.log('[UnifiedSidebar] Periodic chat history refresh');
        loadChatHistory(false);
      }, 30000); // 30 seconds instead of 3
    }

    // Cleanup interval when sidebar closes or component unmounts
    return () => {
      if (intervalRef.current) {
        console.log('[UnifiedSidebar] Clearing chat history interval');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOpen, isFirstLoad]);
  
  const menuItems = [
    { 
      icon: Home, 
      label: t('navigation.home'), 
      href: `/${locale}/dashboard`,
      isActive: pathname === `/${locale}/dashboard`
    },
    { 
      icon: Calendar, 
      label: t('navigation.calendar'), 
      href: `/${locale}/dashboard`,
      isActive: pathname === `/${locale}/calendar`
    },
    { 
      icon: Search, 
      label: t('navigation.search'), 
      onClick: onSearchClick, 
      href: onSearchClick ? undefined : `/${locale}/search`,
      isActive: pathname === `/${locale}/search`
    }
  ];

  // Close sidebar when clicking outside on desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const sidebar = document.getElementById('unified-sidebar');
        const menuButton = document.getElementById('menu-toggle-button');
        if (sidebar && !sidebar.contains(e.target as Node) && 
            menuButton && !menuButton.contains(e.target as Node)) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, isMobile]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - only on mobile */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
            />
          )}
          
          {/* Side Menu */}
          <motion.div
            id="unified-sidebar"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed left-0 top-0 bottom-0 w-80 z-50 overflow-y-auto shadow-2xl ${
              isMobile ? '' : 'md:top-16'
            }`}
            style={{ 
              background: 'var(--bg-secondary)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('sidebar.menu')}</h2>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg transition-all"
                    style={{ 
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Navigation Menu */}
              <nav className="p-4 space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  {t('sidebar.navigation')}
                </h3>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isButton = !!item.onClick;
                  const Component = isButton ? 'button' : Link;
                  const props = isButton 
                    ? { 
                        onClick: () => {
                          console.log('[UnifiedSidebar] Menu item clicked:', item.label, 'onClick:', item.onClick);
                          if (item.onClick) {
                            item.onClick();
                          } else {
                            console.warn('[UnifiedSidebar] No onClick handler for:', item.label);
                          }
                          if (isMobile) onClose();
                        },
                        type: 'button' as const
                      }
                    : { 
                        href: item.href || '#',
                        onClick: isMobile ? onClose : undefined
                      };
                  
                  return (
                    <Component
                      key={item.label}
                      {...props as any}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all w-full text-left group`}
                      style={{
                        backgroundColor: item.isActive ? 'var(--accent-primary)' : 'transparent',
                        color: item.isActive ? 'white' : 'var(--text-primary)',
                        opacity: item.isActive ? 0.15 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!item.isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!item.isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ 
                        color: item.isActive ? 'var(--accent-primary)' : 'var(--text-secondary)' 
                      }} />
                      <span className="flex-1 font-medium">{item.label}</span>
                      <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity ${
                        item.isActive ? 'opacity-50' : ''
                      }`} />
                    </Component>
                  );
                })}
              </nav>
              
              {/* Chat History Section */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="flex items-center justify-between px-3 mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                    {t('sidebar.recentChats')}
                  </h3>
                  {onAIChatClick && (
                    <button
                      onClick={() => {
                        // 활성 세션 클리어하고 새 채팅 시작
                        chatStorage.clearActiveSession();
                        console.log('[UnifiedSidebar] Starting new chat');
                        onAIChatClick();
                        if (isMobile) onClose();
                      }}
                      className="p-1 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                      title={locale === 'ko' ? '새 채팅' : 'New Chat'}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {chatHistoryLoading ? (
                    // Skeleton loader for better UX
                    <div className="px-3 py-2 space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: 'var(--surface-tertiary)' }}
                            />
                            <div className="flex-1 space-y-2">
                              <div 
                                className="h-3 rounded" 
                                style={{ 
                                  backgroundColor: 'var(--surface-tertiary)',
                                  width: `${60 + i * 10}%` 
                                }}
                              />
                              <div 
                                className="h-2 rounded" 
                                style={{ 
                                  backgroundColor: 'var(--surface-tertiary)',
                                  width: '40%' 
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : chatHistory.length > 0 ? (
                    chatHistory.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={async () => {
                          console.log('[UnifiedSidebar] Chat clicked:', chat.id, chat.title);
                          
                          // 활성 세션으로 설정
                          await chatStorage.setActiveSession(chat.id);
                          console.log('[UnifiedSidebar] Set active session to:', chat.id);
                          
                          // 콜백 호출
                          onChatClick?.(chat.id);
                          if (isMobile) onClose();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left"
                        style={{ 
                          backgroundColor: 'transparent',
                          color: 'var(--text-secondary)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Clock className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{chat.title}</div>
                          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {chat.timestamp.toLocaleDateString()}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center">
                      <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        {locale === 'ko' ? '채팅 기록이 없습니다' : 'No chat history'}
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        {locale === 'ko' ? 'AI와 대화를 시작해보세요' : 'Start a conversation with AI'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Footer with User Dropdown */}
              <div className="relative border-t" style={{ borderColor: 'var(--border-default)' }}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="w-full p-4 transition-all"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="flex items-center gap-3">
                    {userInfo?.picture ? (
                      <img 
                        src={userInfo.picture} 
                        alt={userInfo.name || 'User'} 
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {userInfo?.name?.charAt(0)?.toUpperCase() || userInfo?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{userInfo?.name || t('sidebar.user')}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{userInfo?.email || t('sidebar.notLoggedIn')}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${
                      showUserDropdown ? 'rotate-180' : ''
                    }`} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                </button>
                
                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {showUserDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-0 right-0 mb-2 mx-4 p-2 rounded-xl shadow-xl"
                      style={{ 
                        background: 'var(--surface-overlay)',
                        borderColor: 'var(--border-default)',
                        border: '1px solid',
                        backdropFilter: 'blur(20px)'
                      }}
                    >
                      {/* Subscription Status */}
                      <div className="p-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
                        <SubscriptionStatus 
                          onManageClick={() => {
                            onSubscriptionClick?.();
                            setShowUserDropdown(false);
                            if (isMobile) onClose();
                          }}
                          compact={true}
                        />
                      </div>
                      
                      {/* User Actions */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            console.log('Profile button clicked', { onProfileClick });
                            onProfileClick?.();
                            setShowUserDropdown(false);
                            if (isMobile) onClose();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left"
                          style={{ 
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <User className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                          <span className="text-sm">{t('sidebar.profile')}</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            onFriendsClick?.();
                            setShowUserDropdown(false);
                            if (isMobile) onClose();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left"
                          style={{ 
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                          <span className="text-sm">{locale === 'ko' ? '친구' : 'Friends'}</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            onSettingsClick?.();
                            setShowUserDropdown(false);
                            if (isMobile) onClose();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left"
                          style={{ 
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Settings className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                          <span className="text-sm">{t('common.settings')}</span>
                        </button>
                        
                        <div className="my-2 border-t" style={{ borderColor: 'var(--border-default)' }} />
                        
                        <Link
                          href="/api/auth/logout"
                          onClick={() => {
                            // 로그아웃 시 활성 채팅 세션 클리어
                            chatStorage.clearActiveSession();
                            console.log('[UnifiedSidebar] Cleared active chat session on logout');
                            setShowUserDropdown(false);
                            if (isMobile) onClose();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left"
                          style={{ 
                            backgroundColor: 'transparent',
                            color: 'var(--accent-error)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <LogOut className="w-4 h-4" style={{ color: 'var(--accent-error)' }} />
                          <span className="text-sm">{t('auth.logout')}</span>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Simplified Navigation Header for desktop and mobile
export function UnifiedHeader({
  onMenuClick,
  onSearchClick,
  onAddEvent,
  showMenuButton = true,
  title = 'Geulpi',
  subtitle,
  isMobile = false,
  notificationIcon
}: {
  onMenuClick: () => void;
  onSearchClick?: () => void;
  onAddEvent?: () => void;
  showMenuButton?: boolean;
  title?: string;
  subtitle?: string;
  isMobile?: boolean;
  notificationIcon?: React.ReactNode;
}) {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  
  return (
    <header className="sticky top-0 z-40">
      <div 
        className="backdrop-blur-xl border-b px-4 py-3"
        style={{ 
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)' 
        }}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showMenuButton && (
              <button
                id="menu-toggle-button"
                onClick={onMenuClick}
                className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            {/* Logo and Service Name */}
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
              <Logo size={24} color="currentColor" />
              <span className="text-lg font-semibold">Geulpi</span>
            </Link>
            
            {/* Optional Subtitle */}
            {subtitle && (
              <>
                <span className="text-gray-400 dark:text-gray-600">•</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Notification Icon */}
            {notificationIcon}

            {/* AI Overlay Toggle Button */}
            {onAddEvent && (
              <button
                onClick={onAddEvent}
                className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Switch to AI Overlay"
                title="Switch to AI Overlay"
              >
                <Layout className="w-5 h-5" />
              </button>
            )}
            
            {/* Search Button */}
            <button
              onClick={onSearchClick || (() => router.push(`/${locale}/search`))}
              className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}