/**
 * Exponential backoff retry utility for external platform API calls.
 *
 * Usage:
 *   await withRetry(() => shopifyClient.setInventoryLevel(...), { maxAttempts: 3 });
 *
 * Rate-limit awareness:
 *   If the thrown error carries a `retryAfterMs` property, or if the original
 *   response had a numeric `Retry-After` header (seconds), that value is used
 *   as the minimum wait time for the next attempt.
 */

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Delay before the second attempt (ms). Default: 500 */
  initialDelayMs?: number;
  /** Hard cap on inter-attempt delay (ms). Default: 30 000 */
  maxDelayMs?: number;
  /** Backoff multiplier applied after each failure. Default: 2 */
  factor?: number;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 500,
    maxDelayMs = 30_000,
    factor = 2,
  } = options;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      if (attempt === maxAttempts) break;

      // Honour platform rate-limit back-pressure
      let waitMs = delay;
      const retryAfterRaw: string | number | undefined =
        err?.retryAfterMs ??                        // enriched by caller
        err?.response?.headers?.get?.('retry-after'); // fetch Response object

      if (retryAfterRaw !== undefined) {
        const seconds = parseFloat(String(retryAfterRaw));
        if (!isNaN(seconds)) waitMs = Math.max(waitMs, seconds * 1_000);
      }

      waitMs = Math.min(waitMs, maxDelayMs);

      console.warn(
        `[EvoRetry] Attempt ${attempt}/${maxAttempts} failed — retrying in ${waitMs}ms.`,
        err?.message ?? err,
      );

      await sleep(waitMs);
      delay = Math.min(delay * factor, maxDelayMs);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
