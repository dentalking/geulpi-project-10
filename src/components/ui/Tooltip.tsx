'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Info, AlertCircle, ChevronDown } from 'lucide-react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';
type TooltipTrigger = 'hover' | 'click' | 'focus' | 'both';
type TooltipVariant = 'default' | 'info' | 'warning' | 'error' | 'success';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  trigger?: TooltipTrigger;
  variant?: TooltipVariant;
  delay?: number;
  showArrow?: boolean;
  maxWidth?: number;
  className?: string;
  showIcon?: boolean;
  shortcut?: string; // Keyboard shortcut hint
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'auto',
  trigger = 'hover',
  variant = 'default',
  delay = 200,
  showArrow = true,
  maxWidth = 250,
  className = '',
  showIcon = false,
  shortcut
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState<TooltipPosition>(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const variantStyles = {
    default: {
      backgroundColor: 'var(--surface-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-default)'
    },
    info: {
      backgroundColor: 'var(--color-info-bg)',
      color: 'var(--color-info-text)',
      border: '1px solid var(--color-info-border)'
    },
    warning: {
      backgroundColor: 'var(--color-warning-bg)',
      color: 'var(--color-warning-text)',
      border: '1px solid var(--color-warning-border)'
    },
    error: {
      backgroundColor: 'var(--color-error-bg)',
      color: 'var(--color-error-text)',
      border: '1px solid var(--color-error-border)'
    },
    success: {
      backgroundColor: 'var(--color-success-bg)',
      color: 'var(--color-success-text)',
      border: '1px solid var(--color-success-border)'
    }
  };

  const icons = {
    default: <HelpCircle size={14} />,
    info: <Info size={14} />,
    warning: <AlertCircle size={14} />,
    error: <AlertCircle size={14} />,
    success: <Info size={14} />
  };

  useEffect(() => {
    if (isVisible && position === 'auto' && tooltipRef.current && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const padding = 10;

      // Calculate available space in each direction
      const spaceTop = triggerRect.top;
      const spaceBottom = window.innerHeight - triggerRect.bottom;
      const spaceLeft = triggerRect.left;
      const spaceRight = window.innerWidth - triggerRect.right;

      // Determine best position
      let bestPosition: TooltipPosition = 'top';
      
      if (spaceTop >= tooltipRect.height + padding) {
        bestPosition = 'top';
      } else if (spaceBottom >= tooltipRect.height + padding) {
        bestPosition = 'bottom';
      } else if (spaceRight >= tooltipRect.width + padding) {
        bestPosition = 'right';
      } else if (spaceLeft >= tooltipRect.width + padding) {
        bestPosition = 'left';
      }

      setActualPosition(bestPosition);
    } else if (position !== 'auto') {
      setActualPosition(position);
    }
  }, [isVisible, position]);

  const handleShow = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const handleHide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  const handleClick = () => {
    setIsVisible(!isVisible);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getPositionStyles = () => {
    const offset = showArrow ? 12 : 8;
    
    switch (actualPosition) {
      case 'top':
        return {
          bottom: `calc(100% + ${offset}px)`,
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'bottom':
        return {
          top: `calc(100% + ${offset}px)`,
          left: '50%',
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          right: `calc(100% + ${offset}px)`,
          top: '50%',
          transform: 'translateY(-50%)'
        };
      case 'right':
        return {
          left: `calc(100% + ${offset}px)`,
          top: '50%',
          transform: 'translateY(-50%)'
        };
      default:
        return {};
    }
  };

  const getArrowStyles = () => {
    const arrowSize = 6;
    const baseArrowStyles = {
      position: 'absolute' as const,
      width: 0,
      height: 0,
      borderStyle: 'solid',
      borderColor: 'transparent'
    };

    switch (actualPosition) {
      case 'top':
        return {
          ...baseArrowStyles,
          bottom: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px 0`,
          borderTopColor: variantStyles[variant].backgroundColor
        };
      case 'bottom':
        return {
          ...baseArrowStyles,
          top: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: `0 ${arrowSize}px ${arrowSize}px`,
          borderBottomColor: variantStyles[variant].backgroundColor
        };
      case 'left':
        return {
          ...baseArrowStyles,
          right: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`,
          borderLeftColor: variantStyles[variant].backgroundColor
        };
      case 'right':
        return {
          ...baseArrowStyles,
          left: -arrowSize,
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`,
          borderRightColor: variantStyles[variant].backgroundColor
        };
      default:
        return {};
    }
  };

  const triggerProps = {
    ...(trigger === 'hover' || trigger === 'both' ? {
      onMouseEnter: handleShow,
      onMouseLeave: handleHide
    } : {}),
    ...(trigger === 'click' ? {
      onClick: handleClick
    } : {}),
    ...(trigger === 'focus' || trigger === 'both' ? {
      onFocus: handleShow,
      onBlur: handleHide
    } : {})
  };

  return (
    <div className={`tooltip-wrapper ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      <div ref={triggerRef} {...triggerProps}>
        {children}
      </div>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              zIndex: 10000,
              ...getPositionStyles(),
              pointerEvents: trigger === 'click' ? 'auto' : 'none'
            }}
          >
            <div
              style={{
                ...variantStyles[variant],
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-sm)',
                maxWidth: `${maxWidth}px`,
                boxShadow: 'var(--shadow-lg)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
                whiteSpace: 'pre-wrap'
              }}
            >
              {showIcon && icons[variant]}
              <div style={{ flex: 1 }}>
                {content}
                {shortcut && (
                  <div 
                    style={{
                      marginTop: 'var(--space-1)',
                      padding: '2px 6px',
                      backgroundColor: 'rgba(0, 0, 0, 0.1)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-xs)',
                      fontFamily: 'monospace',
                      display: 'inline-block'
                    }}
                  >
                    {shortcut}
                  </div>
                )}
              </div>
            </div>
            {showArrow && <div style={getArrowStyles()} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Preset tooltips for common use cases
export const HelpTooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => (
  <Tooltip content={content} variant="info" showIcon>
    {children}
  </Tooltip>
);

export const ShortcutTooltip: React.FC<{ 
  content: string; 
  shortcut: string; 
  children: React.ReactNode 
}> = ({ content, shortcut, children }) => (
  <Tooltip content={content} shortcut={shortcut} variant="default">
    {children}
  </Tooltip>
);

export const ErrorTooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => (
  <Tooltip content={content} variant="error" showIcon trigger="both">
    {children}
  </Tooltip>
);