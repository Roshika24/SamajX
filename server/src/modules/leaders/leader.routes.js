/**
 * Leaders module — Express routes.
 *
 * GET    /             — list leaders (uni admin: own uni; platform admin: all)
 * GET    /:id          — get leader details
 * PATCH  /:id/approve  — approve a pending leader
 * PATCH  /:id/reject   — reject a pending leader
 * PATCH  /:id/suspend  — suspend an approved leader
 * POST   /:id/transfer — transfer leadership to another member
 */

const { Router } = require('express');
const { parsePagination } = require('../../lib/pagination');
const { z } = require('zod');
const leaderLogic = require('./leader.logic');
const leaderDb = require('./leader.db');
const uniDb = require('../universities/uni.db');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { success, paginated } = require('../../lib/response');
const { ForbiddenError, NotFoundError } = require('../../lib/errors');

const router = Router();

/**
 * Middleware: ensure the requesting university_admin owns the leader's university.
 * Platform admins bypass this check.
 */
async function requireOwnUniLeader(req, res, next) {
  try {
    if (req.user.role === 'platform_admin') return next();

    const leader = await leaderDb.findById(parseInt(req.params.id, 10));
    if (!leader) throw new NotFoundError('Leader not found');

    if (req.user.role === 'leader' && leader.user_id === req.user.id) {
      req.leader = leader;
      return next();
    }

    const uni = await uniDb.findByUserId(req.user.id);
    if (!uni || uni.id !== leader.university_id) {
      throw new ForbiddenError('You can only manage leaders at your own university');
    }
    req.leader = leader;
    next();
  } catch (err) {
    next(err);
  }
}

// Current leader profile. Pending leaders can use this to see their approval state.
router.get('/me', requireAuth, requireRole('leader'), async (req, res, next) => {
  try {
    const leader = await leaderDb.findByUserId(req.user.id);
    if (!leader) throw new NotFoundError('Leader not found');
    const team = await require('../teams/team.db').findByLeaderId(leader.id);
    return success(res, { leader, team });
  } catch (err) { next(err); }
});

// List leaders
router.get(
  '/',
  requireAuth,
  requireRole('university_admin', 'platform_admin'),
  async (req, res, next) => {
    try {
      const { page, limit } = parsePagination(req.query);
      const status = req.query.status || undefined;

      let universityId;
      if (req.user.role === 'university_admin') {
        const uni = await uniDb.findByUserId(req.user.id);
        if (!uni) throw new NotFoundError('University not found');
        universityId = uni.id;
      }

      const { rows, total } = await leaderLogic.list({ universityId, status, page, limit });
      return paginated(res, rows, total, page, limit);
    } catch (err) {
      next(err);
    }
  }
);

// Get leader by ID
router.get(
  '/:id',
  requireAuth,
  requireRole('university_admin', 'leader', 'platform_admin'),
  requireOwnUniLeader,
  async (req, res, next) => {
    try {
      const leader = await leaderLogic.getById(parseInt(req.params.id, 10));
      return success(res, { leader });
    } catch (err) {
      next(err);
    }
  }
);

// Approve leader
router.patch(
  '/:id/approve',
  requireAuth,
  requireRole('university_admin'),
  requireOwnUniLeader,
  async (req, res, next) => {
    try {
      const leader = await leaderLogic.approve(parseInt(req.params.id, 10), req.user.id, req);
      return success(res, { leader });
    } catch (err) {
      next(err);
    }
  }
);

// Reject leader
const rejectSchema = z.object({
  reason: z.string().max(500).optional(),
});

router.patch(
  '/:id/reject',
  requireAuth,
  requireRole('university_admin'),
  requireOwnUniLeader,
  async (req, res, next) => {
    try {
      const data = rejectSchema.parse(req.body);
      const leader = await leaderLogic.reject(parseInt(req.params.id, 10), data.reason, req);
      return success(res, { leader });
    } catch (err) {
      next(err);
    }
  }
);

// Suspend leader
const suspendSchema = z.object({
  reason: z.string().min(1).max(500),
});

router.patch(
  '/:id/suspend',
  requireAuth,
  requireRole('university_admin', 'platform_admin'),
  requireOwnUniLeader,
  async (req, res, next) => {
    try {
      const data = suspendSchema.parse(req.body);
      const leader = await leaderLogic.suspend(
        parseInt(req.params.id, 10),
        data.reason,
        req.user.role,
        req
      );
      return success(res, { leader });
    } catch (err) {
      next(err);
    }
  }
);

// Transfer leadership
const transferSchema = z.object({
  new_leader_member_id: z.number().int().positive(),
  new_leader_email: z.string().email(),
  new_leader_password: z.string().min(8),
});

router.post(
  '/:id/transfer',
  requireAuth,
  requireRole('university_admin'),
  requireOwnUniLeader,
  async (req, res, next) => {
    try {
      const data = transferSchema.parse(req.body);
      const result = await leaderLogic.transfer(
        parseInt(req.params.id, 10),
        data.new_leader_member_id,
        data.new_leader_email,
        data.new_leader_password,
        req
      );
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
