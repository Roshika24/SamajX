/**
 * Seed script skeleton — populates the DB with a platform admin
 * and (later) demo data.
 *
 * Usage: `npm run seed` (or `node src/seed.js`)
 *
 * Idempotent: skips if the admin already exists.
 */

const bcrypt = require('bcryptjs');
const pool = require('./db/pool');
const config = require('./config');

async function seed() {
  if (!config.server.isDev && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 16)) {
    throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters before seeding production');
  }
  console.log('[seed] Starting...');

  /* ── 1. Create platform admin ── */
  const { rows: existing } = await pool.query(
    'SELECT id, role FROM users WHERE email = $1',
    [config.admin.email]
  );

  if (existing.length > 0) {
    if (existing[0].role !== 'platform_admin') {
      throw new Error('ADMIN_EMAIL is already assigned to a non-Platform-Admin account; choose a dedicated admin email');
    }
    console.log('[seed] Platform admin already exists, skipping.');
  } else {
    const hash = await bcrypt.hash(config.admin.password, 12);
    await pool.query(
      `INSERT INTO users (email, password_hash, role, display_name, email_verified)
       VALUES ($1, $2, 'platform_admin', 'Platform Admin', TRUE)`,
      [config.admin.email, hash]
    );
    console.log(`[seed] ✓ Created platform admin: ${config.admin.email}`);
  }

  /* ── 2. Future phases will add demo data here ── */
  // Phase 2: demo universities, leaders, teams
  // Phase 3: demo reports, problems
  // Phase 4: demo applications, projects
  // Phase 5: demo sponsorships, certificates
  // Phase 7: full realistic seed

  console.log('[seed] Done.');
}

seed()
  .catch((err) => {
    console.error('[seed] Fatal error:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
