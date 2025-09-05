'use client';

import { useEffect } from 'react';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  // Pass an empty array or define shortcuts if needed
  useKeyboardShortcuts([]);

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