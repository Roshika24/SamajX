
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../src/config');
const { scoreApplication } = require('../src/modules/applications/application.scoring');

test('Phase 4 scoring uses difficulty-specific weights and returns an explainable breakdown', () => {
  const result = scoreApplication({ levelScore: 10, domainFit: 1, proposalScore: 5, difficulty: 'hard' }, config);
  assert.equal(result.score, 1);
  assert.deepEqual(result.breakdown.weights, config.scoring.hard);
  assert.equal(result.breakdown.total, 1);
});

test('Phase 4 scoring clamps out-of-range inputs instead of producing invalid scores', () => {
  const result = scoreApplication({ levelScore: 1000, domainFit: 8, proposalScore: 100, difficulty: 'small' }, config);
  assert.equal(result.score, 1);
});

test('Phase 4 migration is additive and installs consent, cross-university review and claim guards', () => {
  const file = path.join(__dirname, '..', 'src', 'migrations', '004_phase4_workflows.sql');
  const sql = fs.readFileSync(file, 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS mentor_invitations/i);
  assert.match(sql, /token_hash CHAR\(64\) NOT NULL UNIQUE/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS application_university_reviews/i);
  assert.match(sql, /UNIQUE\(application_id, university_id\)/i);
  assert.match(sql, /uq_projects_application/i);
  assert.match(sql, /uq_projects_problem/i);
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE|DELETE FROM)\b/i);
});



test('Phase 4 selection requires every routed-university approval and advisory locks, but not mentor consent', () => {
  const file = path.join(__dirname, '..', 'src', 'modules', 'applications', 'application.logic.js');
  const source = fs.readFileSync(file, 'utf8');

  assert.doesNotMatch(source, /mentor_invitation_status\s*=\s*'approved'/);
  assert.doesNotMatch(source, /Mentor approval is still required/);
  assert.match(source, /status <> 'approved'/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /maxActiveProjects/);
  assert.match(source, /INSERT INTO projects/);
  assert.match(source, /UPDATE problems SET status='pending_approval'/);
});

test('Far-away routed problems are labelled rather than filtered from leader discovery', () => {
  const file = path.join(__dirname, '..', 'src', 'modules', 'applications', 'application.logic.js');
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /distance_km > 150 THEN 'Far away'/);
  assert.match(source, /WHERE pr\.university_id = \$1/);
  assert.doesNotMatch(source, /distance_km\s*<=\s*150/i);
});


test('Phase 4 keeps a problem reviewable when no proposal is eligible yet', () => {
  const file = path.join(__dirname, '..', 'src', 'modules', 'applications', 'application.logic.js');
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /if \(scored\.length > 0\)[\s\S]*?status='pending_approval'/);
  assert.match(source, /a\.status='submitted'/);
});

const routing = require('../src/modules/reports/problemRouting');

test('routing skills are normalized, bounded and deduplicated', () => {
  assert.deepEqual(routing.normalizeRequiredSkills([' IoT ', 'iot', '', 'GIS', 'x']), ['iot', 'gis']);
});

test('team expertise matching uses explicit skill requirements, not broad branch guesses', () => {
  assert.equal(routing.matchesAnySkill('ECE Embedded Systems; IoT sensors', ['IoT']), true);
  assert.equal(routing.matchesAnySkill('ECE', ['computer vision', 'GIS']), false);
});

test('routing implementation has no distance radius cutoff and labels distance separately', () => {
  const file = path.join(__dirname, '..', 'src', 'modules', 'reports', 'problemRouting.js');
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /earth_distance/);
  assert.doesNotMatch(source, /<=\s*\$\d+\s*\*\s*1000/);
  assert.match(source, /required_skill|skill\.value/);
});

test('Phase 4 routing migration adds required skills without destructive operations', () => {
  const file = path.join(__dirname, '..', 'src', 'migrations', '005_skill_based_distance_independent_routing.sql');
  const source = fs.readFileSync(file, 'utf8');
  assert.match(source, /ADD COLUMN IF NOT EXISTS required_skills TEXT\[\]/i);
  assert.match(source, /USING GIN/i);
  assert.doesNotMatch(source, /\b(DROP|TRUNCATE|DELETE FROM)\b/i);
});

