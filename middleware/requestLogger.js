function createRequestLogger(log = console.log) {
  return function requestLogger(req, res, next) {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const path = req.originalUrl.split('?')[0];
      log(`${req.method} ${path} ${res.statusCode} ${durationMs.toFixed(2)}ms`);
    });

    next();
  };
}

module.exports = { createRequestLogger };
