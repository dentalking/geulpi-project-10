'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion';
import { useHaptic } from '@/hooks/useHaptic';

// 터치 리플 효과 컴포넌트
interface TouchRippleProps {
  x: number;
  y: number;
  color?: string;
  onComplete: () => void;
}

const TouchRipple: React.FC<TouchRippleProps> = ({ x, y, color = 'rgba(255, 255, 255, 0.3)', onComplete }) => {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        x: '-50%',
        y: '-50%',
      }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 4, opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      <div 
        className="w-10 h-10 rounded-full"
        style={{ backgroundColor: color }}
      />
    </motion.div>
  );
};

// 향상된 터치 가능한 컴포넌트
interface EnhancedTouchableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onDoublePress?: () => void;
  disabled?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  rippleColor?: string;
  pressScale?: number;
  className?: string;
}

export const EnhancedTouchable: React.FC<EnhancedTouchableProps> = ({
  children,
  onPress,
  onLongPress,
  onDoublePress,
  disabled = false,
  hapticStyle = 'light',
  rippleColor = 'rgba(255, 255, 255, 0.3)',
  pressScale = 0.97,
  className = ''
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [isPressed, setIsPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const lastPressTime = useRef<number>(0);
  const { trigger } = useHaptic();

  const handleRippleComplete = useCallback((id: number) => {
    setRipples(prev => prev.filter(ripple => ripple.id !== id));
  }, []);

  const addRipple = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in event 
      ? event.touches[0].clientX - rect.left
      : event.clientX - rect.left;
    const y = 'touches' in event
      ? event.touches[0].clientY - rect.top
      : event.clientY - rect.top;

    const newRipple = {
      id: Date.now(),
      x,
      y
    };

    setRipples(prev => [...prev, newRipple]);
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;

    setIsPressed(true);
    addRipple(event);
    trigger(hapticStyle);

    // 더블 탭 감지
    const now = Date.now();
    if (onDoublePress && now - lastPressTime.current < 300) {
      onDoublePress();
      trigger('success');
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      return;
    }
    lastPressTime.current = now;

    // 롱 프레스 감지
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress();
        trigger('heavy');
        setIsPressed(false);
      }, 500);
    }
  }, [disabled, hapticStyle, onDoublePress, onLongPress, addRipple, trigger]);

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;

    setIsPressed(false);

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      
      // 롱 프레스가 트리거되지 않았으면 일반 프레스 실행
      if (onPress) {
        onPress();
      }
    }
  }, [disabled, onPress]);

  const handleTouchCancel = useCallback(() => {
    setIsPressed(false);
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={`relative overflow-hidden ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchCancel}
      animate={{
        scale: isPressed && !disabled ? pressScale : 1
      }}
      transition={{ duration: 0.1 }}
    >
      {children}
      {ripples.map(ripple => (
        <TouchRipple
          key={ripple.id}
          x={ripple.x}
          y={ripple.y}
          color={rippleColor}
          onComplete={() => handleRippleComplete(ripple.id)}
        />
      ))}
    </motion.div>
  );
};

// 스와이프 가능한 카드 (3D 효과)
interface SwipeableCard3DProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
}

export const SwipeableCard3D: React.FC<SwipeableCard3DProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 100,
  className = ''
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [30, -30]);
  const rotateY = useTransform(x, [-100, 100], [-30, 30]);
  const { trigger } = useHaptic();

  const handleDragEnd = (event: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    // 스와이프 방향 결정
    if (Math.abs(offset.x) > Math.abs(offset.y)) {
      // 수평 스와이프
      if (Math.abs(offset.x) > threshold || Math.abs(velocity.x) > 500) {
        if (offset.x > 0) {
          onSwipeRight?.();
          trigger('success');
        } else {
          onSwipeLeft?.();
          trigger('warning');
        }
      }
    } else {
      // 수직 스와이프
      if (Math.abs(offset.y) > threshold || Math.abs(velocity.y) > 500) {
        if (offset.y > 0) {
          onSwipeDown?.();
          trigger('light');
        } else {
          onSwipeUp?.();
          trigger('medium');
        }
      }
    }
    
    // 원위치로 복귀
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      className={`${className}`}
      style={{
        x,
        y,
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000
      }}
      drag
      dragConstraints={{ left: -200, right: 200, top: -200, bottom: 200 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.div>
  );
};

// 압력 감지 버튼 (Force Touch 시뮬레이션)
interface PressureSensitiveButtonProps {
  children: React.ReactNode;
  onLightPress?: () => void;
  onMediumPress?: () => void;
  onHardPress?: () => void;
  className?: string;
}

export const PressureSensitiveButton: React.FC<PressureSensitiveButtonProps> = ({
  children,
  onLightPress,
  onMediumPress,
  onHardPress,
  className = ''
}) => {
  const [pressure, setPressure] = useState(0);
  const pressStartTime = useRef<number>(0);
  const animateControls = useAnimation();
  const { trigger } = useHaptic();

  const handlePressStart = () => {
    pressStartTime.current = Date.now();
    setPressure(1);
    
    // 압력 단계 시뮬레이션
    setTimeout(() => {
      if (pressure > 0) {
        setPressure(2);
        trigger('medium');
        onLightPress?.();
      }
    }, 150);
    
    setTimeout(() => {
      if (pressure > 0) {
        setPressure(3);
        trigger('heavy');
        onMediumPress?.();
      }
    }, 300);
    
    setTimeout(() => {
      if (pressure > 0) {
        setPressure(4);
        trigger('heavy');
        onHardPress?.();
      }
    }, 500);
  };

  const handlePressEnd = () => {
    const duration = Date.now() - pressStartTime.current;
    
    if (duration < 150) {
      onLightPress?.();
    } else if (duration < 300) {
      onMediumPress?.();
    } else {
      onHardPress?.();
    }
    
    setPressure(0);
  };

  const scaleValue = 1 - (pressure * 0.02);
  const shadowValue = pressure * 5;

  return (
    <motion.div
      className={`${className}`}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      animate={{
        scale: scaleValue,
        boxShadow: `0 ${shadowValue}px ${shadowValue * 2}px rgba(0, 0, 0, 0.2)`
      }}
      transition={{ duration: 0.1 }}
    >
      <div className="relative">
        {children}
        {pressure > 0 && (
          <motion.div
            className="absolute inset-0 bg-white rounded-lg pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: pressure * 0.1 }}
          />
        )}
      </div>
    </motion.div>
  );
};

// 핀치 줌 컨테이너
interface PinchZoomContainerProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  className?: string;
}

export const PinchZoomContainer: React.FC<PinchZoomContainerProps> = ({
  children,
  minScale = 0.5,
  maxScale = 3,
  className = ''
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDistance = useRef<number>(0);
  const lastCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (touches: React.TouchList) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      lastDistance.current = getDistance(e.touches);
      lastCenter.current = getCenter(e.touches);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const currentDistance = getDistance(e.touches);
      const currentCenter = getCenter(e.touches);
      
      // 스케일 계산
      const newScale = Math.max(
        minScale,
        Math.min(maxScale, scale * (currentDistance / lastDistance.current))
      );
      
      // 위치 계산
      const deltaX = currentCenter.x - lastCenter.current.x;
      const deltaY = currentCenter.y - lastCenter.current.y;
      
      setScale(newScale);
      setPosition({
        x: position.x + deltaX,
        y: position.y + deltaY
      });
      
      lastDistance.current = currentDistance;
      lastCenter.current = currentCenter;
    }
  };

  const handleDoubleTap = () => {
    if (scale === 1) {
      setScale(2);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <motion.div
        animate={{
          scale,
          x: position.x,
          y: position.y
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onDoubleClick={handleDoubleTap}
      >
        {children}
      </motion.div>
    </div>
  );
};