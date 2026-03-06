/**
 * In-memory sliding-window rate limiter.
 * No external dependencies — works with raw http.createServer.
 *
 * Default: 100 requests per 60 seconds per IP.
 */

const DEFAULT_WINDOW_MS = 60 * 1000; // 60 seconds
const DEFAULT_MAX_REQUESTS = 100;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const hits = new Map(); // ip -> [timestamps]

// Periodically clean stale entries
setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits) {
        const valid = timestamps.filter(t => now - t < DEFAULT_WINDOW_MS);
        if (valid.length === 0) {
            hits.delete(ip);
        } else {
            hits.set(ip, valid);
        }
    }
}, CLEANUP_INTERVAL_MS);

/**
 * Returns true if the request is rate-limited (should be blocked).
 * Automatically sends a 429 response when blocked.
 */
function rateLimit(req, res, { windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX_REQUESTS } = {}) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.socket?.remoteAddress
        || 'unknown';

    const now = Date.now();
    const timestamps = (hits.get(ip) || []).filter(t => now - t < windowMs);

    timestamps.push(now);
    hits.set(ip, timestamps);

    // Set rate limit headers
    const remaining = Math.max(0, max - timestamps.length);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

    if (timestamps.length > max) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000)} seconds.`,
            retryAfter: Math.ceil(windowMs / 1000),
        }));
        return true; // blocked
    }

    return false; // allowed
}

module.exports = { rateLimit };
