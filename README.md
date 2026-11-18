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

Project execution, milestones, completion, certificates and sponsorship remain later-phase work. Phase 4 mentor invitations currently use a time-limited shareable link; SMTP delivery is not configured.

## Requirements

- Node.js 20 or newer
- PostgreSQL 15 or newer (the project was designed and previously audited against PostgreSQL 16)
- npm

## Local setup (Windows PowerShell)

1. Create a PostgreSQL database named `samajx` and a database user with access to it.
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

   **For an existing SamajX database, do not run this command until you have confirmed that `_migrations` contains the matching migration history.** The SQL files create enums, tables and triggers and are not all independently idempotent. If the schema was created manually or by an earlier process that did not populate `_
