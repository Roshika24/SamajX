'use strict';

const pool = require('../../db/pool');
const { NotFoundError } = require('../../lib/errors');

async function listProblems(filters, pagination) {
  const where = ["p.status NOT IN ('resolved_duplicate', 'rejected_spam')"];
  const values = [];
  const add = (sql, value) => { values.push(value); where.push(sql.replace('?', `$${values.length}`)); };
  if (filters.domain) add('d.slug = ?', filters.domain);
  if (filters.status) add('p.status::text = ?', filters.status);
  if (filters.q) {
    values.push(`%${filters.q}%`);
    where.push(`(p.title ILIKE $${values.length} OR p.description ILIKE $${values.length})`);
  }
  if (filters.lat !== undefined && filters.lng !== undefined) {
    values.push(filters.lat, filters.lng, filters.radiusKm || 25);
    where.push(`earth_distance(ll_to_earth(p.lat, p.lng), ll_to_earth($${values.length - 2}, $${values.length - 1})) <= $${values.length} * 1000`);
  }
  const offset = (pagination.page - 1) * pagination.limit;
  const clause = where.join(' AND ');
  const listValues = [...values, pagination.limit, offset];
  const [data, count] = await Promise.all([
    pool.query(
      `SELECT p.id, p.title, p.description, p.category, p.lat, p.lng, p.status,
              p.difficulty, p.needs_authority, p.report_count, p.upvote_count,
              p.priority_score, p.created_at, d.slug AS domain, d.name AS domain_name,
              EXISTS(SELECT 1 FROM upvotes u WHERE u.problem_id = p.id AND u.user_id = $${listValues.length + 1}) AS viewer_upvoted
       FROM problems p LEFT JOIN domains d ON d.id = p.domain_id
       WHERE ${clause}
       ORDER BY p.priority_score DESC, p.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pagination.limit, offset, filters.viewerId]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM problems p LEFT JOIN domains d ON d.id = p.domain_id WHERE ${clause}`, values),
  ]);
  return { rows: data.rows, total: count.rows[0].total };
}

async function getProblem(id, viewerId) {
  const { rows } = await pool.query(
    `SELECT p.id, p.title, p.description, p.category, p.lat, p.lng, p.status,
            p.difficulty, p.needs_authority, p.report_count, p.upvote_count,
            p.priority_score, p.created_at, d.slug AS domain, d.name AS domain_name,
            EXISTS(SELECT 1 FROM upvotes u WHERE u.problem_id = p.id AND u.user_id = $2) AS viewer_upvoted
     FROM problems p LEFT JOIN domains d ON d.id = p.domain_id WHERE p.id = $1`, [id, viewerId]
  );
  if (!rows[0]) throw new NotFoundError('Problem');
  return rows[0];
}

async function toggleUpvote(problemId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: problems } = await client.query('SELECT id FROM problems WHERE id = $1 FOR UPDATE', [problemId]);
    if (!problems[0]) throw new NotFoundError('Problem');
    const { rows: existing } = await client.query('SELECT id FROM upvotes WHERE problem_id = $1 AND user_id = $2', [problemId, userId]);
    let upvoted;
    if (existing[0]) {
      await client.query('DELETE FROM upvotes WHERE id = $1', [existing[0].id]);
      upvoted = false;
    } else {
      await client.query('INSERT INTO upvotes (problem_id, user_id) VALUES ($1, $2)', [problemId, userId]);
      upvoted = true;
    }
    await client.query(
      'UPDATE problems SET upvote_count = (SELECT COUNT(*)::int FROM upvotes WHERE problem_id = $1), priority_score = report_count * 2 + (SELECT COUNT(*)::int FROM upvotes WHERE problem_id = $1) WHERE id = $1',
      [problemId]
    );
    await client.query('COMMIT');
    return { upvoted };
  } catch (err) { await client.query('ROLLBACK').catch(() => {}); throw err; }
  finally { client.release(); }
}

async function flagProblem(problemId, userId, reason) {
  const exists = await pool.query('SELECT id FROM problems WHERE id = $1', [problemId]);
  if (!exists.rows[0]) throw new NotFoundError('Problem');
  const { rows } = await pool.query(
    `INSERT INTO flags (reporter_id, entity_type, entity_id, reason)
     VALUES ($1, 'problem', $2, $3) RETURNING id, status, created_at`, [userId, problemId, reason]
  );
  return rows[0];
}

async function listComments(problemId) {
  const exists = await pool.query('SELECT id FROM problems WHERE id = $1', [problemId]);
  if (!exists.rows[0]) throw new NotFoundError('Problem');
  const { rows } = await pool.query(
    `SELECT c.id, c.content, c.created_at, c.updated_at, c.user_id,
            u.display_name AS author_name
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.problem_id = $1 ORDER BY c.created_at ASC`, [problemId]
  );
  return rows;
}

async function addComment(problemId, userId, content) {
  const exists = await pool.query('SELECT id FROM problems WHERE id = $1', [problemId]);
  if (!exists.rows[0]) throw new NotFoundError('Problem');
  const { rows } = await pool.query(
    `INSERT INTO comments (problem_id, user_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, problem_id, user_id, content, created_at`, [problemId, userId, content]
  );
  return rows[0];
}

async function flagComment(problemId, commentId, userId, reason) {
  const exists = await pool.query('SELECT id FROM comments WHERE id = $1 AND problem_id = $2', [commentId, problemId]);
  if (!exists.rows[0]) throw new NotFoundError('Comment');
  const { rows } = await pool.query(
    `INSERT INTO flags (reporter_id, entity_type, entity_id, reason)
     VALUES ($1, 'comment', $2, $3) RETURNING id, status, created_at`, [userId, commentId, reason]
  );
  return rows[0];
}

async function listPendingFlags({ page, limit }) {
  const offset = (page - 1) * limit;
  const [data, count] = await Promise.all([
    pool.query(
      `SELECT f.id, f.entity_type, f.entity_id, f.reason, f.created_at,
              u.display_name AS reporter_name,
              CASE WHEN f.entity_type = 'problem' THEN p.title
                   WHEN f.entity_type = 'report' THEN r.title
                   WHEN f.entity_type = 'comment' THEN LEFT(c.content, 180)
                   ELSE NULL END AS entity_title
       FROM flags f
       JOIN users u ON u.id = f.reporter_id
       LEFT JOIN problems p ON f.entity_type = 'problem' AND p.id = f.entity_id
       LEFT JOIN reports r ON f.entity_type = 'report' AND r.id = f.entity_id
       LEFT JOIN comments c ON f.entity_type = 'comment' AND c.id = f.entity_id
       WHERE f.status = 'pending'
       ORDER BY f.created_at ASC LIMIT $1 OFFSET $2`, [limit, offset]
    ),
    pool.query("SELECT COUNT(*)::int AS total FROM flags WHERE status = 'pending'")
  ]);
  return { rows: data.rows, total: count.rows[0].total };
}

async function reviewFlag(flagId, adminId, status) {
  const { rows } = await pool.query(
    `UPDATE flags SET status = $3, reviewed_by = $2, reviewed_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING id, status, reviewed_at`, [flagId, adminId, status]
  );
  if (!rows[0]) throw new NotFoundError('Pending moderation flag');
  return rows[0];
}

module.exports = { listProblems, getProblem, toggleUpvote, flagProblem, listPendingFlags, reviewFlag, listComments, addComment, flagComment };
