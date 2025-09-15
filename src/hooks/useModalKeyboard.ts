'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseModalKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  disableEscape?: boolean;
}

export function useModalKeyboard({ isOpen, onClose, disableEscape = false }: UseModalKeyboardProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Focus trap - keep focus within modal
  const handleTabKey = useCallback((e: KeyboardEvent) => {
    if (!modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const focusableArray = Array.from(focusableElements);

    if (focusableArray.length === 0) return;

    const firstFocusable = focusableArray[0] as HTMLElement;
    const lastFocusable = focusableArray[focusableArray.length - 1] as HTMLElement;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }, []);

  // Handle Escape key
  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (!disableEscape && e.key === 'Escape') {
      onClose();
    }
  }, [onClose, disableEscape]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'Tab') {
      handleTabKey(e);
    } else if (e.key === 'Escape') {
      handleEscapeKey(e);
    }
  }, [isOpen, handleTabKey, handleEscapeKey]);

  // Set initial focus and restore on close
  useEffect(() => {
    if (isOpen) {
      // Store current focused element
      previousActiveElement.current = document.activeElement;

      // Set initial focus after a small delay
      setTimeout(() => {
        if (!modalRef.current) return;

        // Try to find the first interactive element
        const firstButton = modalRef.current.querySelector(
          'button:not([disabled]), [tabindex="0"]'
        ) as HTMLElement;

        if (firstButton) {
          firstButton.focus();
        } else {
          // If no button found, focus the modal itself
          modalRef.current.focus();
        }
      }, 100);

      // Add keyboard event listener
      document.addEventListener('keydown', handleKeyDown);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore focus to previous element
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }

      // Restore body scroll
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return modalRef;
}

// Focus management utility
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const focusableArray = Array.from(focusableElements) as HTMLElement[];

  if (focusableArray.length > 0) {
    focusableArray[0].focus();
  }

  return focusableArray;
}