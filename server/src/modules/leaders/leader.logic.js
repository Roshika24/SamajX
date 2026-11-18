/**
 * Leaders module — business logic.
 *
 * Handles leader approval, rejection, suspension, and transfer.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const uniDb = require('../universities/uni.db');
const { ConflictError, UnauthorizedError } = require('../../lib/errors');
const pool = require('../../db/pool');
const leaderDb = require('./leader.db');
const stateMachine = require('../../lib/stateMachine');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../lib/errors');

const SALT_ROUNDS = 12;


/** Register a leader with a verified university promo code in one transaction. */
async function register({ email, password, displayName, phone, promoCode, enrollmentNumber, branch, year }) {
  email = email.trim().toLowerCase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const university = await uniDb.lockValidPromoCode(client, promoCode);
    if (!university) throw new UnauthorizedError('Promo code is invalid, expired, revoked, or has reached its join limit');

    const { rows: existing } = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.length) throw new ConflictError('An account with this email already exists');
    const { rows: enrollmentTaken } = await client.query(
      `SELECT 1 FROM team_members WHERE university_id = $1 AND LOWER(enrollment_number) = LOWER($2)
       UNION ALL
       SELECT 1 FROM leaders WHERE university_id = $1 AND LOWER(enrollment_number) = LOWER($2)
       LIMIT 1`, [university.id, enrollmentNumber]
    );
    if (enrollmentTaken.length) throw new ConflictError('This enrollment number is already registered at this university');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows: userRows } = await client.query(
      `INSERT INTO users (email, password_hash, role, display_name, phone)
       VALUES ($1, $2, 'leader', $3, $4)
       RETURNING id, email, role, display_name, phone, status, created_at`,
      [email.toLowerCase(), passwordHash, displayName, phone || null]
    );
    const user = userRows[0];
    const leader = await leaderDb.create(client, {
      userId: user.id, universityId: university.id, enrollmentNumber, branch, year,
    });
    const incremented = await uniDb.incrementPromoCodeCount(client, university.id);
    if (!incremented) throw new UnauthorizedError('Promo code is no longer available');

    await client.query('COMMIT');
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    return { user, leader: { ...leader, university_name: undefined }, token };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') throw new ConflictError('Email or enrollment number is already registered');
    throw err;
  } finally { client.release(); }
}

/** Approve a pending leader. */
async function approve(leaderId, adminUserId, req) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await stateMachine.transitionTx(client, 'leader', leaderId, 'approved', 'university_admin', req);
    await client.query(
      "UPDATE users SET status = 'active', updated_at = NOW() WHERE id = (SELECT user_id FROM leaders WHERE id = $1)", [leaderId]
    );
    await client.query(
      'UPDATE leaders SET approved_at = NOW(), approved_by = $2, updated_at = NOW() WHERE id = $1',
      [leaderId, adminUserId]
    );

    await client.query('COMMIT');
    return leaderDb.findById(leaderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Reject a pending leader. */
async function reject(leaderId, reason, req) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await stateMachine.transitionTx(client, 'leader', leaderId, 'rejected', 'university_admin', req, { reason: reason || null });
    await client.query(
      "UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = (SELECT user_id FROM leaders WHERE id = $1)", [leaderId]
    );
    await client.query('COMMIT');
    return leaderDb.findById(leaderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Suspend an approved leader. Also suspends their user account. */
async function suspend(leaderId, reason, actorRole, req) {
  const leader = await leaderDb.findById(leaderId);
  if (!leader) throw new NotFoundError('Leader not found');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await stateMachine.transitionTx(client, 'leader', leaderId, 'suspended', actorRole, req, { reason });
    // Also suspend the user account so they can't log in
    await client.query(
      "UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = $1",
      [leader.user_id]
    );
    await client.query('COMMIT');
    return leaderDb.findById(leaderId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Get a leader by ID with user info. */
async function getById(id) {
  const leader = await leaderDb.findById(id);
  if (!leader) throw new NotFoundError('Leader not found');
  return leader;
}

/** Paginated list of leaders. */
async function list(filters) {
  return leaderDb.findAll(filters);
}

/**
 * Transfer leadership to another team member.
 *
 * 1. Create a new user account for the new leader
 * 2. Create a new leader record (approved)
 * 3. Update team.leader_id
 * 4. Swap is_leader flags on member records
 * 5. Suspend the old leader's user account
 */
async function transfer(leaderId, newLeaderMemberId, newLeaderEmail, newLeaderPassword, req) {
  const oldLeader = await leaderDb.findById(leaderId);
  if (!oldLeader) throw new NotFoundError('Leader not found');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the team
    const { rows: teamRows } = await client.query(
      'SELECT * FROM teams WHERE leader_id = $1', [leaderId]
    );
    if (!teamRows.length) throw new ValidationError('Leader has no team');
    const team = teamRows[0];

    // Get the target member
    const { rows: memberRows } = await client.query(
      'SELECT * FROM team_members WHERE id = $1 AND team_id = $2',
      [newLeaderMemberId, team.id]
    );
    if (!memberRows.length) throw new NotFoundError('Member not found in this team');
    const targetMember = memberRows[0];
    if (targetMember.is_leader) throw new ValidationError('This member is already the leader');

    // Release the outgoing leader's profile enrollment so the incoming leader
    // can take the member's existing university-unique enrollment number.
    await client.query('UPDATE leaders SET enrollment_number = NULL WHERE id = $1', [leaderId]);

    // Create new user account
    const passwordHash = await bcrypt.hash(newLeaderPassword, SALT_ROUNDS);
    const { rows: newUserRows } = await client.query(
      `INSERT INTO users (email, password_hash, role, display_name, phone)
       VALUES ($1, $2, 'leader', $3, $4)
       RETURNING id, email, role, display_name, status, created_at`,
      [newLeaderEmail.toLowerCase(), passwordHash, targetMember.name, null]
    );
    const newUser = newUserRows[0];

    // Create the new leader as pending, then use the central state machine
    // to approve the transfer in this same transaction.
    const { rows: newLeaderRows } = await client.query(
      `INSERT INTO leaders (user_id, university_id, enrollment_number, branch, year)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [newUser.id, oldLeader.university_id, targetMember.enrollment_number, targetMember.branch, targetMember.year]
    );
    const newLeader = newLeaderRows[0];
    await stateMachine.transitionTx(client, 'leader', newLeader.id, 'approved', 'university_admin', req, { transferred_from: leaderId });
    await client.query(
      'UPDATE leaders SET approved_at = NOW(), approved_by = $2 WHERE id = $1',
      [newLeader.id, req.user.id]
    );

    // Update team's leader_id
    await client.query(
      'UPDATE teams SET leader_id = $1, updated_at = NOW() WHERE id = $2',
      [newLeader.id, team.id]
    );

    // Swap is_leader flags
    await client.query(
      'UPDATE team_members SET is_leader = FALSE WHERE team_id = $1 AND is_leader = TRUE',
      [team.id]
    );
    await client.query(
      'UPDATE team_members SET is_leader = TRUE WHERE id = $1',
      [newLeaderMemberId]
    );

    // Suspend the outgoing leader through the same central state machine.
    await stateMachine.transitionTx(client, 'leader', leaderId, 'suspended', 'university_admin', req, { transferred_to: newLeader.id });
    await client.query(
      "UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = $1",
      [oldLeader.user_id]
    );

    await client.query('COMMIT');
    return { oldLeader: await leaderDb.findById(leaderId), newLeader: await leaderDb.findById(newLeader.id) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { register, approve, reject, suspend, getById, list, transfer };
