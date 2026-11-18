'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../../config');
const { z } = require('zod');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { success, paginated } = require('../../lib/response');
const { ValidationError } = require('../../lib/errors');
const { parsePagination } = require('../../lib/pagination');
const problemLogic = require('./problem.logic');

const router = Router();
router.use(requireAuth);
const commentLimiter = rateLimit({ windowMs: config.rateLimit.comments.windowMs, max: config.rateLimit.comments.max, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => `user:${req.user.id}`, message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Comment limit reached. Please try again later.' } } });

router.get('/', async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const filters = {};
    if (req.query.domain) filters.domain = String(req.query.domain).slice(0, 50);
    if (req.query.status) filters.status = String(req.query.status);
    if (req.query.q) filters.q = String(req.query.q).trim().slice(0, 100);
    if (req.query.lat !== undefined || req.query.lng !== undefined) {
      const lat = Number(req.query.lat); const lng = Number(req.query.lng);
      const radiusKm = Number(req.query.radiusKm || 25);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || !Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 200) {
        throw new ValidationError('Provide valid coordinates and a radius between 1 and 200 km');
      }
      filters.lat = lat; filters.lng = lng; filters.radiusKm = radiusKm;
    }
    filters.viewerId = req.user.id;
    const result = await problemLogic.listProblems(filters, { page, limit });
    return paginated(res, result.rows, result.total, page, limit);
  } catch (err) { return next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid problem ID');
    return success(res, await problemLogic.getProblem(id, req.user.id));
  } catch (err) { return next(err); }
});

router.get('/:id/comments', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid problem ID');
    return success(res, await problemLogic.listComments(id));
  } catch (err) { return next(err); }
});

router.post('/:id/comments', commentLimiter, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid problem ID');
    const parsed = z.object({ content: z.string().trim().min(2).max(2000) }).safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Comment must be between 2 and 2000 characters');
    return success(res, await problemLogic.addComment(id, req.user.id, parsed.data.content), 201);
  } catch (err) { return next(err); }
});

router.post('/:id/comments/:commentId/flag', async (req, res, next) => {
  try {
    const commentId = Number(req.params.commentId);
    if (!Number.isSafeInteger(commentId) || commentId < 1) throw new ValidationError('Invalid comment ID');
    const parsed = z.object({ reason: z.string().trim().min(5).max(1000) }).safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Please provide a reason of at least 5 characters');
    return success(res, await problemLogic.flagComment(id, commentId, req.user.id, parsed.data.reason), 201);
  } catch (err) { return next(err); }
});

router.post('/:id/upvote', requireRole('citizen'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid problem ID');
    return success(res, await problemLogic.toggleUpvote(id, req.user.id));
  } catch (err) { return next(err); }
});

router.post('/:id/flag', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid problem ID');
    const parsed = z.object({ reason: z.string().trim().min(5).max(1000) }).safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Please provide a reason of at least 5 characters');
    return success(res, await problemLogic.flagProblem(id, req.user.id, parsed.data.reason), 201);
  } catch (err) { return next(err); }
});


router.get('/moderation/flags', requireRole('platform_admin'), async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
    const result = await problemLogic.listPendingFlags({ page, limit });
    return paginated(res, result.rows, result.total, page, limit);
  } catch (err) { return next(err); }
});

router.patch('/moderation/flags/:id', requireRole('platform_admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid flag ID');
    const parsed = z.object({ status: z.enum(['reviewed', 'dismissed']) }).safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Status must be reviewed or dismissed');
    return success(res, await problemLogic.reviewFlag(id, req.user.id, parsed.data.status));
  } catch (err) { return next(err); }
});

module.exports = router;
