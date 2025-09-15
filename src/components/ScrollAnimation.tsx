'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { useIntersectionAnimation } from '@/hooks/useAnimation';

interface ScrollAnimationProps {
  children: React.ReactNode;
  animation?: 'fadeUp' | 'fadeDown' | 'fadeLeft' | 'fadeRight' | 'scale' | 'rotate' | 'blur';
  delay?: number;
  duration?: number;
  threshold?: number;
  triggerOnce?: boolean;
  className?: string;
  stagger?: boolean;
  staggerDelay?: number;
}

const animations: Record<string, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', damping: 20, stiffness: 100 }
    }
  },
  fadeDown: {
    hidden: { opacity: 0, y: -50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', damping: 20, stiffness: 100 }
    }
  },
  fadeLeft: {
    hidden: { opacity: 0, x: 100 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { type: 'spring', damping: 20, stiffness: 100 }
    }
  },
  fadeRight: {
    hidden: { opacity: 0, x: -100 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { type: 'spring', damping: 20, stiffness: 100 }
    }
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { type: 'spring', damping: 20, stiffness: 100 }
    }
  },
  rotate: {
    hidden: { opacity: 0, rotate: -10 },
    visible: { 
      opacity: 1, 
      rotate: 0,
      transition: { type: 'spring', damping: 20, stiffness: 100 }
    }
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(10px)' },
    visible: { 
      opacity: 1, 
      filter: 'blur(0px)',
      transition: { duration: 0.5 }
    }
  }
};

export const ScrollAnimation: React.FC<ScrollAnimationProps> = ({
  children,
  animation = 'fadeUp',
  delay = 0,
  duration = 0.5,
  threshold = 0.1,
  triggerOnce = true,
  className = '',
  stagger = false,
  staggerDelay = 0.1
}) => {
  const { ref, isInView } = useIntersectionAnimation(threshold, triggerOnce);

  const selectedAnimation = animations[animation];

  return (
    <motion.div
      ref={ref as any}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={selectedAnimation}
      transition={{ delay, duration }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 스태거 애니메이션 컨테이너
export const ScrollStagger: React.FC<{
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}> = ({ children, staggerDelay = 0.1, className = '' }) => {
  const { ref, isInView } = useIntersectionAnimation(0.1, true);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 20,
        stiffness: 100
      }
    }
  };

  return (
    <motion.div
      ref={ref as any}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

// 카운터 애니메이션
export const ScrollCounter: React.FC<{
  from?: number;
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}> = ({ from = 0, to, duration = 2, prefix = '', suffix = '', className = '' }) => {
  const { ref, isInView } = useIntersectionAnimation(0.5, true);
  const [count, setCount] = React.useState(from);

  React.useEffect(() => {
    if (!isInView) return;

    const increment = (to - from) / (duration * 60); // 60 FPS
    let current = from;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= to) {
        setCount(to);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [isInView, from, to, duration]);

  return (
    <div ref={ref as any} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </div>
  );
};

// 프로그레스 바 애니메이션
export const ScrollProgress: React.FC<{
  value: number;
  max?: number;
  label?: string;
  color?: string;
  className?: string;
}> = ({ value, max = 100, label, color = 'var(--color-primary)', className = '' }) => {
  const { ref, isInView } = useIntersectionAnimation(0.5, true);

  return (
    <div ref={ref as any} className={className}>
      {label && <div className="mb-2 text-sm font-medium">{label}</div>}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={isInView ? { width: `${(value / max) * 100}%` } : { width: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      <div className="mt-1 text-xs text-gray-600">
        {value}/{max} ({Math.round((value / max) * 100)}%)
      </div>
    </div>
  );
};

// 텍스트 타이핑 애니메이션
export const ScrollTyping: React.FC<{
  text: string;
  speed?: number;
  cursor?: boolean;
  className?: string;
}> = ({ text, speed = 50, cursor = true, className = '' }) => {
  const { ref, isInView } = useIntersectionAnimation(0.5, true);
  const [displayText, setDisplayText] = React.useState('');
  const [showCursor, setShowCursor] = React.useState(true);

  React.useEffect(() => {
    if (!isInView) {
      setDisplayText('');
      return;
    }

    let index = 0;
    const timer = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
        if (cursor) {
          setTimeout(() => setShowCursor(false), 500);
        }
      }
    }, speed);

    return () => clearInterval(timer);
  }, [isInView, text, speed, cursor]);

  return (
    <div ref={ref as any} className={className}>
      {displayText}
      {cursor && showCursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        >
          |
        </motion.span>
      )}
    </div>
  );
};

// 이미지 레이지 로딩 with 애니메이션
export const ScrollImage: React.FC<{
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  animation?: 'fade' | 'scale' | 'blur';
}> = ({ src, alt, placeholder, className = '', animation = 'fade' }) => {
  const { ref, isInView } = useIntersectionAnimation(0.1, true);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState(placeholder || '');

  React.useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.src = src;
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };
  }, [isInView, src]);

  const getAnimationVariants = (): Variants => {
    switch (animation) {
      case 'scale':
        return {
          loading: { scale: 1.1, filter: 'blur(20px)' },
          loaded: { scale: 1, filter: 'blur(0px)' }
        };
      case 'blur':
        return {
          loading: { filter: 'blur(20px)' },
          loaded: { filter: 'blur(0px)' }
        };
      default:
        return {
          loading: { opacity: 0 },
          loaded: { opacity: 1 }
        };
    }
  };

  return (
    <motion.img
      ref={ref as any}
      src={currentSrc}
      alt={alt}
      className={className}
      initial="loading"
      animate={isLoaded ? "loaded" : "loading"}
      variants={getAnimationVariants()}
      transition={{ duration: 0.5 }}
    />
  );
};