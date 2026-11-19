'use strict';

/** Shared, distance-independent university routing. Distance is metadata only. */
const OPEN_ROUTABLE_STATUSES = [
  'reported', 'unrouted', 'open_for_applications', 'window_closed', 'reopened',
];

function normalizeRequiredSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return [...new Set(skills
    .map((skill) => String(skill || '').replace(/[%_]/g, '').trim().toLowerCase())
    .filter((skill) => skill.length >= 2 && skill.length <= 80))].slice(0, 20);
}

function matchesAnySkill(profileText, skills) {
  const profile = String(profileText || '').toLowerCase();
  return normalizeRequiredSkills(skills).some((skill) => profile.includes(skill));
}

async function routeProblem(client, problemId) {
  const { rows: problems } = await client.query(
    `SELECT id, domain_id, lat, lng, required_skills, status
     FROM problems WHERE id=$1 FOR UPDATE`, [problemId]
  );
  const problem = problems[0];
  if (!problem) return { routed: false, universityCount: 0, reason: 'problem_not_found' };
  if (problem.lat == null || problem.lng == null) {
    await client.query("UPDATE problems SET status='unrouted' WHERE id=$1 AND status='reported'", [problemId]);
    return { routed: false, universityCount: 0, reason: 'missing_coordinates' };
  }

  const skills = normalizeRequiredSkills(problem.required_skills);
  const { rows } = await client.query(
    `SELECT u.id AS university_id,
            (earth_distance(ll_to_earth(u.lat, u.lng), ll_to_earth($1, $2)) / 1000.0) AS distance_km
     FROM universities u
     WHERE u.verified=TRUE AND u.lat IS NOT NULL AND u.lng IS NOT NULL
       AND (
         EXISTS (SELECT 1 FROM departments d
                 WHERE d.university_id=u.id AND d.domain_id=$3)
         OR (
           cardinality($4::text[]) > 0
           AND EXISTS (
             SELECT 1 FROM teams t JOIN team_members tm ON tm.team_id=t.id
             WHERE t.university_id=u.id
               AND EXISTS (
                 SELECT 1 FROM unnest($4::text[]) AS skill(value)
                 WHERE concat_ws(' ', tm.branch, tm.speciality, tm.interests)
                       ILIKE '%' || skill.value || '%'
               )
           )
         )
         OR TRUE
       )
     ORDER BY distance_km ASC, u.id ASC`,
    [problem.lat, problem.lng, problem.domain_id, skills]
  );

  for (const university of rows) {
    await client.query(
      `INSERT INTO problem_routes (problem_id, university_id, distance_km)
       VALUES ($1,$2,$3)
       ON CONFLICT (problem_id, university_id)
       DO UPDATE SET distance_km=EXCLUDED.distance_km`,
      [problemId, university.university_id, Number(university.distance_km)]
    );
  }

  if (rows.length) {
    await client.query(
      `UPDATE problems SET status=CASE WHEN status='unrouted' THEN 'reported'::problem_status ELSE status END
       WHERE id=$1`, [problemId]
    );
  } else {
    await client.query(
      `UPDATE problems SET status='unrouted' WHERE id=$1 AND status=ANY($2::problem_status[])
       AND NOT EXISTS (SELECT 1 FROM problem_routes WHERE problem_id=$1)`,
      [problemId, OPEN_ROUTABLE_STATUSES]
    );
  }
  return {
    routed: rows.length > 0,
    universityCount: rows.length,
    universityIds: rows.map((row) => Number(row.university_id)),
    farAwayCount: rows.filter((row) => Number(row.distance_km) > 150).length,
    requiredSkills: skills,
  };
}

async function rerouteOpenProblems(client) {
  const { rows } = await client.query(
    `SELECT id FROM problems WHERE status=ANY($1::problem_status[])
       AND lat IS NOT NULL AND lng IS NOT NULL ORDER BY id`, [OPEN_ROUTABLE_STATUSES]
  );
  const results = [];
  for (const problem of rows) results.push(await routeProblem(client, problem.id));
  return { checked: rows.length, routed: results.filter((result) => result.routed).length };
}

module.exports = { routeProblem, rerouteOpenProblems, normalizeRequiredSkills, matchesAnySkill };
