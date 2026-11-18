const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
};
process.env.NODE_ENV = 'production';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/civicpulse';
process.env.JWT_SECRET = 'a-production-secret-that-is-at-least-32-characters';
process.env.CORS_ORIGIN = 'https://civicpulse.example.com';

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'dotenv') return { config() {} };
  return originalLoad.call(this, request, parent, isMain);
};
let config;
try {
  config = require('../src/config');
} finally {
  Module._load = originalLoad;
}

test('production config accepts explicit database, strong JWT secret and a single valid origin', () => {
  assert.doesNotThrow(() => config.validateRuntime());
});

test('production config rejects missing or weak JWT secrets', () => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'short';
  assert.throws(() => config.validateRuntime(), /JWT_SECRET/);
  process.env.JWT_SECRET = previous;
});

test('production config rejects wildcard, path-bearing and missing CORS origins', () => {
  const previous = process.env.CORS_ORIGIN;
  for (const origin of ['*', 'https://example.com/app', '']) {
    process.env.CORS_ORIGIN = origin;
    assert.throws(() => config.validateRuntime(), /CORS_ORIGIN/);
  }
  process.env.CORS_ORIGIN = previous;
});

test('production config rejects a missing database URL', () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  assert.throws(() => config.validateRuntime(), /DATABASE_URL/);
  process.env.DATABASE_URL = previous;
});

test.after(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
