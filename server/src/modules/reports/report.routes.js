'use strict';

const { Router } = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { success, paginated } = require('../../lib/response');
const { ValidationError } = require('../../lib/errors');
const { parsePagination } = require('../../lib/pagination');
const reportLogic = require('./report.logic');
const photoStorage = require('./photoStorage');
const config = require('../../config');

const router = Router();
router.use(requireAuth);

const reportLimiter = rateLimit({
  windowMs: config.rateLimit.reports.windowMs,
  max: config.rateLimit.reports.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'You have reached the report limit. Please try again later.' } },
  keyGenerator: (req) => `user:${req.user.id}`,
});

const reportSchema = z.object({
  title: z.string().trim().min(8).max(500),
  description: z.string().trim().min(20).max(5000),
  category: z.string().trim().min(2).max(50),

  lat: z.number().finite().min(-90).max(90).nullable().optional(),
lng: z.number().finite().min(-180).max(180).nullable().optional(),

  state: z.string().trim().min(1).max(100),
  district: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  locality: z.string().trim().max(200).default(''),
  address: z.string().trim().min(1).max(500),

  photos: z.array(z.string().max(2000).refine((value) => {
    if (/^\/uploads\/[a-f0-9-]{36}\.(jpg|png)$/i.test(value)) return true;
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  }, 'Photo links must use HTTPS or a CivicPulse uploaded-photo URL')).max(config.uploads.maxPhotosPerReport).default([]),

  anonymous: z.boolean().default(false),
}).superRefine((data, ctx) => {
  const hasLat = data.lat != null;
  const hasLng = data.lng != null;

  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Latitude and longitude must be provided together.',
      path: ['lat']
    });
  }
});


const photoLimiter = rateLimit({
  windowMs: config.rateLimit.reports.windowMs,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Photo upload limit reached. Please try again later.' } },
  keyGenerator: (req) => `user:${req.user.id}`,
});

router.post('/photos', photoLimiter, requireRole('citizen'), require('express').raw({
  type: ['image/jpeg', 'image/png'],
  limit: config.uploads.maxSizeBytes,
}), async (req, res, next) => {
  try {
    const mimeType = req.headers['content-type'];
    const saved = await photoStorage.savePhoto(req.body, mimeType, config.uploads.dir);
    return success(res, saved, 201);
  } catch (err) { return next(err); }
});

router.post('/', reportLimiter, requireRole('citizen'), async (req, res, next) => {
  try {
    const parsed = reportSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Please check the report details', parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })));
    const result = await reportLogic.createReport(req.user.id, parsed.data);
    return success(res, result, 201);
  } catch (err) { return next(err); }
});

router.get('/mine', requireRole('citizen'), async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const result = await reportLogic.listMine(req.user.id, { page, limit });
    return paginated(res, result.rows, result.total, page, limit);
  } catch (err) { return next(err); }
});

router.post('/:id/duplicate-decision', requireRole('citizen'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid report ID');
    const schema = z.object({ sameProblem: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('sameProblem must be true or false');
    const result = await reportLogic.resolveCandidate(req.user.id, id, parsed.data.sameProblem);
    return success(res, result);
  } catch (err) { return next(err); }
});

router.delete('/:id', requireRole('citizen'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid report ID');
    return success(res, await reportLogic.deleteMine(req.user.id, id));
  } catch (err) { return next(err); }
});

module.exports = router;
