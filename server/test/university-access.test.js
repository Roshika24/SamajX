const test = require('node:test');
const assert = require('node:assert/strict');
const { canViewUniversity } = require('../src/modules/universities/uni.access');

const verified = { id: 5, verified: true };
const unverified = { id: 5, verified: false };

test('verified universities are visible to authenticated roles', () => {
  for (const role of ['citizen', 'leader', 'university_admin', 'company', 'platform_admin']) {
    assert.equal(canViewUniversity({ role, id: 100 }, verified), true);
  }
});

test('unverified universities are visible only to Platform Admin and their own University Admin', () => {
  assert.equal(canViewUniversity({ role: 'platform_admin', id: 1 }, unverified), true);
  assert.equal(canViewUniversity({ role: 'university_admin', id: 20 }, unverified, 5), true);
  for (const role of ['citizen', 'leader', 'company']) {
    assert.equal(canViewUniversity({ role, id: 20 }, unverified), false);
  }
  assert.equal(canViewUniversity({ role: 'university_admin', id: 20 }, unverified, 6), false);
});

test('missing actor or university never grants visibility', () => {
  assert.equal(canViewUniversity(null, verified), false);
  assert.equal(canViewUniversity({ role: 'platform_admin' }, null), false);
});
