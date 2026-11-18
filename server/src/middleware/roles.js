/**
 * Role & ownership middleware.
 *
 * requireRole(...roles) – checks that req.user.role is one of the listed roles.
 * requireOwnership(paramFn) – checks that the actor owns the resource.
 *
 * Both expect requireAuth to have run first (req.user exists).
 */

const { ForbiddenError } = require('../lib/errors');

/**
 * Factory: returns middleware that only allows the listed roles through.
 * @param  {...string} roles – e.g. 'citizen', 'leader', 'platform_admin'
 */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `This action requires one of these roles: ${roles.join(', ')}`
        )
      );
    }
    next();
  };
}

/**
 * Factory: returns middleware that runs an async ownership-check function.
 *
 * @param {(req) => Promise<boolean>} checkFn
 *   Receives the request and should return true if the actor owns the resource.
 *   Example: `(req) => isTeamLeader(req.user.id, req.params.id)`
 */
function requireOwnership(checkFn) {
  return async (req, _res, next) => {
    try {
      const allowed = await checkFn(req);
      if (!allowed) {
        return next(new ForbiddenError('You do not own this resource'));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireRole, requireOwnership };
