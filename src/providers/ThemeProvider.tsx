'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';
type FontSize = 'small' | 'normal' | 'large' | 'extra-large';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark'); // 기본값을 dark로 변경
  const [actualTheme, setActualTheme] = useState<'dark' | 'light'>('dark'); // 기본값을 dark로 변경
  const [fontSize, setFontSize] = useState<FontSize>('normal');
  const [mounted, setMounted] = useState(false);

  // Load saved preferences from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const savedFontSize = localStorage.getItem('fontSize') as FontSize;

    console.log('[ThemeProvider] Loading preferences from localStorage:', {
      theme: savedTheme,
      fontSize: savedFontSize
    });

    if (savedTheme) {
      setTheme(savedTheme);
    }
    if (savedFontSize) {
      setFontSize(savedFontSize);
    }

    setMounted(true);
  }, []);

  // Listen for theme change events (from chat or other sources)
  useEffect(() => {
    // Listen for custom theme change events (same window)
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newTheme = customEvent.detail?.theme as Theme;
      if (newTheme) {
        console.log('[ThemeProvider] Theme change event detected from:', customEvent.detail?.source, 'theme:', newTheme);
        setTheme(newTheme);
        // Also save to localStorage to keep in sync
        localStorage.setItem('theme', newTheme);
      }
    };

    // Listen for custom fontSize change events (same window)
    const handleFontSizeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newFontSize = customEvent.detail?.fontSize as FontSize;
      if (newFontSize) {
        console.log('[ThemeProvider] FontSize change event detected from:', customEvent.detail?.source, 'fontSize:', newFontSize);
        setFontSize(newFontSize);
        // Also save to localStorage to keep in sync
        localStorage.setItem('fontSize', newFontSize);
      }
    };

    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        const newTheme = e.newValue as Theme;
        console.log('[ThemeProvider] Storage event detected (other tab), changing theme to:', newTheme);
        setTheme(newTheme);
      }
      if (e.key === 'fontSize' && e.newValue) {
        const newFontSize = e.newValue as FontSize;
        console.log('[ThemeProvider] Storage event detected (other tab), changing fontSize to:', newFontSize);
        setFontSize(newFontSize);
      }
    };

    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('fontSizeChanged', handleFontSizeChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('fontSizeChanged', handleFontSizeChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Determine actual theme based on system preference with enhanced detection
  useEffect(() => {
    const updateActualTheme = () => {
      if (theme === 'system') {
        // Enhanced system theme detection with multiple checks
        const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemTheme = isDarkMode ? 'dark' : 'light';
        setActualTheme(systemTheme);
        
        // Update color-scheme meta for better browser integration
        document.documentElement.style.colorScheme = systemTheme;
      } else {
        setActualTheme(theme as 'dark' | 'light');
        document.documentElement.style.colorScheme = theme as 'dark' | 'light';
      }
    };

    updateActualTheme();

    // Listen for system theme changes with robust event handling
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (theme === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        setActualTheme(newTheme);
        document.documentElement.style.colorScheme = newTheme;
      }
    };
    
    // Use modern addEventListener if available, fallback to older method
    try {
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    } catch {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      
      return () => {
        mediaQuery.removeListener(handleChange);
      };
    }
  }, [theme]);

  // Apply theme and font size to document
  useEffect(() => {
    if (!mounted) return;

    const html = document.documentElement;
    
    // Add transitioning class to prevent flashing during theme change
    html.classList.add('theme-transitioning');
    
    // Apply theme
    html.setAttribute('data-theme', actualTheme);
    
    // Also apply Tailwind dark class for compatibility
    if (actualTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    
    // Remove transitioning class after a brief delay to re-enable animations
    const timeout = setTimeout(() => {
      html.classList.remove('theme-transitioning');
    }, 50);
    
    // Apply font size
    const fontSizeMap: Record<FontSize, string> = {
      'small': '17px',
      'normal': '19px',
      'large': '21px',
      'extra-large': '23px'
    };
    
    document.documentElement.style.setProperty('--font-base', fontSizeMap[fontSize]);
    
    // Adjust other font sizes proportionally
    const scaleFactor = {
      'small': 0.89,  // 17px base (17/19)
      'normal': 1,    // 19px base
      'large': 1.11,  // 21px base (21/19)
      'extra-large': 1.21  // 23px base (23/19)
    }[fontSize];
    
    document.documentElement.style.setProperty('--font-xs', `${11 * scaleFactor}px`);
    document.documentElement.style.setProperty('--font-sm', `${13 * scaleFactor}px`);
    document.documentElement.style.setProperty('--font-lg', `${17 * scaleFactor}px`);
    document.documentElement.style.setProperty('--font-xl', `${21 * scaleFactor}px`);
    document.documentElement.style.setProperty('--font-2xl', `${28 * scaleFactor}px`);
    document.documentElement.style.setProperty('--font-3xl', `${34 * scaleFactor}px`);
    document.documentElement.style.setProperty('--font-4xl', `${48 * scaleFactor}px`);
    
    // Calendar specific font sizes
    document.documentElement.style.setProperty('--calendar-event-text', `${7 * scaleFactor}px`);
    document.documentElement.style.setProperty('--calendar-event-time', `${6 * scaleFactor}px`);
    
    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timeout);
  }, [actualTheme, fontSize, mounted]);

  // Save preferences to localStorage
  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleSetFontSize = (newSize: FontSize) => {
    setFontSize(newSize);
    localStorage.setItem('fontSize', newSize);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        actualTheme,
        setTheme: handleSetTheme,
        fontSize,
        setFontSize: handleSetFontSize
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}