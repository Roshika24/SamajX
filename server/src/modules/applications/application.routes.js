'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const { success } = require('../../lib/response');
const { ValidationError } = require('../../lib/errors');
const logic = require('./application.logic');

const router = Router();

router.use(requireAuth);

router.get('/mentor-options', requireRole('leader'), async (req, res, next) => {
  try {
    return success(res, await logic.listMentorOptions(req.user.id));
  } catch (err) {
    return next(err);
  }
});

router.get('/problems', requireRole('leader'), async (req, res, next) => {
  try {
    return success(res, await logic.listAvailableProblems(req.user.id));
  } catch (err) {
    return next(err);
  }
});

router.post('/problems/:problemId', requireRole('leader'), async (req, res, next) => {
  try {
    const problemId = Number(req.params.problemId);

    if (!Number.isSafeInteger(problemId) || problemId < 1) {
      throw new ValidationError('Invalid problem ID');
    }

    const parsed = z.object({
      approach: z.string().trim().min(50).max(10000),
      timeline: z.string().trim().min(5).max(2000),
      skills: z.string().trim().min(5).max(2000),
      budget_resources: z.string().trim().max(2000).optional(),
      solution_type: z.enum([
        'survey',
        'design_proposal',
        'prototype_software',
        'research_report',
        'awareness_drive',
        'pilot'
      ]),
      mentor_member_id: z.number().int().positive().optional(),
      mentor_name: z.preprocess(
        (value) => typeof value === 'string' && !value.trim()
          ? undefined
          : value,
        z.string().trim().min(2).max(255).optional()
      )
    }).safeParse(req.body);

    if (!parsed.success) {
      const details = parsed.error.issues
        .map(issue => `${issue.path.join('.') || 'request'}: ${issue.message}`)
        .join('; ');

      throw new ValidationError(`Application validation failed: ${details}`);
    }

    return success(
      res,
      await logic.submitApplication(req.user.id, problemId, parsed.data),
      201
    );

  } catch (err) {
    return next(err);
  }
});

router.get('/mine', requireRole('leader'), async (req, res, next) => {
  try {
    return success(res, await logic.listMyApplications(req.user.id));
  } catch (err) {
    return next(err);
  }
});

router.get('/university/problems', requireRole('university_admin'), async (req, res, next) => {
  try {
    return success(res, await logic.listUniversityProblems(req.user.id));
  } catch (err) {
    return next(err);
  }
});

router.get('/university/reviews', requireRole('university_admin'), async (req, res, next) => {
  try {
    return success(res, await logic.listUniversityReviews(req.user.id));
  } catch (err) {
    return next(err);
  }
});

router.patch('/:applicationId/university-review', requireRole('university_admin'), async (req, res, next) => {
  try {
    const id = Number(req.params.applicationId);

    if (!Number.isSafeInteger(id) || id < 1) {
      throw new ValidationError('Invalid application ID');
    }

    const parsed = z.object({
      decision: z.enum(['approved', 'rejected']),
      feedback: z.string().trim().max(2000).optional()
    }).safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid review decision');
    }

    return success(
      res,
      await logic.reviewApplication(
        req.user.id,
        id,
        parsed.data.decision,
        parsed.data.feedback
      )
    );

  } catch (err) {
    return next(err);
  }
});

module.exports = router;