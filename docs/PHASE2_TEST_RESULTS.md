# Phase 2 — Test and Verification Results

Date: 2026-11-12

## Executed successfully

| Check | Result | Detail |
|---|---|---|
| JavaScript syntax check | PASS | `node --check` run over every `server/src/**/*.js` file |
| Unit tests | PASS | `npm test` — 4 tests passed, 0 failed |
| Level calculation | PASS | Includes the 0 and 5 member-score case (average 2.5 → Intermediate), Beginner, Advanced and empty-team defaults |
| Leader state-machine rules | PASS | Allowed and disallowed actor/status transitions covered |
| Pagination response | PASS | Verifies `{ page, limit, total }` metadata |
| New migration file syntax review | REVIEWED | `002_phase2_leader_profile.sql` adds leader enrollment number, branch and year plus a partial unique index |

## Not verified in this execution environment

- PostgreSQL 16 integration tests were not run. No `psql` / `pg_isready` executable or reachable database was available in this environment.
- The original 29-check audit harness was not present in the uploaded ZIP. The provided audit summary was available, but the harness itself was not; therefore it could not be converted or re-executed.
- Server startup and endpoint smoke tests were not run because the environment could not complete dependency installation (`npm ci` timed out; offline retry reported uncached packages, including Zod).
- Vite production build was not run because the client dependencies could not be installed from the npm registry in this environment.

## Commands to run locally

```bash
# Backend
cd server
npm ci
cp .env.example .env
# Set DATABASE_URL and a strong JWT_SECRET in .env
# Only for a brand-new empty database, or after verifying the migration ledger.
# Do NOT run against an existing database with an unverified _migrations table.
# npm run migrate
npm run seed
npm test
npm run dev

# In another terminal, frontend
cd client
npm ci
npm run dev
```

The migration runner applies unrecorded SQL files in filename order based on `_migrations`. The migration files contain non-idempotent object creation. Use the runner on a fresh database, or only after confirming that the migration ledger accurately represents the existing schema. If an existing database has the tables but lacks corresponding ledger rows, do not run the migrations blindly; reconcile the history with a verified backup first.
