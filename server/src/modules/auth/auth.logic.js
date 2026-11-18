/**
 * Auth module — business logic.
 *
 * Orchestrates DB calls, hashing, and token generation.
 * No direct HTTP access — receives data, returns data or throws.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const authDb = require('./auth.db');
const authPolicy = require('./auth.policy');
const uniLogic = require('../universities/uni.logic');
const { ConflictError, UnauthorizedError, ValidationError } = require('../../lib/errors');

const SALT_ROUNDS = 12;

/**
 * Register a new user.
 * @returns {{ user: object, token: string }}
 */
async function register({ email, password, role, displayName, phone, university, company }) {
  // Check for existing user
  const existing = await authDb.findUserByEmail(email);
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  // Only allow self-registration for these roles
  if (!authPolicy.isSelfRegisterRole(role)) {
    throw new ValidationError(`Cannot self-register as ${role}`);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  let user;
  let universityResult = null;
  let companyResult = null;
  try {
    if (role === 'university_admin') {
      if (!university) throw new ValidationError('University details are required');
      const created = await uniLogic.registerWithUser(
        { email, passwordHash, displayName, phone },
        university,
        university.departments || []
      );
      user = created.user;
      universityResult = created.university;
    } else if (role === 'company') {
      if (!company) throw new ValidationError('Company details are required');
      const created = await authDb.createCompanyUser({ email, passwordHash, displayName, phone, company });
      user = created.user;
      companyResult = created.company;
    } else {
      user = await authDb.createUser({ email, passwordHash, role, displayName, phone });
    }
  } catch (err) {
    if (err.code === '23505') throw new ConflictError('An account or university with these details already exists');
    throw err;
  }

  const token = signToken(user);
  return { user, token, university: universityResult, company: companyResult };
}

/**
 * Login with email + password.
 * @returns {{ user: object, token: string }}
 */
async function login({ email, password }) {
  const user = await authDb.findUserByEmail(email);
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Pending leaders may sign in to view their approval status, but a leader
  // account without a valid leader profile must never receive a session.
  const leaderProfile = user.role === 'leader'
    ? await authDb.getRoleProfile(user.id, 'leader')
    : null;
  if (!authPolicy.canLogin(user, leaderProfile)) {
    throw new UnauthorizedError('This account is inactive or not eligible to sign in');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Don't send password_hash to the client
  const { password_hash, ...safeUser } = user;
  const token = signToken(safeUser);
  return { user: safeUser, token };
}

/**
 * Get current user profile with role-specific data.
 */
async function getProfile(userId) {
  const user = await authDb.findUserById(userId);
  if (!user) return null;

  const roleProfile = await authDb.getRoleProfile(userId, user.role);
  const profileKey = { leader: 'leader', university_admin: 'university', company: 'company' }[user.role];
  return { user, roleProfile, ...(profileKey && roleProfile ? { [profileKey]: roleProfile } : {}) };
}

/**
 * Sign a JWT with the user's id, email, and role.
 */
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

module.exports = { register, login, getProfile };
