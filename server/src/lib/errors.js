/**
 * Custom error classes for consistent error handling.
 *
 * Throw these in route handlers / logic — the central error handler
 * will catch them and send the right HTTP status + JSON body.
 */

class AppError extends Error {
  /**
   * @param {string} message  – human-readable error message
   * @param {number} status   – HTTP status code (default 400)
   * @param {string} code     – machine-readable error code (e.g. 'VALIDATION_ERROR')
   */
  constructor(message, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

class NotFoundError extends AppError {
  constructor(entity = 'Resource') {
    super(`${entity} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Invalid credentials') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

class ValidationError extends AppError {
  /**
   * @param {string} message
   * @param {object[]} [details] – array of field-level errors from Zod etc.
   */
  constructor(message = 'Validation failed', details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

module.exports = {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
};
