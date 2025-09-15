'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type LoaderType = 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress';
type LoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface UnifiedLoaderProps {
  type?: LoaderType;
  size?: LoaderSize;
  color?: string;
  text?: string;
  progress?: number; // For progress type
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

export const UnifiedLoader: React.FC<UnifiedLoaderProps> = ({
  type = 'spinner',
  size = 'md',
  color = 'var(--color-primary)',
  text,
  progress = 0,
  fullScreen = false,
  overlay = false,
  className = ''
}) => {
  const sizeMap = {
    xs: 16,
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64
  };

  const pixelSize = sizeMap[size];

  // Spinner Component
  const Spinner = () => (
    <div
      className={`loader-spinner ${className}`}
      style={{
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
        border: `${pixelSize / 16}px solid ${color}20`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}
    />
  );

  // Dots Component
  const Dots = () => (
    <div className={`loader-dots ${className}`} style={{ display: 'flex', gap: `${pixelSize / 8}px` }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            width: `${pixelSize / 4}px`,
            height: `${pixelSize / 4}px`,
            backgroundColor: color,
            borderRadius: '50%'
          }}
          animate={{
            y: [0, -pixelSize / 4, 0],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );

  // Pulse Component
  const Pulse = () => (
    <div className={`loader-pulse ${className}`} style={{ position: 'relative' }}>
      <motion.div
        style={{
          width: `${pixelSize}px`,
          height: `${pixelSize}px`,
          backgroundColor: color,
          borderRadius: '50%',
          position: 'absolute'
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 0.3, 0.7]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      <div
        style={{
          width: `${pixelSize}px`,
          height: `${pixelSize}px`,
          backgroundColor: color,
          borderRadius: '50%',
          opacity: 0.7
        }}
      />
    </div>
  );

  // Skeleton Component
  const Skeleton = () => (
    <div 
      className={`loader-skeleton ${className}`}
      style={{
        width: '100%',
        height: `${pixelSize}px`,
        backgroundColor: 'var(--surface-secondary)',
        borderRadius: 'var(--radius-md)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        }}
        animate={{
          x: ['0%', '200%']
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  );

  // Progress Component
  const Progress = () => (
    <div 
      className={`loader-progress ${className}`}
      style={{
        width: '100%',
        height: `${pixelSize / 4}px`,
        backgroundColor: 'var(--surface-secondary)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <motion.div
        style={{
          height: '100%',
          backgroundColor: color,
          borderRadius: 'var(--radius-full)',
          position: 'absolute',
          left: 0,
          top: 0
        }}
        initial={{ width: '0%' }}
        animate={{ width: `${progress}%` }}
        transition={{
          duration: 0.3,
          ease: 'easeOut'
        }}
      />
      {/* Animated stripe pattern */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.1) 10px,
            rgba(255,255,255,0.1) 20px
          )`,
        }}
        animate={{
          x: [0, 20]
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
    </div>
  );

  const loaderComponents = {
    spinner: <Spinner />,
    dots: <Dots />,
    pulse: <Pulse />,
    skeleton: <Skeleton />,
    progress: <Progress />
  };

  const loader = (
    <div 
      className="loader-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-3)',
        padding: fullScreen ? '0' : 'var(--space-4)',
        minHeight: fullScreen ? '100vh' : 'auto',
        position: fullScreen || overlay ? 'fixed' : 'relative',
        top: fullScreen || overlay ? 0 : 'auto',
        left: fullScreen || overlay ? 0 : 'auto',
        right: fullScreen || overlay ? 0 : 'auto',
        bottom: fullScreen || overlay ? 0 : 'auto',
        zIndex: overlay ? 9999 : 'auto',
        backgroundColor: overlay ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
        backdropFilter: overlay ? 'blur(4px)' : 'none'
      }}
    >
      {loaderComponents[type]}
      {text && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            fontSize: size === 'xs' || size === 'sm' ? 'var(--font-sm)' : 'var(--font-base)',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-2)',
            textAlign: 'center'
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {loader}
    </AnimatePresence>
  );
};

// Preset loaders for common use cases
export const PageLoader = () => (
  <UnifiedLoader type="spinner" size="lg" fullScreen text="Loading..." />
);

export const ButtonLoader = () => (
  <UnifiedLoader type="spinner" size="sm" color="currentColor" />
);

export const ContentLoader = () => (
  <UnifiedLoader type="dots" size="md" text="Loading content..." />
);

export const SkeletonLoader = () => (
  <UnifiedLoader type="skeleton" size="md" />
);

export const ProgressLoader = ({ progress, text }: { progress: number; text?: string }) => (
  <UnifiedLoader type="progress" progress={progress} text={text} />
);