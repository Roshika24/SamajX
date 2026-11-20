# SamajX — Progress Tracker

Read this at the start of every session alongside SPEC.md and DECISIONS.md.

---

## Phase 0 — PLAN ONLY ✅
- [x] Read and analyze the full prompt
- [x] SPEC.md — requirements restatement, assumptions, questions
- [x] STATE_MACHINES.md — all entity state machines with transitions
- [x] SCHEMA.sql — full DDL with indexes and constraints
- [x] API.md — all endpoints with roles, request/response shapes
- [x] DESIGN_SYSTEM.md — tokens, components, page inventory
- [x] DECISIONS.md — design decisions log
- [x] PROGRESS.md — this file
- [x] FUTURE.md — deferred ideas
- [x] User approved (all 5 questions answered with proposed defaults)

## Phase 1 — FOUNDATION ✅
- [x] Repo scaffold (server/ and client/)
- [x] .env.example and config module
- [x] Migration runner script
- [x] DB connection (pg pool)
- [x] Migration file: 001_initial.sql (copied from SCHEMA.sql)
- [x] Auth module (register, login, logout, me)
- [x] JWT in httpOnly cookies
- [x] bcrypt password hashing (bcryptjs — D-019)
- [x] Role + ownership middleware
- [x] Central error handling
- [x] Audit-log helper
- [x] State machine helper (table-driven transitions with row locking)
- [x] Design system CSS (tokens.css, global.css, fonts.css)
- [x] Base components: Button, Card, Chip, Badge, Modal, Timer, ProgressBar, EmptyState
- [x] App shell with react-router-dom
- [x] Role-based routing (ProtectedRoute with role check)
- [x] Login and register pages (UI connected to auth API)
- [x] Layouts: Public, Citizen, Leader, University, Company, PlatformAdmin
- [x] Dashboard placeholders for all 5 roles
- [x] Seed script skeleton
- [x] npm install (server: 104 packages, client: 73 packages)
- [x] Client build passes (61 modules, 0 errors)
- [x] **Run initial migration** (22 tables; confirmed by PostgreSQL 16 audit)
- [x] **Run seed script** (confirmed by PostgreSQL 16 audit)

## Phase 2 — UNIVERSITIES, LEADERS, TEAMS 🟡 IMPLEMENTED — AWAITING USER APPROVAL
- [x] University registration endpoint + UI (user, university, departments, promo code in one transaction)
- [x] Platform admin: verify university
- [x] Department CRUD (add/list/remove)
- [x] Promo code generation, regenerate, revoke; owner-only read
- [x] Leader signup with promo code, academic identity and atomic join-count increment
- [x] University admin: approve/reject/suspend leaders
- [x] Team creation; leader auto-added as first member with real enrollment number
- [x] Member CRUD (add, edit, remove), including enrollment-number updates
- [x] Member evidence CRUD and university-scoped verification/rejection
- [x] Level calculator from average verified member score
- [x] Leader transfer (existing admin-set credential flow retained; see D-027)
- [x] Leader dashboard (team hero, level/XP, members, evidence submission, journey map)
- [x] University admin dashboard (promo code, leader queue, evidence queue)
- [x] Mounted all Phase 2 routers in `index.js`
- [x] Fixed pagination metadata to `{ page, limit, total }`
- [x] Added `002_phase2_leader_profile.sql` migration
- [x] Added permanent Node test suite for pure level/state-machine/pagination rules (4 tests)
- [x] Updated API reference and decision log
- [ ] **Live PostgreSQL 16 integration audit** — not runnable in this environment (no PostgreSQL client/server available)
- [ ] **Full frontend production build** — not runnable; dependency installation could not complete because npm registry access timed out
- [ ] **Convert the original 29-check audit harness** — harness was not included in the uploaded ZIP; only the audit findings were provided

## Phase 3 implementation pass — 2026-11-14

Implemented in the current development worktree (not yet runtime-verified against the user's PostgreSQL instance):
- [x] Citizen report API with citizen-only authorization, Zod validation, coordinate bounds, photo validation and per-user rate limiting.
- [x] Canonical problem creation from the first report and transactional report attachment for high-confidence duplicates; claimed/in-progress projects retain their claim and notify the team leader.
- [x] Category/domain-specific merge radius lookup and explainable cosine text similarity with high / medium / low bands.
- [x] Medium-confidence duplicate decision flow; a resolved candidate cannot receive a late merge and instead creates a recurrence-linked problem.
- [x] Soft-delete own report with aggregate count/priority adjustment; no destructive deletion of the canonical problem.
- [x] Shared problem feed with domain/status/text/near-coordinate filters, problem details, citizen upvotes, comments and content flags.
- [x] Platform Admin moderation queue for pending problem flags.
- [x] Stepwise geographic routing to verified universities with matching departments or relevant team-member branch/speciality/interests; unrouted problems are marked for admin attention.
- [x] Citizen report, feed (list/map), problem detail/discussion and my-reports pages connected to the APIs.
- [x] Migration `003_report_merge_candidates.sql` added; it only creates the medium-confidence decision table and index.

Known scope limits in this pass:
- Photos can be uploaded as JPEG/PNG with EXIF/eXIf metadata stripped, or supplied as HTTPS image URLs. WebP uploads are intentionally not accepted.
- Citizen email verification and email notifications remain separate work; the current report endpoint does not falsely imply that verification has occurred.
- Routing and report transactions have unit/static checks here but still need execution against the user's PostgreSQL 18 instance after migration 003 is applied.

## Phase 3 — PROBLEMS, REPORTS, MERGING 🟡
- [x] Citizen report form (title, description, domain, map pin, anonymous; photo links supported)
- [x] Direct JPEG/PNG upload with file-size limits, random filenames and EXIF/eXIf metadata stripping
- [x] Reports API and per-citizen report listing
- [x] Problem creation from first report
- [x] Duplicate detection: geographic radius + cosine text similarity (TF-IDF/semantic upgrade remains future work)
- [x] Three-band merge flow (auto / citizen confirmation / new)
- [x] Transactional duplicate decisions with advisory locking
- [x] Problem feed with status, domain, text and location filters
- [x] Map view with Leaflet
- [x] Citizen upvotes
- [x] Public problem comments with rate limiting and comment flagging
- [x] Problem flags and Platform Admin moderation queue
- [x] Anonymous display in public-facing problem data
- [x] Delete own report (soft-delete with aggregate update)
- [ ] Backstop dedupe cron job
- [x] Citizen dashboard entry points

## Phase 4 — CLASSIFY, ROUTE, APPLY, SELECT 🔲
- [ ] Domain/difficulty classification (admin sets)
- [ ] Solution types and needs_authority
- [ ] Routing algorithm (geo + domain, widening radius)
- [ ] Application form (proposal fields)
- [ ] Application window + countdown timer UI
- [ ] Review phase (admin rates proposals)
- [ ] Ranking algorithm with score breakdown
- [ ] Mentor pairing
- [ ] Cross-university approval flow
- [ ] Project claim
- [ ] Active project cap enforcement
- [ ] Cron: close application windows
- [ ] Cron: close review phases + rank
- [ ] Cron: detect stale projects
- [ ] Score breakdown + feedback UI for applicants
- [ ] Problem detail page updates

## Phase 5 — EXECUTION, COMPLETION, CERTIFICATES, SPONSORSHIP 🔲
- [ ] Milestone posting
- [ ] Project journey map UI
- [ ] Final report submission
- [ ] Completion sign-off (university admin)
- [ ] Citizen confirm fix (optional)
- [ ] PDF certificate generation (pdfkit)
- [ ] Verification code generation
- [ ] Public verify page (/verify/:code)
- [ ] Certificate download and email
- [ ] Certificate wall UI
- [ ] Company registration and verification
- [ ] Sponsorship pledge flow
- [ ] Company project gallery
- [ ] Notification table + in-app notifications
- [ ] Email notifications (nodemailer, dev console)
- [ ] All role dashboards complete
- [ ] Confetti celebrations (canvas-confetti)

## Phase 6 — AI LAYER ✅
- [x] LLM integration (Claude API via env vars: `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `AI_MODEL`)
- [x] Feature 1: AI-assisted problem-domain classification
- [x] Feature 2: AI-assisted problem-difficulty prediction
- [x] PII stripping before LLM calls (emails, phone numbers, tokens, text bounded)
- [x] Structured JSON schema validation and taxonomy enforcement
- [x] Asynchronous database-backed job processing (`ai_jobs` table, retry-safe with row locking)
- [x] Platform Admin domain review API & UI (accept or override)
- [x] University Admin difficulty review API & UI (accept or override)
- [x] Migration `007_phase6_ai_layer.sql` added and applied
- [x] Full regression test suite passing (69/69 tests passing)
- [x] Client production build passing (136 modules)

## Phase 7 — POLISH & DELIVERY 🔲
- [ ] Tests: state machines
- [ ] Tests: ranking algorithm
- [ ] Tests: merge logic
- [ ] Tests: ownership checks
- [ ] Seed script with realistic demo data
- [ ] UI delight pass
- [ ] Accessibility pass (WCAG AA)
- [ ] README.md with setup instructions
- [ ] DEMO_SCRIPT.md
- [ ] Backup/migration notes

---

## Known Issues
- Phase 2 source changes have passed JavaScript syntax checks and the 4 dependency-free unit tests.
- PostgreSQL integration behavior has not been re-run here; do not treat the prior external 29-check audit as re-executed.
- Client JSX production build has not been verified because dependency installation timed out.
- Uploaded ZIP did not contain the audit harness, so the new `npm test` suite is a baseline and not yet a conversion of those 29 checks.

## Current Phase
**Phase 5 — EXECUTION, COMPLETION, CERTIFICATES (reduced scope)** (implementation added; PostgreSQL/browser verification pending)

## Next Up
Complete the PostgreSQL 16 + frontend build verification for Phase 2, then wait for user approval before Phase 3.


## Repair pass — 2026-11-12

- [x] Repaired platform-admin navigation: removed sidebar destinations whose Phase 3+ screens do not exist yet.
- [x] Added `/admin/platform/universities` as an alias to the existing Phase 2 university-verification queue.
- [x] Kept the existing dashboard and verification implementation intact.
- [x] Re-ran the 4 dependency-free server unit tests: all passed.
- [x] Re-ran JavaScript syntax checks for server source files.
- [ ] PostgreSQL integration/security tests: still required locally.
- [ ] Client production build: blocked in this Linux validation environment because the uploaded `node_modules` contains Windows-only Rollup optional binaries; rebuild on Windows with `npm ci`.


## Routing repair pass — 2026-11-13

- [x] Registered every destination currently exposed in Citizen, Team Leader, University Admin and Company sidebars.
- [x] Kept Platform Admin dashboard and university-verification routes protected by the platform_admin role.
- [x] Added explicit citizen feed/report/my-reports routes, leader team/problems/applications/certificates routes, university teams/problems/evidence routes, and company projects/sponsorships routes.
- [x] Reused the existing Team Leader workspace for `/leader/team` rather than duplicating team/evidence API logic.
- [x] Removed the duplicate University Promo Code and Leader Queue sidebar destinations; promo code and leader approval remain on the existing University Dashboard.
- [x] Added a university-scoped team directory API (`GET /api/teams`) and frontend Teams page. University admins are scoped to their own university; platform admins must specify a university ID.
- [x] Added honest feature-state pages for routes whose Phase 3–5 APIs do not exist yet, so navigation no longer silently redirects or displays a blank page.
- [x] Server source JavaScript syntax checks passed.
- [x] Existing Node test suite: 4/4 passed.
- [ ] Client production build not verified in this environment: Vite is not installed in the extracted client, and `npm ci` timed out while reaching the npm registry.
- [ ] PostgreSQL integration test of the new university team directory not run here; verify locally after applying the existing migrations.

**Important scope note:** This pass repairs route coverage and implements the university team directory. It does not claim that problem reporting/feed, browse problems, applications, certificates, company gallery or sponsorship are fully implemented; the corresponding backend modules and database migrations are absent from this source ZIP. Their routes now render explicit implementation states rather than redirecting.


## Foundation/authentication audit — 2026-11-14 (clean restart)

- [x] Restarted from the original uploaded project ZIP, not from a prior partial repair package.
- [x] Preserved all five roles and existing migration files.
- [x] Company registration now creates its profile atomically with the user account; registration UI and API contract aligned.
- [x] `/auth/me` exposes role-specific profile aliases while preserving `roleProfile`.
- [x] Shared login/session policy permits pending leaders to see approval status and rejects invalid/orphaned leader profiles.
- [x] University detail and department endpoints enforce verified/unverified visibility rules.
- [x] Shared pagination validation added to university, leader, team and evidence list endpoints.
- [x] Production configuration checks and safer Platform Admin seed behavior added.
- [x] Express app factory and graceful shutdown added.
- [x] Backend unit suite: 18/18 passed; backend syntax and frontend JS/JSX parse checks passed.
- [ ] Frontend Vite production build not run: npm registry dependency installation timed out.
- [x] User supplied read-only pgAdmin evidence confirms both migration ledger entries (`001_initial.sql`, `002_phase2_leader_profile.sql`) and identified the lone company-profile orphan as their own test account; no DB writes were made.
- [ ] Live PostgreSQL integration tests and browser end-to-end checks remain outstanding; screenshot evidence is not a substitute for automated integration testing.

**Current status:** Foundation/authentication code repair is complete in the clean working copy. User-supplied local database screenshots confirm the migration ledger. Automated live PostgreSQL integration, browser E2E and Vite production build remain pending because this validation environment cannot connect to the user's database or install npm dependencies. Do not interpret this as a claim that later phases are implemented.


### Final Step 1 verification update — 2026-11-14

- [x] Cookie-session middleware forwards database errors rather than silently downgrading to anonymous.
- [x] Frontend session restore distinguishes HTTP 401 from network/server errors and offers retry.
- [x] Backend tests: 24/24 pass in the audit copy.
- [x] Backend JavaScript syntax: pass.
- [x] Frontend JavaScript/JSX parse: 32 files, 0 syntax diagnostics.
- [x] User's local migration ledger visually confirmed to contain both project migrations.
- [x] User's test company account preserved; no DB changes.
- [ ] Vite production build, live PostgreSQL integration and browser E2E remain unverified.


## Phase 4 implementation pass — 2026-11-14

Implemented in the isolated Phase 3 working copy:

- [x] Additive migration `004_phase4_workflows.sql` for mentor invitations, per-university application reviews, classification metadata and database-level project uniqueness.
- [x] Platform Admin problem classification: domain, difficulty, allowed solution types, authority requirement, application window and review deadline.
- [x] Leader problem discovery scoped to routed universities; distance is displayed and marked `Far away` only above 150 km, without hiding the problem.
- [x] Proposal submission with approach, timeline, skills, budget/resources, solution type and named mentor.
- [x] 256-bit random mentor invitation tokens; only SHA-256 token hashes are persisted; invitations expire after seven days and can be answered once.
- [x] Separate mentor decision and University Admin review records.
- [x] Cross-university review: every university in `problem_routes` receives a review record; selection is blocked until every routed university approves.
- [x] Difficulty-weighted proposal ranking with an explainable score breakdown.
- [x] Atomic selection/project claim, one-project-per-problem and one-project-per-application database guards, and transaction-scoped advisory locks for concurrent claims and team active-project caps.
- [x] Project activation only after mentor approval, all university approvals, ranking and Platform Admin selection.
- [x] In-app notifications for mentor decisions, university reviews and team selection.
- [x] Lifecycle worker: closes application windows, expires mentor invitations, ranks after the review deadline and reopens stale projects. Worker is retry-safe and uses PostgreSQL advisory locking.
- [x] Connected leader discovery/application pages, mentor approval page, university review queue and Platform Admin Phase 4 workspace.
- [x] Backend test suite: 38/38 passed (dependency-free run with a temporary `dotenv` stub; no database was contacted).
- [x] Backend JavaScript syntax checks passed.
- [x] Client JSX/JS parse check passed for 41 files using the installed TypeScript parser.

Not verified in this environment:
- [ ] Apply migration 004 to the user's PostgreSQL database.
- [ ] PostgreSQL integration tests, including concurrency tests and real mentor/university approval flows.
- [ ] Full Vite production build and browser E2E. `npm ci` timed out while reaching the package registry.
- [ ] Email delivery: this pass generates a time-limited mentor approval link for the leader to securely share; it does not claim that SMTP delivery is configured.
- [ ] Production deployment and security review.

**Current status:** Phase 4 implementation is present in the isolated working copy. It is not yet runtime-verified against the user's database or browser.


### Phase 4 cross-check repair — 2026-11-14

- [x] Fixed a lifecycle edge case: when ranking finds zero eligible applications because mentor or university decisions are still pending, the problem remains `window_closed` instead of moving irreversibly to `pending_approval`. The worker can retry after outstanding decisions are completed.
- [x] The lifecycle worker now avoids repeatedly scanning closed problems that have no submitted applications remaining.
- [x] Added a regression guard for the zero-eligible ranking case.
- [ ] PostgreSQL-backed regression test for this workflow remains required.


## Routing refinement — 2026-11-14

- [x] Added additive migration `005_skill_based_distance_independent_routing.sql` for platform-defined problem expertise requirements.
- [x] Replaced stepped 25/50/100/200 km routing cutoff with distance-independent routing for every verified university matching the problem domain or explicit required skills.
- [x] Required skills match team-member branch, speciality or interests; branch names alone are not treated as proof of unrelated expertise.
- [x] Added required-skill editing to Platform Admin Phase 4 classification.
- [x] Added existing team-member expertise editing to the Team Leader workspace.
- [x] Existing open/unrouted problems are re-evaluated when a university is verified, a department is added, or team-member expertise is added, updated or removed.
- [x] Distance remains display metadata; the existing leader problem feed labels distances above 150 km as `Far away` and does not filter them out.
- [x] If no university matches, classification and required skills are saved but the application window stays closed; the UI explains how to complete profiles and retry.
- [ ] Migration 005, live PostgreSQL routing checks and browser workflow remain to be run in the user's local environment.

## Phase 5 reduced-scope implementation — 2026-11-18

Included scope (per user decision):
- [x] Leader project workspace with milestone posting and proof links.
- [x] Final report and HTTPS proof submission for university review.
- [x] University-scoped completion review with approve/reopen decisions.
- [x] Certificate issuance for every team member after university approval.
- [x] Public certificate verification and PDF download.
- [x] Additive migration `006_phase5_completion_certificates.sql`.
- [x] Node.js/Express project routes and React role workspaces.
- [ ] Runtime PostgreSQL migration/integration verification on the user's database.
- [ ] Full Windows `npm ci`, repeated test runs and production Vite build.
- [ ] Browser-based end-to-end test with real leader/university accounts.

Explicitly deferred by user: sponsorship pledges, company project gallery, email notifications and dashboard redesigns.
