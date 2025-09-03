'use client';

import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description?: string;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    shortcuts.forEach((shortcut) => {
      const isCtrlPressed = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : true;
      const isMetaPressed = shortcut.meta ? event.metaKey : true;
      const isShiftPressed = shortcut.shift ? event.shiftKey : !shortcut.shift || event.shiftKey === false;
      const isAltPressed = shortcut.alt ? event.altKey : !shortcut.alt || event.altKey === false;
      
      // Check if the key matches (case-insensitive)
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      
      if (keyMatches && isCtrlPressed && isMetaPressed && isShiftPressed && isAltPressed) {
        event.preventDefault();
        shortcut.handler();
      }
    });
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);
};

// Global shortcuts configuration
export const globalShortcuts = {
  newEvent: {
    key: 'n',
    ctrl: true,
    description: '새 일정 만들기'
  },
  search: {
    key: 'k',
    ctrl: true,
    description: '검색'
  },
  toggleChat: {
    key: '/',
    ctrl: true,
    description: 'AI 채팅 토글'
  },
  escape: {
    key: 'Escape',
    description: '닫기/취소'
  },
  help: {
    key: '?',
    shift: true,
    description: '도움말 표시'
  }
};