const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../src/modules/auth/auth.policy');

test('only citizen, university admin and company can self-register', () => {
  for (const role of ['citizen', 'university_admin', 'company']) assert.equal(policy.isSelfRegisterRole(role), true);
  for (const role of ['leader', 'platform_admin', 'student', 'unknown']) assert.equal(policy.isSelfRegisterRole(role), false);
});

test('pending and approved leaders may log in; invalid or missing leader profiles may not', () => {
  const user = { role: 'leader', status: 'active' };
  assert.equal(policy.canLogin(user, { status: 'pending' }), true);
  assert.equal(policy.canLogin(user, { status: 'approved' }), true);
  assert.equal(policy.canLogin(user, { status: 'rejected' }), false);
  assert.equal(policy.canLogin(user, { status: 'suspended' }), false);
  assert.equal(policy.canLogin(user, null), false);
});

test('session restoration trusts current database status and rejects orphaned leader accounts', () => {
  assert.equal(policy.canRestoreSession({ role: 'leader', status: 'active', leader_status: 'pending' }), true);
  assert.equal(policy.canRestoreSession({ role: 'leader', status: 'active', leader_status: 'approved' }), true);
  assert.equal(policy.canRestoreSession({ role: 'leader', status: 'active', leader_status: null }), false);
  assert.equal(policy.canRestoreSession({ role: 'leader', status: 'suspended', leader_status: 'approved' }), false);
  assert.equal(policy.canRestoreSession({ role: 'citizen', status: 'active' }), true);
  assert.equal(policy.canRestoreSession({ role: 'citizen', status: 'banned' }), false);
});
