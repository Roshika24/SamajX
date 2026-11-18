/**
 * Teams module — business logic.
 *
 * Handles team creation, member management, and level recalculation.
 */

const pool = require('../../db/pool');
const teamDb = require('./team.db');
const leaderDb = require('../leaders/leader.db');
const { NotFoundError, ValidationError, ForbiddenError, ConflictError } = require('../../lib/errors');
const { rerouteOpenProblems } = require('../reports/problemRouting');

/** Lock the university and team rows, then re-check the leader relationship.
 * Serializing enrollment writes with promo-code signup prevents cross-table
 * duplicate enrollment races; re-checking ownership closes transfer races.
 */
async function assertEnrollmentAvailable(client, universityId, enrollmentNumber, { memberId = null, leaderId = null } = {}) {
  const { rows } = await client.query(
    `SELECT 1 FROM team_members
       WHERE university_id = $1 AND LOWER(enrollment_number) = LOWER($2) AND ($3::integer IS NULL OR id <> $3)
     UNION ALL
     SELECT 1 FROM leaders
       WHERE university_id = $1 AND LOWER(enrollment_number) = LOWER($2) AND ($4::integer IS NULL OR id <> $4)
     LIMIT 1`,
    [universityId, enrollmentNumber, memberId, leaderId]
  );
  if (rows.length) throw new ConflictError('This enrollment number is already registered at this university');
}

async function lockOwnedTeam(client, teamId, userId) {
  const { rows: identityRows } = await client.query(
    'SELECT university_id FROM teams WHERE id = $1', [teamId]
  );
  if (!identityRows.length) throw new NotFoundError('Team not found');
  await client.query('SELECT id FROM universities WHERE id = $1 FOR UPDATE', [identityRows[0].university_id]);
  const { rows } = await client.query(
    `SELECT t.*, l.user_id AS leader_user_id, l.status AS leader_status, u.status AS user_status
     FROM teams t JOIN leaders l ON l.id = t.leader_id JOIN users u ON u.id = l.user_id
     WHERE t.id = $1 FOR UPDATE OF t, l, u`, [teamId]
  );
  if (!rows.length) throw new NotFoundError('Team not found');
  if (rows[0].leader_user_id !== userId) throw new ForbiddenError('Only the current team leader can manage this team');
  if (rows[0].leader_status !== 'approved' || rows[0].user_status !== 'active') {
    throw new ForbiddenError('Only approved, active leaders can manage their team');
  }
  return rows[0];
}

/**
 * Create a team for an approved leader.
 * Auto-adds the leader as the first member (is_leader = true).
 */
async function create(userId, name) {
  const leader = await leaderDb.findByUserId(userId);
  if (!leader) throw new NotFoundError('Leader record not found');
  if (!leader.enrollment_number || !leader.branch || !leader.year) {
    throw new ValidationError('Complete your enrollment number, branch and year before creating a team');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Same lock used by promo-code signup and member enrollment writes.
    await client.query('SELECT id FROM universities WHERE id = $1 FOR UPDATE', [leader.university_id]);
    const { rows: lockedLeaderRows } = await client.query(
      `SELECT l.status, u.status AS user_status FROM leaders l
       JOIN users u ON u.id = l.user_id WHERE l.id = $1 FOR UPDATE OF l, u`, [leader.id]
    );
    if (!lockedLeaderRows.length) throw new NotFoundError('Leader record not found');
    if (lockedLeaderRows[0].status !== 'approved' || lockedLeaderRows[0].user_status !== 'active') {
      throw new ForbiddenError('Only approved, active leaders can create teams');
    }
    const { rows: existingTeams } = await client.query('SELECT id FROM teams WHERE leader_id = $1', [leader.id]);
    if (existingTeams.length) throw new ConflictError('You already have a team');
    await assertEnrollmentAvailable(client, leader.university_id, leader.enrollment_number, { leaderId: leader.id });

    const team = await teamDb.create(client, {
      name, leaderId: leader.id, universityId: leader.university_id,
    });
    const { rows: userRows } = await client.query(
      'SELECT display_name, email FROM users WHERE id = $1', [userId]
    );
    const user = userRows[0];
    await teamDb.addMember(client, {
      teamId: team.id, universityId: leader.university_id,
      name: user.display_name, email: user.email,
      enrollmentNumber: leader.enrollment_number, branch: leader.branch,
      year: leader.year, isLeader: true,
    });
    await rerouteOpenProblems(client);
    await client.query('COMMIT');
    return team;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') throw new ConflictError('This leader or enrollment number already belongs to a team');
    throw err;
  } finally { client.release(); }
}

/** Get team by ID with members and level info. */
async function getById(id) {
  const team = await teamDb.findById(id);
  if (!team) throw new NotFoundError('Team not found');

  const members = await teamDb.findMembers(id);
  return { ...team, members };
}

/** Update team details. Only the leader can update their own team. */
async function update(teamId, userId, fields) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockOwnedTeam(client, teamId, userId);
    const updated = await teamDb.update(client, teamId, fields);
    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}

/** Add a member to a team. Enforces enrollment uniqueness per university. */
async function addMember(teamId, userId, memberData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const team = await lockOwnedTeam(client, teamId, userId);
    await assertEnrollmentAvailable(client, team.university_id, memberData.enrollment_number);

    const member = await teamDb.addMember(client, {
      teamId,
      universityId: team.university_id,
      name: memberData.name,
      email: memberData.email,
      enrollmentNumber: memberData.enrollment_number,
      branch: memberData.branch,
      year: memberData.year,
      speciality: memberData.speciality,
      interests: memberData.interests,
      isLeader: false,
    });

    // Recalculate team level after adding a member
    await teamDb.recalcLevel(client, teamId);
    await rerouteOpenProblems(client);

    await client.query('COMMIT');
    return member;
  } catch (err) {
    await client.query('ROLLBACK');
    // Handle unique constraint on (university_id, enrollment_number)
    if (err.code === '23505' && err.constraint?.includes('enrollment')) {
      throw new ConflictError('This enrollment number is already in use at this university');
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Update a member's info. */
async function updateMember(teamId, userId, memberId, fields) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const team = await lockOwnedTeam(client, teamId, userId);
    const member = await teamDb.findMemberById(memberId);
    if (!member || member.team_id !== teamId) throw new NotFoundError('Member not found in this team');
    if (fields.enrollment_number !== undefined) {
      await assertEnrollmentAvailable(client, team.university_id, fields.enrollment_number, {
        memberId, leaderId: member.is_leader ? team.leader_id : null,
      });
    }

    const updated = await teamDb.updateMember(client, memberId, fields);
    await rerouteOpenProblems(client);
    if (member.is_leader && fields.enrollment_number !== undefined) {
      await client.query(
        'UPDATE leaders SET enrollment_number = $1, updated_at = NOW() WHERE id = $2',
        [fields.enrollment_number, team.leader_id]
      );
    }
    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') throw new ConflictError('This enrollment number is already in use at this university');
    throw err;
  } finally { client.release(); }
}

/** Remove a member. Cannot remove the leader member. */
async function removeMember(teamId, userId, memberId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockOwnedTeam(client, teamId, userId);
    const member = await teamDb.findMemberById(memberId);
    if (!member || member.team_id !== teamId) throw new NotFoundError('Member not found in this team');
    if (member.is_leader) throw new ValidationError('Cannot remove the team leader from the team');

    await teamDb.removeMember(client, memberId);
    await teamDb.recalcLevel(client, teamId);
    await rerouteOpenProblems(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}

/** Get all members of a team. */
async function getMembers(teamId) {
  return teamDb.findMembers(teamId);
}

module.exports = { create, getById, update, addMember, updateMember, removeMember, getMembers };
