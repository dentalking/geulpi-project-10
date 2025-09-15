// Performance optimization utilities and strategies

import { lazy } from 'react';

/**
 * Lazy loading components for code splitting
 */
export const LazyComponents = {
  // Heavy components that should be code-split
  SearchEventViewer: lazy(() => import('@/components/SearchEventViewer').then(m => ({ default: m.SearchEventViewer }))),
  AIEventDetailModal: lazy(() => import('@/components/AIEventDetailModal').then(m => ({ default: m.AIEventDetailModal }))),
  EnhancedEventDetailModal: lazy(() => import('@/components/EnhancedEventDetailModal').then(m => ({ default: m.EnhancedEventDetailModal }))),
  
  // Payment components
  SubscriptionManagement: lazy(() => import('@/components/SubscriptionManagement').then(m => ({ default: m.SubscriptionManagement }))),
};

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();
  
  static startTiming(label: string) {
    this.marks.set(label, performance.now());
  }
  
  static endTiming(label: string): number {
    const start = this.marks.get(label);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    this.marks.delete(label);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  static measureComponent<T extends Record<string, any>>(
    ComponentName: string,
    Component: React.ComponentType<T>
  ): React.ComponentType<T> {
    return (props: T) => {
      const renderStart = performance.now();
      const result = (Component as any)(props);
      const renderTime = performance.now() - renderStart;

      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`🐌 Slow render detected in ${ComponentName}: ${renderTime.toFixed(2)}ms`);
      }

      return result;
    };
  }
}

/**
 * Bundle optimization utilities
 */
export const BundleOptimization = {
  // Optimize imports to reduce bundle size
  loadGoogleMapsAPI: () => import('googleapis').then(m => m.google),
  loadFramerMotion: () => import('framer-motion'),
  loadDateFns: () => import('date-fns'),
  loadQRCode: () => import('qrcode'),
  
  // Preload critical resources
  preloadCriticalImages: () => {
    const preloadImages = [
      '/favicon.ico',
      '/logo.svg'
    ];
    
    preloadImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  },
  
  // Service Worker for caching
  registerServiceWorker: async () => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered:', registration);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }
};

/**
 * Memory management utilities
 */
export class MemoryManager {
  private static timers: Set<NodeJS.Timeout> = new Set();
  private static intervals: Set<NodeJS.Timeout> = new Set();
  
  static setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
    return timer;
  }
  
  static setInterval(callback: () => void, delay: number): NodeJS.Timeout {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }
  
  static cleanup() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(interval => clearInterval(interval));
    this.timers.clear();
    this.intervals.clear();
  }
}

/**
 * Image optimization utilities
 */
export const ImageOptimization = {
  // Lazy loading observer
  createLazyLoadObserver: (callback: (entry: IntersectionObserverEntry) => void) => {
    if (typeof window === 'undefined') return null;
    
    return new IntersectionObserver(
      (entries) => {
        entries.forEach(callback);
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
      }
    );
  },
  
  // Optimize image loading
  optimizeImageSrc: (src: string, width?: number, height?: number) => {
    if (!src) return '';
    
    // For Next.js Image optimization
    if (width && height) {
      return `${src}?w=${width}&h=${height}&q=75`;
    }
    
    return src;
  }
};

/**
 * Network optimization utilities
 */
export const NetworkOptimization = {
  // Debounced fetch with cache
  createDebouncedFetch: (delay: number = 300) => {
    const cache = new Map<string, Promise<any>>();
    let timeoutId: NodeJS.Timeout;
    
    return <T>(url: string, options?: RequestInit): Promise<T> => {
      // Check cache first
      if (cache.has(url)) {
        return cache.get(url)!;
      }
      
      // Clear previous timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      return new Promise((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            const response = await fetch(url, options);
            const data = await response.json();
            
            // Cache successful responses
            cache.set(url, Promise.resolve(data));
            
            // Clear cache after 5 minutes
            setTimeout(() => cache.delete(url), 5 * 60 * 1000);
            
            resolve(data);
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    };
  },
  
  // Retry with exponential backoff
  fetchWithRetry: async <T>(
    url: string,
    options?: RequestInit,
    maxRetries: number = 3
  ): Promise<T> => {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }
};

/**
 * Critical resource hints for better loading performance
 */
export const ResourceHints = {
  // Preconnect to external domains
  addPreconnects: () => {
    const domains = [
      'https://fonts.googleapis.com',
      'https://www.google-analytics.com',
      'https://calendar.google.com'
    ];
    
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      document.head.appendChild(link);
    });
  },
  
  // DNS prefetch for likely navigations
  addDnsPrefetch: () => {
    const domains = [
      '//cdn.jsdelivr.net',
      '//unpkg.com'
    ];
    
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });
  }
};