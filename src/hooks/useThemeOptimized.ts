'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/providers/ThemeProvider';

interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  border: string;
  glass: string;
}

interface UseThemeOptimizedReturn {
  currentTheme: 'light' | 'dark';
  colors: ThemeColors;
  isSystemTheme: boolean;
  isHighContrast: boolean;
  toggleTheme: () => void;
  setHighContrast: (enabled: boolean) => void;
}

/**
 * Enhanced theme hook with accessibility features and optimized color management
 */
export function useThemeOptimized(): UseThemeOptimizedReturn {
  const { theme, actualTheme, setTheme } = useTheme();
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [colors, setColors] = useState<ThemeColors>({
    primary: '',
    secondary: '',
    background: '',
    text: '',
    border: '',
    glass: ''
  });

  // Check for high contrast preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Update colors based on theme
  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    setColors({
      primary: computedStyle.getPropertyValue('--accent-primary').trim(),
      secondary: computedStyle.getPropertyValue('--accent-secondary').trim(),
      background: computedStyle.getPropertyValue('--bg-primary').trim(),
      text: computedStyle.getPropertyValue('--text-primary').trim(),
      border: computedStyle.getPropertyValue('--glass-border').trim(),
      glass: computedStyle.getPropertyValue('--glass-bg').trim()
    });
  }, [actualTheme]);

  // Apply high contrast mode
  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [isHighContrast]);

  const toggleTheme = () => {
    const newTheme = actualTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const setHighContrastMode = (enabled: boolean) => {
    setIsHighContrast(enabled);
    localStorage.setItem('highContrast', enabled ? 'true' : 'false');
  };

  return {
    currentTheme: actualTheme,
    colors,
    isSystemTheme: theme === 'system',
    isHighContrast,
    toggleTheme,
    setHighContrast: setHighContrastMode
  };
}

/**
 * Hook to check if reduced motion is preferred
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to apply theme-aware animations
 */
export function useThemeAnimation(baseClass: string): string {
  const reducedMotion = useReducedMotion();
  const { actualTheme } = useTheme();

  if (reducedMotion) {
    return `${baseClass} reduced-motion`;
  }

  return `${baseClass} theme-${actualTheme}`;
}