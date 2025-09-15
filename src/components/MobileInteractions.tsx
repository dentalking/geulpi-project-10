'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, useAnimation } from 'framer-motion';

interface SwipeableProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
}

// 스와이프 가능한 컨테이너
export const Swipeable: React.FC<SwipeableProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className = ''
}) => {
  const handleDragEnd = (event: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    // 수평 스와이프
    if (Math.abs(offset.x) > threshold || Math.abs(velocity.x) > 500) {
      if (offset.x > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
    
    // 수직 스와이프
    if (Math.abs(offset.y) > threshold || Math.abs(velocity.y) > 500) {
      if (offset.y > 0) {
        onSwipeDown?.();
      } else {
        onSwipeUp?.();
      }
    }
  };

  return (
    <motion.div
      className={className}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
};

// 스와이프하여 삭제 컴포넌트
interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete: () => void;
  deleteThreshold?: number;
  className?: string;
}

export const SwipeToDelete: React.FC<SwipeToDeleteProps> = ({
  children,
  onDelete,
  deleteThreshold = 100,
  className = ''
}) => {
  const x = useMotionValue(0);
  const controls = useAnimation();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const background = useTransform(
    x,
    [-deleteThreshold, 0],
    ['rgba(239, 68, 68, 1)', 'rgba(239, 68, 68, 0)']
  );
  
  const handleDragEnd = async (event: any, info: PanInfo) => {
    const shouldDelete = info.offset.x < -deleteThreshold;
    
    if (shouldDelete && !isDeleting) {
      setIsDeleting(true);
      await controls.start({ x: -300, opacity: 0 });
      onDelete();
    } else {
      controls.start({ x: 0 });
    }
  };

  return (
    <motion.div className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-4"
        style={{ backgroundColor: background }}
      >
        <motion.span
          className="text-white font-medium"
          style={{
            opacity: useTransform(x, [-deleteThreshold, -50], [1, 0])
          }}
        >
          삭제
        </motion.span>
      </motion.div>
      
      <motion.div
        drag="x"
        dragConstraints={{ left: -deleteThreshold, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={controls}
        className="relative bg-white"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// 풀 투 리프레시 컴포넌트
interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  className = ''
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const controls = useAnimation();
  
  const pullProgress = useTransform(y, [0, threshold], [0, 1]);
  const pullOpacity = useTransform(y, [0, threshold / 2], [0, 1]);
  const pullScale = useTransform(y, [0, threshold], [0.8, 1]);
  
  const handleDragEnd = async (event: any, info: PanInfo) => {
    if (info.offset.y > threshold && !isRefreshing) {
      setIsRefreshing(true);
      await controls.start({ y: threshold });
      
      try {
        await onRefresh();
      } finally {
        await controls.start({ y: 0 });
        setIsRefreshing(false);
      }
    } else {
      controls.start({ y: 0 });
    }
  };

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-20"
        style={{ opacity: pullOpacity }}
      >
        <motion.div
          style={{ scale: pullScale }}
          className="flex flex-col items-center"
        >
          {isRefreshing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          ) : (
            <svg
              className="w-8 h-8 text-blue-500"
              style={{
                transform: `rotate(${pullProgress.get() * 180}deg)`
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
          <span className="text-xs text-gray-500 mt-2">
            {isRefreshing ? '새로고침 중...' : '당겨서 새로고침'}
          </span>
        </motion.div>
      </motion.div>
      
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: threshold }}
        dragElastic={0.5}
        onDragEnd={handleDragEnd}
        style={{ y }}
        animate={controls}
      >
        {children}
      </motion.div>
    </div>
  );
};

// 터치 가능한 리스트 아이템
interface TouchableItemProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  className?: string;
  hapticFeedback?: boolean;
}

export const TouchableItem: React.FC<TouchableItemProps> = ({
  children,
  onPress,
  onLongPress,
  disabled = false,
  className = '',
  hapticFeedback = true
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout>();
  
  const handleTouchStart = () => {
    if (disabled) return;
    
    setIsPressed(true);
    
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress();
        if (hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate(20);
        }
      }, 500);
    }
  };
  
  const handleTouchEnd = () => {
    if (disabled) return;
    
    setIsPressed(false);
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    if (onPress && !longPressTimer.current) {
      onPress();
    }
  };
  
  const handleTouchCancel = () => {
    setIsPressed(false);
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <motion.div
      className={`${className} ${disabled ? 'opacity-50' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchCancel}
      animate={{
        scale: isPressed ? 0.95 : 1,
        backgroundColor: isPressed ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0)'
      }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.div>
  );
};

// 바텀 시트 컴포넌트
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: string;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  height = '50vh',
  className = ''
}) => {
  const y = useMotionValue(0);
  const controls = useAnimation();
  
  useEffect(() => {
    if (isOpen) {
      controls.start({ y: 0 });
    } else {
      controls.start({ y: '100%' });
    }
  }, [isOpen, controls]);
  
  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    } else {
      controls.start({ y: 0 });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 0.5 : 0 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      
      <motion.div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 ${className}`}
        style={{ height, y }}
        initial={{ y: '100%' }}
        animate={controls}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto my-3" />
        <div className="px-4 pb-4 overflow-y-auto" style={{ height: `calc(${height} - 2rem)` }}>
          {children}
        </div>
      </motion.div>
    </>
  );
};

// 탭 가능한 카드
interface TappableCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const TappableCard: React.FC<TappableCardProps> = ({
  children,
  onClick,
  className = ''
}) => {
  return (
    <motion.div
      className={`cursor-pointer ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  );
};

// 플로팅 액션 버튼
interface FloatingActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  className?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
  icon,
  position = 'bottom-right',
  className = ''
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <motion.button
      className={`fixed z-40 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center ${positionClasses[position]} ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      {icon}
    </motion.button>
  );
};