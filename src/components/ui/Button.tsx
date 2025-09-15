import React from 'react';
import Link from 'next/link';
import RippleEffect from './RippleEffect';

export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ariaLabel?: string;
  disableRipple?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  href,
  onClick,
  type = 'button',
  className = '',
  style = {},
  icon,
  iconPosition = 'left',
  ariaLabel,
  disableRipple = false
}) => {
  // 버튼 스타일 정의
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    fontFamily: 'var(--font-family-base)',
    fontWeight: 'var(--font-medium)',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all var(--transition-base)',
    textDecoration: 'none',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled || loading ? 0.6 : 1,
    position: 'relative',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  };

  // 사이즈별 스타일
  const sizeStyles: Record<string, React.CSSProperties> = {
    xs: {
      padding: 'var(--btn-padding-xs)',
      fontSize: 'var(--btn-font-xs)',
      minHeight: 'var(--btn-height-xs)'
    },
    sm: {
      padding: 'var(--btn-padding-sm)',
      fontSize: 'var(--btn-font-sm)',
      minHeight: 'var(--btn-height-sm)'
    },
    md: {
      padding: 'var(--btn-padding-md)',
      fontSize: 'var(--btn-font-md)',
      minHeight: 'var(--btn-height-md)'
    },
    lg: {
      padding: 'var(--btn-padding-lg)',
      fontSize: 'var(--btn-font-lg)',
      minHeight: 'var(--btn-height-lg)'
    },
    xl: {
      padding: 'var(--btn-padding-xl)',
      fontSize: 'var(--btn-font-xl)',
      minHeight: 'var(--btn-height-xl)'
    }
  };

  // 변형별 스타일
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--color-black)',
      color: 'var(--color-white)',
      border: '1px solid var(--color-black)'
    },
    secondary: {
      background: 'var(--color-white)',
      color: 'var(--color-black)',
      border: '1px solid var(--color-gray-300)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-primary)',
      border: '1px solid transparent',
      padding: 'var(--space-2) var(--space-3)'
    },
    danger: {
      background: 'var(--color-error)',
      color: 'var(--color-white)',
      border: '1px solid var(--color-error)'
    },
    outline: {
      background: 'transparent',
      color: 'var(--color-black)',
      border: '1px solid var(--color-black)'
    }
  };

  // 호버 스타일
  const hoverStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--color-gray-800)',
      transform: 'scale(1.02)',
      boxShadow: 'var(--shadow-md)'
    },
    secondary: {
      background: 'var(--color-gray-100)',
      transform: 'scale(1.02)',
      borderColor: 'var(--color-gray-400)'
    },
    ghost: {
      color: 'var(--color-primary-hover)'
    },
    danger: {
      background: '#E5332A',
      transform: 'scale(1.02)',
      boxShadow: 'var(--shadow-md)'
    },
    outline: {
      background: 'var(--color-gray-100)',
      transform: 'scale(1.02)',
      borderColor: 'var(--color-gray-800)'
    }
  };

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (!disabled && !loading) {
      Object.assign(e.currentTarget.style, hoverStyles[variant]);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (!disabled && !loading) {
      Object.assign(e.currentTarget.style, variantStyles[variant]);
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = 'none';
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    if (!disabled && !loading) {
      e.currentTarget.style.transform = 'scale(0.98)';
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLElement>) => {
    if (!disabled && !loading) {
      e.currentTarget.style.transform = 'scale(1.02)';
      setTimeout(() => {
        e.currentTarget.style.transform = 'scale(1)';
      }, 100);
    }
  };

  const content = (
    <>
      {!disableRipple && !disabled && !loading && (
        <RippleEffect 
          color={variant === 'primary' || variant === 'danger' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'}
        />
      )}
      {loading && (
        <span style={{
          width: '14px',
          height: '14px',
          border: '2px solid transparent',
          borderTopColor: variant === 'primary' || variant === 'danger' ? 'white' : 'var(--color-black)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      )}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
      {variant === 'ghost' && !icon && <span style={{ marginLeft: 'var(--space-1)' }}>→</span>}
    </>
  );

  const commonProps = {
    className: `btn ${className}`,
    style: combinedStyles,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onClick: disabled || loading ? undefined : onClick,
    'aria-label': ariaLabel,
    'aria-disabled': disabled || loading
  };

  if (href && !disabled && !loading) {
    return (
      <Link href={href} {...commonProps}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      {...commonProps}
    >
      {content}
    </button>
  );
};

// 버튼 그룹 컴포넌트
export const ButtonGroup: React.FC<{
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  spacing?: 'tight' | 'normal' | 'loose';
}> = ({ children, align = 'left', spacing = 'normal' }) => {
  const spacingMap = {
    tight: 'var(--space-2)',
    normal: 'var(--space-3)',
    loose: 'var(--space-4)'
  };

  return (
    <div style={{
      display: 'flex',
      gap: spacingMap[spacing],
      justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
      flexWrap: 'wrap'
    }}>
      {children}
    </div>
  );
};