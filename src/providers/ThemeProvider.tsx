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
    
    if (savedTheme) {
      setTheme(savedTheme);
    }
    if (savedFontSize) {
      setFontSize(savedFontSize);
    }
    
    setMounted(true);
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
    
    // Remove transitioning class after a brief delay to re-enable animations
    const timeout = setTimeout(() => {
      html.classList.remove('theme-transitioning');
    }, 50);
    
    // Apply font size
    const fontSizeMap: Record<FontSize, string> = {
      'small': '14px',
      'normal': '15px',
      'large': '17px',
      'extra-large': '19px'
    };
    
    document.documentElement.style.setProperty('--font-base', fontSizeMap[fontSize]);
    
    // Adjust other font sizes proportionally
    const scaleFactor = {
      'small': 0.93,
      'normal': 1,
      'large': 1.13,
      'extra-large': 1.27
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