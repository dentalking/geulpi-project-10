'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, Command, Keyboard } from 'lucide-react';
import { getKeyboardShortcutsList } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ 
  isOpen: controlledIsOpen, 
  onClose 
}) => {
  const [isOpen, setIsOpen] = useState(controlledIsOpen || false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const shortcuts = getKeyboardShortcutsList();

  useEffect(() => {
    const handleShowShortcuts = () => {
      setIsOpen(true);
    };

    window.addEventListener('showKeyboardHelp', handleShowShortcuts);
    window.addEventListener('show-keyboard-shortcuts', handleShowShortcuts);

    return () => {
      window.removeEventListener('showKeyboardHelp', handleShowShortcuts);
      window.removeEventListener('show-keyboard-shortcuts', handleShowShortcuts);
    };
  }, []);

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="keyboard-shortcuts-modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 'var(--space-4)',
        animation: 'fadeIn 0.2s ease-in-out',
      }}
    >
      <div
        ref={modalRef}
        className="keyboard-shortcuts-modal"
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-2xl)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'var(--space-6)',
            borderBottom: '1px solid var(--color-gray-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-gray-50)',
          }}
        >
          <h2
            id="shortcuts-modal-title"
            style={{
              margin: 0,
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-semibold)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              color: 'var(--color-gray-900)',
            }}
          >
            <Keyboard style={{ width: '24px', height: '24px' }} />
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            aria-label="Close keyboard shortcuts modal"
            data-close-modal
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-gray-100)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 'var(--space-6)',
          }}
        >
          {shortcuts.map((category, categoryIndex) => (
            <div
              key={categoryIndex}
              style={{
                marginBottom: 'var(--space-6)',
              }}
            >
              <h3
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--color-gray-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 'var(--space-3)',
                }}
              >
                {category.category}
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                {category.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-gray-50)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-gray-100)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-gray-50)';
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--color-gray-700)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      {shortcut.action}
                    </span>
                    <kbd
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        background: 'var(--color-white)',
                        border: '1px solid var(--color-gray-300)',
                        borderRadius: '4px',
                        fontSize: 'var(--text-xs)',
                        fontFamily: 'monospace',
                        color: 'var(--color-gray-900)',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Additional navigation shortcuts */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--color-gray-500)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-3)',
              }}
            >
              Global Navigation
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 'var(--space-2)',
              }}
            >
              {[
                { keys: 'Alt + H', action: 'Go to Home' },
                { keys: 'Alt + D', action: 'Go to Dashboard' },
                { keys: 'Alt + S', action: 'Go to Settings' },
                { keys: 'Ctrl + /', action: 'Focus Search' },
                { keys: 'Escape', action: 'Close Modal/Dialog' },
                { keys: 'Tab', action: 'Navigate Forward' },
                { keys: 'Shift + Tab', action: 'Navigate Backward' },
                { keys: 'Enter', action: 'Activate Button/Link' },
                { keys: 'Space', action: 'Toggle Checkbox/Button' },
                { keys: 'Arrow Keys', action: 'Navigate Lists/Menus' },
              ].map((shortcut, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-gray-50)',
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  <span style={{ color: 'var(--color-gray-600)' }}>
                    {shortcut.action}
                  </span>
                  <kbd
                    style={{
                      padding: '2px 6px',
                      background: 'var(--color-white)',
                      border: '1px solid var(--color-gray-300)',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 'var(--space-4)',
            borderTop: '1px solid var(--color-gray-200)',
            background: 'var(--color-gray-50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-gray-600)',
          }}
        >
          Press <kbd style={{
            padding: '2px 6px',
            background: 'var(--color-white)',
            border: '1px solid var(--color-gray-300)',
            borderRadius: '3px',
            fontFamily: 'monospace',
          }}>?</kbd> anytime to show keyboard shortcuts
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default KeyboardShortcutsModal;