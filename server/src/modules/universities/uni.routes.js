/**
 * Universities module — Express routes.
 *
 * GET    /                          — list universities
 * GET    /:id                       — get by id
 * PATCH  /:id/verify                — platform admin verifies
 * POST   /:id/promo-code/regenerate — uni admin regenerates code
 * POST   /:id/promo-code/revoke     — uni admin revokes code
 * GET    /:id/departments           — list departments
 * POST   /:id/departments           — add department
 * DELETE /:id/departments/:deptId   — remove department
 */

const { Router } = require('express');
const { parsePagination } = require('../../lib/pagination');
const { z } = require('zod');
const uniLogic = require('./uni.logic');
const uniDb = require('./uni.db');
const uniAccess = require('./uni.access');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { success, paginated } = require('../../lib/response');
const { ForbiddenError, NotFoundError } = require('../../lib/errors');

const router = Router();

/* ── Helpers ── */

/**
 * Ensure the requesting university_admin owns this university.
 * Attaches req.university for downstream handlers.
 */
async function requireOwnUniversity(req, res, next) {
  try {
    const uni = await uniDb.findByUserId(req.user.id);
    if (!uni || uni.id !== parseInt(req.params.id, 10)) {
      throw new ForbiddenError('You can only manage your own university');
    }
    req.university = uni;
    next();
  } catch (err) {
    next(err);
  }
}

/* ── Routes ── */

// Current university admin's own university, including its promo-code metadata.
router.get('/me', requireAuth, requireRole('university_admin'), async (req, res, next) => {
  try {
    const uni = await uniDb.findByUserId(req.user.id);
    if (!uni) throw new ForbiddenError('University profile not found');
    const departments = await uniLogic.getDepartments(uni.id);
    return success(res, { university: { ...uni, departments }, departments });
  } catch (err) { next(err); }
});

// List universities
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    // Platform admin sees all; everyone else sees verified only
    const verified = req.user.role === 'platform_admin' ? req.query.verified : true;
    const parsed = verified === 'true' ? true : verified === 'false' ? false : verified;

    const { rows, total } = await uniLogic.list({ verified: parsed, page, limit });
    return paginated(res, rows, total, page, limit);
  } catch (err) {
    next(err);
  }
});

// Get university by ID
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const universityId = parseInt(req.params.id, 10);
    if (!Number.isInteger(universityId) || universityId < 1) throw new NotFoundError('University');
    const uni = await uniLogic.getById(universityId);
    const own = req.user.role === 'university_admin' ? await uniDb.findByUserId(req.user.id) : null;
    if (!uniAccess.canViewUniversity(req.user, uni, own?.id)) throw new NotFoundError('University');
    return success(res, { university: uni });
  } catch (err) {
    next(err);
  }
});

// Platform admin verifies a university
router.patch(
  '/:id/verify',
  requireAuth,
  requireRole('platform_admin'),
  async (req, res, next) => {
    try {
      const uni = await uniLogic.verify(parseInt(req.params.id, 10), req.user.id, req);
      return success(res, { university: uni });
    } catch (err) {
      next(err);
    }
  }
);

// Promo code is visible only to the owning university admin.
router.get('/:id/promo-code', requireAuth, requireRole('university_admin'), requireOwnUniversity, async (req, res, next) => {
  try {
    const { promo_code, promo_code_expires_at, promo_code_join_limit, promo_code_join_count, promo_code_active } = req.university;
    return success(res, { promo_code, promo_code_expires_at, promo_code_join_limit, promo_code_join_count, promo_code_active });
  } catch (err) { next(err); }
});

// Regenerate promo code
const regenerateSchema = z.object({
  expires_in_days: z.number().int().min(1).max(365).optional(),
  join_limit: z.number().int().min(1).max(1000).optional(),
});

router.post(
  '/:id/promo-code/regenerate',
  requireAuth,
  requireRole('university_admin'),
  requireOwnUniversity,
  async (req, res, next) => {
    try {
      const data = regenerateSchema.parse(req.body);
      const promoInfo = await uniLogic.regeneratePromoCode(
        req.university.id,
        data.expires_in_days || 90,
        data.join_limit || 50,
        req
      );
      return success(res, promoInfo);
    } catch (err) {
      next(err);
    }
  }
);

// Revoke promo code
router.post(
  '/:id/promo-code/revoke',
  requireAuth,
  requireRole('university_admin'),
  requireOwnUniversity,
  async (req, res, next) => {
    try {
      await uniLogic.revokePromoCode(req.university.id, req);
      return success(res, null);
    } catch (err) {
      next(err);
    }
  }
);

// List departments
router.get('/:id/departments', requireAuth, async (req, res, next) => {
  try {
    const universityId = parseInt(req.params.id, 10);
    if (!Number.isInteger(universityId) || universityId < 1) throw new NotFoundError('University');
    const uni = await uniLogic.getById(universityId);
    const own = req.user.role === 'university_admin' ? await uniDb.findByUserId(req.user.id) : null;
    if (!uniAccess.canViewUniversity(req.user, uni, own?.id)) throw new NotFoundError('University');
    const departments = await uniLogic.getDepartments(universityId);
    return success(res, departments);
  } catch (err) {
    next(err);
  }
});

// Add department
const addDeptSchema = z.object({
  domain_slug: z.string().min(1),
  name: z.string().min(2).max(255),
});

router.post(
  '/:id/departments',
  requireAuth,
  requireRole('university_admin'),
  requireOwnUniversity,
  async (req, res, next) => {
    try {
      const data = addDeptSchema.parse(req.body);
      const dept = await uniLogic.addDepartment(req.university.id, data.domain_slug, data.name, req);
      return success(res, { department: dept }, 201);
    } catch (err) {
      next(err);
    }
  }
);

// Remove department
router.delete(
  '/:id/departments/:deptId',
  requireAuth,
  requireRole('university_admin'),
  requireOwnUniversity,
  async (req, res, next) => {
    try {
      await uniLogic.removeDepartment(req.university.id, parseInt(req.params.deptId, 10), req);
      return success(res, null);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
