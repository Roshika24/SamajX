/**
 * Central error-handling middleware.
 *
 * Must be registered AFTER all routes (Express uses the 4-arg signature
 * to identify error handlers).
 */

const config = require('../config');
const { error: errorResponse } = require('../lib/response');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  // Already sent headers — let Express close the connection
  if (res.headersSent) return;

  // Zod validation errors
  if (err.name === 'ZodError') {
    // Zod 3 exposed `errors` as an alias; Zod 4 removes that alias.
    // `issues` is supported by both major versions.
    const issues = Array.isArray(err.issues)
      ? err.issues
      : (Array.isArray(err.errors) ? err.errors : []);
    const details = issues.map((e) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : '',
      message: e.message,
    }));
    return errorResponse(res, 'Validation failed', 400, 'VALIDATION_ERROR', details);
  }

  // Our own AppError hierarchy
  if (err.status && err.code) {
    return errorResponse(res, err.message, err.status, err.code, err.details);
  }

  // Unexpected errors — log the stack, hide details from the client
  console.error('[ERROR]', err.stack || err);
  const message = config.server.isDev
    ? err.message
    : 'Internal server error';
  return errorResponse(res, message, 500, 'INTERNAL_ERROR');
}

module.exports = errorHandler;
