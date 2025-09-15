'use client';

import React, { useState, useLayoutEffect } from 'react';
import styles from './RippleEffect.module.css';

interface RippleProps {
  duration?: number;
  color?: string;
}

interface RippleItem {
  x: number;
  y: number;
  size: number;
  id: number;
}

const RippleEffect: React.FC<RippleProps> = ({ 
  duration = 600,
  color = 'rgba(255, 255, 255, 0.3)'
}) => {
  const [ripples, setRipples] = useState<RippleItem[]>([]);

  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      setRipples([]);
    }, duration * 2);

    return () => clearTimeout(timer);
  }, [ripples, duration]);

  const addRipple = (event: React.MouseEvent<HTMLDivElement>) => {
    const rippleContainer = event.currentTarget.getBoundingClientRect();
    const size = rippleContainer.width > rippleContainer.height 
      ? rippleContainer.width 
      : rippleContainer.height;
      
    const x = event.clientX - rippleContainer.left - size / 2;
    const y = event.clientY - rippleContainer.top - size / 2;
    
    const newRipple = {
      x,
      y,
      size,
      id: Date.now()
    };

    setRipples([...ripples, newRipple]);
  };

  return (
    <div 
      className={styles.rippleContainer} 
      onMouseDown={addRipple}
    >
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className={styles.ripple}
          style={{
            top: ripple.y,
            left: ripple.x,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            animationDuration: `${duration}ms`
          }}
        />
      ))}
    </div>
  );
};

export default RippleEffect;