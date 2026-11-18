/**
 * Teams module — Express routes.
 *
 * POST   /                       — create team
 * GET    /:id                    — get team with members
 * PATCH  /:id                    — update team name/avatar
 * GET    /:id/members            — list members
 * POST   /:id/members            — add member
 * PATCH  /:id/members/:memberId  — update member
 * DELETE /:id/members/:memberId  — remove member
 */

const { Router } = require('express');
const { parsePagination } = require('../../lib/pagination');
const { z } = require('zod');
const teamLogic = require('./team.logic');
const teamDb = require('./team.db');
const uniDb = require('../universities/uni.db');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { success, paginated } = require('../../lib/response');
const { ForbiddenError } = require('../../lib/errors');

const router = Router();

/* ── Schemas ── */

const createSchema = z.object({
  name: z.string().min(2).max(255),
});

const addMemberSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().optional(),
  enrollment_number: z.string().trim().min(1).max(50).transform(value => value.toUpperCase()),
  branch: z.string().min(1).max(100),
  year: z.number().int().min(1).max(6),
  speciality: z.string().max(255).optional(),
  interests: z.string().max(500).optional(),
});

const updateMemberSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  enrollment_number: z.string().trim().min(1).max(50).transform(value => value.toUpperCase()).optional(),
  speciality: z.string().max(255).optional(),
  interests: z.string().max(500).optional(),
  branch: z.string().min(1).max(100).optional(),
  year: z.number().int().min(1).max(6).optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  avatar_url: z.string().url().optional(),
});

/* ── Routes ── */

// University-scoped team directory. Platform admins may inspect all teams.
router.get('/', requireAuth, requireRole('university_admin', 'platform_admin'), async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    let universityId;
    if (req.user.role === 'university_admin') {
      const university = await uniDb.findByUserId(req.user.id);
      if (!university) throw new ForbiddenError('University account not found');
      universityId = university.id;
    } else if (req.query.university_id) {
      universityId = parseInt(req.query.university_id, 10);
      if (!Number.isInteger(universityId) || universityId < 1) throw new ForbiddenError('Invalid university_id');
    }

    if (!universityId) {
      // Avoid an unbounded cross-university directory; platform admins must scope it.
      throw new ForbiddenError('Platform admins must specify university_id');
    }
    const { rows, total } = await teamDb.findByUniversityId(universityId, { page, limit });
    return paginated(res, rows, total, page, limit);
  } catch (err) { next(err); }
});

// Create team
router.post(
  '/',
  requireAuth,
  requireRole('leader'),
  async (req, res, next) => {
    try {
      const data = createSchema.parse(req.body);
      const team = await teamLogic.create(req.user.id, data.name);
      return success(res, { team }, 201);
    } catch (err) {
      next(err);
    }
  }
);

// Get team by ID
router.get(
  '/:id',
  requireAuth,
  async (req, res, next) => {
    try {
      const teamId = parseInt(req.params.id, 10);
      const data = await teamLogic.getById(teamId);

      // Team membership records contain student PII; only the owner and responsible admins can read them.
      if (!['leader', 'university_admin', 'platform_admin'].includes(req.user.role)) throw new ForbiddenError('Access denied');
      if (req.user.role === 'leader' && (data.leader_user_id !== req.user.id || data.leader_status !== 'approved')) {
        throw new ForbiddenError('Access denied');
      }
      if (req.user.role === 'university_admin') {
        const uni = await uniDb.findByUserId(req.user.id);
        if (!uni || uni.id !== data.university_id) throw new ForbiddenError('Access denied');
      }

      return success(res, data);
    } catch (err) {
      next(err);
    }
  }
);

// Update team
router.patch(
  '/:id',
  requireAuth,
  requireRole('leader'),
  async (req, res, next) => {
    try {
      const data = updateTeamSchema.parse(req.body);
      const team = await teamLogic.update(parseInt(req.params.id, 10), req.user.id, data);
      return success(res, { team });
    } catch (err) {
      next(err);
    }
  }
);

// List members
router.get(
  '/:id/members',
  requireAuth,
  requireRole('leader', 'university_admin', 'platform_admin'),
  async (req, res, next) => {
    try {
      const team = await teamLogic.getById(parseInt(req.params.id, 10));
      if (req.user.role === 'leader' && (team.leader_user_id !== req.user.id || team.leader_status !== 'approved')) throw new ForbiddenError('Access denied');
      if (req.user.role === 'university_admin') {
        const uni = await uniDb.findByUserId(req.user.id);
        if (!uni || uni.id !== team.university_id) throw new ForbiddenError('Access denied');
      }
      const members = await teamLogic.getMembers(parseInt(req.params.id, 10));
      return success(res, members);
    } catch (err) {
      next(err);
    }
  }
);

// Add member
router.post(
  '/:id/members',
  requireAuth,
  requireRole('leader'),
  async (req, res, next) => {
    try {
      const data = addMemberSchema.parse(req.body);
      const member = await teamLogic.addMember(parseInt(req.params.id, 10), req.user.id, data);
      return success(res, { member }, 201);
    } catch (err) {
      next(err);
    }
  }
);

// Update member
router.patch(
  '/:id/members/:memberId',
  requireAuth,
  requireRole('leader'),
  async (req, res, next) => {
    try {
      const data = updateMemberSchema.parse(req.body);
      const member = await teamLogic.updateMember(
        parseInt(req.params.id, 10),
        req.user.id,
        parseInt(req.params.memberId, 10),
        data
      );
      return success(res, { member });
    } catch (err) {
      next(err);
    }
  }
);

// Remove member
router.delete(
  '/:id/members/:memberId',
  requireAuth,
  requireRole('leader'),
  async (req, res, next) => {
    try {
      await teamLogic.removeMember(
        parseInt(req.params.id, 10),
        req.user.id,
        parseInt(req.params.memberId, 10)
      );
      return success(res, null);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
