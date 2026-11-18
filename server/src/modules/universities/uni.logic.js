/**
 * Universities module — business logic.
 *
 * Orchestrates DB calls, transactions, and audit logging.
 */

const pool = require('../../db/pool');
const uniDb = require('./uni.db');
const domainDb = require('../domains/domain.db');
const authDb = require('../auth/auth.db');
const audit = require('../../lib/auditLog');
const config = require('../../config');
const { NotFoundError, ValidationError, ForbiddenError, ConflictError } = require('../../lib/errors');
const { rerouteOpenProblems } = require('../reports/problemRouting');

/**
 * Register a university along with its admin user account.
 * Called from auth.logic when role === 'university_admin'.
 *
 * @param {object} userData    - { email, passwordHash, displayName, phone }
 * @param {object} uniData    - { name, address, city, state, country, lat, lng, website }
 * @param {Array}  departments - [{ domain_slug, name }]
 * @returns {{ user, university }}
 */
async function registerWithUser(userData, uniData, departments = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create the user
    const { rows: userRows } = await client.query(
      `INSERT INTO users (email, password_hash, role, display_name, phone)
       VALUES ($1, $2, 'university_admin', $3, $4)
       RETURNING id, email, role, display_name, phone, status, created_at`,
      [userData.email.toLowerCase(), userData.passwordHash, userData.displayName, userData.phone || null]
    );
    const user = userRows[0];

    // 2. Create the university
    const university = await uniDb.create(client, { userId: user.id, ...uniData });

    // 3. Add departments (look up domain by slug)
    for (const dept of departments) {
      const domain = await domainDb.findBySlug(dept.domain_slug);
      if (!domain) {
        throw new ValidationError(`Unknown domain slug: ${dept.domain_slug}`);
      }
      await uniDb.addDepartment(client, {
        universityId: university.id,
        domainId: domain.id,
        name: dept.name,
      });
    }

    // 4. Generate initial promo code
    const promoInfo = await uniDb.generatePromoCode(
      client,
      university.id,
      config.promoCode.defaultExpiryDays,
      config.promoCode.defaultJoinLimit
    );

    await client.query('COMMIT');

    return { user, university: { ...university, ...promoInfo } };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Get a single university by ID with departments. */
async function getById(id) {
  const uni = await uniDb.findById(id);
  if (!uni) throw new NotFoundError('University not found');
  return uni;
}

/** Paginated list. Platform admin sees all; others see verified only. */
async function list({ verified, page, limit }) {
  return uniDb.findAll({ verified, page, limit });
}

/** Platform admin verifies a university. */
async function verify(universityId, adminUserId, req) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const uni = await uniDb.verify(client, universityId, adminUserId);
    if (!uni) throw new NotFoundError('University not found');

    await audit.logTx(client, req, 'verify_university', 'university', universityId, {});
    await rerouteOpenProblems(client);
    await client.query('COMMIT');
    return await uniDb.findById(universityId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** University admin regenerates their promo code. */
async function regeneratePromoCode(universityId, expiresInDays, joinLimit, req) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const promoInfo = await uniDb.generatePromoCode(client, universityId, expiresInDays, joinLimit);
    await audit.logTx(client, req, 'regenerate_promo_code', 'university', universityId, {
      promo_code_regenerated: true,
    });

    await client.query('COMMIT');
    return promoInfo;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** University admin revokes their promo code. */
async function revokePromoCode(universityId, req) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await uniDb.revokePromoCode(client, universityId);
    await audit.logTx(client, req, 'revoke_promo_code', 'university', universityId, {});
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Add a department to a university. Resolves domain slug → id. */
async function addDepartment(universityId, domainSlug, name, req) {
  const domain = await domainDb.findBySlug(domainSlug);
  if (!domain) throw new ValidationError(`Unknown domain: ${domainSlug}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dept = await uniDb.addDepartment(client, {
      universityId,
      domainId: domain.id,
      name,
    });
    if (req) await audit.logTx(client, req, 'add_university_department', 'department', dept.id, { university_id: universityId, domain_slug: domainSlug, name });
    await rerouteOpenProblems(client);
    await client.query('COMMIT');
    return dept;
  } catch (err) {
    await client.query('ROLLBACK');
    // Handle unique constraint violation (duplicate domain for this uni)
    if (err.code === '23505') {
      throw new ConflictError('This department domain already exists for this university');
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Remove a department. */
async function removeDepartment(universityId, deptId, req) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const removed = await uniDb.removeDepartment(client, universityId, deptId);
    if (!removed) throw new NotFoundError('Department not found');
    if (req) await audit.logTx(client, req, 'remove_university_department', 'department', deptId, { university_id: universityId });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** List departments for a university. */
async function getDepartments(universityId) {
  return uniDb.findDepartments(universityId);
}

module.exports = {
  registerWithUser, getById, list, verify,
  regeneratePromoCode, revokePromoCode,
  addDepartment, removeDepartment, getDepartments,
};
