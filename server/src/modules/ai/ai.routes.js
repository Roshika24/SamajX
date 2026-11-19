'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { success } = require('../../lib/response');
const { ValidationError } = require('../../lib/errors');
const aiLogic = require('./ai.logic');
const { runAIWorker, enqueueProblemAIJobs, triggerAIWorker } = require('./ai.worker');

const router = Router();
router.use(requireAuth);

function parseProblemId(val) {
  const id = Number(val);
  if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid problem ID');
  return id;
}

// ── Domain Classification AI Routes (Platform Admin only) ──

router.get('/problems/:id/domain', requireRole('platform_admin'), async (req, res, next) => {
  try {
    const id = parseProblemId(req.params.id);
    const data = await aiLogic.getProblemAIDomain(id);
    return success(res, data);
  } catch (err) {
    return next(err);
  }
});

router.post('/problems/:id/domain/review', requireRole('platform_admin'), async (req, res, next) => {
  try {
    const id = parseProblemId(req.params.id);
    const schema = z.object({
      action: z.enum(['accept', 'override']),
      overrideDomainId: z.number().int().positive().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid review payload', parsed.error.issues);
    }

    const result = await aiLogic.reviewProblemDomain(
      req.user.id,
      id,
      parsed.data.action,
      parsed.data.overrideDomainId
    );
    return success(res, result);
  } catch (err) {
    return next(err);
  }
});

// ── Difficulty Prediction AI Routes (University Admin & Platform Admin) ──

router.get(
  '/problems/:id/difficulty',
  requireRole('university_admin', 'platform_admin'),
  async (req, res, next) => {
    try {
      const id = parseProblemId(req.params.id);
      const data = await aiLogic.getProblemAIDifficulty(id, req.user);
      return success(res, data);
    } catch (err) {
      return next(err);
    }
  }
);

router.post(
  '/problems/:id/difficulty/review',
  requireRole('university_admin', 'platform_admin'),
  async (req, res, next) => {
    try {
      const id = parseProblemId(req.params.id);
      const schema = z.object({
        action: z.enum(['accept', 'override']),
        overrideDifficulty: z.enum(['small', 'medium', 'hard']).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid review payload', parsed.error.issues);
      }

      const result = await aiLogic.reviewProblemDifficulty(
        req.user.id,
        req.user.role,
        id,
        parsed.data.action,
        parsed.data.overrideDifficulty
      );
      return success(res, result);
    } catch (err) {
      return next(err);
    }
  }
);

// ── AI Worker Trigger & Re-enqueue ──

router.post('/jobs/run', requireRole('platform_admin'), async (_req, res, next) => {
  try {
    const result = await runAIWorker({ batchSize: 10 });
    return success(res, result);
  } catch (err) {
    return next(err);
  }
});

router.post('/problems/:id/re-enqueue', requireRole('platform_admin'), async (req, res, next) => {
  try {
    const id = parseProblemId(req.params.id);
    await enqueueProblemAIJobs(id);
    triggerAIWorker();
    return success(res, { message: `AI jobs enqueued for problem #${id}` });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
