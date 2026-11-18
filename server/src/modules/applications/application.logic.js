'use strict';

const pool = require('../../db/pool');
const config = require('../../config');
const { scoreApplication } = require('./application.scoring');
const { NotFoundError, ForbiddenError, ConflictError, ValidationError } = require('../../lib/errors');
const { routeProblem, normalizeRequiredSkills } = require('../reports/problemRouting');

const SOLUTION_TYPES = ['survey', 'design_proposal', 'prototype_software', 'research_report', 'awareness_drive', 'pilot'];
const DIFFICULTIES = ['small', 'medium', 'hard'];

async function getLeaderTeam(client, userId, lock = false) {
  const { rows } = await client.query(
    `SELECT t.*, l.user_id AS leader_user_id, l.status AS leader_status
     FROM teams t JOIN leaders l ON l.id = t.leader_id
     WHERE l.user_id = $1 ${lock ? 'FOR UPDATE OF t' : ''}`, [userId]
  );
  if (!rows[0]) throw new ForbiddenError('Create a team before submitting an application');
  if (rows[0].leader_status !== 'approved') throw new ForbiddenError('Your university must approve your leader account first');
  return rows[0];
}

async function listAvailableProblems(userId) {
  const team = await getLeaderTeam(pool, userId);
  const { rows } = await pool.query(
    `SELECT p.id, p.title, p.description, p.domain_id, d.name AS domain_name,
            p.difficulty, p.solution_types::text[] AS solution_types,
            p.needs_authority, p.status, p.report_count, p.upvote_count,
            p.priority_score, p.window_closes_at,
            pr.distance_km,
            CASE WHEN pr.distance_km > 150 THEN 'Far away' ELSE 'Within range' END AS distance_label
     FROM problem_routes pr
     JOIN problems p ON p.id = pr.problem_id
     LEFT JOIN domains d ON d.id = p.domain_id
     WHERE pr.university_id = $1
       AND p.status = 'open_for_applications'
       AND (p.window_closes_at IS NULL OR p.window_closes_at > NOW())
     ORDER BY p.priority_score DESC, pr.distance_km ASC, p.created_at DESC`,
    [team.university_id]
  );

  // Distance is informational, not a visibility cutoff.
  // All routed problems remain visible.
  return rows;
}

async function listMentorOptions(userId) {
  const team = await getLeaderTeam(pool, userId);
  const { rows } = await pool.query(
    `SELECT id, name, email, enrollment_number, branch
     FROM team_members
     WHERE team_id=$1
     ORDER BY is_leader DESC, name`,
    [team.id]
  );
  return rows;
}

async function classifyProblem(adminId, problemId, input) {
  if (!DIFFICULTIES.includes(input.difficulty)) {
    throw new ValidationError('Invalid difficulty');
  }

  if (!Array.isArray(input.solution_types) || !input.solution_types.length ||
      input.solution_types.some((item) => !SOLUTION_TYPES.includes(item))) {
    throw new ValidationError('Choose one or more supported solution types');
  }

  const windowHours = Number(input.window_hours ?? config.application.windowHours);
  const reviewHours = Number(input.review_hours ?? config.application.reviewHours);

  if (!Number.isInteger(windowHours) || windowHours < 1 || windowHours > 720 ||
      !Number.isInteger(reviewHours) || reviewHours < 1 || reviewHours > 720) {
    throw new ValidationError('Application and review windows must be between 1 and 720 hours');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM problems WHERE id = $1 FOR UPDATE',
      [problemId]
    );

    const problem = rows[0];

    if (!problem) throw new NotFoundError('Problem');

    const existingApplications = await client.query(
      'SELECT 1 FROM applications WHERE problem_id=$1 LIMIT 1',
      [problemId]
    );

    if (existingApplications.rows.length) {
      throw new ConflictError('A problem with submitted applications cannot be reclassified or reopened');
    }

    if (['claimed', 'in_progress', 'completed', 'rejected_spam', 'resolved_duplicate'].includes(problem.status)) {
      throw new ConflictError('This problem can no longer be classified for applications');
    }

    if (input.domain_id !== undefined) {
      const domain = await client.query(
        'SELECT id FROM domains WHERE id = $1',
        [input.domain_id]
      );

      if (!domain.rows[0]) {
        throw new ValidationError('Selected domain does not exist');
      }
    }

    const requiredSkills = normalizeRequiredSkills(input.required_skills || []);

    const { rows: updated } = await client.query(
      `UPDATE problems
       SET domain_id = COALESCE($2, domain_id),
           difficulty = $3,
           solution_types = $4::solution_type[],
           needs_authority = $5,
           required_skills = $6::text[],
           classified_by = $7,
           classified_at = NOW(),
           status = 'reported',
           window_closes_at = NULL,
           review_deadline = NULL
       WHERE id = $1
       RETURNING id, status, difficulty, solution_types, needs_authority, required_skills`,
      [
        problemId,
        input.domain_id ?? null,
        input.difficulty,
        input.solution_types,
        Boolean(input.needs_authority),
        requiredSkills,
        adminId
      ]
    );

    // Recompute routes after applying domain and skill requirements.
    const routing = await routeProblem(client, problemId);

    if (!routing.routed) {
      await client.query(
        `INSERT INTO audit_log(user_id,action,entity_type,entity_id,details)
         VALUES($1,'classify_problem','problem',$2,$3::jsonb)`,
        [
          adminId,
          problemId,
          JSON.stringify({
            difficulty: input.difficulty,
            solution_types: input.solution_types,
            needs_authority: Boolean(input.needs_authority),
            required_skills: requiredSkills,
            routing,
            application_window_opened: false
          })
        ]
      );

      await client.query('COMMIT');

      return {
        ...updated[0],
        routing,
        application_window_opened: false,
        message: 'Classification and skill requirements saved, but no verified university matches yet. Complete university/team expertise profiles and save again.'
      };
    }

    const { rows: opened } = await client.query(
      `UPDATE problems
       SET status='open_for_applications',
           window_closes_at = NOW() + ($2 * INTERVAL '1 hour'),
           review_deadline = NOW() + (($2 + $3) * INTERVAL '1 hour')
       WHERE id=$1
       RETURNING id,status,difficulty,solution_types,needs_authority,required_skills,window_closes_at,review_deadline`,
      [problemId, windowHours, reviewHours]
    );

    await client.query(
      `INSERT INTO audit_log(user_id,action,entity_type,entity_id,details)
       VALUES($1,'classify_problem','problem',$2,$3::jsonb)`,
      [
        adminId,
        problemId,
        JSON.stringify({
          difficulty: input.difficulty,
          solution_types: input.solution_types,
          needs_authority: Boolean(input.needs_authority),
          required_skills: requiredSkills,
          routing,
          window_hours: windowHours,
          review_hours: reviewHours
        })
      ]
    );

    await client.query('COMMIT');
    return opened[0];

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function submitApplication(userId, problemId, input) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const team = await getLeaderTeam(client, userId, true);

    const { rows: problems } = await client.query(
      `SELECT p.*, d.name AS domain_name
       FROM problems p
       LEFT JOIN domains d ON d.id = p.domain_id
       WHERE p.id = $1
       FOR UPDATE OF p`,
      [problemId]
    );

    const problem = problems[0];

    if (!problem) throw new NotFoundError('Problem');

    if (
      problem.status !== 'open_for_applications' ||
      (problem.window_closes_at && new Date(problem.window_closes_at) <= new Date())
    ) {
      throw new ConflictError('The application window is not open');
    }

    if (!problem.solution_types?.includes(input.solution_type)) {
      throw new ValidationError('This solution type is not allowed for the problem');
    }

    const { rows: routeRows } = await client.query(
      `SELECT university_id
       FROM problem_routes
       WHERE problem_id = $1
       ORDER BY university_id`,
      [problemId]
    );

    if (!routeRows.some((r) => Number(r.university_id) === Number(team.university_id))) {
      throw new ForbiddenError('This problem is not routed to your university');
    }

    const { rows: existing } = await client.query(
      'SELECT id FROM applications WHERE problem_id = $1 AND team_id = $2',
      [problemId, team.id]
    );

    if (existing[0]) {
      throw new ConflictError('Your team has already applied to this problem');
    }

    // Mentor details are optional. No invitation or approval is required.
    let mentorName = input.mentor_name || null;
    const mentorMemberId = input.mentor_member_id || null;

    if (mentorMemberId) {
      const { rows: members } = await client.query(
        `SELECT id, name
         FROM team_members
         WHERE id = $1 AND team_id = $2`,
        [mentorMemberId, team.id]
      );

      if (!members[0]) {
        throw new ValidationError('Mentor must be a member of your team');
      }

      mentorName = members[0].name;
    }

    const { rows: apps } = await client.query(
      `INSERT INTO applications
        (
          problem_id,
          team_id,
          approach,
          timeline,
          skills,
          budget_resources,
          solution_type,
          mentor_member_id,
          mentor_is_faculty,
          mentor_name,
          status
        )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'submitted')
       RETURNING *`,
      [
        problemId,
        team.id,
        input.approach,
        input.timeline,
        input.skills,
        input.budget_resources || null,
        input.solution_type,
        mentorMemberId,
        !mentorMemberId,
        mentorName
      ]
    );

    const app = apps[0];

    // Every routed university receives a review record.
    for (const route of routeRows) {
      await client.query(
        `INSERT INTO application_university_reviews(application_id, university_id)
         VALUES ($1,$2)
         ON CONFLICT (application_id, university_id) DO NOTHING`,
        [app.id, route.university_id]
      );
    }

    await client.query('COMMIT');

    return { application: app };

  } catch (err) {
    await client.query('ROLLBACK');

    if (err.code === '23505') {
      throw new ConflictError('Your team has already applied to this problem');
    }

    throw err;
  } finally {
    client.release();
  }
}

async function listMyApplications(userId) {
  const { rows } = await pool.query(
    `SELECT a.*, p.title AS problem_title, p.status AS problem_status,
       t.name AS team_name,
       COALESCE(
         json_agg(
           json_build_object(
             'university_id', r.university_id,
             'university_name', u.name,
             'status', r.status,
             'feedback', r.feedback
           )
         ) FILTER (WHERE r.id IS NOT NULL),
         '[]'
       ) AS university_reviews
     FROM applications a
     JOIN teams t ON t.id = a.team_id
     JOIN leaders l ON l.id = t.leader_id
     JOIN problems p ON p.id = a.problem_id
     LEFT JOIN application_university_reviews r ON r.application_id = a.id
     LEFT JOIN universities u ON u.id = r.university_id
     WHERE l.user_id = $1
     GROUP BY a.id, p.title, p.status, t.name
     ORDER BY a.submitted_at DESC`,
    [userId]
  );

  return rows;
}

async function getUniversityId(userId) {
  const { rows } = await pool.query(
    'SELECT id FROM universities WHERE user_id = $1',
    [userId]
  );

  if (!rows[0]) {
    throw new ForbiddenError('University administrator profile not found');
  }

  return rows[0].id;
}

async function listUniversityReviews(userId) {
  const universityId = await getUniversityId(userId);

  const { rows } = await pool.query(
    `SELECT r.id AS review_id,
       r.status AS university_review_status,
       r.feedback,
       a.id AS application_id,
       a.approach,
       a.timeline,
       a.skills,
       a.budget_resources,
       a.solution_type,
       a.status AS application_status,
       a.mentor_name,
       a.submitted_at,
       p.id AS problem_id,
       p.title AS problem_title,
       p.difficulty,
       p.needs_authority,
       t.id AS team_id,
       t.name AS team_name,
       t.level,
       t.level_score,
       l.user_id AS leader_user_id,
       leader.display_name AS leader_name
     FROM application_university_reviews r
     JOIN applications a ON a.id = r.application_id
     JOIN problems p ON p.id = a.problem_id
     JOIN teams t ON t.id = a.team_id
     JOIN leaders l ON l.id = t.leader_id
     JOIN users leader ON leader.id = l.user_id
     WHERE r.university_id = $1
     ORDER BY r.created_at DESC`,
    [universityId]
  );

  return rows;
}

async function reviewApplication(userId, applicationId, decision, feedback) {
  const universityId = await getUniversityId(userId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT r.*, a.status AS application_status, l.user_id AS leader_user_id
       FROM application_university_reviews r
       JOIN applications a ON a.id = r.application_id
       JOIN teams t ON t.id = a.team_id
       JOIN leaders l ON l.id = t.leader_id
       WHERE r.application_id = $1
         AND r.university_id = $2
       FOR UPDATE OF r, a`,
      [applicationId, universityId]
    );

    if (!rows[0]) {
      throw new ForbiddenError('This application is not assigned to your university for review');
    }

    if (rows[0].status !== 'pending') {
      throw new ConflictError('Your university has already reviewed this application');
    }

    if (['rejected', 'withdrawn', 'not_selected'].includes(rows[0].application_status)) {
      throw new ConflictError('This application is no longer reviewable');
    }

    await client.query(
      `UPDATE application_university_reviews
       SET status=$3,
           feedback=$4,
           reviewed_by=$5,
           reviewed_at=NOW()
       WHERE id=$1
         AND university_id=$2
         AND status='pending'`,
      [rows[0].id, universityId, decision, feedback || null, userId]
    );

    await client.query(
      `INSERT INTO notifications(user_id,type,title,message,link)
       VALUES($1,'university_application_review',$2,$3,'/leader/applications')`,
      [
        rows[0].leader_user_id,
        decision === 'approved'
          ? 'University approved your application'
          : 'University rejected your application',
        `A routed university has ${decision} application #${applicationId}.`
      ]
    );

    await client.query(
      `INSERT INTO audit_log(user_id,action,entity_type,entity_id,details)
       VALUES($1,'review_application','application',$2,$3::jsonb)`,
      [
        userId,
        applicationId,
        JSON.stringify({
          university_id: universityId,
          decision,
          feedback: feedback || null
        })
      ]
    );

    if (decision === 'rejected') {
      await client.query(
        `UPDATE applications SET status='rejected' WHERE id=$1`,
        [applicationId]
      );
    } else {
      const { rows: counts } = await client.query(
        `SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status='approved')::int AS approved,
           COUNT(*) FILTER (WHERE status='rejected')::int AS rejected
         FROM application_university_reviews
         WHERE application_id=$1`,
        [applicationId]
      );

      if (counts[0].rejected) {
        await client.query(
          `UPDATE applications SET status='rejected' WHERE id=$1`,
          [applicationId]
        );
      } else if (
        counts[0].total > 0 &&
        counts[0].approved === counts[0].total
      ) {
        await client.query(
          `UPDATE applications SET review_completed_at=NOW() WHERE id=$1`,
          [applicationId]
        );
      }
    }

    await client.query('COMMIT');

    return {
      application_id: applicationId,
      university_id: universityId,
      decision
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function rankProblemApplications(problemId, adminId = null) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [7204, problemId]
    );

    const { rows: ps } = await client.query(
      'SELECT * FROM problems WHERE id=$1 FOR UPDATE',
      [problemId]
    );

    const problem = ps[0];

    if (!problem) throw new NotFoundError('Problem');

    if (!['window_closed', 'open_for_applications'].includes(problem.status)) {
      throw new ConflictError('Problem is not in the review stage');
    }

    if (problem.window_closes_at && new Date(problem.window_closes_at) > new Date()) {
      throw new ConflictError('Application window is still open');
    }

    if (problem.review_deadline && new Date(problem.review_deadline) > new Date()) {
      throw new ConflictError('The review phase is still open');
    }

    await client.query(
      `UPDATE problems SET status='window_closed' WHERE id=$1`,
      [problemId]
    );

    const { rows: apps } = await client.query(
      `SELECT a.id, a.team_id, a.proposal_score, t.level_score,
         CASE
           WHEN p.domain_id IS NOT NULL AND EXISTS (
             SELECT 1
             FROM team_members tm
             WHERE tm.team_id=t.id
               AND (
                 LOWER(tm.branch) LIKE '%' || LOWER(d.name) || '%'
                 OR LOWER(COALESCE(tm.speciality,'')) LIKE '%' || LOWER(d.name) || '%'
                 OR LOWER(COALESCE(tm.interests,'')) LIKE '%' || LOWER(d.name) || '%'
               )
           )
           THEN 1.0
           ELSE 0.5
         END AS domain_fit
       FROM applications a
       JOIN teams t ON t.id=a.team_id
       JOIN problems p ON p.id=a.problem_id
       LEFT JOIN domains d ON d.id=p.domain_id
       WHERE a.problem_id=$1
         AND a.status NOT IN ('rejected','withdrawn','not_selected')
         AND EXISTS (
           SELECT 1
           FROM application_university_reviews r
           WHERE r.application_id=a.id
         )
         AND NOT EXISTS (
           SELECT 1
           FROM application_university_reviews r
           WHERE r.application_id=a.id
             AND r.status <> 'approved'
         )
       FOR UPDATE OF a`,
      [problemId]
    );

    const scored = apps.map((a) => {
      const result = scoreApplication({
        levelScore: a.level_score,
        domainFit: a.domain_fit,
        proposalScore: a.proposal_score,
        difficulty: problem.difficulty
      }, config);

      return {
        ...a,
        score: result.score,
        breakdown: result.breakdown
      };
    }).sort((a, b) => b.score - a.score || a.id - b.id);

    for (let i = 0; i < scored.length; i++) {
      await client.query(
        `UPDATE applications
         SET rank=$2,
             score=$3,
             score_breakdown=$4::jsonb,
             status='ranked'
         WHERE id=$1`,
        [
          scored[i].id,
          i + 1,
          scored[i].score.toFixed(4),
          JSON.stringify(scored[i].breakdown)
        ]
      );
    }

    if (scored.length > 0) {
      await client.query(
        `UPDATE applications
         SET status='not_selected'
         WHERE problem_id=$1
           AND status IN ('submitted','ranked')
           AND id <> ALL($2::int[])`,
        [problemId, scored.map((a) => a.id)]
      );

      // Ranking completes only when at least one application
      // has approval from every routed university.
      await client.query(
        `UPDATE problems SET status='pending_approval' WHERE id=$1`,
        [problemId]
      );
    }

    if (adminId) {
      await client.query(
        `INSERT INTO audit_log(user_id,action,entity_type,entity_id,details)
         VALUES($1,'rank_applications','problem',$2,$3::jsonb)`,
        [
          adminId,
          problemId,
          JSON.stringify({ ranked_count: scored.length })
        ]
      );
    }

    await client.query('COMMIT');

    return {
      problem_id: problemId,
      ranked_count: scored.length,
      ranking: scored.map((a, i) => ({
        application_id: a.id,
        rank: i + 1,
        score: Number(a.score.toFixed(4))
      }))
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function rateProposal(adminId, applicationId, score, feedback) {
  const { rows } = await pool.query(
    `UPDATE applications a
     SET proposal_score=$2,
         feedback=$3,
         proposal_rated_by=$4,
         status=CASE
           WHEN a.status='ranked'
           THEN 'submitted'::application_status
           ELSE a.status
         END,
         rank=NULL,
         score=NULL,
         score_breakdown=NULL
     FROM problems p
     WHERE a.id=$1
       AND p.id=a.problem_id
       AND a.status NOT IN ('rejected','withdrawn','not_selected','selected','approved')
       AND p.status='window_closed'
       AND p.review_deadline > NOW()
     RETURNING a.id`,
    [applicationId, score, feedback || null, adminId]
  );

  if (!rows[0]) {
    throw new ConflictError('Application cannot be rated in its current state');
  }

  await pool.query(
    `INSERT INTO audit_log(user_id,action,entity_type,entity_id,details)
     VALUES($1,'rate_application','application',$2,$3::jsonb)`,
    [
      adminId,
      applicationId,
      JSON.stringify({
        proposal_score: score,
        feedback: feedback || null
      })
    ]
  );

  return {
    application_id: applicationId,
    proposal_score: score
  };
}

async function selectApplication(adminId, applicationId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: lookup } = await client.query(
      'SELECT problem_id FROM applications WHERE id=$1',
      [applicationId]
    );

    if (!lookup[0]) throw new NotFoundError('Application');

    const problemId = lookup[0].problem_id;

    await client.query(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [7204, problemId]
    );

    const { rows: apps } = await client.query(
      `SELECT a.*, t.id AS team_id, t.name AS team_name, t.university_id,
         l.user_id AS leader_user_id,
         p.status AS problem_status
       FROM applications a
       JOIN teams t ON t.id=a.team_id
       JOIN leaders l ON l.id=t.leader_id
       JOIN problems p ON p.id=a.problem_id
       WHERE a.id=$1
       FOR UPDATE OF a,t,p`,
      [applicationId]
    );

    const app = apps[0];

    if (!app) throw new NotFoundError('Application');

    if (app.status !== 'ranked') {
      throw new ConflictError('Only a ranked application can be selected');
    }

    if (app.problem_status !== 'pending_approval') {
      throw new ConflictError('Problem must complete ranking before selection');
    }

    // Mentor approval is not required.
    // Every routed university must still approve.
    const { rows: reviews } = await client.query(
      `SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status='approved')::int AS approved
       FROM application_university_reviews
       WHERE application_id=$1`,
      [applicationId]
    );

    if (!reviews[0].total || reviews[0].approved !== reviews[0].total) {
      throw new ConflictError('Every routed university must approve this application before selection');
    }

    await client.query(
      'SELECT pg_advisory_xact_lock($1, $2)',
      [7205, app.team_id]
    );

    const { rows: active } = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM projects
       WHERE team_id=$1 AND status='active'`,
      [app.team_id]
    );

    if (active[0].count >= config.application.maxActiveProjects) {
      throw new ConflictError(
        `This team has reached its active project limit (${config.application.maxActiveProjects})`
      );
    }

    const { rows: existing } = await client.query(
      'SELECT id FROM projects WHERE problem_id=$1 OR application_id=$2',
      [problemId, applicationId]
    );

    if (existing[0]) {
      throw new ConflictError('This problem has already been claimed');
    }

    const { rows: projectRows } = await client.query(
      `INSERT INTO projects(
         problem_id,
         team_id,
         application_id,
         status,
         started_at,
         last_milestone_at,
         stale_deadline
       )
       VALUES($1,$2,$3,'active',NOW(),NOW(),NOW()+($4 * INTERVAL '1 day'))
       RETURNING *`,
      [
        problemId,
        app.team_id,
        applicationId,
        config.application.staleDays
      ]
    );

    await client.query(
      `UPDATE applications
       SET status='selected', selected_at=NOW()
       WHERE problem_id=$1 AND id=$2`,
      [problemId, applicationId]
    );

    await client.query(
      `UPDATE applications
       SET status='not_selected'
       WHERE problem_id=$1
         AND id<>$2
         AND status NOT IN ('rejected','withdrawn')`,
      [problemId, applicationId]
    );

    await client.query(
      `UPDATE problems SET status='claimed' WHERE id=$1`,
      [problemId]
    );

    await client.query(
      `INSERT INTO notifications(user_id,type,title,message,link)
       VALUES($1,'team_selected','Your proposal was selected',$2,$3)`,
      [
        app.leader_user_id,
        `Your team ${app.team_name} was selected for problem #${problemId}.`,
        '/leader/applications'
      ]
    );

    await client.query(
      `INSERT INTO audit_log(user_id,action,entity_type,entity_id,details)
       VALUES($1,'select_application','application',$2,$3::jsonb)`,
      [
        adminId,
        applicationId,
        JSON.stringify({
          problem_id: problemId,
          project_id: projectRows[0].id
        })
      ]
    );

    await client.query('COMMIT');

    return {
      project: projectRows[0],
      selected_application_id: applicationId
    };

  } catch (err) {
    await client.query('ROLLBACK');

    if (err.code === '23505') {
      throw new ConflictError('Another team has already claimed this problem');
    }

    throw err;
  } finally {
    client.release();
  }
}

async function listAdminProblems() {
  const { rows } = await pool.query(
    `SELECT p.id,p.title,p.description,p.status,p.difficulty,p.solution_types,p.required_skills,
       p.needs_authority,p.window_closes_at,p.review_deadline,p.created_at,
       d.name AS domain_name,
       COUNT(DISTINCT pr.university_id)::int AS routed_universities,
       COUNT(DISTINCT a.id)::int AS application_count
     FROM problems p
     LEFT JOIN domains d ON d.id=p.domain_id
     LEFT JOIN problem_routes pr ON pr.problem_id=p.id
     LEFT JOIN applications a ON a.problem_id=p.id
     WHERE p.status NOT IN ('resolved_duplicate','rejected_spam')
     GROUP BY p.id,d.name
     ORDER BY p.created_at DESC`
  );

  return rows;
}

async function runLifecycleJobs() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const lock = await client.query(
      'SELECT pg_try_advisory_xact_lock(7400, 1) AS locked'
    );

    if (!lock.rows[0].locked) {
      await client.query('ROLLBACK');
      return { skipped: true };
    }

    const closed = await client.query(
      `UPDATE problems
       SET status='window_closed'
       WHERE status='open_for_applications'
         AND window_closes_at <= NOW()
       RETURNING id`
    );

    const stale = await client.query(
      `UPDATE projects
       SET status='reopened'
       WHERE status='active'
         AND stale_deadline IS NOT NULL
         AND stale_deadline <= NOW()
       RETURNING problem_id, team_id`
    );

    for (const item of stale.rows) {
      await client.query(
        `UPDATE problems
         SET status='reopened'
         WHERE id=$1
           AND status IN ('claimed','in_progress')`,
        [item.problem_id]
      );
    }

    await client.query('COMMIT');

    const ranked = [];

    const { rows: readyToRank } = await pool.query(
      `SELECT p.id
       FROM problems p
       WHERE p.status='window_closed'
         AND p.review_deadline <= NOW()
         AND EXISTS (
           SELECT 1
           FROM applications a
           WHERE a.problem_id=p.id
             AND a.status='submitted'
         )`
    );

    for (const item of readyToRank) {
      try {
        ranked.push(await rankProblemApplications(item.id));
      } catch (err) {
        // Keep the job retryable; a failed problem is retried on the next pass.
        ranked.push({
          problem_id: item.id,
          error: err.message
        });
      }
    }

    return {
      windows_closed: closed.rowCount,
      stale_projects_reopened: stale.rowCount,
      ranking: ranked
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listAdminApplications() {
  const { rows } = await pool.query(
    `SELECT a.id,a.problem_id,a.team_id,a.status,a.rank,a.score,a.score_breakdown,
       a.proposal_score,a.feedback,a.mentor_name,a.submitted_at,
       p.title AS problem_title,
       t.name AS team_name,
       COALESCE(
         json_agg(
           json_build_object(
             'university_id',r.university_id,
             'university_name',u.name,
             'status',r.status
           )
         ) FILTER (WHERE r.id IS NOT NULL),
         '[]'
       ) AS reviews
     FROM applications a
     JOIN problems p ON p.id=a.problem_id
     JOIN teams t ON t.id=a.team_id
     LEFT JOIN application_university_reviews r ON r.application_id=a.id
     LEFT JOIN universities u ON u.id=r.university_id
     GROUP BY a.id,p.title,t.name
     ORDER BY a.submitted_at DESC`
  );

  return rows;
}

module.exports = {
  listAvailableProblems,
  listMentorOptions,
  classifyProblem,
  submitApplication,
  listMyApplications,
  listUniversityReviews,
  reviewApplication,
  rankProblemApplications,
  rateProposal,
  selectApplication,
  listAdminProblems,
  listAdminApplications,
  runLifecycleJobs
};