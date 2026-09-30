const HttpError = require('../utils/httpError');

/**
 * Fixed-window rate limiter kept in memory. It is enough for a single server
 * process; a multi-instance deployment would move the counters to Redis.
 */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, keyFor = (req) => req.ip, message } = {}) {
  const hits = new Map();

  const sweep = setInterval(() => {
    const now = Date.now();
    hits.forEach((entry, key) => {
      if (entry.resetAt <= now) hits.delete(key);
    });
  }, windowMs);
  sweep.unref();

  return function limiter(req, res, next) {
    const now = Date.now();
    const key = keyFor(req);
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    const secondsLeft = Math.ceil((entry.resetAt - now) / 1000);
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.set('RateLimit-Reset', String(secondsLeft));

    if (entry.count > max) {
      res.set('Retry-After', String(secondsLeft));
      const minutes = Math.max(1, Math.ceil(secondsLeft / 60));
      return next(new HttpError(429, message || `Too many attempts. Wait ${minutes} minutes and try again.`));
    }
    return next();
  };
}

module.exports = rateLimit;
