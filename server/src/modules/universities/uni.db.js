/**
 * Universities module — database queries.
 *
 * Handles university CRUD, promo codes, and departments.
 */

const crypto = require('crypto');
const pool = require('../../db/pool');

/**
 * Create a university record inside an existing transaction.
 * @param {import('pg').PoolClient} client
 */
async function create(client, { userId, name, address, city, state, country, lat, lng, website }) {
  const { rows } = await client.query(
    `INSERT INTO universities (user_id, name, address, city, state, country, lat, lng, website)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [userId, name, address, city, state, country || 'India', lat, lng, website || null]
  );
  return rows[0];
}

/** Get a university by ID, with aggregated departments. */
async function findById(id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.address, u.city, u.state, u.country, u.lat, u.lng,
            u.website, u.logo_url, u.verified, u.verified_at, u.created_at,
            COALESCE(
              json_agg(json_build_object('id', d.id, 'domain_id', d.domain_id, 'name', d.name,
                                        'domain_slug', dom.slug, 'domain_name', dom.name))
                FILTER (WHERE d.id IS NOT NULL), '[]'
            ) AS departments
     FROM universities u
     LEFT JOIN departments d ON d.university_id = u.id
     LEFT JOIN domains dom ON dom.id = d.domain_id
     WHERE u.id = $1 GROUP BY u.id`, [id]
  );
  return rows[0] || null;
}

/** Get a university by its user_id. */
async function findByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM universities WHERE user_id = $1',
    [userId]
  );
  return rows[0] || null;
}

/** Paginated list of universities, optionally filtered by verified status. */
async function findAll({ verified, page = 1, limit = 20 }) {
  const where = verified !== undefined ? 'WHERE u.verified = $1' : '';
  const params = verified !== undefined ? [verified] : [];
  const offset = (page - 1) * limit;

  const countRes = await pool.query(
    `SELECT COUNT(*) FROM universities u ${where}`, params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  const idx = params.length;
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.city, u.state, u.country, u.verified, u.created_at,
            u.website, u.logo_url
     FROM universities u ${where}
     ORDER BY u.created_at DESC
     LIMIT $${idx + 1} OFFSET $${idx + 2}`,
    [...params, limit, offset]
  );

  return { rows, total };
}

/** Mark a university as verified (inside a transaction). */
async function verify(client, id, verifiedBy) {
  const { rows } = await client.query(
    `UPDATE universities
     SET verified = TRUE, verified_at = NOW(), verified_by = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, verifiedBy]
  );
  return rows[0];
}

/**
 * Generate a new promo code for a university.
 * Format: 16-character uppercase hexadecimal code (64 bits of entropy).
 */
async function generatePromoCode(client, id, expiresInDays, joinLimit) {
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const attempts = require('../../config').promoCode.generationAttempts;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const code = crypto.randomBytes(require('../../config').promoCode.codeBytes).toString('hex').toUpperCase();
    await client.query('SAVEPOINT promo_code_generation');
    try {
      const { rows } = await client.query(
        `UPDATE universities
         SET promo_code = $2, promo_code_expires_at = $3, promo_code_join_limit = $4,
             promo_code_join_count = 0, promo_code_active = TRUE, updated_at = NOW()
         WHERE id = $1
         RETURNING promo_code, promo_code_expires_at, promo_code_join_limit, promo_code_join_count, promo_code_active`,
        [id, code, expiresAt, joinLimit]
      );
      await client.query('RELEASE SAVEPOINT promo_code_generation');
      if (!rows[0]) throw new Error('University not found');
      return rows[0];
    } catch (err) {
      await client.query('ROLLBACK TO SAVEPOINT promo_code_generation');
      await client.query('RELEASE SAVEPOINT promo_code_generation');
      if (err.code !== '23505') throw err;
    }
  }
  throw new Error('Could not generate a unique promo code after several attempts');
}

/** Deactivate the current promo code. */
async function revokePromoCode(client, id) {
  await client.query(
    `UPDATE universities SET promo_code_active = FALSE, updated_at = NOW() WHERE id = $1`,
    [id]
  );
}

/**
 * Look up a university by its promo code.
 * Returns null if code is invalid, expired, inactive, or full.
 */
async function findByPromoCode(code) {
  const { rows } = await pool.query(
    `SELECT * FROM universities
     WHERE promo_code = $1
       AND promo_code_active = TRUE
       AND verified = TRUE
       AND (promo_code_expires_at IS NULL OR promo_code_expires_at > NOW())
       AND promo_code_join_count < promo_code_join_limit`,
    [code.toUpperCase()]
  );
  return rows[0] || null;
}


/** Lock and validate a promo code inside a registration transaction. */
async function lockValidPromoCode(client, code) {
  const { rows } = await client.query(
    `SELECT id, verified FROM universities
     WHERE promo_code = $1 AND promo_code_active = TRUE AND verified = TRUE
       AND (promo_code_expires_at IS NULL OR promo_code_expires_at > NOW())
       AND promo_code_join_count < promo_code_join_limit
     FOR UPDATE`, [String(code).trim().toUpperCase()]
  );
  return rows[0] || null;
}

/** Increment only after the locked promo code was validated. */
async function incrementPromoCodeCount(client, id) {
  const { rowCount } = await client.query(
    `UPDATE universities SET promo_code_join_count = promo_code_join_count + 1, updated_at = NOW()
     WHERE id = $1 AND promo_code_active = TRUE
       AND (promo_code_expires_at IS NULL OR promo_code_expires_at > NOW())
       AND promo_code_join_count < promo_code_join_limit`, [id]
  );
  return rowCount === 1;
}


/* ── Department helpers ── */

async function addDepartment(client, { universityId, domainId, name }) {
  const { rows } = await client.query(
    `INSERT INTO departments (university_id, domain_id, name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [universityId, domainId, name]
  );
  return rows[0];
}

async function removeDepartment(client, universityId, deptId) {
  const { rowCount } = await client.query(
    'DELETE FROM departments WHERE id = $1 AND university_id = $2',
    [deptId, universityId]
  );
  return rowCount > 0;
}

async function findDepartments(universityId) {
  const { rows } = await pool.query(
    `SELECT d.id, d.domain_id, d.name, dom.slug AS domain_slug, dom.name AS domain_name
     FROM departments d
     JOIN domains dom ON dom.id = d.domain_id
     WHERE d.university_id = $1
     ORDER BY d.name`,
    [universityId]
  );
  return rows;
}

module.exports = {
  create, findById, findByUserId, findAll,
  verify, generatePromoCode, revokePromoCode,
  findByPromoCode, lockValidPromoCode, incrementPromoCodeCount,
  addDepartment, removeDepartment, findDepartments,
};
