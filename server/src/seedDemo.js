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
 *   3. Open complaints with active application countdown timers (ready for team application)
 *   4. Active project and completed project submitted for review (ready for University Admin completion sign-off & certificates)
 *
 * Safe & Idempotent: checks for existing records and updates or inserts safely.
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
    const domainMap = Object.fromEntries(allDomains.map((d) => [d.slug, d.id]));

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

    // ── 4. Ensure Realistic Civic Problems Exist ──
    const testProblems = [
      {
        id: 1,
        title: 'Dangerous Potholes and Asphalt Erosion on Outer Ring Road',
        description: 'Deep potholes and surface cracking across a 400m stretch near the north gate of the university campus. Water accumulates during rains creating severe two-wheeler skid hazards.',
        domain_slug: 'roads_transport',
        category: 'Roads & Pavement',
        difficulty: 'medium',
        status: 'open_for_applications',
        solution_types: ['survey', 'design_proposal', 'prototype_software'],
        lat: 28.7495,
        lng: 77.1180,
        report_count: 5,
        upvote_count: 18,
        window_hours: 48,
        ai_domain_explanation: 'The citizen report describes dangerous roadway potholes and pavement degradation requiring civil and transport assessment.',
        ai_difficulty_reason: 'Requires measuring road surface deflection and proposing durable cold-mix asphalt patching.',
      },
      {
        id: 2,
        title: 'Sewage Overflow and Clogged Storm Drain near Metro Gate 3',
        description: 'Persistent blackwater seepage and solid debris blocking the stormwater intake grate. Foul odor and pedestrian sidewalk flooding during peak hours.',
        domain_slug: 'water_sanitation',
        category: 'Water & Sanitation',
        difficulty: 'hard',
        status: 'open_for_applications',
        solution_types: ['prototype_software', 'pilot'],
        lat: 28.7520,
        lng: 77.1210,
        report_count: 8,
        upvote_count: 24,
        window_hours: 36,
        ai_domain_explanation: 'The complaint involves blocked municipal sewer drains and urban sanitation backup.',
        ai_difficulty_reason: 'Requires ultrasonic level monitoring sensors and automated trash-screen mechanical actuation.',
      },
      {
        id: 3,
        title: 'Decentralized Solar Streetlight Inverters Malfunctioning at Sector 14 Park',
        description: '14 solar-powered LED streetlights shut down within 90 minutes of dusk due to battery voltage sag and inverter trip, leaving public walking paths dark.',
        domain_slug: 'energy',
        category: 'Clean Energy',
        difficulty: 'small',
        status: 'open_for_applications',
        solution_types: ['survey', 'design_proposal'],
        lat: 28.7480,
        lng: 77.1150,
        report_count: 3,
        upvote_count: 9,
        window_hours: 24,
        ai_domain_explanation: 'The issue describes solar panel equipment failure and decentralized renewable power outage.',
        ai_difficulty_reason: 'Troubleshooting solar panel power degradation requires electrical multimeter testing and charge controller inspection.',
      },
      {
        id: 4,
        title: 'Drinking Water Pipeline Discoloration and Pressure Drop in Block C',
        description: 'Turbid and brown-tinted tap water observed in domestic supply lines. Several households report low hydraulic pressure and suspended rust particles.',
        domain_slug: 'water_sanitation',
        category: 'Water Quality',
        difficulty: 'hard',
        status: 'reported',
        solution_types: ['prototype_software', 'pilot'],
        lat: 28.7550,
        lng: 77.1190,
        report_count: 6,
        upvote_count: 14,
        window_hours: 72,
        ai_domain_explanation: 'Water quality telemetry and pipeline pressure analysis are needed to pinpoint pipe corrosion.',
        ai_difficulty_reason: 'Requires multi-parameter probe sensing (turbidity, TDS, pH) and GPS-linked flowmeters.',
      },
      {
        id: 5,
        title: 'Illegal Solid Waste Dumping and Micro-Plastic Accumulation on Riverbank',
        description: 'Unsegregated commercial debris and single-use packaging deposited along the drainage canal perimeter. Leachate seeps into the ground and attracts pests.',
        domain_slug: 'waste',
        category: 'Waste Management',
        difficulty: 'medium',
        status: 'reported',
        solution_types: ['survey', 'awareness_drive', 'prototype_software'],
        lat: 28.7450,
        lng: 77.1250,
        report_count: 4,
        upvote_count: 11,
        window_hours: 48,
        ai_domain_explanation: 'Public health and environmental waste accumulation requiring detection and community recycling incentives.',
        ai_difficulty_reason: 'Requires GIS aerial mapping of dump volume and optical waste classification prototype.',
      },
      {
        id: 6,
        title: 'Smart Streetlight Scheduling and Battery Telemetry System',
        description: 'Automated monitoring of public streetlights with adaptive dimming and real-time power telemetry to cut campus municipal energy waste by 35%.',
        domain_slug: 'energy',
        category: 'Energy Efficiency',
        difficulty: 'medium',
        status: 'in_progress',
        solution_types: ['prototype_software'],
        lat: 28.7505,
        lng: 77.1170,
        report_count: 2,
        upvote_count: 16,
        window_hours: 48,
        ai_domain_explanation: 'Energy management and smart electrical engineering challenge.',
        ai_difficulty_reason: 'Requires firmware development and cloud dashboard telemetry.',
      },
      {
        id: 7,
        title: 'Ultrasonic Municipal Drainage Level Telemetry Prototype',
        description: 'Low-cost solar-powered ultrasonic sensor nodes deployed inside underground drains to predict monsoon flash-flooding with automated SMS warnings.',
        domain_slug: 'water_sanitation',
        category: 'Stormwater Management',
        difficulty: 'hard',
        status: 'completed',
        solution_types: ['prototype_software', 'pilot'],
        lat: 28.7530,
        lng: 77.1185,
        report_count: 7,
        upvote_count: 32,
        window_hours: 48,
        ai_domain_explanation: 'Hydrology sensing and early warning telecommunications.',
        ai_difficulty_reason: 'Involves water-resistant hardware enclosure and predictive water level modeling.',
      },
      {
        id: 8,
        title: 'Air Quality & Ambient Particulate (PM2.5/PM10) Telemetry in High-Traffic School Zone',
        description: 'Excessive diesel exhaust and construction dust particulate levels near the primary school gate. Parents report children developing respiratory irritation during morning school drop-off hours.',
        domain_slug: 'environmental',
        category: 'Air Quality',
        difficulty: 'medium',
        status: 'open_for_applications',
        solution_types: ['prototype_software', 'design_proposal', 'awareness_drive'],
        lat: 28.7470,
        lng: 77.1220,
        report_count: 9,
        upvote_count: 27,
        window_hours: 60,
        ai_domain_explanation: 'Atmospheric air quality sensing and school zone health telemetry.',
        ai_difficulty_reason: 'Requires optical particle counter sensors and automated color-coded LED smog alert boards.',
      },
      {
        id: 9,
        title: 'Pedestrian Safety Blindspot & Adaptive Solar Crosswalk Illumination at Bus Interchange',
        description: 'Poor night visibility and absence of illuminated zebra crossings create dangerous pedestrian collisions where commuters cross four traffic lanes to reach the main bus terminal.',
        domain_slug: 'roads_transport',
        category: 'Urban Safety',
        difficulty: 'small',
        status: 'open_for_applications',
        solution_types: ['design_proposal', 'pilot'],
        lat: 28.7510,
        lng: 77.1140,
        report_count: 4,
        upvote_count: 15,
        window_hours: 36,
        ai_domain_explanation: 'Pedestrian traffic engineering and solar-assisted smart illuminated crosswalks.',
        ai_difficulty_reason: 'Requires motion-activated road stud lighting and passive infrared sensor triggers.',
      },
      {
        id: 10,
        title: 'Automated Segregation Sensor & Odor Neutralizer for Neighborhood Wet Waste Bins',
        description: 'Community garbage receptacles overflow with mixed organic and plastic waste, causing strong ammonia odor and attracting stray animals into residential alleys.',
        domain_slug: 'waste',
        category: 'Waste Management',
        difficulty: 'medium',
        status: 'open_for_applications',
        solution_types: ['prototype_software', 'survey'],
        lat: 28.7540,
        lng: 77.1260,
        report_count: 3,
        upvote_count: 12,
        window_hours: 48,
        ai_domain_explanation: 'Solid waste management and municipal sanitation monitoring.',
        ai_difficulty_reason: 'Requires capacitive moisture classification sensors and automated deodorizing spray actuation.',
      },
      {
        id: 11,
        title: 'Automated Solar Cold-Storage Humidity Telemetry for Local Farmer Produce Market',
        description: 'High spoilage of perishable vegetables at the community mandi due to fluctuating ambient heat and lack of low-cost microclimate ventilation.',
        domain_slug: 'agriculture',
        category: 'Agriculture & Food',
        difficulty: 'hard',
        status: 'open_for_applications',
        solution_types: ['pilot', 'prototype_software'],
        lat: 28.7440,
        lng: 77.1160,
        report_count: 6,
        upvote_count: 21,
        window_hours: 72,
        ai_domain_explanation: 'Agricultural post-harvest loss prevention and microclimate temperature regulation.',
        ai_difficulty_reason: 'Requires thermoelectric Peltier cooling loops and remote humidity data logging.',
      },
      {
        id: 12,
        title: 'Acoustic Sound Barrier & Decibel Telemetry along Elevated Metro Rail Curve',
        description: 'Severe wheel-rail squeal and low-frequency vibration exceeding 85 dBA disturbing nearby residents and hospital patients throughout the operating hours.',
        domain_slug: 'civil',
        category: 'Noise Pollution & Civil',
        difficulty: 'hard',
        status: 'reported',
        solution_types: ['research_report', 'design_proposal'],
        lat: 28.7490,
        lng: 77.1280,
        report_count: 5,
        upvote_count: 19,
        window_hours: 96,
        ai_domain_explanation: 'Civil acoustics and transit structural sound dampening investigation.',
        ai_difficulty_reason: 'Requires multi-point sound pressure calibrated measurements and porous acoustic absorption baffles.',
      }
    ];

    for (const tp of testProblems) {
      const domainId = domainMap[tp.domain_slug] || allDomains[0]?.id || 1;
      const windowCloses = new Date(Date.now() + tp.window_hours * 3600000);
      const reviewDeadline = new Date(Date.now() + (tp.window_hours + 48) * 3600000);

      // Check if problem already exists by id
      const { rows: pRows } = await client.query('SELECT id FROM problems WHERE id = $1', [tp.id]);
      if (!pRows[0]) {
        await client.query(
          `INSERT INTO problems (
             id, title, description, domain_id, category, difficulty, difficulty_set_by,
             solution_types, needs_authority, status, lat, lng, report_count, upvote_count,
             priority_score, window_closes_at, review_deadline, ai_status,
             ai_suggested_domain_id, ai_domain_explanation, ai_domain_status,
             ai_suggested_difficulty, ai_difficulty_reason, ai_difficulty_status
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7,
             $8, FALSE, $9, $10, $11, $12, $13,
             $14, $15, $16, 'done',
             $4, $17, 'suggested',
             $6, $18, 'suggested'
           )
           ON CONFLICT (id) DO NOTHING`,
          [
            tp.id, tp.title, tp.description, domainId, tp.category, tp.difficulty, adminUser.id,
            tp.solution_types, tp.status, tp.lat, tp.lng, tp.report_count, tp.upvote_count,
            tp.report_count * 2 + tp.upvote_count, windowCloses, reviewDeadline,
            tp.ai_domain_explanation, tp.ai_difficulty_reason,
          ]
        );
        console.log(`[seedDemo] ✓ Inserted Problem #${tp.id}: "${tp.title}"`);
      } else {
        await client.query(
          `UPDATE problems
           SET status = $2,
               domain_id = $3,
               difficulty = $4,
               window_closes_at = $5,
               review_deadline = $6,
               ai_status = 'done',
               ai_suggested_domain_id = $3,
               ai_domain_status = 'suggested',
               ai_suggested_difficulty = $4,
               ai_difficulty_status = 'suggested'
           WHERE id = $1`,
          [tp.id, tp.status, domainId, tp.difficulty, windowCloses, reviewDeadline]
        );
      }

      // Add a citizen report record linked to problem
      await client.query(
        `INSERT INTO reports (user_id, problem_id, title, description, category, lat, lng, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         ON CONFLICT DO NOTHING`,
        [citizenUser.id, tp.id, tp.title, tp.description, tp.category, tp.lat, tp.lng]
      );

      // Route to university
      await client.query(
        `INSERT INTO problem_routes (problem_id, university_id, distance_km)
         VALUES ($1, $2, 0.75)
         ON CONFLICT (problem_id, university_id) DO UPDATE SET distance_km = 0.75`,
        [tp.id, university.id]
      );

      // Add a community discussion comment
      await client.query(
        `INSERT INTO comments (problem_id, user_id, content)
         VALUES ($1, $2, 'Confirmed this issue on site. Looking forward to student engineering proposals!')
         ON CONFLICT DO NOTHING`,
        [tp.id, citizenUser.id]
      );
    }

    // Reset sequence for problems
    await client.query(`SELECT setval('problems_id_seq', (SELECT GREATEST(MAX(id), 10) FROM problems))`);

    // ── 5. Create Live Application on Problem #6 for University Review ──
    let app6Id;
    const { rows: existingApp6 } = await client.query(
      'SELECT id FROM applications WHERE problem_id = 6 AND team_id = $1',
      [team.id]
    );

    if (!existingApp6[0]) {
      const app6Res = await client.query(
        `INSERT INTO applications (
           problem_id, team_id, approach, timeline, skills, budget_resources,
           solution_type, mentor_name, mentor_approved, status
         ) VALUES (
           6, $1,
           'Design and assemble an IoT microcontroller board with adaptive solar charging that senses ambient luminescence and battery state-of-charge for smart street scheduling.',
           '4 weeks: W1 Circuit Design, W2 Firmware & Sensors, W3 Enclosure & Stress Test, W4 Field Pilot at Campus Quad',
           'Embedded C, solar charge controllers, lithium battery safety, IoT',
           'Sensors and battery pack from DTU renewable lab, INR 3,500 total prototype cost',
           'prototype_software', 'Prof. Sanjeev Kumar', TRUE, 'submitted'
         ) RETURNING id`,
        [team.id]
      );
      app6Id = app6Res.rows[0].id;
      console.log(`[seedDemo] ✓ Created Live Proposal on Problem #6 (App #${app6Id})`);
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

    // ── 6. Create Completed Project on Problem #7 for Completion Sign-Off ──
    const { rows: existingProj } = await client.query(
      'SELECT id FROM projects WHERE id = 1 OR problem_id = 7'
    );

    let projId;
    if (!existingProj[0]) {
      // Create approved application for problem #7 first
      const { rows: app7 } = await client.query(
        `INSERT INTO applications (
           problem_id, team_id, approach, timeline, skills, budget_resources,
           solution_type, mentor_name, mentor_approved, status, score, rank
         ) VALUES (
           7, $1,
           'Deployed waterproof ultrasonic pulse sensor nodes with LoRaWAN telemetry to monitor underground water levels in real-time.',
           'Completed over 6 weeks with comprehensive field data validation.',
           'Hydrology, embedded C++, LoRa, GIS mapping',
           'Sensors sponsored by DTU innovation fund',
           'pilot', 'Dr. Ramesh Gupta', TRUE, 'selected', 0.9450, 1
         ) RETURNING id`,
        [team.id]
      );

      const projRes = await client.query(
        `INSERT INTO projects (
           problem_id, application_id, team_id, status,
           final_report, final_proof_urls, demo_link
         ) VALUES (
           7, $1, $2, 'submitted_for_review',
           'Project Successfully Deployed: Our squad constructed 3 ultrasonic pulse nodes and mounted them inside municipal drain shafts along Main Bawana Road. During heavy rainfall simulations, telemetry successfully signaled early flash-flood alarms with sub-10 second latency to the municipal dashboard. Total BOM cost was reduced by 60% compared to commercial industrial sensors.',
           $3::JSONB,
           'https://drainage-demo.dtu.ac.in'
         ) RETURNING id`,
        [app7[0].id, team.id, JSON.stringify(['https://github.com/dtu/drainage-telemetry', 'https://youtu.be/sample-civic-demo'])]
      );
      projId = projRes.rows[0].id;
      console.log(`[seedDemo] ✓ Created Project #${projId} ready for Completion Sign-Off!`);

      // Add milestones for this project
      await client.query(
        `INSERT INTO milestones (project_id, title, description, proof_urls)
         VALUES
           ($1, 'Sensor Calibration & Bench Testing', 'Tested ultrasonic transducer accuracy against 0-2m water level tank.', $2::JSONB),
           ($1, 'Solar Power & IP67 Enclosure Assembly', 'Sealed electronics in weatherproof NEMA enclosures with lithium-iron-phosphate battery.', $3::JSONB),
           ($1, 'Field Deployment & Live Stream Verification', 'Mounted 3 nodes in drain shafts with live LoRa telemetry to dashboard.', $4::JSONB)`,
        [projId, JSON.stringify(['https://github.com/dtu/drainage-telemetry#bench-test']), JSON.stringify(['https://github.com/dtu/drainage-telemetry#enclosure']), JSON.stringify(['https://github.com/dtu/drainage-telemetry#field'])]
      );
    } else {
      projId = existingProj[0].id;
      await client.query(
        `UPDATE projects
         SET status = 'submitted_for_review',
             final_report = 'Project Successfully Deployed: Our squad constructed 3 ultrasonic pulse nodes and mounted them inside municipal drain shafts along Main Bawana Road. During heavy rainfall simulations, telemetry successfully signaled early flash-flood alarms with sub-10 second latency to the municipal dashboard. Total BOM cost was reduced by 60% compared to commercial industrial sensors.',
             final_proof_urls = $2::JSONB,
             demo_link = 'https://drainage-demo.dtu.ac.in',
             completion_approved_by = NULL,
             completion_approved_at = NULL,
             completion_feedback = NULL
         WHERE id = $1`,
        [projId, JSON.stringify(['https://github.com/dtu/drainage-telemetry', 'https://youtu.be/sample-civic-demo'])]
      );
    }

    await client.query('COMMIT');
    console.log('[seedDemo] ========================================================');
    console.log('[seedDemo] ✓ DEMO & TEST DATA SEEDED SUCCESSFULLY!');
    console.log('[seedDemo] ========================================================');
    console.log('[seedDemo] Test Accounts:');
    console.log('[seedDemo]   - Platform Admin: admin@civicpulse.local (admin123)');
    console.log('[seedDemo]   - University Admin: uniadmin@delhi.edu (password123)');
    console.log('[seedDemo]   - Student Leader: leader@delhi.edu (password123)');
    console.log('[seedDemo]   - Citizen: citizen@example.com (password123)');
    console.log('[seedDemo]   - Company Sponsor: sponsor@techcorp.in (password123)');
    console.log('[seedDemo] ========================================================');
    console.log('[seedDemo] Test Problems:');
    console.log('[seedDemo]   - Problems #1, #2, #3: Open for student team applications (live timers)');
    console.log('[seedDemo]   - Problems #4, #5: Reported state, AI suggestions ready for review');
    console.log('[seedDemo]   - Problem #6: Has student proposal waiting in University Admin queue');
    console.log('[seedDemo]   - Problem #7: Has completed project waiting for University sign-off & certificates');
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
