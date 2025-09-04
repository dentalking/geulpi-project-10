import React from 'react';

/* ============================================
   CONTAINER COMPONENT - 컨테이너
   ============================================ */

interface ContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  size = 'lg',
  padding = 'md',
  className = '',
  style = {}
}) => {
  const sizeMap = {
    sm: 'var(--container-sm)',
    md: 'var(--container-md)',
    lg: 'var(--container-lg)',
    xl: 'var(--container-xl)',
    full: '100%'
  };

  const paddingMap = {
    none: '0',
    sm: 'var(--space-4)',
    md: 'var(--space-6)',
    lg: 'var(--space-8)',
    xl: 'var(--space-10)'
  };

  return (
    <div
      className={`container ${className}`}
      style={{
        maxWidth: sizeMap[size],
        margin: '0 auto',
        padding: `0 ${paddingMap[padding]}`,
        width: '100%',
        ...style
      }}
    >
      {children}
    </div>
  );
};

/* ============================================
   CARD COMPONENT - 카드
   ============================================ */

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'bordered' | 'elevated' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  radius = 'lg',
  interactive = false,
  onClick,
  className = '',
  style = {}
}) => {
  const paddingMap = {
    none: '0',
    sm: 'var(--space-4)',
    md: 'var(--space-6)',
    lg: 'var(--space-8)',
    xl: 'var(--space-10)'
  };

  const radiusMap = {
    none: 'var(--radius-none)',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
    full: 'var(--radius-full)'
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: 'var(--color-white)',
      border: 'none'
    },
    bordered: {
      background: 'var(--color-white)',
      border: '1px solid var(--color-gray-200)'
    },
    elevated: {
      background: 'var(--color-white)',
      border: 'none',
      boxShadow: 'var(--shadow-md)'
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.18)'
    }
  };

  const baseStyles: React.CSSProperties = {
    padding: paddingMap[padding],
    borderRadius: radiusMap[radius],
    transition: 'all var(--transition-base)',
    cursor: interactive || onClick ? 'pointer' : 'default',
    ...variantStyles[variant],
    ...style
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactive || onClick) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (interactive || onClick) {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = variantStyles[variant].boxShadow || 'none';
    }
  };

  return (
    <div
      className={`card ${className}`}
      style={baseStyles}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

/* ============================================
   STACK COMPONENT - 스택 레이아웃
   ============================================ */

interface StackProps {
  children: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className = '',
  style = {}
}) => {
  const spacingMap = {
    none: '0',
    xs: 'var(--space-2)',
    sm: 'var(--space-3)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)',
    xl: 'var(--space-8)'
  };

  const alignMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch'
  };

  const justifyMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly'
  };

  return (
    <div
      className={`stack ${className}`}
      style={{
        display: 'flex',
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
        gap: spacingMap[spacing],
        alignItems: alignMap[align],
        justifyContent: justifyMap[justify],
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...style
      }}
    >
      {children}
    </div>
  );
};

/* ============================================
   DIVIDER COMPONENT - 구분선
   ============================================ */

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  thickness?: 'thin' | 'medium' | 'thick';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'solid',
  thickness = 'thin',
  spacing = 'md',
  color = 'var(--color-gray-200)',
  className = '',
  style = {}
}) => {
  const thicknessMap = {
    thin: '1px',
    medium: '2px',
    thick: '4px'
  };

  const spacingMap = {
    none: '0',
    sm: 'var(--space-2)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)'
  };

  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      className={`divider ${className}`}
      style={{
        width: isHorizontal ? '100%' : thicknessMap[thickness],
        height: isHorizontal ? thicknessMap[thickness] : '100%',
        background: color,
        margin: isHorizontal 
          ? `${spacingMap[spacing]} 0`
          : `0 ${spacingMap[spacing]}`,
        borderStyle: variant,
        ...style
      }}
    />
  );
};

/* ============================================
   SPACER COMPONENT - 간격
   ============================================ */

interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  direction?: 'horizontal' | 'vertical';
}

export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
  direction = 'vertical'
}) => {
  const sizeMap = {
    xs: 'var(--space-2)',
    sm: 'var(--space-3)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)',
    xl: 'var(--space-8)',
    '2xl': 'var(--space-10)'
  };

  return (
    <div
      style={{
        width: direction === 'horizontal' ? sizeMap[size] : '100%',
        height: direction === 'vertical' ? sizeMap[size] : '100%'
      }}
    />
  );
};