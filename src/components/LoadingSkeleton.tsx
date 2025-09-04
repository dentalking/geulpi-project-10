'use client';

import { motion, Variants } from 'framer-motion';

interface LoadingSkeletonProps {
  type?: 'card' | 'text' | 'button' | 'avatar' | 'calendar' | 'full';
  className?: string;
}

export default function LoadingSkeleton({ 
  type = 'full', 
  className = '' 
}: LoadingSkeletonProps) {
  const skeletonVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.3,
        ease: 'easeInOut'
      }
    }
  };

  const shimmerVariants: Variants = {
    initial: { x: '-100%' },
    animate: {
      x: '100%',
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: 'linear'
      }
    }
  };

  if (type === 'full') {
    return (
      <motion.div 
        className="min-h-screen bg-black relative overflow-hidden"
        initial="initial"
        animate="animate"
        variants={skeletonVariants}
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10" />
        
        {/* Content skeleton */}
        <div className="relative z-10 p-6 max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 backdrop-blur animate-pulse" />
              <div className="h-8 w-32 rounded-lg bg-white/5 backdrop-blur animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-28 rounded-full bg-white/5 backdrop-blur animate-pulse" />
              <div className="h-10 w-32 rounded-full bg-white/5 backdrop-blur animate-pulse" />
            </div>
          </div>

          {/* Command bar skeleton */}
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="h-12 rounded-xl bg-white/5 backdrop-blur animate-pulse relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                variants={shimmerVariants}
                initial="initial"
                animate="animate"
              />
            </div>
          </div>

          {/* Calendar grid skeleton */}
          <div className="grid grid-cols-7 gap-4 mb-8">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-4 w-12 rounded bg-white/5 mx-auto mb-3 animate-pulse" />
                <div className="aspect-square rounded-lg bg-white/5 backdrop-blur animate-pulse" />
              </div>
            ))}
          </div>

          {/* Event cards skeleton */}
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10 relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-1 h-full rounded-full bg-gradient-to-b from-purple-500/50 to-pink-500/50" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 rounded bg-white/10 animate-pulse" />
                    <div className="h-4 w-1/2 rounded bg-white/5 animate-pulse" />
                    <div className="h-4 w-1/3 rounded bg-white/5 animate-pulse" />
                  </div>
                </div>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                  variants={shimmerVariants}
                  initial="initial"
                  animate="animate"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === 'card') {
    return (
      <div className={`p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10 animate-pulse ${className}`}>
        <div className="space-y-3">
          <div className="h-5 w-3/4 rounded bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-white/5" />
          <div className="h-4 w-2/3 rounded bg-white/5" />
        </div>
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="h-4 w-full rounded bg-white/5 animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-white/5 animate-pulse" />
        <div className="h-4 w-4/6 rounded bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (type === 'button') {
    return (
      <div className={`h-10 w-28 rounded-full bg-white/5 backdrop-blur animate-pulse ${className}`} />
    );
  }

  if (type === 'avatar') {
    return (
      <div className={`w-10 h-10 rounded-full bg-white/5 backdrop-blur animate-pulse ${className}`} />
    );
  }

  return null;
}

// Export specialized skeleton components
export function CalendarSkeleton() {
  return <LoadingSkeleton type="full" />;
}

export function EventCardSkeleton() {
  return <LoadingSkeleton type="card" />;
}

export function ButtonSkeleton() {
  return <LoadingSkeleton type="button" />;
}

export function TextSkeleton() {
  return <LoadingSkeleton type="text" />;
}

export function AvatarSkeleton() {
  return <LoadingSkeleton type="avatar" />;
}