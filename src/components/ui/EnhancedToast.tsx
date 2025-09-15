'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X, 
  RotateCcw,
  ChevronRight 
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface EnhancedToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  position?: ToastPosition;
  onClose?: () => void;
  action?: ToastAction;
  undoAction?: () => void;
  progress?: boolean;
  persistent?: boolean;
}

export const EnhancedToast: React.FC<EnhancedToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  position = 'top-right',
  onClose,
  action,
  undoAction,
  progress = true,
  persistent = false
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progressWidth, setProgressWidth] = useState(100);

  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />
  };

  const colors = {
    success: {
      bg: 'var(--color-success-bg, #10B98115)',
      border: 'var(--color-success, #10B981)',
      text: 'var(--color-success, #10B981)',
      progressBg: 'var(--color-success, #10B981)'
    },
    error: {
      bg: 'var(--color-error-bg, #EF444415)',
      border: 'var(--color-error, #EF4444)',
      text: 'var(--color-error, #EF4444)',
      progressBg: 'var(--color-error, #EF4444)'
    },
    warning: {
      bg: 'var(--color-warning-bg, #F5970015)',
      border: 'var(--color-warning, #F59700)',
      text: 'var(--color-warning, #F59700)',
      progressBg: 'var(--color-warning, #F59700)'
    },
    info: {
      bg: 'var(--color-info-bg, #3B82F615)',
      border: 'var(--color-info, #3B82F6)',
      text: 'var(--color-info, #3B82F6)',
      progressBg: 'var(--color-info, #3B82F6)'
    }
  };

  useEffect(() => {
    if (!persistent && duration > 0) {
      const interval = setInterval(() => {
        setProgressWidth(prev => {
          if (prev <= 0) {
            handleClose();
            return 0;
          }
          return prev - (100 / (duration / 100));
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [duration, persistent]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const getPositionStyles = () => {
    const base = { position: 'fixed' as const, zIndex: 10001 };
    const offset = 'var(--space-4)';
    
    switch (position) {
      case 'top-right':
        return { ...base, top: offset, right: offset };
      case 'top-left':
        return { ...base, top: offset, left: offset };
      case 'bottom-right':
        return { ...base, bottom: offset, right: offset };
      case 'bottom-left':
        return { ...base, bottom: offset, left: offset };
      case 'top-center':
        return { ...base, top: offset, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-center':
        return { ...base, bottom: offset, left: '50%', transform: 'translateX(-50%)' };
      default:
        return base;
    }
  };

  const getAnimationProps = () => {
    const isTop = position.includes('top');
    const isLeft = position.includes('left');
    const isCenter = position.includes('center');

    if (isCenter) {
      return {
        initial: { opacity: 0, y: isTop ? -20 : 20, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: isTop ? -20 : 20, scale: 0.9 }
      };
    }

    return {
      initial: { opacity: 0, x: isLeft ? -100 : 100 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: isLeft ? -100 : 100 }
    };
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          key={id}
          {...getAnimationProps()}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{
            ...getPositionStyles(),
            minWidth: '320px',
            maxWidth: '420px'
          }}
        >
          <div
            style={{
              backgroundColor: colors[type].bg,
              border: `1px solid ${colors[type].border}`,
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-xl)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Main Content */}
            <div 
              style={{
                padding: 'var(--space-3)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)'
              }}
            >
              {/* Icon */}
              <div style={{ color: colors[type].text, flexShrink: 0, marginTop: '2px' }}>
                {icons[type]}
              </div>

              {/* Text Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 'var(--font-semibold)',
                  fontSize: 'var(--font-base)',
                  color: 'var(--text-primary)',
                  marginBottom: message ? 'var(--space-1)' : 0
                }}>
                  {title}
                </div>
                {message && (
                  <div style={{
                    fontSize: 'var(--font-sm)',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.4
                  }}>
                    {message}
                  </div>
                )}

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  marginTop: 'var(--space-2)',
                  flexWrap: 'wrap'
                }}>
                  {undoAction && (
                    <button
                      onClick={undoAction}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)',
                        padding: '4px 8px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${colors[type].border}`,
                        borderRadius: 'var(--radius-md)',
                        color: colors[type].text,
                        fontSize: 'var(--font-sm)',
                        fontWeight: 'var(--font-medium)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors[type].bg;
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <RotateCcw size={12} />
                      Undo
                    </button>
                  )}
                  
                  {action && (
                    <button
                      onClick={action.onClick}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)',
                        padding: '4px 8px',
                        backgroundColor: colors[type].border,
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        color: 'white',
                        fontSize: 'var(--font-sm)',
                        fontWeight: 'var(--font-medium)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.opacity = '0.9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      {action.label}
                      <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                style={{
                  padding: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Progress Bar */}
            {progress && !persistent && (
              <div 
                style={{
                  height: '2px',
                  backgroundColor: 'var(--surface-tertiary)',
                  position: 'relative'
                }}
              >
                <motion.div
                  style={{
                    height: '100%',
                    backgroundColor: colors[type].progressBg,
                    width: `${progressWidth}%`,
                    transition: 'width 0.1s linear'
                  }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Toast Manager Hook
export const useEnhancedToast = () => {
  const [toasts, setToasts] = useState<EnhancedToastProps[]>([]);

  const showToast = (options: Omit<EnhancedToastProps, 'id' | 'onClose'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: EnhancedToastProps = {
      ...options,
      id,
      onClose: () => removeToast(id)
    };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (title: string, options?: Partial<EnhancedToastProps>) => 
    showToast({ ...options, type: 'success', title });

  const error = (title: string, options?: Partial<EnhancedToastProps>) => 
    showToast({ ...options, type: 'error', title });

  const warning = (title: string, options?: Partial<EnhancedToastProps>) => 
    showToast({ ...options, type: 'warning', title });

  const info = (title: string, options?: Partial<EnhancedToastProps>) => 
    showToast({ ...options, type: 'info', title });

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
};