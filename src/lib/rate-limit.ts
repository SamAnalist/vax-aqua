export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function createRateLimiter(windowMs: number, max: number) {
  const hits = new Map<string, number[]>();

  function prune(key: string, now: number) {
    const keep = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (keep.length === 0) hits.delete(key);
    else hits.set(key, keep);
    return keep;
  }

  return {
    peek(key: string, now = Date.now()): RateLimitResult {
      const keep = prune(key, now);
      if (keep.length >= max) {
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((keep[0] + windowMs - now) / 1000)) };
      }
      return { ok: true };
    },
    check(key: string, now = Date.now()): RateLimitResult {
      const keep = prune(key, now);
      if (keep.length >= max) {
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((keep[0] + windowMs - now) / 1000)) };
      }
      keep.push(now);
      hits.set(key, keep);
      return { ok: true };
    },
    reset(key: string) {
      hits.delete(key);
    },
  };
}

export const loginLimiter = createRateLimiter(15 * 60 * 1000, 5);
export const loginIpLimiter = createRateLimiter(15 * 60 * 1000, 20);
export const accountLimiter = createRateLimiter(15 * 60 * 1000, 5);
