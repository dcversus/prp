/**
 * Performance monitoring utilities for PRP CLI
 */
// NodeJS types are available globally
export interface PerformanceMetrics {
  startupTime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  cpuUsage: NodeJS.CpuUsage;
  timestamp: number;
}
export interface PerformanceThresholds {
  startupTime: number; // ms
  memoryRSS: number; // MB
  memoryHeapUsed: number; // MB
  commandLatency: number; // ms
}
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private thresholds: PerformanceThresholds = {
    startupTime: 2000, // 2 seconds
    memoryRSS: 50 * 1024 * 1024, // 50MB
    memoryHeapUsed: 30 * 1024 * 1024, // 30MB
    commandLatency: 100, // 100ms
  };
  private startTime: number = Date.now();
  static getInstance(): PerformanceMonitor {
    if (typeof PerformanceMonitor.instance === 'undefined') {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  startMeasurement(): void {
    this.startTime = Date.now();
  }
  recordStartupTime(): number {
    const startupTime = Date.now() - this.startTime;
    this.recordMetric('startupTime', startupTime);
    return startupTime;
  }
  getCurrentMetrics(): PerformanceMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    return {
      startupTime: Date.now() - this.startTime,
      memoryUsage: memUsage,
      cpuUsage,
      timestamp: Date.now(),
    };
  }
  recordMetric(type: string, value: number): void {
    const metric = this.getCurrentMetrics();
    // Store metrics with additional context
    this.metrics.push({
      ...metric,
      startupTime: type === 'startupTime' ? value : metric.startupTime,
    });
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }
  checkThresholds(): { passed: boolean; violations: string[] } {
    const current = this.getCurrentMetrics();
    const violations: string[] = [];
    if (current.startupTime > this.thresholds.startupTime) {
      violations.push(
        `Startup time ${current.startupTime}ms exceeds threshold ${this.thresholds.startupTime}ms`,
      );
    }
    if (current.memoryUsage.rss > this.thresholds.memoryRSS) {
      violations.push(
        `RSS memory ${Math.round(current.memoryUsage.rss / 1024 / 1024)}MB exceeds threshold ${Math.round(this.thresholds.memoryRSS / 1024 / 1024)}MB`,
      );
    }
    if (current.memoryUsage.heapUsed > this.thresholds.memoryHeapUsed) {
      violations.push(
        `Heap memory ${Math.round(current.memoryUsage.heapUsed / 1024 / 1024)}MB exceeds threshold ${Math.round(this.thresholds.memoryHeapUsed / 1024 / 1024)}MB`,
      );
    }
    return {
      passed: violations.length === 0,
      violations,
    };
  }
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
  generateReport(): string {
    const current = this.getCurrentMetrics();
    const status = this.checkThresholds();
    return `
Performance Report - ${new Date().toISOString()}
===============================
Current Metrics:
- Startup Time: ${current.startupTime}ms
- Memory Usage: ${Math.round(current.memoryUsage.rss / 1024 / 1024)}MB RSS, ${Math.round(current.memoryUsage.heapUsed / 1024 / 1024)}MB Heap
- CPU Usage: User ${current.cpuUsage.user}μs, System ${current.cpuUsage.system}μs
Threshold Status: ${status.passed ? '✅ PASSED' : '❌ FAILED'}
${status.violations.length > 0 ? `\nViolations:\n${  status.violations.map((v) => `- ${v}`).join('\n')}` : ''}
History: ${this.metrics.length} samples recorded
    `.trim();
  }
  reset(): void {
    this.metrics = [];
    this.startTime = Date.now();
  }
}
// Global performance monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();
