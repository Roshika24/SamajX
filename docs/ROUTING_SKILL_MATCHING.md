# CivicPulse — skill-based, distance-independent routing

## What changed

- University department/domain matches continue to route automatically.
- Platform Admin can specify up to 20 required expertise phrases for each problem (for example: `computer vision`, `IoT`, `GIS`, `sensors`).
- A verified university also matches when at least one team member's branch, speciality or interests contains one of those explicit required skill phrases.
- Matching is not limited to 25/50/100/200 km. Every matching verified university is routed; distance is stored for display only. The existing leader discovery UI labels distances above 150 km as `Far away` and does not filter them out.
- Existing open/unrouted problems are re-evaluated when a university is verified, a department is added, or team-member expertise is added/updated/removed.
- Existing routes are retained (routing is additive) so this repair does not silently revoke an institution's access to an already-routed problem.
- If no university matches, classification and skill requirements are saved but the application window is not opened. The UI explains that a team/university profile must be completed and the admin can retry classification.

## Migration

Apply `005_skill_based_distance_independent_routing.sql` after migrations 001–004 using the existing migration runner. It adds `problems.required_skills` and a GIN index only; it does not delete or rewrite existing reports, routes, universities, teams or members.

## For the current GLA / pothole test

The GLA team currently has ESE and ECE branches but no speciality or interests. Branch labels alone are not assumed to prove pothole/infrastructure expertise. After migration 005:

1. In the Team Leader workspace, edit each member's expertise and add only genuine capabilities (for example IoT sensors, embedded systems, computer vision, GIS or road-condition monitoring, if accurate).
2. In Platform Admin → Phase 4 workflows, set the problem's required skills to the subset actually needed for this pothole project.
3. Save classification again. The system will route the problem to GLA if the declared team profile matches; otherwise it will leave the problem unrouted and explain why.

No manual inserts into `problem_routes` are needed.
