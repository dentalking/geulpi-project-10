'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

// Focus Trap Hook
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // 초기 포커스 설정
    if (firstElement) {
      firstElement.focus();
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);
  
  return containerRef;
}

// Focus Trap Component
interface FocusTrapProps {
  children: React.ReactNode;
  isActive?: boolean;
  returnFocus?: boolean;
  className?: string;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  isActive = true,
  returnFocus = true,
  className = ''
}) => {
  const previousFocus = useRef<HTMLElement | null>(null);
  const containerRef = useFocusTrap(isActive);
  
  useEffect(() => {
    if (isActive && returnFocus) {
      previousFocus.current = document.activeElement as HTMLElement;
      
      return () => {
        previousFocus.current?.focus();
      };
    }
  }, [isActive, returnFocus]);
  
  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

// Skip to Content Link
export const SkipToContent: React.FC<{ targetId: string }> = ({ targetId }) => {
  const handleClick = () => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView();
    }
  };
  
  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
    >
      Skip to main content
    </a>
  );
};

// Keyboard Shortcut Manager
interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach(shortcut => {
        const matchesKey = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const matchesShift = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const matchesAlt = shortcut.alt ? e.altKey : !e.altKey;
        const matchesMeta = shortcut.meta ? e.metaKey : !e.metaKey;
        
        if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, isActive]);
}

// Keyboard Navigation List
interface KeyboardNavigableListProps {
  items: any[];
  renderItem: (item: any, index: number, isFocused: boolean) => React.ReactNode;
  onSelect?: (item: any, index: number) => void;
  orientation?: 'vertical' | 'horizontal';
  wrap?: boolean;
  className?: string;
}

export const KeyboardNavigableList: React.FC<KeyboardNavigableListProps> = ({
  items,
  renderItem,
  onSelect,
  orientation = 'vertical',
  wrap = false,
  className = ''
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const key = e.key;
    const isVertical = orientation === 'vertical';
    
    let newIndex = focusedIndex;
    
    switch (key) {
      case 'ArrowUp':
        if (isVertical) {
          e.preventDefault();
          newIndex = focusedIndex - 1;
        }
        break;
      case 'ArrowDown':
        if (isVertical) {
          e.preventDefault();
          newIndex = focusedIndex + 1;
        }
        break;
      case 'ArrowLeft':
        if (!isVertical) {
          e.preventDefault();
          newIndex = focusedIndex - 1;
        }
        break;
      case 'ArrowRight':
        if (!isVertical) {
          e.preventDefault();
          newIndex = focusedIndex + 1;
        }
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onSelect) {
          onSelect(items[focusedIndex], focusedIndex);
        }
        break;
    }
    
    // Handle wrapping
    if (wrap) {
      if (newIndex < 0) newIndex = items.length - 1;
      if (newIndex >= items.length) newIndex = 0;
    } else {
      newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
    }
    
    setFocusedIndex(newIndex);
  }, [focusedIndex, items.length, onSelect, orientation, wrap]);
  
  return (
    <div
      ref={containerRef}
      className={className}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="list"
      aria-orientation={orientation}
    >
      {items.map((item, index) => (
        <div
          key={index}
          role="listitem"
          aria-selected={index === focusedIndex}
          onClick={() => {
            setFocusedIndex(index);
            onSelect?.(item, index);
          }}
        >
          {renderItem(item, index, index === focusedIndex)}
        </div>
      ))}
    </div>
  );
};

// Roving Tab Index
interface RovingTabIndexProps {
  children: React.ReactElement[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const RovingTabIndex: React.FC<RovingTabIndexProps> = ({
  children,
  orientation = 'horizontal',
  className = ''
}) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isHorizontal = orientation === 'horizontal';
    let newIndex = focusedIndex;
    
    switch (e.key) {
      case 'ArrowLeft':
        if (isHorizontal) {
          e.preventDefault();
          newIndex = Math.max(0, focusedIndex - 1);
        }
        break;
      case 'ArrowRight':
        if (isHorizontal) {
          e.preventDefault();
          newIndex = Math.min(children.length - 1, focusedIndex + 1);
        }
        break;
      case 'ArrowUp':
        if (!isHorizontal) {
          e.preventDefault();
          newIndex = Math.max(0, focusedIndex - 1);
        }
        break;
      case 'ArrowDown':
        if (!isHorizontal) {
          e.preventDefault();
          newIndex = Math.min(children.length - 1, focusedIndex + 1);
        }
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = children.length - 1;
        break;
    }
    
    setFocusedIndex(newIndex);
  };
  
  return (
    <div className={className} onKeyDown={handleKeyDown}>
      {React.Children.map(children, (child, index) =>
        React.cloneElement(child, {
          tabIndex: index === focusedIndex ? 0 : -1,
          onFocus: () => setFocusedIndex(index)
        })
      )}
    </div>
  );
};

// Accessible Modal
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = ''
}) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // ESC key to close
  useKeyboardShortcuts([
    { key: 'Escape', action: onClose }
  ], isOpen);
  
  if (!mounted || !isOpen) return null;
  
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <FocusTrap isActive={isOpen}>
          <div className={`bg-white rounded-lg shadow-xl max-w-md w-full ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 id="modal-title" className="text-lg font-semibold">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4">
              {children}
            </div>
          </div>
        </FocusTrap>
      </div>
    </>,
    document.body
  );
};

// Keyboard Hint Component
interface KeyboardHintProps {
  shortcut: string;
  description: string;
  className?: string;
}

export const KeyboardHint: React.FC<KeyboardHintProps> = ({
  shortcut,
  description,
  className = ''
}) => {
  const keys = shortcut.split('+').map(key => key.trim());
  
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
              {key}
            </kbd>
            {index < keys.length - 1 && <span className="text-gray-400">+</span>}
          </React.Fragment>
        ))}
      </div>
      <span className="text-gray-600">{description}</span>
    </div>
  );
};

// Announce for Screen Readers
export const useAnnounce = () => {
  const [announcement, setAnnouncement] = useState('');
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement('');
    setTimeout(() => {
      setAnnouncement(message);
    }, 100);
  }, []);
  
  return {
    announce,
    Announcer: () => (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    )
  };
};