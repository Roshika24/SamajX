/**
 * Auth module — database queries.
 *
 * Pure data access: no HTTP, no business logic.
 */

const pool = require('../../db/pool');

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return rows[0] || null;
}

async function findUserById(id) {
  const { rows } = await pool.query(
    `SELECT id, email, role, display_name, phone, email_verified,
            avatar_url, status, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function createUser({ email, passwordHash, role, displayName, phone }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, role, display_name, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, role, display_name, phone, email_verified, status, created_at`,
    [email.toLowerCase(), passwordHash, role, displayName, phone || null]
  );
  return rows[0];
}


/** Insert the company user and profile using the caller's transaction. */
async function createCompanyUserWithClient(client, { email, passwordHash, displayName, phone, company }) {
  const { rows: userRows } = await client.query(
    `INSERT INTO users (email, password_hash, role, display_name, phone)
     VALUES ($1, $2, 'company', $3, $4)
     RETURNING id, email, role, display_name, phone, email_verified, status, created_at`,
    [email, passwordHash, displayName, phone || null]
  );
  const user = userRows[0];
  const { rows: companyRows } = await client.query(
    `INSERT INTO companies (user_id, name, description, website, industry)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, name, description, website, industry, verified, created_at`,
    [user.id, company.name, company.description || null, company.website || null, company.industry || null]
  );
  return { user, company: companyRows[0] };
}

/** Create a company user and its profile atomically. */
async function createCompanyUser(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = await createCompanyUserWithClient(client, data);
    await client.query('COMMIT');
    return created;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
/**
 * Get role-specific profile data (university, leader, company) for a user.
 */
async function getRoleProfile(userId, role) {
  switch (role) {
    case 'university_admin': {
      const { rows } = await pool.query(
        `SELECT u.*, array_agg(json_build_object('id', d.id, 'domain_id', d.domain_id, 'name', d.name)) 
           FILTER (WHERE d.id IS NOT NULL) AS departments
         FROM universities u
         LEFT JOIN departments d ON d.university_id = u.id
         WHERE u.user_id = $1
         GROUP BY u.id`,
        [userId]
      );
      return rows[0] || null;
    }
    case 'leader': {
      const { rows } = await pool.query(
        `SELECT l.*, un.name AS university_name
         FROM leaders l
         JOIN universities un ON un.id = l.university_id
         WHERE l.user_id = $1`,
        [userId]
      );
      return rows[0] || null;
    }
    case 'company': {
      const { rows } = await pool.query(
        'SELECT * FROM companies WHERE user_id = $1',
        [userId]
      );
      return rows[0] || null;
    }
    default:
      return null;
  }
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  createCompanyUser,
  createCompanyUserWithClient,
  getRoleProfile,
};
