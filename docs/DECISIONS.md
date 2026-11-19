# CivicPulse — Decisions Log

Every design decision, deviation from the prompt, and ambiguity resolution is recorded here.
Read this at the start of every session.

---

## Phase 0 Decisions

### D-001: One role per user account
**Decision**: Each user account has exactly one role. A leader cannot also submit citizen reports.
**Reason**: Simplifies auth middleware, role checks, and the UI. If a leader wants to report a problem, they need a separate citizen account with a different email.
**Risk**: Minor UX friction for students who want to also report problems.

### D-002: One team per leader
**Decision**: A leader can create exactly one team. Enforced via UNIQUE constraint on `teams.leader_id`.
**Reason**: The prompt says "The leader creates a team" (singular). Multiple teams per leader would complicate project caps and level calculation.

### D-003: Only routed university teams can apply
**Decision**: Only teams from universities that were routed to a problem can apply. "Any team can apply to ANY problem" means any difficulty level, not any geography.
**Reason**: Without this restriction, routing would be meaningless. Geographic proximity is a core design principle — students solve local problems.

### D-004: Review phase after window closes
**Decision**: Added a configurable "review phase" (default 48h) between window close and ranking. During this phase, university admins rate proposals from their own teams 1–5. Unrated proposals after the deadline get a default score of 3/5.
**Reason**: The ranking formula requires `proposal_score` (admin-rated), but the prompt says ranking happens "when the window closes." These conflict. The review phase resolves this cleanly.
**Deviation from prompt**: The prompt doesn't mention a review phase. I've added `review_deadline` to the problems table and a `window_closed` → `pending_approval` transition that fires after the review phase.

### D-005: Priority score formula
**Decision**: `priority_score = report_count × 2 + upvote_count`. Recalculated on every new report merge and upvote.
**Reason**: Simple, transparent, and serves the purpose of surfacing important problems. Can be refined later.

### D-006: University location via map pin
**Decision**: Universities enter their location as a lat/lng map pin during registration. No geocoding service.
**Reason**: Keeps dependencies lean. Geocoding would require an external API. A map pin is sufficient and more accurate for campus locations.

### D-007: Platform admin bootstrap
**Decision**: The first platform admin is created via a seed script using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.
**Reason**: Standard bootstrap pattern. No self-service signup for platform admins.

### D-008: Enrollment number uniqueness scope
**Decision**: `UNIQUE(university_id, enrollment_number)` across ALL teams in that university. One person cannot be on multiple teams.
**Reason**: The prompt explicitly says "unique within the university, to stop one person sitting on several teams."

### D-009: Leader transfer mechanics
**Decision**: University admin can transfer the leader role to an existing member of the team. The old leader's user account status is set to `suspended`. They remain a member record (for certificates). A new user account is created for the new leader if they don't have one.
**Reason**: The prompt says "the university admin can reassign the leader if they graduate or disappear." The old leader shouldn't be able to log in anymore.

### D-010: Comment visibility
**Decision**: Comments on problems are public. Any logged-in user can comment. Flagged comments go to the moderation queue.
**Reason**: Public discourse helps citizens and teams discuss problems openly. Moderation controls abuse.

### D-011: Certificate verification code format
**Decision**: 32-character hex string generated via `crypto.randomBytes(16).toString('hex')`. Not sequential.
**Reason**: The prompt says "a long random verification code (not sequential)." 32 hex chars = 128 bits of entropy, virtually impossible to guess.

### D-012: PostgreSQL earthdistance extension for geo queries
**Decision**: Use PostgreSQL's built-in `earthdistance` + `cube` extensions for geographic distance calculations instead of computing Haversine in application code.
**Reason**: These are built-in contrib modules (not external dependencies), provide GiST-indexable distance calculations, and are significantly more efficient than per-row Haversine in SQL.

### D-013: Application visibility during window
**Decision**: While the application window is open, applicants can see the number of other applications but not who they are. After ranking, each applicant sees their own score breakdown. Admins see everything.
**Reason**: Prevents gaming (e.g., not applying because a strong team already did) while still providing transparency after the fact.

### D-014: Stale project runner-up flow
**Decision**: When a project goes stale → project status `reopened`, problem status `reopened`. If a runner-up from the original round exists (next-ranked, not withdrawn/rejected) → problem goes to `pending_approval` with that team selected. If no runner-up → problem goes to `open_for_applications` with a new window.
**Reason**: Follows the prompt's stale rule. Prioritizes the original applicant pool before opening a new window.

### D-015: Domain stored as a reference table, not enum
**Decision**: Domains are stored in a `domains` table (not a PostgreSQL ENUM) because they're configurable and may change.
**Reason**: The prompt says domains are "configurable" (a table). Adding/removing domains shouldn't require a migration.

### D-016: Photos stored as JSON array of file paths
**Decision**: Report photos are stored as a JSONB array of file path strings on the `reports` table. No separate `photos` table.
**Reason**: Photos are always fetched with their report. A separate table adds complexity without benefit. Maximum 5 photos per report.

### D-017: Difficulty re-check threshold
**Decision**: When `report_count` passes a configurable threshold (default 10), the system flags the problem for difficulty re-evaluation by an admin. It does NOT auto-change the difficulty.
**Reason**: The prompt says "re-check difficulty" — the admin still has final say.

### D-018: Project name
**Decision**: The project is called "CivicPulse."
**Reason**: Captures the civic + community heartbeat theme. Short, memorable, domain-available-ish.

### D-019: bcryptjs instead of bcrypt
**Decision**: Use `bcryptjs` (pure JavaScript) instead of `bcrypt` (native C++ addon).
**Reason**: Avoids native compilation issues on Windows. Functionally identical API, ~30% slower hashing which is irrelevant at our scale.

### D-020: cookie-parser as 10th server dependency
**Decision**: Added `cookie-parser` to read JWT from httpOnly cookies in `req.cookies`.
**Reason**: Express does not parse cookies natively. Required by our auth middleware to read the JWT token from the `token` cookie.


### D-021: University onboarding is a single registration transaction
**Decision**: `POST /api/auth/register` accepts university details and department selections for `university_admin`; user, university, departments and initial promo code are created in one PostgreSQL transaction.
**Reason**: Prevents the previously observed orphaned university-admin account with no university profile. Platform verification remains a separate step.

### D-022: Leader enrollment identity is collected before team creation
**Decision**: Leader signup requires enrollment number, branch and year. These are stored on the leader record and copied into the leader's first team-member record when a team is created. A Phase 2 migration adds these fields.
**Reason**: Removes the `LEADER-1` placeholder and makes enrollment uniqueness enforceable from the beginning.

### D-023: Promo-code signup serializes usage
**Decision**: Leader signup locks the university row with `FOR UPDATE`, validates verification/expiry/active/join-limit state, creates the user and leader, then increments the join count before committing. Promo regeneration uses a longer random code and retries unique collisions with savepoints.
**Reason**: Concurrent signups cannot exceed the join limit or consume a stale code.

### D-024: Suspensions are checked against current database state
**Decision**: Authentication middleware reloads the user's current status (and leader status) for cookie-authenticated requests. Rejected/suspended leaders and suspended user accounts cannot continue using previously issued JWTs.
**Reason**: JWT expiry alone leaves a long access window after suspension or transfer. This adds one indexed user lookup per authenticated request in exchange for immediate revocation.

### D-025: University promo codes are owner-only data
**Decision**: Public university detail/list queries omit promo-code fields. The owning university admin can retrieve them through `/api/universities/me` or `/api/universities/:id/promo-code`. Audit logs record that a code was regenerated but do not copy the secret itself.
**Reason**: Prevents the promo-code gate from being bypassed by any logged-in user.

### D-026: Team member PII requires team/university ownership
**Decision**: Team detail/member/evidence reads are limited to the owning leader, the owning university admin, or the platform admin. Citizen/company roles cannot read team rosters.
**Reason**: Team records contain email addresses and enrollment numbers.

### D-027: Existing leader-transfer credential flow retained for this phase
**Decision**: The current transfer endpoint still accepts the new leader's email and password from the university admin.
**Reason**: A secure invite-link flow requires an email delivery/token lifecycle not present in the current Phase 1 code. It remains a known improvement; no email invite was fabricated in this phase.


### D-028: Enrollment identity writes are serialized across leaders and members
**Decision**: Leader signup, team creation, member addition and enrollment-number edits lock the university row and check both `leaders` and `team_members` before committing. Team ownership is rechecked under a row lock before leader write operations.
**Reason**: A unique index on either table alone cannot enforce uniqueness across both tables; the shared university-row lock serializes the application-level cross-table check.


### D-029: Hide navigation for unimplemented phases
**Decision**: The Phase 2 platform-admin sidebar exposes only Dashboard and Universities. The Universities route reuses the existing Phase 2 university verification queue. Companies, moderation, problems and audit navigation remain hidden until their screens and APIs are implemented.
**Reason**: Links to unimplemented routes were triggering the catch-all redirect to `/`, making the dashboard appear broken. Hiding future-phase destinations avoids false affordances without fabricating placeholder functionality.

## D-ROUTE-001 — Explicit routes for all role navigation (2026-11-13)

All destinations shown in role sidebars must be registered as protected React Router routes. When a feature's API does not yet exist, its route must render a clear, non-empty implementation state rather than falling through to the catch-all redirect. This prevents navigation from appearing broken without falsely presenting an unfinished feature as functional.

## D-ROUTE-002 — University team directory scope (2026-11-13)

The university team directory is scoped by the authenticated university admin's university ID on the server. A platform admin must provide an explicit `university_id`; the API does not expose an unbounded cross-university team listing by default.

## D-PHASE5-001 — Reduced Phase 5 scope (2026-11-18)

Implement only project milestones/progress, final report and proof, university completion sign-off, PDF certificates and public verification. Defer sponsorship, company project gallery, email notifications and unrelated dashboard redesign. Certificate issuance occurs only after the owning university admin approves completion. Reopening requires written feedback.

## D-PHASE6-001 — Asynchronous AI layer with human-in-the-loop review (2026-11-19)

Phase 6 implements exactly two approved AI features: AI-assisted problem-domain classification and AI-assisted problem-difficulty prediction. Both run asynchronously via a database-backed job queue (`ai_jobs`) with bounded retries and transactional row locking. Citizen problem submissions return immediately and are never blocked by external LLM provider calls. Prior to external transmission, all problem text is sanitized of PII (emails, phone numbers, auth tokens) and bounded to 2000 characters. LLM responses are strictly validated JSON matching the database domain taxonomy and allowed difficulty enum ('small', 'medium', 'hard'). Platform Admin is the authoritative reviewer for problem domains; University Admin is the authoritative reviewer for difficulty predictions. Original AI suggestions and explanations are immutably preserved alongside human review decisions.

