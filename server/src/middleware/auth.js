/**
 * Authentication middleware — verifies the JWT from httpOnly cookie.
 *
 * Exports:
 *   verifyToken   – populates req.user if a valid token is present (non-blocking)
 *   requireAuth   – blocks the request if no valid token is present
 */

const { UnauthorizedError } = require('../lib/errors');

/**
 * Attach req.user from the cookie token if present and valid.
 * Does NOT reject — downstream middleware can decide whether auth is required.
 *
 * Invalid/expired JWTs are treated as anonymous requests. Database failures are
 * passed to Express error handling instead of being misreported as bad sessions.
 */
function createVerifyToken({ jwt: jwtLib, config: runtimeConfig, pool: dbPool, authPolicy: policy }) {
  return async function verifyToken(req, _res, next) {
    const token = req.cookies?.[runtimeConfig.jwt.cookieName];
    if (!token) {
      req.user = null;
      return next();
    }

    let payload;
    try {
      payload = jwtLib.verify(token, runtimeConfig.jwt.secret);
    } catch (_err) {
      req.user = null;
      return next();
    }

    try {
      // JWTs are stateless, so check the authoritative account state on each
      // request. This makes suspension and leader transfer effective immediately.
      const { rows } = await dbPool.query(
        `SELECT u.id, u.email, u.role, u.status,
                l.status AS leader_status
         FROM users u LEFT JOIN leaders l ON l.user_id = u.id
         WHERE u.id = $1`, [payload.id]
      );
      const account = rows[0];
      if (!policy.canRestoreSession(account)) {
        req.user = null;
      } else {
        req.user = { id: account.id, email: account.email, role: account.role };
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function verifyToken(req, res, next) {
  return createVerifyToken({
    jwt: require('jsonwebtoken'),
    config: require('../config'),
    pool: require('../db/pool'),
    authPolicy: require('../modules/auth/auth.policy'),
  })(req, res, next);
}

/**
 * Reject the request if req.user is not set.
 * Use after verifyToken in the middleware chain.
 */
function requireAuth(req, _res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }
  next();
}

module.exports = { verifyToken, requireAuth, createVerifyToken };
