'use strict';

/**
 * SamajX Comprehensive Demo & Test Data Seeder
 *
 * Populates realistic test data across all five roles and the full problem lifecycle:
 * - Standard test accounts for all roles (Citizen, University Admin, Leader, Company, Platform Admin)
 * - Verified University with departments and promo code
 * - Approved Team Leader with full student team roster and verified evidence
 * - Realistic citizen complaints in various lifecycle states:
 *   1. New complaint with AI domain & difficulty suggestions awaiting Platform Admin review
 *   2. Another complaint with AI suggestions ready for University Admin difficulty review
 *   3. Open complaint with active application countdown timer (ready for team application)
 *   4. Completed project submitted for review (ready for University Admin completion sign-off & certificates)
 *
 * Safe & Idempotent: checks for existing emails/records and updates or skips safely.
 *
 * Usage: `node src/seedDemo.js`
 */

const bcrypt = require('bcryptjs');
const pool = require('./db/pool');
const config = require('./config');

async function seedDemoData() {
  const client = await pool.connect();

  try {
    console.log('[seedDemo] Starting SamajX demo data seeding...');
    await client.query('BEGIN');

    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // ── 1. Create or ensure Demo Accounts ──

    // A. Platform Admin
    let adminUser;
    const { rows: adminRows } = await client.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [config.admin.email]
    );
    if (!adminRows[0]) {
      const adminHash = await bcrypt.hash(config.admin.password, 12);
      const res = await client.query(
        `INSERT INTO users (email, password_hash, role, display_name, email_verified)
         VALUES ($1, $2, 'platform_admin', 'Platform Administrator', TRUE)
         RETURNING id, email, role`,
        [config.admin.email, adminHash]
      );
      adminUser = res.rows[0];
      console.log(`[seedDemo] ✓ Created Platform Admin: ${config.admin.email}`);
    } else {
      adminUser = adminRows[0];
      console.log(`[seedDemo] • Using existing Platform Admin: ${adminUser.email}`);
    }

    // B. Citizen
    let citizenUser;
    const { rows: citizenRows } = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['citizen@example.com']
    );
    if (!citizenRows[0]) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, role, display_name, phone, email_verified)
         VALUES ('citizen@example.com', $1, 'citizen', 'Rajesh Sharma', '9876543210', TRUE)
         RETURNING id, email`,
        [passwordHash]
      );
      citizenUser = res.rows[0];
      console.log(`[seedDemo] ✓ Created Citizen: citizen@example.com`);
    } else {
      citizenUser = citizenRows[0];
      console.log(`[seedDemo] • Using existing Citizen: citizen@example.com`);
    }

    // C. University Admin
    let uniAdminUser;
    const { rows: uniAdminRows } = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['uniadmin@delhi.edu']
    );
    if (!uniAdminRows[0]) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, role, display_name, phone, email_verified)
         VALUES ('uniadmin@delhi.edu', $1, 'university_admin', 'Dr. Ramesh Gupta', '9811122233', TRUE)
         RETURNING id, email`,
        [passwordHash]
      );
      uniAdminUser = res.rows[0];
      console.log(`[seedDemo] ✓ Created University Admin: uniadmin@delhi.edu`);
    } else {
      uniAdminUser = uniAdminRows[0];
      console.log(`[seedDemo] • Using existing University Admin: uniadmin@delhi.edu`);
    }

    // D. Team Leader
    let leaderUser;
    const { rows: leaderRows } = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['leader@delhi.edu']
    );
    if (!leaderRows[0]) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, role, display_name, phone, email_verified)
         VALUES ('leader@delhi.edu', $1, 'leader', 'Aryan Sharma (Team Leader)', '9899988877', TRUE)
         RETURNING id, email`,
        [passwordHash]
      );
      leaderUser = res.rows[0];
      console.log(`[seedDemo] ✓ Created Team Leader: leader@delhi.edu`);
    } else {
      leaderUser = leaderRows[0];
      console.log(`[seedDemo] • Using existing Team Leader: leader@delhi.edu`);
    }

    // E. Company / Sponsor
    let companyUser;
    const { rows: compRows } = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      ['sponsor@techcorp.in']
    );
    if (!compRows[0]) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, role, display_name, phone, email_verified)
         VALUES ('sponsor@techcorp.in', $1, 'company', 'TechCorp CSR Foundation', '9900011122', TRUE)
         RETURNING id, email`,
        [passwordHash]
      );
      companyUser = res.rows[0];
      await client.query(
        `INSERT INTO companies (user_id, name, description, website, industry, verified, verified_at, verified_by)
         VALUES ($1, 'TechCorp India CSR', 'Supporting university civic innovations and smart city prototypes.', 'https://techcorp.in', 'Technology', TRUE, NOW(), $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [companyUser.id, adminUser.id]
      );
      console.log(`[seedDemo] ✓ Created Company: sponsor@techcorp.in`);
    } else {
      companyUser = compRows[0];
    }

    // ── 2. Create University & Departments ──
    let university;
    const { rows: existingUni } = await client.query(
      'SELECT * FROM universities WHERE user_id = $1',
      [uniAdminUser.id]
    );
    if (!existingUni[0]) {
      const uniRes = await client.query(
        `INSERT INTO universities (user_id, name, address, city, state, country, lat, lng, website, promo_code, verified, verified_at, verified_by)
         VALUES ($1, 'Delhi Technological University (DTU)', 'Shahbad Daulatpur, Main Bawana Road', 'Delhi', 'Delhi', 'India', 28.7501, 77.1177, 'http://dtu.ac.in', 'DTU2026CODE', TRUE, NOW(), $2)
         RETURNING *`,
        [uniAdminUser.id, adminUser.id]
      );
      university = uniRes.rows[0];
      console.log(`[seedDemo] ✓ Created University: ${university.name}`);
    } else {
      university = existingUni[0];
    }

    // Add departments for the university
    const { rows: allDomains } = await client.query('SELECT id, slug, name FROM domains');
    const domainMap = Object.fromEntries(allDomains.map(d => [d.slug, d.id]));

    const targetDeptSlugs = ['water_sanitation', 'roads_transport', 'civil', 'environmental', 'software_it', 'energy', 'waste'];
    for (const slug of targetDeptSlugs) {
      if (domainMap[slug]) {
        await client.query(
          `INSERT INTO departments (university_id, domain_id, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (university_id, domain_id) DO NOTHING`,
          [university.id, domainMap[slug], `Department of ${slug.replace('_', ' ').toUpperCase()}`]
        );
      }
    }

    // ── 3. Create Leader & Team with Members & Evidence ──
    let leaderRecord;
    const { rows: existingLeader } = await client.query(
      'SELECT * FROM leaders WHERE user_id = $1',
      [leaderUser.id]
    );
    if (!existingLeader[0]) {
      const leaderRes = await client.query(
        `INSERT INTO leaders (user_id, university_id, status, approved_at, approved_by, enrollment_number, branch, year)
         VALUES ($1, $2, 'approved', NOW(), $3, 'DTU-2024-CS01', 'Computer Science', 3)
         RETURNING *`,
        [leaderUser.id, university.id, uniAdminUser.id]
      );
      leaderRecord = leaderRes.rows[0];
      console.log(`[seedDemo] ✓ Approved Leader record created for Aryan Sharma`);
    } else {
      leaderRecord = existingLeader[0];
    }

    let team;
    const { rows: existingTeam } = await client.query(
      'SELECT * FROM teams WHERE leader_id = $1',
      [leaderRecord.id]
    );
    if (!existingTeam[0]) {
      const teamRes = await client.query(
        `INSERT INTO teams (name, leader_id, university_id, level, level_score)
         VALUES ('EcoInnovators', $1, $2, 'intermediate', 4.50)
         RETURNING *`,
        [leaderRecord.id, university.id]
      );
      team = teamRes.rows[0];
      console.log(`[seedDemo] ✓ Created Team: ${team.name}`);
    } else {
      team = existingTeam[0];
    }

    // Add team members
    const membersData = [
      { name: 'Aryan Sharma', email: 'aryan.sharma@dtu.ac.in', enrollment_number: 'DTU-2024-CS01', branch: 'Computer Science', year: 3, speciality: 'Embedded Systems & IoT', interests: 'IoT, GIS, sensors', is_leader: true, credential_score: 5.0 },
      { name: 'Priya Patel', email: 'priya.patel@dtu.ac.in', enrollment_number: 'DTU-2024-CE02', branch: 'Civil Engineering', year: 3, speciality: 'Hydrology & Stormwater', interests: 'Drainage, AutoCAD, flood modeling', is_leader: false, credential_score: 4.5 },
      { name: 'Vikram Singh', email: 'vikram.singh@dtu.ac.in', enrollment_number: 'DTU-2024-EE03', branch: 'Electrical Engineering', year: 2, speciality: 'Solar Power & Circuit Design', interests: 'Microgrids, sensors, renewable energy', is_leader: false, credential_score: 4.0 },
    ];

    for (const m of membersData) {
      const { rows: memRow } = await client.query(
        `INSERT INTO team_members (team_id, university_id, name, email, enrollment_number, branch, year, speciality, interests, is_leader, credential_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (university_id, enrollment_number) DO UPDATE
           SET name = EXCLUDED.name, speciality = EXCLUDED.speciality, interests = EXCLUDED.interests
         RETURNING id`,
        [team.id, university.id, m.name, m.email, m.enrollment_number, m.branch, m.year, m.speciality, m.interests, m.is_leader, m.credential_score]
      );

      // Add verified evidence
      await client.query(
        `INSERT INTO member_evidence (member_id, type, title, description, link, verified, verified_at, verified_by, points)
         VALUES ($1, 'project', 'Smart Civic Telemetry', 'Field tested monitoring sensor suite.', 'https://github.com/dtu/telemetry', TRUE, NOW(), $2, 3)
         ON CONFLICT DO NOTHING`,
        [memRow[0].id, uniAdminUser.id]
      );
    }

    // ── 4. Update Existing Problems (1, 2, 3) with Realistic AI Analysis ──
    // Only update if not already reviewed (accepted/overridden) by the user
    await client.query(
      `UPDATE problems
       SET ai_suggested_domain_id = $1,
           ai_domain_explanation = 'The citizen report describes dangerous roadway potholes and pavement degradation requiring civil and transport assessment.',
           ai_domain_status = 'suggested',
           ai_suggested_difficulty = 'medium'::difficulty,
           ai_difficulty_reason = 'Requires measuring road surface deflection and proposing durable cold-mix asphalt patching.',
           ai_difficulty_status = 'suggested',
           ai_status = 'done'
       WHERE id = 1 AND (ai_domain_status IS NULL OR ai_domain_status = 'pending')`,
      [domainMap['roads_transport'] || 5]
    );

    // Route Problem #1 to DTU as well
    await client.query(
      `INSERT INTO problem_routes (problem_id, university_id, distance_km)
       VALUES (1, $1, 1.20)
       ON CONFLICT (problem_id, university_id) DO NOTHING`,
      [university.id]
    );

    await client.query(
      `UPDATE problems
       SET ai_suggested_domain_id = $1,
           ai_domain_explanation = 'The reported complaint concerns road pavement surface depression, pothole hazards, and commuter traffic safety.',
           ai_domain_status = 'suggested',
           ai_suggested_difficulty = 'small'::difficulty,
           ai_difficulty_reason = 'Pothole dimensions and depth can be cataloged using a standard mobile survey without specialized lab infrastructure.',
           ai_difficulty_status = 'suggested',
           ai_status = 'done'
       WHERE id = 2 AND (ai_domain_status IS NULL OR ai_domain_status = 'pending')`,
      [domainMap['roads_transport'] || 5]
    );

    await client.query(
      `UPDATE problems
       SET ai_suggested_domain_id = $1,
           ai_domain_explanation = 'The issue describes solar panel equipment failure and decentralized renewable power outage.',
           ai_domain_status = 'suggested',
           ai_suggested_difficulty = 'medium'::difficulty,
           ai_difficulty_reason = 'Troubleshooting solar panel power degradation requires electrical multimeter testing and charge controller inspection.',
           ai_difficulty_status = 'suggested',
           ai_status = 'done'
       WHERE id = 3 AND (ai_domain_status IS NULL OR ai_domain_status = 'pending')`,
      [domainMap['energy'] || 9]
    );

    // Route Problem #3 to DTU
    await client.query(
      `INSERT INTO problem_routes (problem_id, university_id, distance_km)
       VALUES (3, $1, 0.55)
       ON CONFLICT (problem_id, university_id) DO NOTHING`,
      [university.id]
    );

    // ── 5. Ensure Problems #4 & #5 have status = 'suggested' for Live Acceptance if not yet reviewed ──
    await client.query(
      `UPDATE problems
       SET ai_domain_status = 'suggested',
           ai_difficulty_status = 'suggested',
           ai_domain_review_action = NULL,
           ai_difficulty_review_action = NULL
       WHERE id IN (4, 5) AND (ai_domain_status IS NULL OR ai_domain_status = 'pending')`
    );

    // Route Problem #4 and #5 to DTU so University Admin sees them in /admin/university/problems!
    await client.query(
      `INSERT INTO problem_routes (problem_id, university_id, distance_km)
       VALUES (4, $1, 0.45), (5, $1, 0.82)
       ON CONFLICT (problem_id, university_id) DO NOTHING`,
      [university.id]
    );

    // Ensure ALL problems are routed to ALL universities regardless of distance
    const { rows: allUnis } = await client.query('SELECT id, lat, lng FROM universities WHERE verified = TRUE');
    const { rows: allProbs } = await client.query('SELECT id, lat, lng FROM problems');
    for (const p of allProbs) {
      for (const u of allUnis) {
        if (u.lat && u.lng && p.lat && p.lng) {
          await client.query(`
            INSERT INTO problem_routes (problem_id, university_id, distance_km)
            VALUES (
              $1, $2,
              round((earth_distance(ll_to_earth($3, $4), ll_to_earth($5, $6)) / 1000.0)::numeric, 2)
            )
            ON CONFLICT (problem_id, university_id)
            DO UPDATE SET distance_km = EXCLUDED.distance_km
          `, [p.id, u.id, u.lat, u.lng, p.lat, p.lng]);
        } else {
          await client.query(`
            INSERT INTO problem_routes (problem_id, university_id, distance_km)
            VALUES ($1, $2, 0)
            ON CONFLICT (problem_id, university_id) DO NOTHING
          `, [p.id, u.id]);
        }
      }
    }

    // ── 6. Create a Live Application Awaiting University Admin Review ──
    // Create an application on Problem #6 from team EcoInnovators
    const { rows: existingApp6 } = await client.query(
      'SELECT id FROM applications WHERE problem_id = 6 AND team_id = $1',
      [team.id]
    );

    let app6Id;
    if (!existingApp6[0]) {
      const app6Res = await client.query(
        `INSERT INTO applications (
           problem_id, team_id, approach, timeline, skills, budget_resources,
           solution_type, mentor_name, mentor_approved, status
         ) VALUES (
           6, $1,
           'Design and assemble an IoT microcontroller board that senses battery state-of-charge and solar panel generation, providing automated streetlight scheduling.',
           '4 weeks: circuit design, firmware programming, field testing at the Shahbad park perimeter.',
           'Embedded C, solar charge controllers, lithium battery safety, IoT',
           'Sensors and battery pack from DTU renewable lab, INR 3,500 prototype cost',
           'prototype_software', 'Prof. Sanjeev Kumar', TRUE, 'submitted'
         ) RETURNING id`,
        [team.id]
      );
      app6Id = app6Res.rows[0].id;
    } else {
      app6Id = existingApp6[0].id;
    }

    // Add review record for DTU in application_university_reviews
    await client.query(
      `INSERT INTO application_university_reviews (application_id, university_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (application_id, university_id) DO UPDATE
         SET status = 'pending'`,
      [app6Id, university.id]
    );

    // ── 7. Ensure Problem #7 / Project #2 is Waiting in the Completion Review Queue ──
    await client.query(
      `UPDATE projects
       SET status = 'submitted_for_review',
           completion_approved_by = NULL,
           completion_approved_at = NULL,
           completion_feedback = NULL
       WHERE id = 2`
    );
    await client.query('DELETE FROM certificates WHERE project_id = 2');

    await client.query('COMMIT');
    console.log('[seedDemo] ========================================================');
    console.log('[seedDemo] ✓ DEMO & TEST DATA SYNCHRONIZED SUCCESSFULLY!');
    console.log('[seedDemo] ========================================================');
    console.log('[seedDemo] 1. Platform Admin (/admin/platform/phase4):');
    console.log('[seedDemo]    -> Problems #2, #3, #4, #5 ALL have AI suggestions ready with:');
    console.log('[seedDemo]       "Accept AI Domain" & "Override Domain"');
    console.log('[seedDemo]       "Accept AI Difficulty" & "Override Difficulty" buttons!');
    console.log('[seedDemo] 2. University Admin (/admin/university/problems):');
    console.log('[seedDemo]    -> Section 1: Shows routed problems (#3, #4, #5) with AI Difficulty cards');
    console.log('[seedDemo]    -> Section 2: Shows live application (#6) awaiting university review!');
    console.log('[seedDemo] 3. University Admin Completions (/admin/university/completions):');
    console.log('[seedDemo]    -> Problem #7 ready to click "Approve Completion" & generate certificates!');
    console.log('[seedDemo] ========================================================');

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[seedDemo] Error seeding demo data:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoData().catch((err) => {
  console.error('[seedDemo] Fatal seeder error:', err.message);
  process.exit(1);
});
