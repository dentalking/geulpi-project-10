'use client';

import { useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeContext } from '@/providers/ThemeProvider';

interface KeyboardShortcuts {
  // Theme shortcuts
  toggleTheme?: boolean;
  toggleDarkMode?: boolean;
  toggleLightMode?: boolean;
  toggleSystemTheme?: boolean;
  
  // Font size shortcuts
  increaseFontSize?: boolean;
  decreaseFontSize?: boolean;
  resetFontSize?: boolean;
  
  // Settings panel
  openSettings?: boolean;
  
  // Language switching
  switchLanguage?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcuts = {}) {
  // Use context directly with fallback values
  const themeContext = useContext(ThemeContext);
  
  // Provide safe defaults if context is not available
  const theme = themeContext?.theme || 'system';
  const setTheme = themeContext?.setTheme || (() => {});
  const actualTheme = themeContext?.actualTheme || 'dark';
  const fontSize = themeContext?.fontSize || 'normal';
  const setFontSize = themeContext?.setFontSize || (() => {});
  
  const router = useRouter();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check for modifier keys
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      
      // Prevent shortcuts in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.isContentEditable) {
        return;
      }

      // Theme Toggle: Cmd/Ctrl + Shift + T
      if (modifierKey && isShift && e.key === 'T') {
        e.preventDefault();
        toggleTheme();
        announceToScreenReader(`Theme switched to ${actualTheme === 'dark' ? 'light' : 'dark'} mode`);
      }

      // Quick Dark Mode: Cmd/Ctrl + D
      if (modifierKey && !isShift && e.key === 'd') {
        e.preventDefault();
        setTheme('dark');
        announceToScreenReader('Dark mode enabled');
      }

      // Quick Light Mode: Cmd/Ctrl + L
      if (modifierKey && !isShift && e.key === 'l') {
        e.preventDefault();
        setTheme('light');
        announceToScreenReader('Light mode enabled');
      }

      // System Theme: Cmd/Ctrl + Shift + S
      if (modifierKey && isShift && e.key === 'S') {
        e.preventDefault();
        setTheme('system');
        announceToScreenReader('System theme enabled');
      }

      // Increase Font Size: Cmd/Ctrl + Plus
      if (modifierKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        changeFontSize('increase');
      }

      // Decrease Font Size: Cmd/Ctrl + Minus
      if (modifierKey && e.key === '-') {
        e.preventDefault();
        changeFontSize('decrease');
      }

      // Reset Font Size: Cmd/Ctrl + 0
      if (modifierKey && e.key === '0') {
        e.preventDefault();
        setFontSize('normal');
        announceToScreenReader('Font size reset to normal');
      }

      // Open Settings: Cmd/Ctrl + Comma
      if (modifierKey && e.key === ',') {
        e.preventDefault();
        openSettingsPanel();
      }

      // Language Switch: Cmd/Ctrl + Shift + L
      if (modifierKey && isShift && e.key === 'L') {
        e.preventDefault();
        cycleLanguage();
      }

      // Accessibility Help: Cmd/Ctrl + /
      if (modifierKey && e.key === '/') {
        e.preventDefault();
        showKeyboardShortcuts();
      }
    };

    // Helper functions
    const toggleTheme = () => {
      if (theme === 'system') {
        setTheme(actualTheme === 'dark' ? 'light' : 'dark');
      } else {
        setTheme(actualTheme === 'dark' ? 'light' : 'dark');
      }
    };

    const changeFontSize = (direction: 'increase' | 'decrease') => {
      const sizes: Array<'small' | 'normal' | 'large' | 'extra-large'> = 
        ['small', 'normal', 'large', 'extra-large'];
      const currentIndex = sizes.indexOf(fontSize);
      
      if (direction === 'increase' && currentIndex < sizes.length - 1) {
        const newSize = sizes[currentIndex + 1];
        setFontSize(newSize);
        announceToScreenReader(`Font size increased to ${newSize}`);
      } else if (direction === 'decrease' && currentIndex > 0) {
        const newSize = sizes[currentIndex - 1];
        setFontSize(newSize);
        announceToScreenReader(`Font size decreased to ${newSize}`);
      }
    };

    const cycleLanguage = () => {
      // Get current pathname and toggle between ko/en
      const pathname = window.location.pathname;
      const segments = pathname.split('/').filter(Boolean);
      
      if (segments[0] === 'ko') {
        segments[0] = 'en';
        router.push('/' + segments.join('/'));
        announceToScreenReader('Language switched to English');
      } else if (segments[0] === 'en') {
        segments[0] = 'ko';
        router.push('/' + segments.join('/'));
        announceToScreenReader('Language switched to Korean');
      }
    };

    const openSettingsPanel = () => {
      // Dispatch custom event to open settings
      const event = new CustomEvent('openSettings');
      window.dispatchEvent(event);
      announceToScreenReader('Settings panel opened');
    };

    const showKeyboardShortcuts = () => {
      // Show keyboard shortcuts modal/notification
      const shortcuts = getKeyboardShortcutsList();
      console.log('Keyboard Shortcuts:', shortcuts);
      announceToScreenReader('Keyboard shortcuts help displayed in console');
      
      // You could also dispatch an event to show a modal
      const event = new CustomEvent('showKeyboardHelp', { detail: shortcuts });
      window.dispatchEvent(event);
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyPress);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [theme, actualTheme, fontSize, setTheme, setFontSize, router]);

  return {
    shortcuts: getKeyboardShortcutsList()
  };
}

// Helper function to announce to screen readers
function announceToScreenReader(message: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Get list of keyboard shortcuts
function getKeyboardShortcutsList() {
  const isMac = typeof navigator !== 'undefined' && 
                navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';
  
  return [
    { category: 'Theme', shortcuts: [
      { keys: `${mod} + Shift + T`, action: 'Toggle theme' },
      { keys: `${mod} + D`, action: 'Dark mode' },
      { keys: `${mod} + L`, action: 'Light mode' },
      { keys: `${mod} + Shift + S`, action: 'System theme' },
    ]},
    { category: 'Font Size', shortcuts: [
      { keys: `${mod} + Plus`, action: 'Increase font size' },
      { keys: `${mod} + Minus`, action: 'Decrease font size' },
      { keys: `${mod} + 0`, action: 'Reset font size' },
    ]},
    { category: 'Navigation', shortcuts: [
      { keys: `${mod} + ,`, action: 'Open settings' },
      { keys: `${mod} + Shift + L`, action: 'Switch language' },
      { keys: `${mod} + /`, action: 'Show keyboard shortcuts' },
    ]}
  ];
}

// Export helper functions for external use
export { announceToScreenReader, getKeyboardShortcutsList };