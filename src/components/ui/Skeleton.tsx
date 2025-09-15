'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 w-full rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: width,
        height: height || (variant === 'text' ? '1rem' : undefined)
      }}
    />
  );
}

// 캘린더 이벤트 스켈레톤
export function CalendarEventSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" className="opacity-60" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 카드 스켈레톤
export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="space-y-4">
        <Skeleton variant="rectangular" height={200} className="rounded-lg" />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={80} height={32} />
          <Skeleton variant="rounded" width={80} height={32} />
        </div>
      </div>
    </div>
  );
}

// 테이블 스켈레톤
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="w-full">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(columns)].map((_, i) => (
              <Skeleton key={i} variant="text" width="70%" />
            ))}
          </div>
        </div>
        
        {/* Rows */}
        {[...Array(rows)].map((_, rowIndex) => (
          <div 
            key={rowIndex}
            className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-0"
          >
            <div className="grid grid-cols-4 gap-4">
              {[...Array(columns)].map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  variant="text" 
                  width={colIndex === 0 ? "90%" : "60%"} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 리스트 아이템 스켈레톤
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="50%" className="opacity-60" />
      </div>
      <Skeleton variant="rounded" width={24} height={24} />
    </div>
  );
}

// 프로필 스켈레톤
export function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width={64} height={64} />
      <div className="space-y-2">
        <Skeleton variant="text" width={120} />
        <Skeleton variant="text" width={180} className="opacity-60" />
      </div>
    </div>
  );
}

// 차트 스켈레톤
export function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end h-64 gap-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton 
              variant="rectangular" 
              height={`${Math.random() * 100 + 50}px`}
              className="rounded-t-lg"
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} variant="text" width={30} />
        ))}
      </div>
    </div>
  );
}

// 대시보드 스켈레톤
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton variant="text" width={200} height={32} />
        <div className="flex gap-2">
          <Skeleton variant="rounded" width={100} height={40} />
          <Skeleton variant="rounded" width={100} height={40} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <div className="space-y-3">
              <Skeleton variant="text" width="50%" />
              <Skeleton variant="text" width="30%" height={28} />
              <Skeleton variant="text" width="40%" className="opacity-60" />
            </div>
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CardSkeleton />
        </div>
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
            <Skeleton variant="text" width="60%" className="mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <ListItemSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}