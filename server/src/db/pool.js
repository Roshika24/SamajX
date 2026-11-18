/**
 * PostgreSQL connection pool — single shared instance.
 *
 * Usage:
 *   const pool = require('../db/pool');
 *   const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
 */

const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.db.connectionString,
});

// Log connection issues in dev (non-fatal, the pool retries)
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = pool;
