'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { tokenize, cosineSimilarity, mergeBand } = require('../src/modules/reports/similarity');

test('tokenizer normalizes case and removes punctuation and common words', () => {
  assert.deepEqual(tokenize('The POTHOLE, near the Bus-Stop!'), ['pothole', 'bus', 'stop']);
});

test('cosine similarity is 1 for identical term frequency vectors', () => {
  assert.equal(cosineSimilarity('large pothole near bus stop', 'large pothole near bus stop'), 1);
});

test('cosine similarity is 0 for unrelated descriptions', () => {
  assert.equal(cosineSimilarity('broken street light pole', 'overflowing garbage collection'), 0);
});

test('similarity is symmetric and bounded', () => {
  const a = cosineSimilarity('water leaking from pipe near school', 'pipe leakage near the school gate');
  const b = cosineSimilarity('pipe leakage near the school gate', 'water leaking from pipe near school');
  assert.equal(a, b);
  assert.ok(a >= 0 && a <= 1);
});

test('merge bands honor the configured threshold boundaries', () => {
  assert.equal(mergeBand(0.85), 'high');
  assert.equal(mergeBand(0.8499), 'medium');
  assert.equal(mergeBand(0.65), 'medium');
  assert.equal(mergeBand(0.6499), 'low');
});
