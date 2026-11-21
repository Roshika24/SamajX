'use strict';

const pool = require('../../db/pool');
const config = require('../../config');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../lib/errors');
const { cosineSimilarity, mergeBand } = require('./similarity');
const { routeProblem } = require('./problemRouting');

const OPEN_STATUSES = ['reported', 'open_for_applications', 'window_closed', 'pending_approval', 'claimed', 'in_progress', 'reopened', 'unrouted'];
const CATEGORY_ALIASES = {
  pothole: 'roads_transport', street: 'roads_transport', road: 'roads_transport',
  drainage: 'water_sanitation', water: 'water_sanitation', sewage: 'water_sanitation',
  garbage: 'waste', trash: 'waste', waste: 'waste',
};

function normalizeText(value) { return String(value || '').trim().replace(/\s+/g, ' '); }

async function findDomain(client, category) {
  const slug = CATEGORY_ALIASES[category.toLowerCase()] || category.toLowerCase();
  const { rows } = await client.query(
    'SELECT id, slug, name, merge_radius_m, routing_radius_km FROM domains WHERE slug = $1', [slug]
  );
  if (!rows[0]) throw new ValidationError('Choose a valid problem category');
  return rows[0];
}

async function insertProblem(client, { title, description, category, domainId, lat, lng, recurrenceOf = null }) {
  const { rows } = await client.query(
    `INSERT INTO problems
       (title, description, category, domain_id, lat, lng, report_count, priority_score, status, recurrence_of)
     VALUES ($1, $2, $3, $4, $5, $6, 1, 2, 'reported', $7)
     RETURNING id, title, description, category, domain_id, lat, lng, report_count,
               upvote_count, priority_score, status, created_at`,
    [title, description, category, domainId, lat, lng, recurrenceOf]
  );
  return rows[0];
}

async function createReport(userId, input) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize duplicate decisions to prevent two simultaneous first reports
    // from creating separate canonical problems in the same category.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`civicpulse-report:${input.category.toLowerCase()}`]);
    const domain = await findDomain(client, input.category);
    const radius = Number(domain.merge_radius_m) || 500;
    const { rows: candidates } = await client.query(
      `SELECT id, title, description, status
       FROM problems
       WHERE category = $1
         AND status = ANY($2::problem_status[])
         AND earth_distance(ll_to_earth(lat, lng), ll_to_earth($3, $4)) <= $5
       ORDER BY earth_distance(ll_to_earth(lat, lng), ll_to_earth($3, $4)) ASC
       LIMIT 30`,
      [domain.slug, OPEN_STATUSES, input.lat, input.lng, radius]
    );

    let best = null;
    for (const candidate of candidates) {
      const score = cosineSimilarity(`${input.title} ${input.description}`, `${candidate.title} ${candidate.description}`);
      if (!best || score > best.score) best = { ...candidate, score };
    }

    const band = best ? mergeBand(best.score, config.merge) : 'low';
    let recurrenceOf = null;
    if (band === 'low') {
      const { rows: resolvedCandidates } = await client.query(
        `SELECT id, title, description
         FROM problems
         WHERE category = $1 AND status = 'completed'
           AND earth_distance(ll_to_earth(lat, lng), ll_to_earth($2, $3)) <= $4
         ORDER BY earth_distance(ll_to_earth(lat, lng), ll_to_earth($2, $3)) ASC
         LIMIT 20`,
        [domain.slug, input.lat, input.lng, radius]
      );
      let recurrence = null;
      for (const candidate of resolvedCandidates) {
        const score = cosineSimilarity(`${input.title} ${input.description}`, `${candidate.title} ${candidate.description}`);
        if (!recurrence || score > recurrence.score) recurrence = { ...candidate, score };
      }
      if (recurrence && recurrence.score >= config.merge.mediumThreshold) recurrenceOf = recurrence.id;
    }
    let problem = null;
    let routing = null;
    let reportProblemId = null;
    if (best && band === 'high') {
      problem = best;
      reportProblemId = best.id;
      await client.query(
        `UPDATE problems
         SET report_count = report_count + 1,
             priority_score = (report_count + 1) * 2 + upvote_count,
             difficulty_recheck_flag = (report_count + 1) >= $2
         WHERE id = $1`,
        [best.id, config.problem.difficultyRecheckThreshold]
      );
      if (['claimed', 'in_progress'].includes(best.status)) {
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, link)
          SELECT l.user_id, 'new_duplicate_report', 'New report added to your problem',
                  'A citizen report was matched to a problem your team is working on.', $2
          FROM projects pr
          JOIN teams t ON t.id = pr.team_id
          JOIN leaders l ON l.id = t.leader_id
          WHERE pr.problem_id = $1 AND pr.status IN ('active', 'pending_approval')`,
          [best.id, `/leader/problems/${best.id}`]
        );
      }
    } else if (!(best && band === 'medium')) {
      problem = await insertProblem(client, {
        title: input.title, description: input.description, category: domain.slug,
        domainId: domain.id, lat: input.lat, lng: input.lng,
        recurrenceOf,
      });
      routing = await routeProblem(client, problem.id);
      reportProblemId = problem.id;
    }

    const reportStatus = best && band === 'high' ? 'merged' : 'active';
const { rows: reportRows } = await client.query(
  `INSERT INTO reports (
    user_id, problem_id, title, description, category,
    lat, lng, state, district, city, locality, address,
    photos, anonymous, status, merge_confidence, ai_status
  )
  VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
    $13::jsonb, $14, $15, $16, $17
  )
  RETURNING
    id, problem_id, title, description, category,
    lat, lng, state, district, city, locality, address,
    photos, anonymous, status, merge_confidence, created_at`,
  [
    userId,
    reportProblemId,
    input.title,
    input.description,
    domain.slug,
    input.lat,
    input.lng,
    input.state || null,
    input.district || null,
    input.city || null,
    input.locality || null,
    input.address || null,
    JSON.stringify(input.photos || []),
    input.anonymous,
    reportStatus,
    best ? Number(best.score.toFixed(3)) : null,
    band === 'medium' ? 'pending' : null
  ]
);
    const report = reportRows[0];
    if (best && band === 'medium') {
      await client.query(
        `INSERT INTO report_merge_candidates (report_id, problem_id, confidence)
        VALUES ($1, $2, $3)`, [report.id, best.id, best.score]
      );
    }
    await client.query('COMMIT');
    return {
      report,
      duplicate: best ? { band, confidence: Number(best.score.toFixed(3)), candidate: { id: best.id, title: best.title } } : null,
      problem: problem ? { id: problem.id, title: problem.title, status: problem.status || 'reported' } : null,
      routing,
      recurrenceOf,
      nextAction: band === 'medium' ? 'confirm_duplicate' : 'created_or_merged',
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function resolveCandidate(userId, reportId, confirm) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT r.id, r.user_id, r.title, r.description, r.category, r.lat, r.lng,
              r.problem_id, r.status, c.problem_id AS candidate_problem_id, c.confidence,
              p.title AS candidate_title, p.status AS candidate_status, p.domain_id
       FROM reports r
       JOIN report_merge_candidates c ON c.report_id = r.id AND c.status = 'pending'
       JOIN problems p ON p.id = c.problem_id
       WHERE r.id = $1
       FOR UPDATE OF r, c`, [reportId]
    );
    const row = rows[0];
    if (!row) throw new NotFoundError('Pending duplicate decision');
    if (row.user_id !== userId) throw new ForbiddenError('You can only decide duplicates for your own report');
    const canStillMerge = OPEN_STATUSES.includes(row.candidate_status);
    let routing = null;
    if (confirm && canStillMerge) {
      await client.query("UPDATE reports SET problem_id = $2, merge_confidence = $3, status = 'merged' WHERE id = $1", [reportId, row.candidate_problem_id, row.confidence]);
      await client.query(
        `UPDATE problems SET report_count = report_count + 1,
          priority_score = (report_count + 1) * 2 + upvote_count,
          difficulty_recheck_flag = (report_count + 1) >= $2 WHERE id = $1`,
        [row.candidate_problem_id, config.problem.difficultyRecheckThreshold]
      );
      if (['claimed', 'in_progress'].includes(row.candidate_status)) {
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           SELECT l.user_id, 'new_duplicate_report', 'New report added to your problem',
                  'A citizen confirmed that their report concerns the problem your team is working on.', $2
           FROM projects pr
           JOIN teams t ON t.id = pr.team_id
           JOIN leaders l ON l.id = t.leader_id
           WHERE pr.problem_id = $1 AND pr.status IN ('active', 'pending_approval')`,
          [row.candidate_problem_id, `/leader/problems/${row.candidate_problem_id}`]
        );
      }
      await client.query("UPDATE report_merge_candidates SET status = 'confirmed', resolved_at = NOW() WHERE report_id = $1", [reportId]);
    } else {
      const domain = await findDomain(client, row.category);
      const problem = await insertProblem(client, {
        title: row.title, description: row.description, category: domain.slug,
        domainId: domain.id, lat: row.lat, lng: row.lng,
        recurrenceOf: confirm ? row.candidate_problem_id : null,
      });
      routing = await routeProblem(client, problem.id);
      await client.query('UPDATE reports SET problem_id = $2, merge_confidence = NULL WHERE id = $1', [reportId, problem.id]);
      await client.query("UPDATE report_merge_candidates SET status = 'rejected', resolved_at = NOW() WHERE report_id = $1", [reportId]);
    }
    await client.query('COMMIT');
    return { reportId: Number(reportId), duplicateConfirmed: Boolean(confirm && canStillMerge), routing };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally { client.release(); }
}

async function listMine(userId, { page, limit }) {
  const offset = (page - 1) * limit;
  const [data, count] = await Promise.all([
    pool.query(
      `SELECT r.id, r.title, r.description, r.category,
       r.lat, r.lng, r.state, r.district, r.city,
       r.locality, r.address, r.photos,
              r.anonymous, r.status, r.merge_confidence, r.created_at, r.problem_id,
              p.status AS problem_status, p.title AS problem_title,
              c.problem_id AS duplicate_candidate_id, cp.title AS duplicate_candidate_title,
              c.confidence AS duplicate_candidate_confidence
       FROM reports r
       LEFT JOIN problems p ON p.id = r.problem_id
       LEFT JOIN report_merge_candidates c ON c.report_id = r.id AND c.status = 'pending'
       LEFT JOIN problems cp ON cp.id = c.problem_id
       WHERE r.user_id = $1 AND r.status <> 'deleted'
       ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`, [userId, limit, offset]
    ),
    pool.query("SELECT COUNT(*)::int AS total FROM reports WHERE user_id = $1 AND status <> 'deleted'", [userId]),
  ]);
  return { rows: data.rows, total: count.rows[0].total };
}

async function deleteMine(userId, reportId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE reports SET status = 'deleted'
       WHERE id = $1 AND user_id = $2 AND status IN ('active', 'merged', 'split')
       RETURNING id, problem_id`, [reportId, userId]
    );
    if (!rows[0]) throw new NotFoundError('Report');
    if (rows[0].problem_id) {
      await client.query(
        `UPDATE problems
         SET report_count = GREATEST(report_count - 1, 0),
             priority_score = GREATEST(report_count - 1, 0) * 2 + upvote_count
         WHERE id = $1`, [rows[0].problem_id]
      );
    }
    await client.query("UPDATE report_merge_candidates SET status = 'rejected', resolved_at = NOW() WHERE report_id = $1 AND status = 'pending'", [reportId]);
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally { client.release(); }
}

module.exports = { createReport, resolveCandidate, listMine, deleteMine, routeProblem };
