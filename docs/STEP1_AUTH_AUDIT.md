# Step 1 — Foundation and Authentication Audit

## Scope

This pass starts from the originally uploaded `SamajX_Routing_Repair(1).zip`. It preserves the five-role model and the existing PostgreSQL schema/migrations. It does not implement later product phases such as citizen reporting, routing, applications, project execution, certificates or sponsorship.

## Changes in this clean pass

- Company registration now requires company details and creates the `users` and `companies` rows in one transaction.
- Company registration UI collects company name, industry, website and description.
- `/api/auth/me` returns the documented role-specific aliases (`leader`, `university`, `company`) and retains `roleProfile` for compatibility.
- Email addresses are trimmed and lowercased at citizen/university/company registration, leader registration and login boundaries.
- Login and cookie-session restoration share one account-state policy. Pending leaders can log in and view their approval state; only pending/approved leader records are eligible for a session. Inactive users and orphaned/suspended/rejected leader accounts are denied.
- University detail and department endpoints enforce the same verified/unverified visibility rule as the university list: verified universities are visible to authenticated roles; unverified universities are visible only to Platform Admin and their own University Admin. Other callers receive `404`.
- Pagination parsing is shared across university, leader, team and evidence lists; malformed, zero, negative and unsafe page values are rejected, and page size is capped at 100.
- Production startup validates required database configuration, a unique JWT secret of at least 32 characters, a valid single CORS origin and a valid port.
- Platform Admin seeding requires explicit strong credentials in non-development environments and refuses to treat an existing non-admin account as the Platform Admin.
- Frontend logout always clears in-memory authentication state in a `finally` block, even if the logout request fails; the server clears the httpOnly cookie whenever the request reaches it.
- Frontend session restoration now distinguishes an explicit `401` (anonymous session) from network/5xx failures; transient failures show a retry state instead of silently treating the user as logged out.
- Cookie-session middleware distinguishes invalid/expired JWTs from PostgreSQL failures: invalid tokens continue as anonymous requests, while database failures reach the central error handler instead of being misreported as logged-out sessions.
- Express app creation is separated from process startup to make the application factory testable; SIGINT/SIGTERM trigger graceful HTTP/database shutdown.
- Added setup, database-preservation and validation notes in the root README.

## Preserved behavior

- Five roles remain: `citizen`, `university_admin`, `leader`, `company`, `platform_admin`.
- Platform Admin verifies universities.
- University Admin approves/rejects/suspends leaders belonging to their own university.
- Pending leaders retain access to their own approval-status endpoint; team creation and management remain approval-gated in the existing business logic.
- Existing migrations are unchanged. No database reset or data migration is introduced by this pass.

## Verification performed in this environment

- Backend unit suite in the current audit working copy: 24 passed, 0 failed. This includes regression tests for invalid JWTs, valid sessions and database failures in cookie-session middleware.
- Backend JavaScript syntax checks: passed.
- Frontend JavaScript/JSX parse check using the installed TypeScript parser: 32 files parsed, 0 syntax diagnostics.
- Original source ZIP integrity: passed before extraction.
- User's local pgAdmin screenshots confirm `public._migrations` exists and records both `001_initial.sql` and `002_phase2_leader_profile.sql`. No migration or database write was requested or performed during this audit.
- User's local read-only account audit found one company-role user without a company profile; user confirmed it is their own test account. It was preserved unchanged; no profile was fabricated and no account was deleted.

## Not verified here

- `npm ci` could not complete because the npm registry request timed out in this environment.
- Frontend Vite production build was therefore not run.
- No live PostgreSQL connection was available for transaction/constraint integration tests.
- No browser end-to-end run was available.

The transaction tests use a deterministic database-client double. They verify query order and error propagation, not PostgreSQL's actual transaction engine or schema constraints. A backed-up local PostgreSQL database and browser smoke test remain necessary before deployment.


## Startup, seed and migration safety review

- Production startup validates the port, explicit database URL, a unique JWT secret of at least 32 characters, and a single valid CORS origin.
- The Platform Admin seed refuses production execution without explicit admin credentials and refuses to claim an existing non-admin email. Existing Platform Admin accounts are left unchanged.
- The migration runner uses `_migrations` as its sole applied-file ledger. The SQL files include non-idempotent enum/table/trigger creation, so a pre-existing schema with missing ledger rows must not be migrated blindly. Setup documentation now explicitly limits first-time migration execution to a fresh database or a verified migration ledger.
- No migrations were edited or added in this Step 1 audit. No database reset or data repair was performed.
- Email SMTP values remain reserved for the planned Phase 3 email workflow; no mail delivery or email-verification endpoint is claimed as implemented.


## Final local database evidence supplied by the user

The user's pgAdmin query results show both expected migration ledger entries (IDs 1 and 2) with timestamps on 2026-11-12. This is screenshot-based verification of the user's local database, not a direct connection from this audit environment. The user's role-count query showed 3 citizens, 1 university admin, 1 leader, 1 company and 1 platform admin. The single company account missing a company profile was identified as the user's own test account (user ID 7) and deliberately left untouched.

## Final frontend session recovery hardening

`AuthContext` now treats only HTTP 401 as an anonymous session. A network error or server error displays a retryable session-verification message in the app shell. This avoids presenting transient infrastructure failures as a normal logout. The changed client source passed TypeScript parser syntax validation; the Vite production build remains unverified because dependencies could not be installed in this environment.
