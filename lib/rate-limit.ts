/**
 * Rate Limiting Library
 *
 * Tracks user requests to prevent abuse.
 * Uses in-memory Map for simplicity (can be upgraded to Redis in production).
 *
 * Limits: 5 generations per minute per user
 *
 * TODO: Migrate rate limiter storage from in-memory Map to Redis (e.g. Upstash).
 * The current implementation resets on every cold start / deploy, which means
 * rate limit windows do not persist across serverless function instances and
 * burst traffic can bypass limits on multi-instance deployments.
 */

interface RateLimitEntry {
  userId: string;
  timestamps: number[]; // Array of request timestamps
  lastCleanup: number; // Last cleanup time for this user
}

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly MAX_REQUESTS: number;
  private readonly WINDOW_MS: number;
  private readonly CLEANUP_INTERVAL: number;

  constructor(maxRequests = 5, windowMs = 60_000) {
    this.MAX_REQUESTS = maxRequests;
    this.WINDOW_MS = windowMs;
    this.CLEANUP_INTERVAL = windowMs;
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Check if a user can make a request
   * @param userId - User ID to check
   * @returns Object with allowed status and remaining requests
   */
  checkLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = this.requests.get(userId);

    if (!entry) {
      // First request for this user
      this.requests.set(userId, {
        userId,
        timestamps: [now],
        lastCleanup: now,
      });
      return {
        allowed: true,
        remaining: this.MAX_REQUESTS - 1,
        resetIn: this.WINDOW_MS,
      };
    }

    // Remove timestamps older than the window
    const windowStart = now - this.WINDOW_MS;
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    if (entry.timestamps.length >= this.MAX_REQUESTS) {
      // Find the oldest timestamp to calculate reset time
      const oldestTimestamp = Math.min(...entry.timestamps);
      const resetIn = this.WINDOW_MS - (now - oldestTimestamp);

      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.max(0, resetIn),
      };
    }

    // Add current request timestamp
    entry.timestamps.push(now);
    entry.lastCleanup = now;

    const remaining = this.MAX_REQUESTS - entry.timestamps.length;

    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      resetIn: this.WINDOW_MS,
    };
  }

  /**
   * Get remaining requests for a user without incrementing
   */
  getRemaining(userId: string): { remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = this.requests.get(userId);

    if (!entry) {
      return {
        remaining: this.MAX_REQUESTS,
        resetIn: 0,
      };
    }

    // Remove timestamps older than the window
    const windowStart = now - this.WINDOW_MS;
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    const count = entry.timestamps.length;
    const remaining = Math.max(0, this.MAX_REQUESTS - count);

    // Calculate reset time
    let resetIn = 0;
    if (count > 0) {
      const oldestTimestamp = Math.min(...entry.timestamps);
      resetIn = Math.max(0, this.WINDOW_MS - (now - oldestTimestamp));
    }

    return {
      remaining,
      resetIn,
    };
  }

  /**
   * Clean up old entries that haven't been accessed in a while
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [userId, entry] of this.requests.entries()) {
      // Remove entries older than maxAge
      if (now - entry.lastCleanup > maxAge) {
        this.requests.delete(userId);
      } else {
        // Clean up old timestamps
        const windowStart = now - this.WINDOW_MS;
        entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
        
        // Remove entry if no timestamps remain
        if (entry.timestamps.length === 0 && now - entry.lastCleanup > maxAge / 2) {
          this.requests.delete(userId);
        }
      }
    }
  }

  /**
   * Reset rate limit for a user (useful for testing or admin actions)
   */
  reset(userId: string): void {
    this.requests.delete(userId);
  }
}

// Singleton instance
let rateLimiter: RateLimiter | null = null;

/**
 * Get the rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter();
  }
  return rateLimiter;
}

/**
 * Check if a user can make a request
 * @param userId - User ID to check
 * @param hourlyLimit - Optional: if true, limits to 1 request per hour (for expensive users)
 */
export function checkRateLimit(
  userId: string,
  hourlyLimit: boolean = false
): { allowed: boolean; remaining: number; resetIn: number } {
  if (hourlyLimit) {
    // Use hourly rate limiter for expensive users
    return getHourlyRateLimiter().checkLimit(userId);
  }
  return getRateLimiter().checkLimit(userId);
}

/**
 * Hourly rate limiter for expensive users (1 gen/hour)
 */
class HourlyRateLimiter {
  private requests: Map<string, number> = new Map(); // userId -> last request timestamp

  checkLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const lastRequest = this.requests.get(userId);

    if (!lastRequest) {
      // First request
      this.requests.set(userId, now);
      return {
        allowed: true,
        remaining: 0,
        resetIn: 60 * 60 * 1000, // 1 hour
      };
    }

    const timeSinceLastRequest = now - lastRequest;
    const HOUR_MS = 60 * 60 * 1000;

    if (timeSinceLastRequest < HOUR_MS) {
      // Still within hour window
      const resetIn = HOUR_MS - timeSinceLastRequest;
      return {
        allowed: false,
        remaining: 0,
        resetIn,
      };
    }

    // Hour has passed, allow request
    this.requests.set(userId, now);
    return {
      allowed: true,
      remaining: 0,
      resetIn: HOUR_MS,
    };
  }

  reset(userId: string): void {
    this.requests.delete(userId);
  }
}

let hourlyRateLimiter: HourlyRateLimiter | null = null;

function getHourlyRateLimiter(): HourlyRateLimiter {
  if (!hourlyRateLimiter) {
    hourlyRateLimiter = new HourlyRateLimiter();
  }
  return hourlyRateLimiter;
}

/**
 * Get remaining requests for a user
 */
export function getRateLimitRemaining(userId: string): { remaining: number; resetIn: number } {
  return getRateLimiter().getRemaining(userId);
}

// ── Auth rate limiter: 5 requests / minute / IP ───────────────────────────
// Tightened from 20 — OAuth flows only need 2-3 attempts at most.

let authLimiter: RateLimiter | null = null;
function getAuthRateLimiter(): RateLimiter {
  if (!authLimiter) authLimiter = new RateLimiter(5, 60_000);
  return authLimiter;
}

// ── Checkout rate limiter: 3 requests / minute / user ────────────────────
// Tightened from 10 — a legitimate subscription attempt needs at most 1-2.

let checkoutLimiter: RateLimiter | null = null;
function getCheckoutRateLimiter(): RateLimiter {
  if (!checkoutLimiter) checkoutLimiter = new RateLimiter(3, 60_000);
  return checkoutLimiter;
}

/**
 * Rate-limit by IP address (for unauthenticated endpoints like OAuth flows).
 * Allows 20 requests per minute per IP.
 */
export function checkIpRateLimit(
  ip: string,
): { allowed: boolean; remaining: number; resetIn: number } {
  return getAuthRateLimiter().checkLimit(ip);
}

/**
 * Rate-limit checkout session creation by user ID.
 * Allows 10 requests per minute per user.
 */
export function checkCheckoutRateLimit(
  userId: string,
): { allowed: boolean; remaining: number; resetIn: number } {
  return getCheckoutRateLimiter().checkLimit(userId);
}

/**
 * Extract the real client IP from a Next.js request.
 * Respects x-forwarded-for (set by Vercel/proxies).
 */
export function getClientIp(request: import('next/server').NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

