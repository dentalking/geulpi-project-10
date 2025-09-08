'use client';

import { useState, useEffect } from 'react';

interface TypingAnimationProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

export function TypingAnimation({ text, speed = 30, onComplete }: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  return (
    <span className="inline">
      {displayedText}
      {currentIndex < text.length && (
        <span 
          className="inline-block w-0.5 h-4 animate-pulse ml-0.5" 
          style={{ backgroundColor: 'var(--text-primary)' }}
        />
      )}
    </span>
  );
}