// Centralized error handling: an HttpError type plus the 404 and error middleware.

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  next(new HttpError(404, 'Route not found'));
}

// Maps any thrown value to an HTTP status. Errors from body-parser and other
// http-errors users carry a 4xx `status`; anything else is treated as a 500.
function statusOf(err) {
  const status = err && (err.status || err.statusCode);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

function messageFor(err, status) {
  if (err.type === 'entity.parse.failed') return 'Invalid JSON body';
  if (err.type === 'entity.too.large') return 'Request body too large';
  // Never leak internal error messages for server faults.
  if (status >= 500) return 'Internal server error';
  return err.message || 'Bad request';
}

// Must keep four parameters so Express recognizes it as an error handler.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = statusOf(err);
  if (status >= 500) console.error(err && err.stack ? err.stack : err);
  const body = { error: messageFor(err, status) };
  if (status < 500 && err.details !== undefined) body.details = err.details;
  res.status(status).json(body);
}

module.exports = { HttpError, notFoundHandler, errorHandler };
