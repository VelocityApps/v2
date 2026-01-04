/**
 * Performance Tracking Library
 * 
 * Tracks API call performance and alerts on slow requests.
 */

import { logEvent } from './monitoring';

interface PerformanceMetrics {
  route: string;
  method: string;
  duration: number;
  statusCode?: number;
  userId?: string;
}

/**
 * Track API call performance
 */
export async function trackPerformance(metrics: PerformanceMetrics): Promise<void> {
  const { route, method, duration, statusCode, userId } = metrics;

  // Log if generation takes >30 seconds
  if (route.includes('/api/generate') && duration > 30000) {
    console.warn(`[Performance] Slow generation: ${duration}ms`);
    await logEvent('error', {
      component: 'performance',
      route,
      message: `Generation took ${duration}ms (>30s threshold)`,
      duration_ms: duration,
    }, userId);
  }

  // Log performance metrics for monitoring
  // Could be extended to send to analytics service
  if (duration > 10000) {
    console.warn(`[Performance] Slow API call: ${method} ${route} took ${duration}ms`);
  }
}

/**
 * Wrapper function to measure API route performance
 */
export function withPerformanceTracking<T>(
  route: string,
  handler: () => Promise<T>,
  userId?: string
): Promise<T> {
  const startTime = Date.now();
  const method = 'POST'; // Could be made dynamic

  return handler()
    .then((result) => {
      const duration = Date.now() - startTime;
      trackPerformance({
        route,
        method,
        duration,
        statusCode: 200,
        userId,
      });
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      trackPerformance({
        route,
        method,
        duration,
        statusCode: error.status || 500,
        userId,
      });
      throw error;
    });
}

/**
 * Calculate average response time for a route
 * This would typically be done by querying monitoring_events
 */
export async function getAverageResponseTime(route: string): Promise<number> {
  // This is a placeholder - in production, you'd query monitoring_events
  // or use a time-series database like InfluxDB
  return 0;
}

