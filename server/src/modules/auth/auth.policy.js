/** Pure account-state policy shared by login and cookie-session restoration. */
const SELF_REGISTER_ROLES = Object.freeze(['citizen', 'university_admin', 'company']);
const VALID_LEADER_STATES = Object.freeze(['pending', 'approved']);

function canRestoreSession(account) {
  if (!account || account.status !== 'active') return false;
  if (account.role === 'leader') return VALID_LEADER_STATES.includes(account.leader_status);
  return true;
}

function canLogin(user, leaderProfile) {
  if (!user || user.status !== 'active') return false;
  if (user.role === 'leader') return Boolean(leaderProfile && VALID_LEADER_STATES.includes(leaderProfile.status));
  return true;
}

function isSelfRegisterRole(role) {
  return SELF_REGISTER_ROLES.includes(role);
}

module.exports = { SELF_REGISTER_ROLES, VALID_LEADER_STATES, canRestoreSession, canLogin, isSelfRegisterRole };
