/**
 * Simple in-memory rate limiter for Vercel Serverless Functions.
 * Prevents brute-force attacks on login and registration endpoints.
 * Each serverless instance has its own memory, so this acts as
 * per-instance throttling — sufficient to stop naive bots.
 */

const store = new Map(); // key → { count, resetAt }

/**
 * @param {string} key       - IP or identifier to rate-limit
 * @param {number} limit     - Max requests in window
 * @param {number} windowMs  - Window duration in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
export function rateLimit(key, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }

  entry.count++;
  store.set(key, entry);

  const remaining = Math.max(0, limit - entry.count);
  const resetIn = Math.max(0, entry.resetAt - now);

  return {
    allowed: entry.count <= limit,
    remaining,
    resetIn,
  };
}

/**
 * Extract a reasonable client identifier from the Vercel request.
 * Prefers x-forwarded-for (set by Vercel edge), falls back to a constant.
 */
export function getClientKey(req, prefix = '') {
  const ip =
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers?.['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown';
  return prefix ? `${prefix}:${ip}` : ip;
}
