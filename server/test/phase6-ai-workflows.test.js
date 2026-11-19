'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const aiLogic = require('../src/modules/ai/ai.logic');
const { ValidationError, ForbiddenError } = require('../src/lib/errors');

test('reviewProblemDomain rejects invalid action', async () => {
  await assert.rejects(
    async () => aiLogic.reviewProblemDomain(1, 10, 'invalid_action'),
    ValidationError
  );
});

test('reviewProblemDifficulty rejects invalid action', async () => {
  await assert.rejects(
    async () => aiLogic.reviewProblemDifficulty(1, 'platform_admin', 10, 'disagree'),
    ValidationError
  );
});

test('reviewProblemDifficulty rejects invalid override rating', async () => {
  await assert.rejects(
    async () => aiLogic.reviewProblemDifficulty(1, 'platform_admin', 10, 'override', 'huge'),
    ValidationError
  );
});

test('reviewProblemDomain rejects override with non-numeric or missing domainId', async () => {
  await assert.rejects(
    async () => aiLogic.reviewProblemDomain(1, 10, 'override', 'not-a-number'),
    ValidationError
  );
});

test('AI routes require appropriate role permissions', () => {
  const { requireRole } = require('../src/middleware/roles');
  const citizenReq = { user: { id: 1, role: 'citizen' } };
  const leaderReq = { user: { id: 2, role: 'leader' } };
  const uniAdminReq = { user: { id: 3, role: 'university_admin' } };
  const platformAdminReq = { user: { id: 4, role: 'platform_admin' } };

  const domainReviewMiddleware = requireRole('platform_admin');
  const difficultyReviewMiddleware = requireRole('university_admin', 'platform_admin');

  // Domain review: only platform_admin
  domainReviewMiddleware(citizenReq, {}, (err) => {
    assert.ok(err instanceof ForbiddenError);
  });
  domainReviewMiddleware(leaderReq, {}, (err) => {
    assert.ok(err instanceof ForbiddenError);
  });
  domainReviewMiddleware(uniAdminReq, {}, (err) => {
    assert.ok(err instanceof ForbiddenError);
  });
  domainReviewMiddleware(platformAdminReq, {}, (err) => {
    assert.equal(err, undefined);
  });

  // Difficulty review: university_admin and platform_admin
  difficultyReviewMiddleware(citizenReq, {}, (err) => {
    assert.ok(err instanceof ForbiddenError);
  });
  difficultyReviewMiddleware(leaderReq, {}, (err) => {
    assert.ok(err instanceof ForbiddenError);
  });
  difficultyReviewMiddleware(uniAdminReq, {}, (err) => {
    assert.equal(err, undefined);
  });
  difficultyReviewMiddleware(platformAdminReq, {}, (err) => {
    assert.equal(err, undefined);
  });
});
