/**
 * Auth module — Express routes.
 *
 * POST /api/auth/register   – create a new citizen / university_admin / company
 * POST /api/auth/login      – email + password → JWT cookie
 * POST /api/auth/logout     – clear cookie
 * GET  /api/auth/me         – current user + role profile
 */

const { Router } = require('express');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const config = require('../../config');
const authLogic = require('./auth.logic');
const leaderLogic = require('../leaders/leader.logic');
const { requireAuth } = require('../../middleware/auth');
const { success } = require('../../lib/response');

const router = Router();

/* ── Rate limiter for auth routes ── */
const authLimiter = rateLimit({
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMIT', message: 'Too many attempts, try again later' } },
});

/* ── Validation schemas ── */
const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address').transform(value => value.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().trim().min(2, 'Name must be at least 2 characters').max(255),
  phone: z.string().max(20).optional(),
  role: z.enum(['citizen', 'university_admin', 'company']),
  company: z.object({
    name: z.string().trim().min(2).max(255),
    description: z.string().max(5000).optional(),
    website: z.string().url().max(500).optional(),
    industry: z.string().max(100).optional(),
  }).optional(),
  university: z.object({
    name: z.string().min(2).max(255),
    address: z.string().max(1000).optional().default(''),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    country: z.string().max(100).optional().default('India'),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    website: z.string().url().max(500).optional(),
    departments: z.array(z.object({ domain_slug: z.string().min(1), name: z.string().min(2).max(255) })).min(1),
  }).optional(),
}).superRefine((value, ctx) => {
  if (value.role === 'university_admin' && !value.university) {
    ctx.addIssue({ code: 'custom', path: ['university'], message: 'University details are required' });
  }
  if (value.role === 'company' && !value.company) {
    ctx.addIssue({ code: 'custom', path: ['company'], message: 'Company details are required' });
  }
  if (value.role !== 'company' && value.company) {
    ctx.addIssue({ code: 'custom', path: ['company'], message: 'Company details are only valid for company registration' });
  }
  if (value.role !== 'university_admin' && value.university) {
    ctx.addIssue({ code: 'custom', path: ['university'], message: 'University details are only valid for university registration' });
  }
});

const loginSchema = z.object({
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(1),
});

const leaderRegisterSchema = z.object({
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(8),
  display_name: z.string().trim().min(2).max(255),
  phone: z.string().max(20).optional(),
  promo_code: z.string().min(6).max(32),
  enrollment_number: z.string().trim().min(1).max(50).transform(value => value.toUpperCase()),
  branch: z.string().min(1).max(100),
  year: z.number().int().min(1).max(6),
});

/* ── Routes ── */

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const { user, token, university, company } = await authLogic.register({
      email: data.email,
      password: data.password,
      role: data.role,
      displayName: data.display_name,
      phone: data.phone,
      university: data.university,
      company: data.company,
    });

    setCookie(res, token);
    return success(res, { user, ...(university ? { university } : {}), ...(company ? { company } : {}) }, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/register/leader', authLimiter, async (req, res, next) => {
  try {
    const data = leaderRegisterSchema.parse(req.body);
    const { user, leader, token } = await leaderLogic.register({
      email: data.email, password: data.password, displayName: data.display_name,
      phone: data.phone, promoCode: data.promo_code,
      enrollmentNumber: data.enrollment_number, branch: data.branch, year: data.year,
    });
    setCookie(res, token);
    return success(res, { user, leader }, 201);
  } catch (err) { next(err); }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const { user, token } = await authLogic.login({
      email: data.email,
      password: data.password,
    });

    setCookie(res, token);
    return success(res, { user });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(config.jwt.cookieName);
  return success(res, null);
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await authLogic.getProfile(req.user.id);
    return success(res, profile);
  } catch (err) {
    next(err);
  }
});

/* ── Helpers ── */

function setCookie(res, token) {
  const opts = { ...config.jwt.cookieOptions };
  if (!config.server.isDev) opts.secure = true;
  res.cookie(config.jwt.cookieName, token, opts);
}

module.exports = router;
