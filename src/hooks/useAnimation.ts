import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, TargetAndTransition } from 'framer-motion';

/**
 * 통합 애니메이션 훅
 * 일관된 마이크로 인터랙션을 위한 애니메이션 패턴 제공
 */

// 애니메이션 프리셋
export const animationPresets = {
  // 페이드 인/아웃
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  
  // 슬라이드 애니메이션
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  slideLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  slideRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // 스케일 애니메이션
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  
  // 회전 애니메이션
  rotate: {
    initial: { opacity: 0, rotate: -180 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 180 },
    transition: { duration: 0.4, ease: 'easeInOut' }
  },
  
  // 팝 애니메이션
  pop: {
    initial: { scale: 0 },
    animate: { scale: 1 },
    exit: { scale: 0 },
    transition: { type: 'spring', stiffness: 500, damping: 25 }
  }
};

// 호버 애니메이션 프리셋
export const hoverPresets = {
  lift: {
    whileHover: { 
      y: -4, 
      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
      transition: { duration: 0.2 }
    }
  },
  
  glow: {
    whileHover: { 
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
      transition: { duration: 0.2 }
    }
  },
  
  scale: {
    whileHover: { 
      scale: 1.05,
      transition: { duration: 0.2 }
    },
    whileTap: { scale: 0.95 }
  },
  
  brightness: {
    whileHover: { 
      filter: 'brightness(1.1)',
      transition: { duration: 0.2 }
    }
  },
  
  tilt: {
    whileHover: { 
      rotateZ: 2,
      transition: { duration: 0.2 }
    }
  }
};

// 스크롤 애니메이션 프리셋
export const scrollPresets = {
  fadeInUp: {
    initial: { opacity: 0, y: 50 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.5, ease: 'easeOut' }
  },
  
  fadeInScale: {
    initial: { opacity: 0, scale: 0.8 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.5, ease: 'easeOut' }
  },
  
  slideInLeft: {
    initial: { opacity: 0, x: -100 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.6, ease: 'easeOut' }
  },
  
  slideInRight: {
    initial: { opacity: 0, x: 100 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.6, ease: 'easeOut' }
  }
};

/**
 * 호버 애니메이션 훅
 */
export function useHoverAnimation(preset: keyof typeof hoverPresets = 'scale') {
  const [isHovered, setIsHovered] = useState(false);
  
  const handlers = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false)
  };
  
  const animationProps = {
    ...hoverPresets[preset],
    animate: isHovered ? hoverPresets[preset].whileHover : {}
  };
  
  return { isHovered, handlers, animationProps };
}

/**
 * 포커스 애니메이션 훅
 */
export function useFocusAnimation() {
  const [isFocused, setIsFocused] = useState(false);
  
  const handlers = {
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false)
  };
  
  const animationProps = {
    animate: isFocused ? {
      borderColor: 'var(--color-primary)',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    } : {},
    transition: { duration: 0.2 }
  };
  
  return { isFocused, handlers, animationProps };
}

/**
 * 스태거 애니메이션 훅
 * 여러 요소를 순차적으로 애니메이션
 */
export function useStaggerAnimation(
  itemCount: number,
  staggerDelay: number = 0.1
) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  };
  
  return { containerVariants, itemVariants };
}

/**
 * 드래그 애니메이션 훅
 */
export function useDragAnimation(
  onDragEnd?: (x: number, y: number) => void
) {
  const constraintsRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragProps = {
    drag: true,
    dragConstraints: constraintsRef,
    dragElastic: 0.2,
    whileDrag: { scale: 1.1, zIndex: 1000 },
    onDragStart: () => setIsDragging(true),
    onDragEnd: (event: any, info: any) => {
      setIsDragging(false);
      onDragEnd?.(info.offset.x, info.offset.y);
    }
  };
  
  return { constraintsRef, isDragging, dragProps };
}

/**
 * 제스처 애니메이션 훅
 * 터치 및 마우스 제스처 처리
 */
export function useGestureAnimation() {
  const [gesture, setGesture] = useState<'idle' | 'hover' | 'tap' | 'drag'>('idle');
  
  const gestureProps = {
    whileHover: () => setGesture('hover'),
    whileTap: () => setGesture('tap'),
    whileDrag: () => setGesture('drag'),
    onHoverEnd: () => setGesture('idle'),
    onTapCancel: () => setGesture('idle'),
    onDragEnd: () => setGesture('idle')
  };
  
  const getGestureStyles = () => {
    switch (gesture) {
      case 'hover':
        return { scale: 1.05, filter: 'brightness(1.1)' };
      case 'tap':
        return { scale: 0.95 };
      case 'drag':
        return { scale: 1.1, opacity: 0.8 };
      default:
        return {};
    }
  };
  
  return { gesture, gestureProps, getGestureStyles };
}

/**
 * 패럴랙스 애니메이션 훅
 */
export function useParallaxAnimation(speed: number = 0.5) {
  const [offsetY, setOffsetY] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      setOffsetY(window.scrollY * speed);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);
  
  const parallaxStyle = {
    transform: `translateY(${offsetY}px)`
  };
  
  return { offsetY, parallaxStyle };
}

/**
 * 인터섹션 애니메이션 훅
 * 요소가 뷰포트에 들어올 때 애니메이션
 */
export function useIntersectionAnimation(
  threshold: number = 0.1,
  triggerOnce: boolean = true
) {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  
  useEffect(() => {
    if (!ref.current || (triggerOnce && hasTriggered)) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsInView(inView);
        if (inView && triggerOnce) {
          setHasTriggered(true);
        }
      },
      { threshold }
    );
    
    observer.observe(ref.current);
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, triggerOnce, hasTriggered]);
  
  return { ref, isInView };
}