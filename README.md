# SamajX

SamajX is a university-linked civic problem-to-solution platform. The repository contains the foundation, university/leader/team workflows, citizen reporting and Phase 4 problem-to-project selection workflows.

## Current implementation

- Five roles: `citizen`, `university_admin`, `leader`, `company`, `platform_admin`.
- Cookie-based authentication using JWT in an httpOnly cookie.
- Password hashing with bcryptjs.
- Database-authoritative role and account-status checks on every authenticated request.
- University registration, Platform Admin university verification, leader promo-code registration and University Admin leader approval.
- Team and evidence workflows from Phase 2.
- Company registration creates the company profile with its user account in one database transaction.
- Phase 4 applications, mentor consent, cross-university review, project selection and lifecycle jobs.
- Skill-based university routing: Platform Admin defines required expertise; matching verified universities are routed without a distance cutoff, and distances above 150 km are labelled `Far away`.
- Phase 3 citizen reporting, duplicate decisions, problem feed, moderation and university routing.
- Phase 4 problem classification, application windows, mentor consent links, cross-university review, proposal ranking, atomic project claim and activation.
- Leader, University Admin and Platform Admin Phase 4 workspaces; in-app review/selection notifications and retry-safe lifecycle jobs.

Phase 5 reduced scope includes leader milestone/proof updates, final report submission, university completion sign-off, member certificates and public certificate verification/PDF download. Sponsorship pledges, company project gallery and email notifications are deferred. Phase 4 mentor invitations currently use a time-limited shareable link; SMTP delivery is not configured.

## Requirements

- Node.js 20 or newer
- PostgreSQL 15 or newer (the project was designed and previously audited against PostgreSQL 16)
- npm

## Local setup (Windows PowerShell)

1. Create a PostgreSQL database named `SamajX` and a database user with access to it.
2. Copy `server/.env.example` to `server/.env` and update `DATABASE_URL`. Set a unique `JWT_SECRET` for any shared or deployed environment.
3. Install backend dependencies:

   ```powershell
   cd server
   npm ci
   ```

4. **For a brand-new, empty database only**, run the migration runner:

   ```powershell
   npm run migrate
   ```

   **For an existing SamajX database, do not run this command until you have confirmed that `_migrations` contains the matching migration history.** The SQL files create enums, tables and triggers and are not all independently idempotent. If the schema was created manually or by an earlier process that did not populate `_migrations`, stop and reconcile the migration history with a database backup rather than rerunning the SQL files.

5. In development, seed the Platform Admin account if it does not already exist:

   ```powershell
   npm run seed
   ```

6. Start the backend:

   ```powershell
   npm run dev
   ```

7. In a second terminal, install and start the frontend:

   ```powershell
   cd client
   npm ci
   npm run dev
   ```

The Vite development server proxies `/api` to the backend. Open the local URL printed by Vite.

## Existing database safety

- **Do not drop or recreate your existing `SamajX` database.**
- Do not delete `_migrations` or edit already-applied migration files.
- `npm run migrate` trusts `_migrations`; it does not independently prove that an unrecorded migration's schema objects are absent. Run it on a fresh database, or only after verifying the ledger matches the actual schema. Never use it to "repair" a pre-existing database with missing migration history.
- Keep your existing `server/.env` and database backups. The distributed source archive intentionally excludes `.env`, `node_modules`, uploads and database data.
- Never share your database URL, password, JWT secret or Platform Admin password in chat or source control.

## Tests and checks

Backend unit tests:

```powershell
cd server
npm test
```

Backend syntax check (PowerShell):

```powershell
Get-ChildItem -Recurse src,test -Filter *.js | ForEach-Object { node --check $_.FullName }
```

Frontend production build:

```powershell
cd client
npm ci
npm run build
```

The backend unit suite does not replace a live PostgreSQL integration test or browser end-to-end test. Those should be run against a backed-up development database before deployment.

## Production configuration

Set `NODE_ENV=production`, `DATABASE_URL`, a unique `JWT_SECRET` of at least 32 characters, and the exact frontend `CORS_ORIGIN` (scheme + host + optional port; no wildcard or path). Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` before running the production seed script. The server fails fast when required production security settings are missing or malformed.
