
'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { success } = require('../../lib/response');
const { ValidationError } = require('../../lib/errors');
const logic = require('../applications/application.logic');

const router = Router();
router.use(requireAuth, requireRole('platform_admin'));

router.get('/applications', async (_req, res, next) => {
  try { return success(res, await logic.listAdminApplications()); }
  catch (err) { return next(err); }
});

router.get('/problems', async (_req, res, next) => {
  try { return success(res, await logic.listAdminProblems()); }
  catch (err) { return next(err); }
});

router.patch('/problems/:id/classification', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid problem ID');
    const parsed = z.object({
      domain_id: z.number().int().positive().optional(),
      difficulty: z.enum(['small','medium','hard']),
      solution_types: z.array(z.enum(['survey','design_proposal','prototype_software','research_report','awareness_drive','pilot'])).min(1),
      required_skills: z.array(z.string().trim().min(2).max(80)).max(20).optional(),
      needs_authority: z.boolean(),
      window_hours: z.number().int().min(1).max(720).optional(),
      review_hours: z.number().int().min(1).max(720).optional(),
    }).safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid problem classification');
    return success(res, await logic.classifyProblem(req.user.id, id, parsed.data));
  } catch (err) { return next(err); }
});

router.post('/applications/:id/rank', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid problem ID');
    return success(res, await logic.rankProblemApplications(id, req.user.id));
  } catch (err) { return next(err); }
});

router.patch('/applications/:id/score', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const parsed = z.object({ proposal_score: z.number().min(1).max(5), feedback: z.string().trim().max(2000).optional() }).safeParse(req.body);
    if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) throw new ValidationError('Invalid application score');
    return success(res, await logic.rateProposal(req.user.id, id, parsed.data.proposal_score, parsed.data.feedback));
  } catch (err) { return next(err); }
});

router.post('/applications/:id/select', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new ValidationError('Invalid application ID');
    return success(res, await logic.selectApplication(req.user.id, id), 201);
  } catch (err) { return next(err); }
});

router.post('/jobs/run', async (_req, res, next) => {
  try { return success(res, await logic.runLifecycleJobs()); }
  catch (err) { return next(err); }
});

module.exports = router;
