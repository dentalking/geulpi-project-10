'use client';

import React from 'react';
import { motion } from 'framer-motion';

// 스켈레톤 로더 컴포넌트
export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-white/10 rounded-lg h-full w-full" />
    </div>
  );
}

// 캘린더 스켈레톤 로더
export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      {/* 헤더 스켈레톤 */}
      <div className="flex justify-between items-center mb-6">
        <SkeletonLoader className="h-8 w-32" />
        <div className="flex gap-2">
          <SkeletonLoader className="h-10 w-10 rounded-lg" />
          <SkeletonLoader className="h-10 w-20 rounded-lg" />
          <SkeletonLoader className="h-10 w-10 rounded-lg" />
        </div>
      </div>
      
      {/* 캘린더 그리드 스켈레톤 */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <SkeletonLoader key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// 이벤트 리스트 스켈레톤 로더
export function EventListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-lg">
          <SkeletonLoader className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLoader className="h-4 w-3/4" />
            <SkeletonLoader className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 스피너 로더
export function SpinnerLoader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center">
      <motion.div
        className={`${sizeMap[size]} border-2 border-purple-500/30 border-t-purple-500 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

// 프로그레스 로더
export function ProgressLoader({ progress = 0 }: { progress: number }) {
  return (
    <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
        initial={{ width: '0%' }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}

// 도트 로더
export function DotLoader() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-purple-500 rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [0.3, 1, 0.3]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1
          }}
        />
      ))}
    </div>
  );
}

// 풀페이지 로딩
export function FullPageLoader({ message = '로딩 중...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="relative mb-8">
          {/* 애니메이션 배경 효과 */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-2xl opacity-20"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* 메인 로딩 서클 */}
          <div className="relative">
            <motion.div
              className="w-24 h-24 mx-auto"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="2"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 0.75 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
            
            {/* 중앙 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-3xl"
              >
                📅
              </motion.div>
            </div>
          </div>
        </div>
        
        {/* 로딩 메시지 */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ color: 'var(--text-secondary)' }}
          className="text-sm font-medium mb-2"
        >
          {message}
        </motion.p>
        
        {/* 도트 로더 */}
        <DotLoader />
      </motion.div>
    </div>
  );
}

// 인라인 로딩 상태
export function InlineLoader({ text = '처리 중' }: { text?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <SpinnerLoader size="sm" />
      <span>{text}</span>
      <DotLoader />
    </div>
  );
}

// 버튼 로딩 상태
export function ButtonLoader({ loading, children, ...props }: any) {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <div className="flex items-center gap-2">
          <SpinnerLoader size="sm" />
          <span>처리 중...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}

// 지연 로딩 컨테이너 (로딩이 너무 빨리 깜빡이는 것 방지)
export function DelayedLoader({ 
  delay = 200, 
  children,
  fallback 
}: { 
  delay?: number;
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const [showLoader, setShowLoader] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowLoader(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!showLoader) return null;
  
  return <>{fallback}</>;
}

// 에러 상태 컴포넌트
export function ErrorState({ 
  title = '오류가 발생했습니다',
  message = '잠시 후 다시 시도해주세요',
  onRetry
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12"
    >
      <div className="text-5xl mb-4">😢</div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm transition-all"
          style={{ color: 'var(--text-primary)' }}
        >
          다시 시도
        </button>
      )}
    </motion.div>
  );
}