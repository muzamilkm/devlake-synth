function createRateLimiter({ limit = 100, windowMs = 60000, now = Date.now } = {}) {
  const clients = new Map();

  return function rateLimit(req, res, next) {
    const time = now();
    const key = req.ip;

    // Drop expired entries so the map doesn't grow without bound.
    for (const [ip, entry] of clients) {
      if (time >= entry.resetAt) clients.delete(ip);
    }

    let entry = clients.get(key);
    if (!entry) {
      entry = { count: 0, resetAt: time + windowMs };
      clients.set(key, entry);
    }
    entry.count += 1;

    res.set('RateLimit-Limit', String(limit));
    res.set('RateLimit-Remaining', String(Math.max(0, limit - entry.count)));

    if (entry.count > limit) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - time) / 1000)));
      return res.status(429).json({ error: 'Too many requests' });
    }

    next();
  };
}

module.exports = { createRateLimiter };
