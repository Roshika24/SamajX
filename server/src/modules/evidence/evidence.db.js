/**
 * Evidence module — database queries.
 *
 * Handles member_evidence CRUD, verification, and score recalculation.
 */

const pool = require('../../db/pool');

/** Create an evidence entry (inside a transaction). */
async function create(client, { memberId, type, title, description, link, facultyName }) {
  const { rows } = await client.query(
    `INSERT INTO member_evidence (member_id, type, title, description, link, faculty_name)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [memberId, type, title, description || null, link || null, facultyName || null]
  );
  return rows[0];
}

/** Get all evidence for a member, newest first. */
async function findByMember(memberId) {
  const { rows } = await pool.query(
    'SELECT * FROM member_evidence WHERE member_id = $1 ORDER BY created_at DESC',
    [memberId]
  );
  return rows;
}

/** Get a single evidence item with member and team info. */
async function findById(id) {
  const { rows } = await pool.query(
    `SELECT me.*, tm.team_id, tm.university_id, tm.name AS member_name
     FROM member_evidence me
     JOIN team_members tm ON tm.id = me.member_id
     WHERE me.id = $1`,
    [id]
  );
  return rows[0] || null;
}

/** Mark evidence as verified and assign points (inside a transaction). */
async function verify(client, id, verifiedBy, points) {
  const { rows } = await client.query(
    `UPDATE member_evidence
     SET verified = TRUE, verified_by = $2, verified_at = NOW(), points = $3
     WHERE id = $1 AND verified = FALSE
     RETURNING *`,
    [id, verifiedBy, points]
  );
  return rows[0];
}

/** Delete unverified evidence. Returns true if a row was actually deleted. */
async function remove(id) {
  const { rowCount } = await pool.query(
    'DELETE FROM member_evidence WHERE id = $1 AND verified = FALSE',
    [id]
  );
  return rowCount > 0;
}

/**
 * Get pending (unverified) evidence for all members at a university.
 * Paginated. Used by the university admin's evidence queue.
 */
async function findPendingByUniversity(universityId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const countRes = await pool.query(
    `SELECT COUNT(*)
     FROM member_evidence me
     JOIN team_members tm ON tm.id = me.member_id
     WHERE tm.university_id = $1 AND me.verified = FALSE`,
    [universityId]
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT me.*, tm.name AS member_name, tm.enrollment_number, tm.team_id,
            t.name AS team_name
     FROM member_evidence me
     JOIN team_members tm ON tm.id = me.member_id
     JOIN teams t ON t.id = tm.team_id
     WHERE tm.university_id = $1 AND me.verified = FALSE
     ORDER BY me.created_at ASC
     LIMIT $2 OFFSET $3`,
    [universityId, limit, offset]
  );

  return { rows, total };
}

/**
 * Recalculate a member's credential_score from their verified evidence.
 * Must be called inside a transaction.
 */
async function recalcMemberScore(client, memberId) {
  const { rows } = await client.query(
    'SELECT COALESCE(SUM(points), 0) AS total_score FROM member_evidence WHERE member_id = $1 AND verified = TRUE',
    [memberId]
  );
  const score = parseFloat(rows[0].total_score);

  await client.query(
    'UPDATE team_members SET credential_score = $1, updated_at = NOW() WHERE id = $2',
    [score, memberId]
  );

  return score;
}

module.exports = {
  create, findByMember, findById, verify, remove,
  findPendingByUniversity, recalcMemberScore,
};
