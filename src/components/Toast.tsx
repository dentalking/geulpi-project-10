'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast = ({ toast, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const getIcon = () => {
    return <img src="/images/logo.svg" alt="Toast" style={{ width: '18px', height: '18px' }} />;
  };

  const getColor = () => {
    switch (toast.type) {
      case 'success':
        return 'var(--accent-success)';
      case 'error':
        return 'var(--accent-danger)';
      case 'warning':
        return 'var(--accent-warning)';
      case 'info':
      default:
        return 'var(--accent-info)';
    }
  };

  return (
    <div
      className="glass-heavy"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        minWidth: '320px',
        maxWidth: '420px',
        marginBottom: 'var(--space-3)',
        border: `0.5px solid ${getColor()}20`,
        animation: 'slideInRight 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transform: 'translateX(0)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      }}
      onClick={() => onClose(toast.id)}
      role="alert"
      aria-live="polite"
    >
      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          background: getColor(),
          animation: `progress ${toast.duration || 3000}ms linear`,
          width: '100%',
          transformOrigin: 'left'
        }}
      />
      
      <div style={{
        fontSize: '20px',
        marginTop: '2px',
        filter: 'saturate(0.8)'
      }}>
        {getIcon()}
      </div>
      
      <div style={{ flex: 1 }}>
        <h4 className="text-on-glass-strong" style={{
          margin: 0,
          fontSize: 'var(--font-base)',
          fontWeight: '600',
          marginBottom: toast.message ? 'var(--space-1)' : 0
        }}>
          {toast.title}
        </h4>
        {toast.message && (
          <p style={{
            margin: 0,
            fontSize: 'var(--font-sm)',
            color: 'var(--text-secondary)',
            lineHeight: 'var(--leading-relaxed)'
          }}>
            {toast.message}
          </p>
        )}
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose(toast.id);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-tertiary)',
          fontSize: '18px',
          cursor: 'pointer',
          padding: 0,
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-sm)',
          transition: 'var(--transition-fast)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
        aria-label="닫기"
      >
        ×
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 'var(--space-6)',
        right: 'var(--space-6)',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    >
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes progress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
        
        @media (max-width: 768px) {
          div[style*="top: var(--space-6)"] {
            top: var(--space-4) !important;
            right: var(--space-3) !important;
            left: var(--space-3) !important;
          }
          
          div[style*="minWidth: 320px"] {
            min-width: auto !important;
            width: 100% !important;
          }
        }
      `}</style>
      <div style={{ pointerEvents: 'auto' }}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </div>
    </div>,
    document.body
  );
};