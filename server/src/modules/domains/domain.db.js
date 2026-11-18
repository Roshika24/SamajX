/**
 * Domains module — database queries.
 *
 * Domains are the reference/config table seeded at migration time.
 * Admin can add more via the platform admin UI.
 */

const pool = require('../../db/pool');

/** Return every domain row, alphabetically. */
async function findAll() {
  const { rows } = await pool.query(
    'SELECT id, slug, name, description FROM domains ORDER BY name'
  );
  return rows;
}

/** Look up a single domain by its slug (e.g. 'civil'). */
async function findBySlug(slug) {
  const { rows } = await pool.query(
    'SELECT * FROM domains WHERE slug = $1',
    [slug]
  );
  return rows[0] || null;
}

module.exports = { findAll, findBySlug };
