const DEFAULT_TIMEOUT_MS = 10000;

function createShutdown(server, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const exit = options.exit || process.exit;
  const log = options.log || console.log;
  let shuttingDown = false;

  return function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`${signal} received, closing server`);

    const timer = setTimeout(() => {
      log('Shutdown timed out, forcing exit');
      exit(1);
    }, timeoutMs);
    timer.unref();

    // Stop accepting new connections; in-flight requests keep running.
    server.close((err) => {
      clearTimeout(timer);
      if (err) {
        log(`Error closing server: ${err.message}`);
        exit(1);
        return;
      }
      log('Server closed');
      exit(0);
    });

    // Drop idle keep-alive sockets so close() is not held open by them.
    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }
  };
}

function installGracefulShutdown(server, options = {}) {
  const shutdown = createShutdown(server, options);
  const proc = options.process || process;
  proc.on('SIGTERM', () => shutdown('SIGTERM'));
  return shutdown;
}

module.exports = { createShutdown, installGracefulShutdown };
