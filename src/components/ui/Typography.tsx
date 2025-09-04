import React from 'react';

type TypographyVariant = 
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'body' | 'body-large' | 'body-small'
  | 'caption' | 'label' | 'micro';

type TypographyWeight = 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
type TypographyColor = 'primary' | 'secondary' | 'tertiary' | 'error' | 'success' | 'warning' | 'info';
type TypographyAlign = 'left' | 'center' | 'right' | 'justify';

interface TypographyProps {
  variant?: TypographyVariant;
  weight?: TypographyWeight;
  color?: TypographyColor;
  align?: TypographyAlign;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: keyof JSX.IntrinsicElements;
  truncate?: boolean;
  maxLines?: number;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  weight = 'regular',
  color = 'primary',
  align = 'left',
  children,
  className = '',
  style = {},
  as,
  truncate = false,
  maxLines
}) => {
  // 변형별 스타일 매핑
  const variantStyles: Record<TypographyVariant, React.CSSProperties> = {
    h1: {
      fontSize: 'var(--text-5xl)',
      lineHeight: 'var(--leading-tight)',
      letterSpacing: 'var(--tracking-tighter)',
      fontWeight: 'var(--font-bold)'
    },
    h2: {
      fontSize: 'var(--text-4xl)',
      lineHeight: 'var(--leading-tight)',
      letterSpacing: 'var(--tracking-tight)',
      fontWeight: 'var(--font-bold)'
    },
    h3: {
      fontSize: 'var(--text-3xl)',
      lineHeight: 'var(--leading-snug)',
      letterSpacing: 'var(--tracking-tight)',
      fontWeight: 'var(--font-semibold)'
    },
    h4: {
      fontSize: 'var(--text-2xl)',
      lineHeight: 'var(--leading-snug)',
      letterSpacing: 'var(--tracking-normal)',
      fontWeight: 'var(--font-semibold)'
    },
    h5: {
      fontSize: 'var(--text-xl)',
      lineHeight: 'var(--leading-normal)',
      letterSpacing: 'var(--tracking-normal)',
      fontWeight: 'var(--font-medium)'
    },
    h6: {
      fontSize: 'var(--text-lg)',
      lineHeight: 'var(--leading-normal)',
      letterSpacing: 'var(--tracking-normal)',
      fontWeight: 'var(--font-medium)'
    },
    'body': {
      fontSize: 'var(--text-base)',
      lineHeight: 'var(--leading-normal)',
      letterSpacing: 'var(--tracking-normal)',
      fontWeight: 'var(--font-regular)'
    },
    'body-large': {
      fontSize: 'var(--text-md)',
      lineHeight: 'var(--leading-relaxed)',
      letterSpacing: 'var(--tracking-normal)',
      fontWeight: 'var(--font-regular)'
    },
    'body-small': {
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-normal)',
      letterSpacing: 'var(--tracking-normal)',
      fontWeight: 'var(--font-regular)'
    },
    caption: {
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-normal)',
      letterSpacing: 'var(--tracking-normal)',
      fontWeight: 'var(--font-regular)'
    },
    label: {
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--leading-tight)',
      letterSpacing: 'var(--tracking-wide)',
      fontWeight: 'var(--font-medium)',
      textTransform: 'uppercase'
    },
    micro: {
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--leading-tight)',
      letterSpacing: 'var(--tracking-normal)',
      fontWeight: 'var(--font-regular)'
    }
  };

  // 색상 매핑
  const colorStyles: Record<TypographyColor, string> = {
    primary: 'var(--color-gray-900)',
    secondary: 'var(--color-gray-600)',
    tertiary: 'var(--color-gray-400)',
    error: 'var(--color-error)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    info: 'var(--color-info)'
  };

  // Weight 매핑
  const weightStyles: Record<TypographyWeight, string> = {
    thin: 'var(--font-thin)',
    light: 'var(--font-light)',
    regular: 'var(--font-regular)',
    medium: 'var(--font-medium)',
    semibold: 'var(--font-semibold)',
    bold: 'var(--font-bold)'
  };

  // 기본 태그 결정
  const getDefaultTag = (): keyof JSX.IntrinsicElements => {
    if (as) return as;
    if (variant.startsWith('h')) return variant as keyof JSX.IntrinsicElements;
    if (variant === 'label') return 'label';
    if (variant === 'caption' || variant === 'micro') return 'span';
    return 'p';
  };

  const Tag = getDefaultTag();

  // 스타일 조합
  const combinedStyles: React.CSSProperties = {
    ...variantStyles[variant],
    color: colorStyles[color],
    fontWeight: weightStyles[weight],
    textAlign: align,
    fontFamily: 'var(--font-family-base)',
    margin: 0,
    ...(truncate && {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }),
    ...(maxLines && {
      display: '-webkit-box',
      WebkitLineClamp: maxLines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden'
    }),
    ...style
  };

  return React.createElement(
    Tag,
    {
      className: `typography ${className}`,
      style: combinedStyles
    },
    children
  );
};

// 헤딩 컴포넌트 shortcuts
export const H1: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h1" {...props} />
);

export const H2: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h2" {...props} />
);

export const H3: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h3" {...props} />
);

export const H4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h4" {...props} />
);

export const H5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h5" {...props} />
);

export const H6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="h6" {...props} />
);

export const Body: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="body" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const Label: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="label" {...props} />
);

export const Micro: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="micro" {...props} />
);