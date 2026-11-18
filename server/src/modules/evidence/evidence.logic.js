/**
 * Evidence module — business logic.
 *
 * Handles adding, verifying, rejecting, and removing member evidence.
 * Verification triggers score + level recalculation.
 */

const pool = require('../../db/pool');
const evidenceDb = require('./evidence.db');
const teamDb = require('../teams/team.db');
const leaderDb = require('../leaders/leader.db');
const uniDb = require('../universities/uni.db');
const audit = require('../../lib/auditLog');
const config = require('../../config');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../lib/errors');

/** Valid evidence types matching the DB enum. */
const VALID_TYPES = Object.keys(config.evidencePoints);

/**
 * Add evidence for a team member.
 * The requesting leader must own the member's team.
 */
async function addEvidence(memberId, userId, data) {
  // Validate evidence type
  if (!VALID_TYPES.includes(data.type)) {
    throw new ValidationError(`Invalid evidence type: ${data.type}`);
  }

  // Get the member and verify ownership
  const member = await teamDb.findMemberById(memberId);
  if (!member) throw new NotFoundError('Member not found');

  const leader = await leaderDb.findByUserId(userId);
  if (!leader || leader.status !== 'approved') throw new ForbiddenError('An approved leader account is required');

  const team = await teamDb.findByLeaderId(leader.id);
  if (!team || team.id !== member.team_id) {
    throw new ForbiddenError('This member is not in your team');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const evidence = await evidenceDb.create(client, {
      memberId,
      type: data.type,
      title: data.title,
      description: data.description,
      link: data.link,
      facultyName: data.faculty_name,
    });
    await client.query('COMMIT');
    return evidence;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Get all evidence for a member. */
async function getByMember(memberId) {
  return evidenceDb.findByMember(memberId);
}

/**
 * University admin verifies evidence.
 * Assigns points based on evidence type, recalculates member score and team level.
 */
async function verify(evidenceId, adminUserId, req) {
  const evidence = await evidenceDb.findById(evidenceId);
  if (!evidence) throw new NotFoundError('Evidence not found');
  if (evidence.verified) throw new ValidationError('Evidence is already verified');
  const adminUniversity = await uniDb.findByUserId(adminUserId);
  if (!adminUniversity || adminUniversity.id !== evidence.university_id) {
    throw new ForbiddenError('You can only verify evidence from your own university');
  }

  // Look up point value from config
  const points = config.evidencePoints[evidence.type] || 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify the evidence and assign points
    const updated = await evidenceDb.verify(client, evidenceId, adminUserId, points);
    if (!updated) throw new ValidationError('Evidence was already verified by another admin');

    // Recalculate the member's credential_score
    await evidenceDb.recalcMemberScore(client, evidence.member_id);

    // Recalculate the team's level
    await teamDb.recalcLevel(client, evidence.team_id);

    // Audit log
    await audit.logTx(client, req, 'verify_evidence', 'member_evidence', evidenceId, {
      member_id: evidence.member_id,
      type: evidence.type,
      points,
    });

    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * University admin rejects evidence (deletes it).
 */
async function reject(evidenceId, adminUserId, req) {
  const evidence = await evidenceDb.findById(evidenceId);
  if (!evidence) throw new NotFoundError('Evidence not found');
  if (evidence.verified) throw new ValidationError('Cannot reject already verified evidence');
  const adminUniversity = await uniDb.findByUserId(adminUserId);
  if (!adminUniversity || adminUniversity.id !== evidence.university_id) {
    throw new ForbiddenError('You can only reject evidence from your own university');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      'DELETE FROM member_evidence WHERE id = $1 AND verified = FALSE', [evidenceId]
    );
    if (!rowCount) throw new NotFoundError('Evidence not found or already verified');
    await audit.logTx(client, req, 'reject_evidence', 'member_evidence', evidenceId, {
      member_id: evidence.member_id, type: evidence.type, title: evidence.title,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}

/**
 * Leader removes their own team member's evidence (only if unverified).
 */
async function remove(evidenceId, userId) {
  const evidence = await evidenceDb.findById(evidenceId);
  if (!evidence) throw new NotFoundError('Evidence not found');

  // Verify the leader owns the member's team
  const leader = await leaderDb.findByUserId(userId);
  if (!leader) throw new ForbiddenError('Leader record not found');

  const team = await teamDb.findByLeaderId(leader.id);
  if (!team || team.id !== evidence.team_id) {
    throw new ForbiddenError('This evidence is not for a member of your team');
  }

  const removed = await evidenceDb.remove(evidenceId);
  if (!removed) throw new ValidationError('Cannot delete verified evidence');
}

/** Paginated queue of pending evidence for a university. */
async function getPendingForUniversity(universityId, page, limit) {
  return evidenceDb.findPendingByUniversity(universityId, page, limit);
}

module.exports = { addEvidence, getByMember, verify, reject, remove, getPendingForUniversity };
