const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateLevel } = require('../src/modules/teams/level');
const { canTransition } = require('../src/lib/stateMachine.rules');

test('team level uses average verified member score and configured thresholds', () => {
  assert.equal(calculateLevel([0, 5], { beginnerMax: 2, intermediateMax: 5 }).level, 'intermediate');
  assert.equal(calculateLevel([0, 5], { beginnerMax: 2, intermediateMax: 5 }).average, 2.5);
  assert.equal(calculateLevel([0, 1], { beginnerMax: 2, intermediateMax: 5 }).level, 'beginner');
  assert.equal(calculateLevel([6, 7], { beginnerMax: 2, intermediateMax: 5 }).level, 'advanced');
  assert.equal(calculateLevel([], { beginnerMax: 2, intermediateMax: 5 }).level, 'beginner');
});

test('leaders can only transition through the approved state machine', () => {
  assert.deepEqual(canTransition('leader', 'pending', 'approved', 'university_admin'), { allowed: true });
  assert.equal(canTransition('leader', 'pending', 'approved', 'leader').allowed, false);
  assert.equal(canTransition('leader', 'suspended', 'approved', 'university_admin').allowed, true);
  assert.equal(canTransition('leader', 'pending', 'suspended', 'university_admin').allowed, false);
});

test('unknown state-machine entities are rejected', () => {
  assert.equal(canTransition('team', 'active', 'deleted', 'leader').allowed, false);
});
