/**
 * SamajX — Centralised configuration.
 *
 * Every tuneable value lives here so nothing is hardcoded in business logic.
 * Values come from environment variables with sensible defaults.
 */

require('dotenv').config();

const config = {
  /* ── Server ── */
  server: {
    port: Number(process.env.PORT || '3001'),
    env: process.env.NODE_ENV || 'development',
    isDev: (process.env.NODE_ENV || 'development') === 'development',
  },

  /* ── Database ── */
  db: {
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/SamajX',
  },

  /* ── JWT / Auth ── */
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieName: 'token',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      // secure: true in production (set dynamically in auth middleware)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    },
  },

  /* ── CORS ── */
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').trim(),
    credentials: true,
  },

  /* ── Uploads ── */
  uploads: {
    dir: process.env.UPLOADS_DIR || './uploads',
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimes: ['image/jpeg', 'image/png'],
    maxPhotosPerReport: 5,
  },

  /* ── Email ── */
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@SamajX.local',
  },

  /* ── Rate limiting ── */
  rateLimit: {
    auth:     { windowMs: 15 * 60 * 1000, max: 10 },  // 10 attempts / 15 min
    reports:  { windowMs: 60 * 60 * 1000, max: 5 },   // 5 reports / hour
    comments: { windowMs: 60 * 60 * 1000, max: 10 },  // 10 comments / hour
  },

  /* ── Scoring weights (by difficulty) ── */
  scoring: {
    hard:   { level: 0.5, domain: 0.3, proposal: 0.2 },
    medium: { level: 0.25, domain: 0.5, proposal: 0.25 },
    small:  { level: 0.0, domain: 0.5, proposal: 0.5 },
    maxLevelScore: 10,          // normalise level_score to 0–1
    tieBreakEpsilon: 0.01,     // scores within this are "equal"
    defaultProposalScore: 3,   // unrated proposals after review deadline
  },

  /* ── Team level thresholds (average verified member score) ── */
  levels: {
    beginnerMax: 2,     // < 2 = beginner
    intermediateMax: 5, // 2–5 = intermediate, > 5 = advanced
  },

  /* ── Evidence point values ── */
  evidencePoints: {
    platform_project: 3,
    project: 2,
    faculty_lab: 2,
    hackathon: 2,
    internship: 2,
    certification: 1,
    faculty_endorsement: 0, // minimum evidence, no points awarded
  },

  /* ── Duplicate merge thresholds ── */
  merge: {
    highThreshold: 0.85,   // auto-merge
    mediumThreshold: 0.65, // ask the reporter
    // below medium → create new problem
  },

  /* ── Routing ── */
  routing: {
    radiusStepsKm: [25, 50, 100, 200],
  },

  /* ── Application & project lifecycle ── */
  application: {
    windowHours: 48,
    reviewHours: 48,
    maxActiveProjects: 2,
    staleDays: 21,
  },

  /* ── Promo code defaults ── */
  promoCode: {
    defaultJoinLimit: 50,
    defaultExpiryDays: 90,
    codeBytes: 8,
    generationAttempts: 5,
  },

  /* ── Problem ── */
  problem: {
    difficultyRecheckThreshold: 10, // re-flag when report_count passes this
  },

  /* ── Admin bootstrap ── */
  admin: {
    email: (process.env.ADMIN_EMAIL || 'admin@SamajX.local').trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },

  /* ── AI Layer (Phase 6) ── */
  ai: {
    enabled: process.env.AI_ENABLED === 'true' || (process.env.AI_ENABLED !== 'false' && ((Boolean(process.env.ANTHROPIC_API_KEY) && !process.env.ANTHROPIC_API_KEY.includes('your')) || (process.env.NODE_ENV || 'development') === 'development')),
    provider: process.env.AI_PROVIDER || 'anthropic',
    apiKey: (process.env.ANTHROPIC_API_KEY || '').trim(),
    model: process.env.AI_MODEL || 'claude-3-haiku-20240307',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 20000),
    maxRetries: 3,
  },
};

/** Fail fast on unsafe or malformed production configuration. */
config.validateRuntime = function validateRuntime() {
  if (!Number.isInteger(config.server.port) || config.server.port < 1 || config.server.port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  if (!config.server.isDev) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'dev-secret-change-me') {
      throw new Error('JWT_SECRET must be a unique secret of at least 32 characters in production');
    }
    if (!process.env.CORS_ORIGIN) throw new Error('CORS_ORIGIN must be explicitly configured in production');
    const corsOrigin = process.env.CORS_ORIGIN.trim();
    let origin;
    try { origin = new URL(corsOrigin); } catch { throw new Error('CORS_ORIGIN must be a valid absolute URL'); }
    if (!['https:', 'http:'].includes(origin.protocol) || origin.origin !== corsOrigin.replace(/\/$/, '')) {
      throw new Error('CORS_ORIGIN must contain one origin only (scheme + host + optional port)');
    }
  }
};

module.exports = config;
