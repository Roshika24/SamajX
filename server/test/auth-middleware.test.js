const test = require('node:test');
const assert = require('node:assert/strict');
const { createVerifyToken } = require('../src/middleware/auth');

function makeMiddleware({ token = 'valid-token', jwtError = null, queryError = null, rows = [{
  id: 7, email: 'company@example.test', role: 'company', status: 'active', leader_status: null,
}] } = {}) {
  const calls = { next: [], query: 0 };
  const middleware = createVerifyToken({
    jwt: {
      verify(value, secret) {
        assert.equal(value, token);
        assert.equal(secret, 'test-secret');
        if (jwtError) throw jwtError;
        return { id: 7 };
      },
    },
    config: { jwt: { cookieName: 'token', secret: 'test-secret' } },
    pool: {
      async query() {
        calls.query += 1;
        if (queryError) throw queryError;
        return { rows };
      },
    },
    authPolicy: { canRestoreSession: (account) => Boolean(account && account.status === 'active') },
  });
  return { middleware, calls };
}

test('missing cookie continues as anonymous without querying the database', async () => {
  const { middleware, calls } = makeMiddleware();
  const req = { cookies: {} };
  await middleware(req, {}, (err) => calls.next.push(err || null));
  assert.equal(req.user, null);
  assert.deepEqual(calls.next, [null]);
  assert.equal(calls.query, 0);
});

test('invalid JWT continues as anonymous without querying the database', async () => {
  const { middleware, calls } = makeMiddleware({ jwtError: new Error('expired') });
  const req = { cookies: { token: 'valid-token' } };
  await middleware(req, {}, (err) => calls.next.push(err || null));
  assert.equal(req.user, null);
  assert.deepEqual(calls.next, [null]);
  assert.equal(calls.query, 0);
});

test('database failure is forwarded instead of being misreported as an anonymous session', async () => {
  const databaseError = new Error('database unavailable');
  const { middleware, calls } = makeMiddleware({ queryError: databaseError });
  const req = { cookies: { token: 'valid-token' } };
  await middleware(req, {}, (err) => calls.next.push(err || null));
  assert.equal(req.user, undefined);
  assert.deepEqual(calls.next, [databaseError]);
  assert.equal(calls.query, 1);
});

test('active account is attached to the request after database validation', async () => {
  const { middleware, calls } = makeMiddleware();
  const req = { cookies: { token: 'valid-token' } };
  await middleware(req, {}, (err) => calls.next.push(err || null));
  assert.deepEqual(req.user, { id: 7, email: 'company@example.test', role: 'company' });
  assert.deepEqual(calls.next, [null]);
  assert.equal(calls.query, 1);
});
