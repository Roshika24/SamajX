'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(__dirname, '..', 'src', 'migrations', '003_report_merge_candidates.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

test('Phase 3 migration only adds the medium-confidence decision table and index', () => {
  assert.match(sql, /CREATE TABLE report_merge_candidates/i);
  assert.match(sql, /report_id INTEGER NOT NULL UNIQUE REFERENCES reports\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /problem_id INTEGER NOT NULL REFERENCES problems\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /confidence NUMERIC\(5,4\).*0\.65.*0\.85/i);
  assert.match(sql, /CREATE INDEX idx_report_merge_candidates_status/i);
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE|DELETE FROM)\b/i);
});
