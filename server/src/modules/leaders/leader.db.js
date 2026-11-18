/**
 * Leaders module — database queries.
 */

const pool = require('../../db/pool');

/** Create a leader record inside a transaction. */
async function create(client, { userId, universityId, enrollmentNumber, branch, year }) {
  const { rows } = await client.query(
    `INSERT INTO leaders (user_id, university_id, enrollment_number, branch, year)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, universityId, enrollmentNumber, branch, year]
  );
  return rows[0];
}

/** Get a leader by ID with user and university info. */
async function findById(id) {
  const { rows } = await pool.query(
    `SELECT l.*, u.email, u.display_name, u.phone, u.status AS user_status,
            un.name AS university_name
     FROM leaders l
     JOIN users u ON u.id = l.user_id
     JOIN universities un ON un.id = l.university_id
     WHERE l.id = $1`,
    [id]
  );
  return rows[0] || null;
}

/** Get a leader by their user_id. */
async function findByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT l.*, un.name AS university_name, u.display_name, u.email, u.phone
     FROM leaders l
     JOIN users u ON u.id = l.user_id
     JOIN universities un ON un.id = l.university_id
     WHERE l.user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

/** Paginated list of leaders, filtered by university and/or status. */
async function findAll({ universityId, status, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];
  let idx = 0;

  if (universityId) {
    idx++; conditions.push(`l.university_id = $${idx}`); params.push(universityId);
  }
  if (status) {
    idx++; conditions.push(`l.status = $${idx}`); params.push(status);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (page - 1) * limit;

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM leaders l ${where}`, params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT l.*, u.email, u.display_name, u.phone,
            un.name AS university_name
     FROM leaders l
     JOIN users u ON u.id = l.user_id
     JOIN universities un ON un.id = l.university_id
     ${where}
     ORDER BY l.created_at DESC
     LIMIT $${idx + 1} OFFSET $${idx + 2}`,
    [...params, limit, offset]
  );

  return { rows, total };
}

module.exports = { create, findById, findByUserId, findAll };
