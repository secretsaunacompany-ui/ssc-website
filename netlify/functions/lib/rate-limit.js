/**
 * In-memory sliding window rate limiter for Netlify Functions.
 * Resets on cold start. Sufficient for current traffic levels.
 */

const limiters = new Map();

function checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  let record = limiters.get(key);

  if (!record) {
    record = { timestamps: [now] };
    limiters.set(key, record);
    return { allowed: true, remaining: maxRequests - 1 };
  }

  // Remove timestamps outside the window
  record.timestamps = record.timestamps.filter(t => now - t < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestInWindow = record.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestInWindow);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil(retryAfterMs / 1000)
    };
  }

  record.timestamps.push(now);
  return { allowed: true, remaining: maxRequests - record.timestamps.length };
}

function getClientIp(headers) {
  return headers['x-nf-client-connection-ip'] ||
         headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         headers['client-ip'] ||
         'unknown';
}

// Cleanup stale entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of limiters.entries()) {
    record.timestamps = record.timestamps.filter(t => now - t < 120000);
    if (record.timestamps.length === 0) {
      limiters.delete(key);
    }
  }
}, 120000);

module.exports = { checkRateLimit, getClientIp };
