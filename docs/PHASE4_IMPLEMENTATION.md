# SamajX Phase 4 — implementation and rollout

## Included workflows

1. Platform Admin classifies a routed problem, selects its domain, difficulty, allowed solution types and authority requirement, and sets application/review windows.
2. A team leader at any university in `problem_routes` submits one proposal for their team and selects a team-member or external mentor.
3. The server creates a 256-bit random, seven-day mentor invitation. Only its SHA-256 hash is stored. The leader receives the one-time link to share with the named mentor. The mentor approves or declines through the public bearer-link page.
4. Every university to which the problem was routed receives a separate review row for the application. A University Admin can decide only for their own university.
5. Once the application window closes, the review period remains open. University reviews and Platform Admin proposal scores can be recorded during this period.
6. After the review deadline, the lifecycle worker ranks applications that have mentor consent and approval from every routed university. Ranking stores an explainable score breakdown.
7. Platform Admin selects a ranked application. The selection transaction locks the problem and team, checks the active-project cap, inserts the active project, marks the problem claimed, rejects competing selections and writes notifications/audit data.

## Safety properties

- Mentor invitation tokens are random, one-time, expiring and stored only as hashes.
- University review rows are unique per application/university.
- A team can submit only one application per problem (existing unique constraint).
- A problem and application can each be claimed by only one project (migration 004 unique indexes).
- PostgreSQL advisory transaction locks serialize simultaneous selection attempts for the same problem and team.
- A project is not created/activated before mentor approval, all routed-university approvals, ranking and Platform Admin selection.
- The lifecycle worker is retry-safe and uses a PostgreSQL advisory lock. It can run on multiple app instances without duplicating state transitions.
- Distance is descriptive: routed problems remain visible regardless of distance; only distances above 150 km are labelled `Far away`.

## API surface

- `GET /api/applications/problems` — problems routed to the leader's university.
- `GET /api/applications/mentor-options` — leader's team members available as mentors.
- `POST /api/applications/problems/:problemId` — submit proposal and create mentor invitation.
- `GET /api/applications/mine` — leader's application statuses and review decisions.
- `POST /api/applications/mentor/:token/respond` — public mentor approval/decline using the invitation token.
- `GET /api/applications/university/reviews` — University Admin's review queue.
- `PATCH /api/applications/:applicationId/university-review` — approve/reject for the authenticated university.
- `GET /api/admin/phase4/problems` — Platform Admin problem classification queue.
- `PATCH /api/admin/phase4/problems/:id/classification` — classify and open the application window.
- `GET /api/admin/phase4/applications` — application ranking/review view.
- `PATCH /api/admin/phase4/applications/:id/score` — rate proposal (during review phase).
- `POST /api/admin/phase4/applications/:id/rank` — rank after review deadline.
- `POST /api/admin/phase4/applications/:id/select` — atomic project claim and activation.
- `POST /api/admin/phase4/jobs/run` — manually run lifecycle jobs (also scheduled every 60 seconds by the server).

## Database rollout

The package includes additive migration `004_phase4_workflows.sql`. The source archive's prior migration history includes migrations 001–003. Back up the database, confirm `_migrations` matches the existing schema, then from `server` run:

```powershell
npm ci
npm run migrate
```

Do not reset the database or edit/re-run already applied migrations manually. Migration 004 is intended to be recorded and applied by the existing migration runner.

## Verification state

- Backend tests: 45/45 passed after routing refinement and regression tests were added in the isolated worktree using a temporary `dotenv` stub. These are unit/static tests and do not connect to PostgreSQL. A regression guard now keeps the problem in the review state when no proposal is eligible yet, allowing pending mentor/university decisions to complete before ranking.
- Backend JavaScript syntax checks: passed.
- Frontend JSX/JS parse: 41 files passed.
- Not run: PostgreSQL migration/integration tests, simultaneous claim tests, full Vite build and browser E2E. Dependency installation timed out while reaching the npm registry.
- SMTP delivery is not configured. The invitation is generated as a secure, time-limited shareable link; the leader must share it with the named mentor.


## Routing refinement addendum

See `ROUTING_SKILL_MATCHING.md`. Migration 005 adds explicit required expertise phrases. Routing now includes every verified university that matches the problem domain or a team member's declared branch/speciality/interests, with no distance cutoff. Distances above 150 km remain labelled `Far away` in leader discovery. Existing open/unrouted problems are re-evaluated after university verification, department addition and team profile changes. The live PostgreSQL execution of migration 005 is still pending in the user's local environment.
