module.exports = function requestLogger() {
  return (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });

    next();
  };
};
