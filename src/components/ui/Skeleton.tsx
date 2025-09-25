'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const variantClasses = {
    text: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={cn(
        baseClasses,
        animationClasses[animation],
        variantClasses[variant],
        className
      )}
      style={style}
      {...props}
    />
  );
}

// Event Card Skeleton
export function EventCardSkeleton() {
  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton height={20} width="60%" />
          <Skeleton height={16} width="40%" />
        </div>
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton height={14} width={80} />
        <Skeleton height={14} width={100} />
      </div>
      <Skeleton height={14} width="80%" />
    </div>
  );
}

// Chat Message Skeleton
export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton variant="circular" width={36} height={36} />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="70%" />
        <Skeleton height={16} width="90%" />
        <Skeleton height={16} width="40%" />
      </div>
    </div>
  );
}

// Calendar Event List Skeleton
export function EventListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <EventCardSkeleton key={index} />
      ))}
    </div>
  );
}

// Detail View Skeleton
export function EventDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <Skeleton height={32} width="70%" className="mb-2" />
        <Skeleton height={16} width={120} />
      </div>

      {/* Content sections */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Skeleton variant="circular" width={20} height={20} />
          <div className="flex-1">
            <Skeleton height={16} width="60%" />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Skeleton variant="circular" width={20} height={20} />
          <div className="flex-1">
            <Skeleton height={16} width="45%" />
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Skeleton variant="circular" width={20} height={20} />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="80%" />
            <Skeleton height={16} width="60%" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Skeleton height={40} width={100} className="rounded-lg" />
        <Skeleton height={40} width={100} className="rounded-lg" />
      </div>
    </div>
  );
}

// Search Suggestions Skeleton
export function SuggestionsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          height={36}
          className="rounded-lg"
        />
      ))}
    </div>
  );
}

// Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton height={32} width={200} />
        <Skeleton height={40} width={120} className="rounded-lg" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="p-4 bg-white dark:bg-gray-900 rounded-lg">
            <Skeleton height={16} width="60%" className="mb-2" />
            <Skeleton height={32} width="40%" />
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
        <Skeleton height={200} className="rounded-lg" />
      </div>

      {/* Event List */}
      <EventListSkeleton count={5} />
    </div>
  );
}