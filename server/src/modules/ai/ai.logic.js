'use strict';

const pool = require('../../db/pool');
const { NotFoundError, ForbiddenError, ValidationError } = require('../../lib/errors');
const { routeProblem } = require('../reports/problemRouting');

/**
 * Retrieve AI domain classification details for a problem.
 * @param {number} problemId
 * @returns {Promise<object>}
 */
async function getProblemAIDomain(problemId) {
  const { rows } = await pool.query(
    `SELECT p.id, p.title, p.description, p.domain_id,
            d_curr.name AS current_domain_name, d_curr.slug AS current_domain_slug,
            p.ai_suggested_domain_id,
            d_ai.name AS ai_suggested_domain_name, d_ai.slug AS ai_suggested_domain_slug,
            p.ai_domain_explanation, p.ai_domain_status,
            p.ai_domain_reviewed_by, u.display_name AS reviewed_by_name,
            p.ai_domain_reviewed_at, p.ai_domain_review_action,
            j.status AS job_status, j.attempts AS job_attempts, j.last_error AS job_last_error
     FROM problems p
     LEFT JOIN domains d_curr ON d_curr.id = p.domain_id
     LEFT JOIN domains d_ai ON d_ai.id = p.ai_suggested_domain_id
     LEFT JOIN users u ON u.id = p.ai_domain_reviewed_by
     LEFT JOIN ai_jobs j ON j.problem_id = p.id AND j.job_type = 'domain_classification'
     WHERE p.id = $1`,
    [problemId]
  );

  if (!rows[0]) throw new NotFoundError('Problem');
  return rows[0];
}

/**
 * Review an AI domain classification suggestion (Platform Admin only).
 *
 * @param {number} adminId
 * @param {number} problemId
 * @param {'accept' | 'override'} action
 * @param {number} [overrideDomainId]
 * @returns {Promise<object>}
 */
async function reviewProblemDomain(adminId, problemId, action, overrideDomainId) {
  if (!['accept', 'override'].includes(action)) {
    throw new ValidationError('Action must be "accept" or "override"');
  }

  let parsedOverrideId;
  if (action === 'override') {
    parsedOverrideId = Number(overrideDomainId);
    if (!Number.isSafeInteger(parsedOverrideId) || parsedOverrideId < 1) {
      throw new ValidationError('Choose a valid domain to override the suggestion');
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, domain_id, ai_suggested_domain_id, ai_domain_explanation, ai_domain_status
       FROM problems WHERE id = $1 FOR UPDATE`,
      [problemId]
    );

    const problem = rows[0];
    if (!problem) throw new NotFoundError('Problem');

    let finalDomainId;
    if (action === 'accept') {
      if (!problem.ai_suggested_domain_id) {
        throw new ValidationError('Cannot accept domain: no AI suggestion is available for this problem');
      }
      finalDomainId = problem.ai_suggested_domain_id;
    } else {
      const domainCheck = await client.query('SELECT id FROM domains WHERE id = $1', [parsedOverrideId]);
      if (!domainCheck.rows[0]) {
        throw new ValidationError('Selected override domain does not exist');
      }
      finalDomainId = parsedOverrideId;
    }

    const { rows: updated } = await client.query(
      `UPDATE problems
       SET domain_id = $2,
           ai_domain_status = $3,
           ai_domain_reviewed_by = $4,
           ai_domain_reviewed_at = NOW(),
           ai_domain_review_action = $5
       WHERE id = $1
       RETURNING id, domain_id, ai_suggested_domain_id, ai_domain_explanation,
                 ai_domain_status, ai_domain_reviewed_by, ai_domain_reviewed_at,
                 ai_domain_review_action`,
      [problemId, finalDomainId, action === 'accept' ? 'accepted' : 'overridden', adminId, action]
    );

    // Route problem to universities based on newly confirmed domain
    await routeProblem(client, problemId).catch(() => {});

    // If still in reported status, activate the application window immediately
    if (problem.status === 'reported') {
      await client.query(
        `UPDATE problems
         SET status = 'open_for_applications',
             window_closes_at = COALESCE(window_closes_at, NOW() + INTERVAL '48 hours'),
             review_deadline = COALESCE(review_deadline, NOW() + INTERVAL '96 hours')
         WHERE id = $1 AND status = 'reported'`,
        [problemId]
      );
    }

    // Audit log entry
    await client.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'review_ai_domain', 'problem', $2, $3::jsonb)`,
      [
        adminId,
        problemId,
        JSON.stringify({
          action,
          final_domain_id: finalDomainId,
          ai_suggested_domain_id: problem.ai_suggested_domain_id,
          previous_domain_id: problem.domain_id,
        }),
      ]
    );

    await client.query('COMMIT');
    return updated[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retrieve AI difficulty prediction details for a problem.
 * @param {number} problemId
 * @param {object} actor - Authenticated user { id, role }
 * @returns {Promise<object>}
 */
async function getProblemAIDifficulty(problemId, actor) {
  // Check access: if university_admin, verify problem is routed to their university
  if (actor.role === 'university_admin') {
    const uniCheck = await pool.query(
      `SELECT pr.id
       FROM problem_routes pr
       JOIN universities u ON u.id = pr.university_id
       WHERE pr.problem_id = $1 AND u.user_id = $2`,
      [problemId, actor.id]
    );
    if (!uniCheck.rows.length) {
      throw new ForbiddenError('This problem is not routed to your university');
    }
  }

  const { rows } = await pool.query(
    `SELECT p.id, p.title, p.description, p.difficulty,
            p.ai_suggested_difficulty, p.ai_difficulty_reason, p.ai_difficulty_status,
            p.ai_difficulty_reviewed_by, u.display_name AS reviewed_by_name,
            p.ai_difficulty_reviewed_at, p.ai_difficulty_review_action,
            j.status AS job_status, j.attempts AS job_attempts, j.last_error AS job_last_error
     FROM problems p
     LEFT JOIN users u ON u.id = p.ai_difficulty_reviewed_by
     LEFT JOIN ai_jobs j ON j.problem_id = p.id AND j.job_type = 'difficulty_prediction'
     WHERE p.id = $1`,
    [problemId]
  );

  if (!rows[0]) throw new NotFoundError('Problem');
  return rows[0];
}

/**
 * Review an AI difficulty prediction (University Admin or Platform Admin).
 *
 * @param {number} userId
 * @param {string} userRole
 * @param {number} problemId
 * @param {'accept' | 'override'} action
 * @param {'small' | 'medium' | 'hard'} [overrideDifficulty]
 * @returns {Promise<object>}
 */
async function reviewProblemDifficulty(userId, userRole, problemId, action, overrideDifficulty) {
  if (!['accept', 'override'].includes(action)) {
    throw new ValidationError('Action must be "accept" or "override"');
  }

  let finalDifficulty;
  if (action === 'override') {
    const validDifficulties = ['small', 'medium', 'hard'];
    if (!overrideDifficulty || !validDifficulties.includes(String(overrideDifficulty).toLowerCase())) {
      throw new ValidationError('Choose a valid difficulty rating (Small, Medium, Hard)');
    }
    finalDifficulty = String(overrideDifficulty).toLowerCase();
  }
  if (userRole === 'university_admin') {
    const uniCheck = await pool.query(
      `SELECT pr.id
       FROM problem_routes pr
       JOIN universities u ON u.id = pr.university_id
       WHERE pr.problem_id = $1 AND u.user_id = $2`,
      [problemId, userId]
    );
    if (!uniCheck.rows.length) {
      throw new ForbiddenError('This problem is not routed to your university');
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id, difficulty, ai_suggested_difficulty, ai_difficulty_reason, ai_difficulty_status
       FROM problems WHERE id = $1 FOR UPDATE`,
      [problemId]
    );

    const problem = rows[0];
    if (!problem) throw new NotFoundError('Problem');

    if (action === 'accept') {
      if (!problem.ai_suggested_difficulty) {
        throw new ValidationError('Cannot accept difficulty: no AI prediction is available for this problem');
      }
      finalDifficulty = problem.ai_suggested_difficulty;
    }

    const { rows: updated } = await client.query(
      `UPDATE problems
       SET difficulty = $2::difficulty,
           difficulty_set_by = $4,
           ai_difficulty_status = $3,
           ai_difficulty_reviewed_by = $4,
           ai_difficulty_reviewed_at = NOW(),
           ai_difficulty_review_action = $5
       WHERE id = $1
       RETURNING id, difficulty, ai_suggested_difficulty, ai_difficulty_reason,
                 ai_difficulty_status, ai_difficulty_reviewed_by, ai_difficulty_reviewed_at,
                 ai_difficulty_review_action`,
      [problemId, finalDifficulty, action === 'accept' ? 'accepted' : 'overridden', userId, action]
    );

    // Route problem to universities
    await routeProblem(client, problemId).catch(() => {});

    // If domain is already set and still reported, open the application window
    if (problem.domain_id && problem.status === 'reported') {
      await client.query(
        `UPDATE problems
         SET status = 'open_for_applications',
             window_closes_at = COALESCE(window_closes_at, NOW() + INTERVAL '48 hours'),
             review_deadline = COALESCE(review_deadline, NOW() + INTERVAL '96 hours')
         WHERE id = $1 AND status = 'reported'`,
        [problemId]
      );
    }

    // Audit log entry
    await client.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'review_ai_difficulty', 'problem', $2, $3::jsonb)`,
      [
        userId,
        problemId,
        JSON.stringify({
          action,
          final_difficulty: finalDifficulty,
          ai_suggested_difficulty: problem.ai_suggested_difficulty,
          previous_difficulty: problem.difficulty,
          role: userRole,
        }),
      ]
    );

    await client.query('COMMIT');
    return updated[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  getProblemAIDomain,
  reviewProblemDomain,
  getProblemAIDifficulty,
  reviewProblemDifficulty,
};
