'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { sanitizeText, sanitizeProblem } = require('../src/modules/ai/ai.sanitizer');
const { buildDomainClassificationPrompt, buildDifficultyPredictionPrompt } = require('../src/modules/ai/ai.prompts');
const { extractAndParseJSON, validateDomainOutput, validateDifficultyOutput } = require('../src/modules/ai/ai.validation');
const { AIProviderError } = require('../src/modules/ai/ai.provider');
const { classifyProblemDomain, predictProblemDifficulty } = require('../src/modules/ai/ai.service');

// ── 1. PII Sanitization Tests ──

test('PII Sanitizer redacts email addresses', () => {
  const input = 'Contact me at citizen.test@example.com or admin@university.edu for details.';
  const sanitized = sanitizeText(input);
  assert.ok(!sanitized.includes('citizen.test@example.com'));
  assert.ok(!sanitized.includes('admin@university.edu'));
  assert.ok(sanitized.includes('[REDACTED_EMAIL]'));
});

test('PII Sanitizer redacts phone numbers', () => {
  const input = 'Call 9876543210 or +91-98765-43210 immediately regarding the water leak.';
  const sanitized = sanitizeText(input);
  assert.ok(!sanitized.includes('9876543210'));
  assert.ok(!sanitized.includes('98765-43210'));
  assert.ok(sanitized.includes('[REDACTED_PHONE]'));
});

test('PII Sanitizer redacts credential tokens', () => {
  const input = 'Report submitted with token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID and sk_live_1234567890abcdef.';
  const sanitized = sanitizeText(input);
  assert.ok(!sanitized.includes('Bearer eyJ'));
  assert.ok(!sanitized.includes('sk_live_'));
  assert.ok(sanitized.includes('[REDACTED_CREDENTIAL]'));
});

test('PII Sanitizer bounds text length to prevent context flooding', () => {
  const longText = 'A'.repeat(3000);
  const sanitized = sanitizeText(longText, 500);
  assert.ok(sanitized.length <= 530);
  assert.ok(sanitized.endsWith('[TRUNCATED]'));
});

test('sanitizeProblem sanitizes both title and description', () => {
  const problem = {
    title: 'Water leak at test@domain.org',
    description: 'Call 9988776655 for site visit.',
  };
  const sanitized = sanitizeProblem(problem);
  assert.ok(!sanitized.title.includes('test@domain.org'));
  assert.ok(!sanitized.description.includes('9988776655'));
  assert.ok(sanitized.title.includes('[REDACTED_EMAIL]'));
  assert.ok(sanitized.description.includes('[REDACTED_PHONE]'));
});

// ── 2. Prompt Engineering & Defense-in-Depth Tests ──

test('Domain classification prompt marks user input as untrusted and injects allowed domains', () => {
  const allowed = [
    { id: 1, slug: 'water_sanitation', name: 'Water & Sanitation', description: 'Drainage and water supply' },
    { id: 2, slug: 'roads_transport', name: 'Roads & Transport', description: 'Potholes and roads' },
  ];
  const problem = { title: 'Pothole on MG Road', description: 'Deep crater causing accidents' };
  const { systemPrompt, userPrompt } = buildDomainClassificationPrompt(problem, allowed);

  assert.ok(systemPrompt.includes('water_sanitation'));
  assert.ok(systemPrompt.includes('roads_transport'));
  assert.ok(systemPrompt.includes('untrusted user input'));
  assert.ok(userPrompt.includes('<problem_text>'));
  assert.ok(userPrompt.includes('Pothole on MG Road'));
});

test('Difficulty prediction prompt enforces small, medium, hard definitions', () => {
  const problem = { title: 'Water pump automation', description: 'Build an IoT board' };
  const { systemPrompt, userPrompt } = buildDifficultyPredictionPrompt(problem);

  assert.ok(systemPrompt.includes('"small"'));
  assert.ok(systemPrompt.includes('"medium"'));
  assert.ok(systemPrompt.includes('"hard"'));
  assert.ok(userPrompt.includes('<problem_text>'));
});

// ── 3. Validation & Guardrails Tests ──

test('extractAndParseJSON handles bare JSON and markdown code blocks', () => {
  const bare = '{"key": "value"}';
  const fenced = '```json\n{"key": "value"}\n```';
  const genericFence = '```\n{"key": "value"}\n```';

  assert.deepEqual(extractAndParseJSON(bare), { key: 'value' });
  assert.deepEqual(extractAndParseJSON(fenced), { key: 'value' });
  assert.deepEqual(extractAndParseJSON(genericFence), { key: 'value' });
});

test('extractAndParseJSON rejects malformed JSON', () => {
  assert.throws(() => extractAndParseJSON('{ bad json'), /not valid JSON/);
});

test('validateDomainOutput accepts valid domain from allowed taxonomy', () => {
  const allowed = [
    { id: 3, slug: 'waste', name: 'Waste Management' },
    { id: 4, slug: 'education', name: 'Education' },
  ];
  const validOutput = JSON.stringify({
    domain_slug: 'waste',
    explanation: 'Garbage pile accumulated near the residential market.',
  });

  const result = validateDomainOutput(validOutput, allowed);
  assert.equal(result.domainId, 3);
  assert.equal(result.domainSlug, 'waste');
  assert.ok(result.explanation.includes('Garbage pile'));
});

test('validateDomainOutput rejects domain not in allowed taxonomy', () => {
  const allowed = [{ id: 1, slug: 'roads_transport', name: 'Roads' }];
  const invalidOutput = JSON.stringify({
    domain_slug: 'blockchain_cryptocurrency',
    explanation: 'Community needs digital tokens.',
  });

  assert.throws(() => validateDomainOutput(invalidOutput, allowed), /unknown domain slug/);
});

test('validateDomainOutput rejects empty or missing explanation', () => {
  const allowed = [{ id: 1, slug: 'roads_transport', name: 'Roads' }];
  const missingExp = JSON.stringify({ domain_slug: 'roads_transport' });
  assert.throws(() => validateDomainOutput(missingExp, allowed), /failed schema validation/);

  const emptyExp = JSON.stringify({ domain_slug: 'roads_transport', explanation: '' });
  assert.throws(() => validateDomainOutput(emptyExp, allowed), /failed schema validation/);
});

test('validateDifficultyOutput accepts valid Small, Medium, and Hard outputs', () => {
  const smallJson = JSON.stringify({ difficulty: 'small', explanation: 'Basic survey and photo cataloging.' });
  const medJson = JSON.stringify({ difficulty: 'medium', explanation: 'Developing custom data tracking software.' });
  const hardJson = JSON.stringify({ difficulty: 'hard', explanation: 'Structural analysis of compromised bridge pier.' });

  assert.equal(validateDifficultyOutput(smallJson).difficulty, 'small');
  assert.equal(validateDifficultyOutput(medJson).difficulty, 'medium');
  assert.equal(validateDifficultyOutput(hardJson).difficulty, 'hard');
});

test('validateDifficultyOutput rejects invalid difficulty values', () => {
  const invalid = JSON.stringify({ difficulty: 'extreme', explanation: 'Very very difficult.' });
  assert.throws(() => validateDifficultyOutput(invalid), /failed schema validation/);
});

// ── 4. Provider Error Handling & Retries Tests ──

test('AIProviderError identifies retryable vs non-retryable errors correctly', () => {
  const timeoutErr = new AIProviderError('Timed out', 504, 'AI_TIMEOUT', true);
  const rateLimitErr = new AIProviderError('Rate limited', 429, 'AI_RATE_LIMITED', true);
  const serverErr = new AIProviderError('500 internal error', 502, 'AI_SERVER_ERROR', true);
  const authErr = new AIProviderError('401 unauthorized', 502, 'AI_AUTH_ERROR', false);
  const clientErr = new AIProviderError('400 bad request', 400, 'AI_REQUEST_ERROR', false);

  assert.equal(timeoutErr.isRetryable, true);
  assert.equal(rateLimitErr.isRetryable, true);
  assert.equal(serverErr.isRetryable, true);
  assert.equal(authErr.isRetryable, false);
  assert.equal(clientErr.isRetryable, false);
});

// ── 5. End-to-End Service Tests with Mocked Provider ──

test('classifyProblemDomain sanitizes input, invokes provider, and validates result', async () => {
  const allowedDomains = [
    { id: 10, slug: 'water_sanitation', name: 'Water & Sanitation', description: 'Water drainage' },
  ];

  let receivedPrompt = '';
  const mockProvider = async ({ userPrompt }) => {
    receivedPrompt = userPrompt;
    return JSON.stringify({
      domain_slug: 'water_sanitation',
      explanation: 'Flooding and open drain issues on Station Road.',
    });
  };

  const result = await classifyProblemDomain({
    title: 'Water overflow on Station Road',
    description: 'Contact 9876543210 about blocked stormwater channel.',
    allowedDomains,
    providerFn: mockProvider,
  });

  assert.equal(result.domainId, 10);
  assert.equal(result.domainSlug, 'water_sanitation');
  assert.ok(result.explanation.includes('Flooding'));
  assert.ok(!receivedPrompt.includes('9876543210'), 'Phone number must be redacted before sending to LLM');
});

test('predictProblemDifficulty sanitizes input, invokes provider, and validates result', async () => {
  let receivedPrompt = '';
  const mockProvider = async ({ userPrompt }) => {
    receivedPrompt = userPrompt;
    return JSON.stringify({
      difficulty: 'medium',
      explanation: 'Requires designing a low-cost microcontroller water level alert circuit.',
    });
  };

  const result = await predictProblemDifficulty({
    title: 'Water Level Alert Prototype',
    description: 'Send test queries to dev@civicpulse.org for schematics.',
    providerFn: mockProvider,
  });

  assert.equal(result.difficulty, 'medium');
  assert.ok(result.explanation.includes('microcontroller'));
  assert.ok(!receivedPrompt.includes('dev@civicpulse.org'), 'Email must be redacted before sending to LLM');
});
