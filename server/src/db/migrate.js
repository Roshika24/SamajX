/**
 * Migration runner — executes numbered .sql files in order.
 *
 * Tracks which migrations have already run in a `_migrations` table.
 * Usage: `node src/db/migrate.js` (or `npm run migrate`)
 */

const fs = require('fs');
const path = require('path');
const pool = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function run() {
  const client = await pool.connect();
  try {
    // Ensure the tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id        SERIAL PRIMARY KEY,
        filename  VARCHAR(255) NOT NULL UNIQUE,
        run_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Find which migrations have already run
    const { rows: done } = await client.query(
      'SELECT filename FROM _migrations ORDER BY filename'
    );
    const doneSet = new Set(done.map((r) => r.filename));

    // Read .sql files from the migrations directory, sorted by name
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let applied = 0;
    for (const file of files) {
      if (doneSet.has(file)) continue;

      console.log(`[migrate] Running ${file}...`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        applied++;
        console.log(`[migrate] ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] ✗ ${file}:`, err.message);
        throw err;
      }
    }

    if (applied === 0) {
      console.log('[migrate] Database is up to date.');
    } else {
      console.log(`[migrate] Applied ${applied} migration(s).`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[migrate] Fatal error:', err);
  process.exit(1);
});
