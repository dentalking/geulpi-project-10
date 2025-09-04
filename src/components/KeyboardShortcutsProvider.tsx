'use client';

import { useEffect } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  // Safely call useKeyboardShortcuts with default values
  const result = useKeyboardShortcuts({
    toggleTheme: true,
    toggleDarkMode: true,
    toggleLightMode: true,
    toggleSystemTheme: true,
    increaseFontSize: true,
    decreaseFontSize: true,
    resetFontSize: true,
    openSettings: true,
    switchLanguage: true,
  });
  
  // Provide default if result is undefined
  const shortcuts = result?.shortcuts || [];

  // Listen for show keyboard help event
  useEffect(() => {
    const handleShowHelp = (e: CustomEvent) => {
      // You can implement a modal here to show shortcuts
      // For now, we'll just log them
      console.table(e.detail);
    };

    window.addEventListener('showKeyboardHelp', handleShowHelp as EventListener);
    
    return () => {
      window.removeEventListener('showKeyboardHelp', handleShowHelp as EventListener);
    };
  }, []);

  return <>{children}</>;
}