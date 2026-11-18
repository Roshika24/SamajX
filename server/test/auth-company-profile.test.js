const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

// A deterministic pg Pool/client double exercises the real transaction wrapper.
let fakePool;
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'pg') {
    return { Pool: class FakePool { constructor() { fakePool = this; } on() {} } };
  }
  if (request === 'dotenv') return { config() {} };
  return originalLoad.call(this, request, parent, isMain);
};
let authDb;
try {
  authDb = require('../src/modules/auth/auth.db');
} finally {
  Module._load = originalLoad;
}

function makeClient({ failCompanyInsert = false } = {}) {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes('INSERT INTO users')) return { rows: [{ id: 42, email: 'team@example.com', role: 'company' }] };
      if (sql.includes('INSERT INTO companies')) {
        if (failCompanyInsert) throw Object.assign(new Error('profile constraint failed'), { code: '23514' });
        return { rows: [{ id: 9, user_id: 42, name: 'Civic Labs', verified: false }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
    release() { released = true; },
  };
  return { client, calls, wasReleased: () => released };
}

const registration = {
  email: 'team@example.com', passwordHash: 'hash', displayName: 'Civic Labs',
  company: { name: 'Civic Labs', description: 'Building civic tools', website: 'https://example.com', industry: 'Technology' },
};

test('company user and company profile are created and committed in one transaction', async () => {
  const fake = makeClient();
  fakePool.connect = async () => fake.client;

  const result = await authDb.createCompanyUser(registration);

  assert.equal(result.user.id, 42);
  assert.equal(result.company.user_id, result.user.id);
  assert.deepEqual(fake.calls.map(call => call.sql), [
    'BEGIN',
    fake.calls[1].sql,
    fake.calls[2].sql,
    'COMMIT',
  ]);
  assert.match(fake.calls[1].sql, /INSERT INTO users/);
  assert.match(fake.calls[2].sql, /INSERT INTO companies/);
  assert.deepEqual(fake.calls[2].params, [42, 'Civic Labs', 'Building civic tools', 'https://example.com', 'Technology']);
  assert.equal(fake.wasReleased(), true);
});

test('company profile failure rolls back the user insert and releases the connection', async () => {
  const fake = makeClient({ failCompanyInsert: true });
  fakePool.connect = async () => fake.client;

  await assert.rejects(authDb.createCompanyUser(registration), /profile constraint failed/);
  assert.deepEqual(fake.calls.map(call => call.sql), [
    'BEGIN',
    fake.calls[1].sql,
    fake.calls[2].sql,
    'ROLLBACK',
  ]);
  assert.match(fake.calls[1].sql, /INSERT INTO users/);
  assert.match(fake.calls[2].sql, /INSERT INTO companies/);
  assert.equal(fake.wasReleased(), true);
});
