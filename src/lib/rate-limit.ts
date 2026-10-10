interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes to avoid memory accumulation
if (typeof setInterval !== 'undefined') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (typeof cleanupTimer === 'object' && cleanupTimer !== null && 'unref' in cleanupTimer && typeof (cleanupTimer as { unref: () => void }).unref === 'function') {
    (cleanupTimer as { unref: () => void }).unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Lightweight in-memory rate limiter per client identifier (IP or token)
 * @param identifier Client IP or token
 * @param limit Maximum allowed requests per window (default 15)
 * @param windowSeconds Duration of window in seconds (default 60)
 */
export function checkRateLimit(
  identifier: string,
  limit = 15,
  windowSeconds = 60
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const current = rateLimitMap.get(identifier);

  if (!current || now > current.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetInSeconds: windowSeconds,
    };
  }

  if (current.count >= limit) {
    const resetInSeconds = Math.max(1, Math.ceil((current.resetTime - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetInSeconds,
    };
  }

  current.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((current.resetTime - now) / 1000));
  return {
    allowed: true,
    limit,
    remaining: limit - current.count,
    resetInSeconds,
  };
}
