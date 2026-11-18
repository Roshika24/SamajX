/**
 * Evidence module — Express routes.
 *
 * Handles two route groups:
 *   /api/members/:memberId/evidence  — member-scoped CRUD
 *   /api/evidence/:id                — direct evidence actions
 *   /api/evidence/queue/:uniId       — university admin evidence queue
 */

const { Router } = require('express');
const { parsePagination } = require('../../lib/pagination');
const { z } = require('zod');
const evidenceLogic = require('./evidence.logic');
const teamDb = require('../teams/team.db');
const leaderDb = require('../leaders/leader.db');
const uniDb = require('../universities/uni.db');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { success, paginated } = require('../../lib/response');
const { ForbiddenError, NotFoundError } = require('../../lib/errors');

const router = Router();

/* ── Schemas ── */

const createSchema = z.object({
  type: z.enum([
    'platform_project', 'project', 'faculty_lab',
    'hackathon', 'certification', 'internship', 'faculty_endorsement',
  ]),
  title: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  link: z.string().url().max(500).optional(),
  faculty_name: z.string().max(255).optional(),
});

/* ── Member-scoped routes ── */

// POST /api/members/:memberId/evidence — leader adds evidence for a member
router.post(
  '/members/:memberId/evidence',
  requireAuth,
  requireRole('leader'),
  async (req, res, next) => {
    try {
      const data = createSchema.parse(req.body);
      const evidence = await evidenceLogic.addEvidence(
        parseInt(req.params.memberId, 10),
        req.user.id,
        data
      );
      return success(res, { evidence }, 201);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/members/:memberId/evidence — leader (own team) or university_admin
router.get(
  '/members/:memberId/evidence',
  requireAuth,
  requireRole('leader', 'university_admin', 'platform_admin'),
  async (req, res, next) => {
    try {
      const memberId = parseInt(req.params.memberId, 10);
      const member = await teamDb.findMemberById(memberId);
      if (!member) throw new NotFoundError('Member not found');

      // Access control
      if (req.user.role === 'university_admin') {
        const uni = await uniDb.findByUserId(req.user.id);
        if (!uni || uni.id !== member.university_id) {
          throw new ForbiddenError('Access denied');
        }
      }
      if (req.user.role === 'leader') {
        const leader = await leaderDb.findByUserId(req.user.id);
        const team = leader ? await teamDb.findByLeaderId(leader.id) : null;
        if (!team || leader.status !== 'approved' || team.id !== member.team_id) throw new ForbiddenError('Access denied');
      }

      const evidence = await evidenceLogic.getByMember(memberId);
      return success(res, evidence);
    } catch (err) {
      next(err);
    }
  }
);

/* ── Direct evidence routes ── */

// PATCH /api/evidence/:id/verify — university admin verifies
router.patch(
  '/evidence/:id/verify',
  requireAuth,
  requireRole('university_admin'),
  async (req, res, next) => {
    try {
      const evidence = await evidenceLogic.verify(
        parseInt(req.params.id, 10),
        req.user.id,
        req
      );
      return success(res, { evidence });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/evidence/:id/reject — university admin rejects
router.patch(
  '/evidence/:id/reject',
  requireAuth,
  requireRole('university_admin'),
  async (req, res, next) => {
    try {
      await evidenceLogic.reject(parseInt(req.params.id, 10), req.user.id, req);
      return success(res, null);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/evidence/:id — leader deletes unverified evidence
router.delete(
  '/evidence/:id',
  requireAuth,
  requireRole('leader'),
  async (req, res, next) => {
    try {
      await evidenceLogic.remove(parseInt(req.params.id, 10), req.user.id);
      return success(res, null);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/evidence/queue/:uniId — university admin's evidence queue
router.get(
  '/evidence/queue/:uniId',
  requireAuth,
  requireRole('university_admin'),
  async (req, res, next) => {
    try {
      const uniId = parseInt(req.params.uniId, 10);
      // Verify ownership
      const uni = await uniDb.findByUserId(req.user.id);
      if (!uni || uni.id !== uniId) throw new ForbiddenError('Access denied');

      const { page, limit } = parsePagination(req.query);

      const { rows, total } = await evidenceLogic.getPendingForUniversity(uniId, page, limit);
      return paginated(res, rows, total, page, limit);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
