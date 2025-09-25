/**
 * Performance Monitoring Utility
 * Measures and compares performance metrics for calendar components
 */

export interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  memoryUsed: number;
  eventCount: number;
  timestamp: Date;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private marks: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Mark the start of an operation
  startMeasure(label: string): void {
    this.marks.set(label, performance.now());
  }

  // Mark the end and calculate duration
  endMeasure(label: string, componentName: string, eventCount: number = 0): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`No start mark found for ${label}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Get memory usage if available
    const memoryUsed = this.getMemoryUsage();

    // Store metrics
    this.metrics.push({
      componentName,
      renderTime: duration,
      memoryUsed,
      eventCount,
      timestamp: new Date()
    });

    this.marks.delete(label);

    console.log(`[Performance] ${componentName}: ${duration.toFixed(2)}ms for ${eventCount} events`);

    return duration;
  }

  // Get current memory usage (Chrome only)
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1048576; // Convert to MB
    }
    return 0;
  }

  // Get all collected metrics
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // Get average metrics for a component
  getAverageMetrics(componentName: string): {
    avgRenderTime: number;
    avgMemory: number;
    count: number;
  } {
    const componentMetrics = this.metrics.filter(m => m.componentName === componentName);

    if (componentMetrics.length === 0) {
      return { avgRenderTime: 0, avgMemory: 0, count: 0 };
    }

    const avgRenderTime = componentMetrics.reduce((sum, m) => sum + m.renderTime, 0) / componentMetrics.length;
    const avgMemory = componentMetrics.reduce((sum, m) => sum + m.memoryUsed, 0) / componentMetrics.length;

    return {
      avgRenderTime,
      avgMemory,
      count: componentMetrics.length
    };
  }

  // Compare two components
  compareComponents(component1: string, component2: string): {
    component1: ReturnType<typeof this.getAverageMetrics>;
    component2: ReturnType<typeof this.getAverageMetrics>;
    improvement: {
      renderTime: string;
      memory: string;
    };
  } {
    const metrics1 = this.getAverageMetrics(component1);
    const metrics2 = this.getAverageMetrics(component2);

    const renderImprovement = metrics1.avgRenderTime > 0
      ? ((1 - metrics2.avgRenderTime / metrics1.avgRenderTime) * 100).toFixed(1)
      : '0';

    const memoryImprovement = metrics1.avgMemory > 0
      ? ((1 - metrics2.avgMemory / metrics1.avgMemory) * 100).toFixed(1)
      : '0';

    return {
      component1: metrics1,
      component2: metrics2,
      improvement: {
        renderTime: `${renderImprovement}%`,
        memory: `${memoryImprovement}%`
      }
    };
  }

  // Generate performance report
  generateReport(): string {
    const components = [...new Set(this.metrics.map(m => m.componentName))];
    let report = '📊 Performance Report\n';
    report += '=' .repeat(50) + '\n\n';

    components.forEach(component => {
      const metrics = this.getAverageMetrics(component);
      report += `📦 ${component}\n`;
      report += `  • Avg Render Time: ${metrics.avgRenderTime.toFixed(2)}ms\n`;
      report += `  • Avg Memory: ${metrics.avgMemory.toFixed(2)}MB\n`;
      report += `  • Measurements: ${metrics.count}\n\n`;
    });

    // Add comparisons if we have both old and new versions
    const hasOldDayView = components.includes('SimpleCalendar-DayView');
    const hasNewDayView = components.includes('OptimizedDayView');

    if (hasOldDayView && hasNewDayView) {
      report += '🔄 Comparison: Day View\n';
      report += '-' .repeat(30) + '\n';
      const comparison = this.compareComponents('SimpleCalendar-DayView', 'OptimizedDayView');
      report += `Old (SimpleCalendar): ${comparison.component1.avgRenderTime.toFixed(2)}ms\n`;
      report += `New (OptimizedDayView): ${comparison.component2.avgRenderTime.toFixed(2)}ms\n`;
      report += `Improvement: ${comparison.improvement.renderTime}\n\n`;
    }

    const hasOldModal = components.includes('AIEventDetailModal');
    const hasNewModal = components.includes('UnifiedEventModal');

    if (hasOldModal && hasNewModal) {
      report += '🔄 Comparison: Event Modal\n';
      report += '-' .repeat(30) + '\n';
      const comparison = this.compareComponents('AIEventDetailModal', 'UnifiedEventModal');
      report += `Old (AIEventDetailModal): ${comparison.component1.avgRenderTime.toFixed(2)}ms\n`;
      report += `New (UnifiedEventModal): ${comparison.component2.avgRenderTime.toFixed(2)}ms\n`;
      report += `Improvement: ${comparison.improvement.renderTime}\n\n`;
    }

    return report;
  }

  // Clear all metrics
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }
}

// Export singleton instance
export const perfMonitor = PerformanceMonitor.getInstance();

// React Hook for performance monitoring
import { useEffect, useRef } from 'react';

export function usePerformanceMonitor(componentName: string, eventCount: number = 0) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
    const label = `${componentName}-${renderCount.current}`;

    perfMonitor.startMeasure(label);

    // Measure after render completes
    const timeoutId = setTimeout(() => {
      perfMonitor.endMeasure(label, componentName, eventCount);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [componentName, eventCount]);

  return {
    getMetrics: () => perfMonitor.getAverageMetrics(componentName),
    getReport: () => perfMonitor.generateReport()
  };
}