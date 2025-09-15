'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
  type?: 'fade' | 'slide' | 'scale' | 'slideUp' | 'crossfade';
  duration?: number;
  delay?: number;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  type = 'fade',
  duration = 0.3,
  delay = 0
}) => {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState('enter');

  useEffect(() => {
    setTransitionStage('exit');
    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setTransitionStage('enter');
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [children, duration]);

  const variants = {
    fade: {
      enter: { opacity: 1 },
      exit: { opacity: 0 }
    },
    slide: {
      enter: { x: 0, opacity: 1 },
      exit: { x: -100, opacity: 0 }
    },
    slideUp: {
      enter: { y: 0, opacity: 1 },
      exit: { y: 20, opacity: 0 }
    },
    scale: {
      enter: { scale: 1, opacity: 1 },
      exit: { scale: 0.95, opacity: 0 }
    },
    crossfade: {
      enter: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(4px)' }
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="exit"
        animate="enter"
        exit="exit"
        variants={variants[type]}
        transition={{
          duration,
          delay,
          ease: [0.4, 0, 0.2, 1] // Custom easing
        }}
      >
        {displayChildren}
      </motion.div>
    </AnimatePresence>
  );
};

// 라우트별 맞춤 전환 효과
export const RouteTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  
  // 라우트별 전환 타입 설정
  const getTransitionType = () => {
    if (pathname?.includes('/dashboard')) return 'slideUp';
    if (pathname?.includes('/profile')) return 'scale';
    if (pathname?.includes('/settings')) return 'slide';
    return 'fade';
  };

  return (
    <PageTransition type={getTransitionType()} duration={0.4}>
      {children}
    </PageTransition>
  );
};

// 섹션 전환 애니메이션
export const SectionTransition: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};