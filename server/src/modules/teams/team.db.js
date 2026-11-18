/**
 * Teams module — database queries.
 *
 * Handles teams and team_members tables.
 */

const pool = require('../../db/pool');
const { calculateLevel } = require('./level');
const config = require('../../config');

/** Create a team inside a transaction. */
async function create(client, { name, leaderId, universityId }) {
  const { rows } = await client.query(
    `INSERT INTO teams (name, leader_id, university_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, leaderId, universityId]
  );
  return rows[0];
}

/** Get a team by ID with leader info. */
async function findById(id) {
  const { rows } = await pool.query(
    `SELECT t.*, l.user_id AS leader_user_id, l.status AS leader_status,
            u.display_name AS leader_name, u.email AS leader_email
     FROM teams t
     JOIN leaders l ON l.id = t.leader_id
     JOIN users u ON u.id = l.user_id
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
}

/** List teams for one university (used by its university admin dashboard). */
async function findByUniversityId(universityId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const [{ rows }, count] = await Promise.all([
    pool.query(
      `SELECT t.id, t.name, t.level, t.level_score, t.created_at,
              u.display_name AS leader_name, l.status AS leader_status,
              COUNT(tm.id)::integer AS member_count
       FROM teams t
       JOIN leaders l ON l.id = t.leader_id
       JOIN users u ON u.id = l.user_id
       LEFT JOIN team_members tm ON tm.team_id = t.id
       WHERE t.university_id = $1
       GROUP BY t.id, u.display_name, l.status
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [universityId, limit, offset]
    ),
    pool.query('SELECT COUNT(*)::integer AS total FROM teams WHERE university_id = $1', [universityId]),
  ]);
  return { rows, total: count.rows[0].total };
}

/** Get a team by its leader's leader_id. */
async function findByLeaderId(leaderId) {
  const { rows } = await pool.query(
    'SELECT * FROM teams WHERE leader_id = $1',
    [leaderId]
  );
  return rows[0] || null;
}

/** Update allowed team fields. */
async function update(client, id, fields) {
  const sets = [];
  const params = [];
  let idx = 0;

  if (fields.name !== undefined) {
    idx++; sets.push(`name = $${idx}`); params.push(fields.name);
  }
  if (fields.avatar_url !== undefined) {
    idx++; sets.push(`avatar_url = $${idx}`); params.push(fields.avatar_url);
  }
  if (!sets.length) return findById(id);

  sets.push('updated_at = NOW()');
  idx++; params.push(id);

  const { rows } = await client.query(
    `UPDATE teams SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return rows[0];
}

/* ── Member queries ── */

/** Get all members of a team, leader first. */
async function findMembers(teamId) {
  const { rows } = await pool.query(
    `SELECT * FROM team_members
     WHERE team_id = $1
     ORDER BY is_leader DESC, name`,
    [teamId]
  );
  return rows;
}

/** Get a single member by ID. */
async function findMemberById(memberId) {
  const { rows } = await pool.query(
    'SELECT * FROM team_members WHERE id = $1',
    [memberId]
  );
  return rows[0] || null;
}

/** Add a member to a team (inside a transaction). */
async function addMember(client, { teamId, universityId, name, email, enrollmentNumber, branch, year, speciality, interests, isLeader }) {
  const { rows } = await client.query(
    `INSERT INTO team_members
       (team_id, university_id, name, email, enrollment_number, branch, year, speciality, interests, is_leader)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [teamId, universityId, name, email || null, enrollmentNumber, branch, year,
     speciality || null, interests || null, isLeader || false]
  );
  return rows[0];
}

/** Update allowed member fields. */
async function updateMember(client, memberId, fields) {
  const allowed = ['name', 'email', 'enrollment_number', 'speciality', 'interests', 'branch', 'year'];
  const sets = [];
  const params = [];
  let idx = 0;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      idx++; sets.push(`${key} = $${idx}`); params.push(fields[key]);
    }
  }
  if (!sets.length) return findMemberById(memberId);

  sets.push('updated_at = NOW()');
  idx++; params.push(memberId);

  const { rows } = await client.query(
    `UPDATE team_members SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return rows[0];
}

/** Remove a member. */
async function removeMember(client, memberId) {
  await client.query('DELETE FROM team_members WHERE id = $1', [memberId]);
}

/**
 * Recalculate a team's level from average member credential scores.
 * Must be called inside a transaction.
 */
async function recalcLevel(client, teamId) {
  // Average of all members' credential_score
  const { rows } = await client.query(
    `SELECT COALESCE(AVG(credential_score), 0) AS avg_score
     FROM team_members WHERE team_id = $1`,
    [teamId]
  );
  const avgScore = parseFloat(rows[0].avg_score);
  const { level } = calculateLevel([avgScore], config.levels);

  await client.query(
    'UPDATE teams SET level = $1, level_score = $2, updated_at = NOW() WHERE id = $3',
    [level, avgScore.toFixed(2), teamId]
  );

  return { level, level_score: avgScore };
}

module.exports = {
  create, findById, findByLeaderId, findByUniversityId, update,
  findMembers, findMemberById, addMember, updateMember, removeMember,
  recalcLevel,
};
