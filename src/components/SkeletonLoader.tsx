import React from 'react';
import styles from './SkeletonLoader.module.css';

interface SkeletonLoaderProps {
  type?: 'calendar' | 'chat' | 'event' | 'text';
  width?: string;
  height?: string;
  count?: number;
}

export default function SkeletonLoader({ 
  type = 'text', 
  width = '100%', 
  height = '20px',
  count = 1 
}: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'calendar':
        return (
          <div className={styles.calendarSkeleton}>
            <div className={styles.calendarHeader}>
              <div className={styles.shimmer} style={{ width: '200px', height: '32px' }} />
              <div className={styles.shimmer} style={{ width: '100px', height: '32px' }} />
            </div>
            <div className={styles.calendarGrid}>
              {Array.from({ length: 35 }, (_, i) => (
                <div key={i} className={`${styles.calendarCell} ${styles.shimmer}`} />
              ))}
            </div>
          </div>
        );
      
      case 'chat':
        return (
          <div className={styles.chatSkeleton}>
            <div className={styles.chatHeader}>
              <div className={styles.shimmer} style={{ width: '150px', height: '24px' }} />
            </div>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className={styles.chatMessage}>
                <div className={styles.shimmer} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div className={styles.chatBubble}>
                  <div className={styles.shimmer} style={{ width: '80%', height: '16px', marginBottom: '8px' }} />
                  <div className={styles.shimmer} style={{ width: '60%', height: '16px' }} />
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'event':
        return (
          <div className={styles.eventSkeleton}>
            <div className={styles.shimmer} style={{ width: '70%', height: '20px', marginBottom: '8px' }} />
            <div className={styles.shimmer} style={{ width: '40%', height: '16px' }} />
          </div>
        );
      
      default:
        return (
          <div className={styles.shimmer} style={{ width, height }} />
        );
    }
  };

  return (
    <div className={styles.skeletonWrapper} role="status" aria-live="polite">
      <span className={styles.srOnly}>로딩 중...</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeletonItem}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
}