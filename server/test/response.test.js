const test = require('node:test');
const assert = require('node:assert/strict');
const { paginated } = require('../src/lib/response');

test('paginated response always returns page, limit and total metadata', () => {
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  paginated(res, [{ id: 1 }], 42, 2, 20);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.meta, { page: 2, limit: 20, total: 42 });
});
