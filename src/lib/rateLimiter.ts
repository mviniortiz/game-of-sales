/**
 * Client-side rate limiter using a sliding window counter.
 * Prevents excessive API calls from the frontend before they hit the backend.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitEntry>();

/**
 * Check if an action is rate-limited.
 * @param key - Unique identifier for the action (e.g., "whatsapp-copilot", "deal-call")
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 * @returns { allowed: boolean, retryAfterMs: number }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000
): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const now = Date.now();
  let entry = buckets.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    buckets.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  const remaining = Math.max(0, maxRequests - entry.timestamps.length);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldest);
    return { allowed: false, retryAfterMs, remaining: 0 };
  }

  entry.timestamps.push(now);
  return { allowed: true, retryAfterMs: 0, remaining: remaining - 1 };
}

/**
 * Reset a specific rate limit bucket.
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * Pre-configured rate limits for common actions.
 */
export const RATE_LIMITS = {
  /** Supabase mutations (create, update, delete) */
  mutation: (key: string) => checkRateLimit(`mutation:${key}`, 10, 10_000),
  /** AI/LLM calls (copilot, insights) */
  ai: (key: string) => checkRateLimit(`ai:${key}`, 5, 60_000),
  /** File uploads / imports */
  upload: (key: string) => checkRateLimit(`upload:${key}`, 3, 60_000),
  /** Auth actions (login, register) */
  auth: (key: string) => checkRateLimit(`auth:${key}`, 5, 300_000),
} as const;
