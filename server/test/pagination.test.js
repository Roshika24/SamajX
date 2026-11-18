const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePagination } = require('../src/lib/pagination');

test('pagination defaults and caps requested page size', () => {
  assert.deepEqual(parsePagination({}), { page: 1, limit: 20 });
  assert.deepEqual(parsePagination({ page: '3', limit: '500' }), { page: 3, limit: 100 });
});

test('pagination rejects malformed, zero and unsafe values instead of generating invalid SQL offsets', () => {
  for (const query of [{ page: '0' }, { page: '-1' }, { page: 'abc' }, { limit: '0' }, { limit: '2.5' }, { page: '9007199254740992' }, { page: '9007199254740991', limit: '100' }]) {
    assert.throws(() => parsePagination(query), /positive integer|too large/);
  }
});
