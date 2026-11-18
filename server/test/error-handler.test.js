const test = require('node:test');
const assert = require('node:assert/strict');
const errorHandler = require('../src/middleware/errorHandler');

function invoke(error) {
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    get headersSent() { return false; },
  };
  errorHandler(error, { method: 'POST', path: '/api/test' }, response, () => {});
  return response;
}

test('Zod validation issues are converted to stable API error details', () => {
  const response = invoke({
    name: 'ZodError',
    issues: [{ path: ['company', 'name'], message: 'Required' }],
  });
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body.error.details, [{ field: 'company.name', message: 'Required' }]);
});

test('legacy Zod errors alias remains supported for compatibility', () => {
  const response = invoke({
    name: 'ZodError',
    errors: [{ path: ['email'], message: 'Invalid email' }],
  });
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body.error.details, [{ field: 'email', message: 'Invalid email' }]);
});
