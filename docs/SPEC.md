# CivicPulse — Specification

> A university-linked civic problem-to-solution platform.

## 1. Vision

Citizens report local civic problems (potholes, drainage, waste, water, health, etc.).
Duplicate reports in the same area merge into a single "problem." Each problem is
classified by difficulty and domain, then routed to nearby universities with matching
departments. Student teams apply to solve problems. Selection is fair and skill-aware.
Companies browse approved projects and sponsor them. On verified completion, every
team member receives a verifiable PDF certificate.

---

## 2. Roles

| Role | Has login? | Description |
|------|-----------|-------------|
| `citizen` | Yes | Reports problems, upvotes, tracks status, optionally confirms a fix. |
| `university_admin` | Yes | One per university. Owns the promo code. Approves leaders, verifies evidence, confirms difficulty, approves selected teams, signs off completion. |
| `leader` | Yes | A student who signs up with the promo code. Account starts `pending`. Creates the team, adds members, applies to problems, posts milestones, submits the final report. |
| `company` | Yes | Browses approved projects and pledges sponsorship. Must be verified by the platform admin. |
| `platform_admin` | Yes | Verifies universities and companies, moderates reports, handles unrouted problems, splits wrongly merged reports. |

**There is NO student role and NO student login.** Team members are rows in `team_members`.
Only the group leader has a login.

---

## 3. Core Workflows

### 3.1 University Onboarding
1. A university registers (name, address, location pin, website, departments).
2. Platform admin verifies the university.
3. The university's user account becomes the `university_admin`.
4. A unique promo code is generated with an expiry, a join limit, and active status.
5. The admin can regenerate or revoke the code at any time.

### 3.2 Leader Signup & Team Creation
1. A student enters the promo code during registration → creates a `leader` user linked to that university, with status `pending`.
2. The university admin reviews and approves/rejects the leader.
3. Once approved, the leader creates a team (name, optional avatar).
4. The leader adds member records: name, optional email, enrollment number (unique within the university), branch, year, speciality, interests, credential evidence.
5. **The leader is also a member record** so they receive a certificate.
6. One leader, one team. One enrollment number cannot appear on multiple teams within the same university.

### 3.3 Credentials & Levels
- Each member gets evidence entries of types: `project` (link/description), `faculty_lab` (faculty name), `hackathon`, `certification`, `internship`, `faculty_endorsement` (minimum evidence fallback).
- The university admin verifies each piece of evidence.
- **Points table** (configurable):

| Evidence Type | Points |
|--------------|--------|
| Completed platform project | 3 |
| Verified external project | 2 |
| Faculty/lab experience | 2 |
| Hackathon | 2 |
| Internship | 2 |
| Certification | 1 |

- **Team level** = average verified member score:
  - Beginner: < 2
  - Intermediate: 2–5
  - Advanced: > 5
- Thresholds are configurable.
- Every member must provide at least one piece of work evidence. Faculty endorsement counts as minimum evidence.
- Beginners are **never locked out** of applying.

### 3.4 Citizen Reporting
1. Citizen submits a report: title, description, category, map pin (lat/lng), photos, anonymous flag.
2. Consent notice at signup. Citizens can delete their own reports.
3. Rate limiting, email verification, flag/report button, moderation queue.
4. Language: Hindi, English, or Hinglish.

### 3.5 Duplicate Merging
- Each citizen submission → row in `reports`. The merged parent → row in `problems`.
- New reports attach to a parent, raising `report_count` and `priority_score`.
- **Candidate test**: same category + within a per-category radius + OPEN problems only + text similarity.
- **Per-category default radii**: pothole/street 300m, waste 500m, drainage/water 1km.
- **Three-band merge**:
  - High (≥ 0.85): auto-merge, notify reporter.
  - Medium (0.65–0.85): ask reporter "Is this the same problem?"
  - Low (< 0.65): create new problem.
- Transaction-based to avoid races. Periodic backstop dedupe pass.
- Never merge into a RESOLVED problem → create a new problem linked as `recurrence`.
- Admins can split a report out of a parent.
- Merging after a team has claimed: attach reports, don't change the claim, notify the team.

### 3.6 Problem Classification
- Every problem has a **domain** (configurable: civil, environmental, water_sanitation, waste, roads_transport, health, agriculture, education, energy, software_it, other) and a **difficulty** (small / medium / hard).
- Admin sets difficulty by hand (AI suggests in phase 6).
- Allowed **solution types**: survey, design_proposal, prototype_software, research_report, awareness_drive, pilot.
- `needs_authority` flag for public property → deliverable limited to design/proposal/survey; pilot requires authority permission.
- Re-check difficulty when `report_count` passes a configurable threshold (default 10).

### 3.7 Routing
1. Find universities within X km of the problem (default starting radius: 25 km).
2. Keep those with a registered department OR a team in the problem's domain.
3. If none match, widen stepwise: 25 → 50 → 100 → 200 km.
4. If still none, mark `unrouted` for the platform admin.
5. Radius is configurable per domain/category.

### 3.8 Application & Selection
1. When a problem opens for applications, an application window starts (default 48h, configurable). Stored as `window_closes_at` on the problem.
2. Any team from a routed university can apply to any problem (including Hard ones) with a proposal: approach, timeline, skills, budget/resources, chosen solution type.
3. Window closes → system triggers a **review phase** (default 48h) where relevant university admins rate proposals 1–5.
4. After the review phase (or when all proposals are rated), the system ranks applicants.
5. **Ranking formula**: `score = w_level × level_score + w_domain × domain_match + w_proposal × proposal_score`
6. **Default weights** (configurable):

| Difficulty | w_level | w_domain | w_proposal |
|-----------|---------|----------|------------|
| Hard | 0.5 | 0.3 | 0.2 |
| Medium | 0.25 | 0.5 | 0.25 |
| Small | 0.0 | 0.5 | 0.5 |

7. **Normalization**: level_score → min(team_avg / 10, 1.0); domain_match → 0 or 1; proposal_score → (rating − 1) / 4.
8. **Tie-break**: if scores within ε (0.01), earliest valid application wins.
9. **Mentor rule**: A team with a mentor (Advanced member or faculty) attached to its proposal → the mentor's credential score is added as a virtual member when calculating the team's effective level for this application.
10. If no Advanced team applies to a Hard problem, best available team gets it.
11. **Cross-university rule**: Platform ranks all applicants globally. The TOP team's OWN university admin approves or rejects. If rejected, next team goes to THEIR admin. One responsible admin per step.
12. **Cap**: a team may have at most 2 active projects (configurable).
13. **Stale rule**: no milestone update for 21 days (configurable) → problem reopened, runner-up gets the offer.
14. Every applicant can see their score breakdown and improvement feedback.

### 3.9 Execution & Completion
1. Leader posts milestones with title, description, and proof.
2. Leader submits a final report with proof matching the solution type.
3. University admin verifies and marks the project complete.
4. The reporting citizen may optionally confirm the fix.
5. System issues a PDF certificate to EVERY team member (including the leader) with a long random verification code.
6. Public page `/verify/:code` shows certificate details with no login.
7. Leader or admin downloads certificates; emailed if member has email.

### 3.10 Sponsorship
- Types: `funding`, `mentorship`, `tools`, `internship`.
- Lifecycle: pledged → confirmed → fulfilled. Also: cancelled.
- Companies see only admin-approved projects.
- No real payments in the MVP. Presented honestly as pledges.

### 3.11 Notifications
- In-app notifications for users with accounts.
- Email notifications for team members with email addresses.
- Dev mode: emails logged to console.

---

## 4. Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js + Express, single monolith, modular |
| Database | PostgreSQL, plain SQL via `pg`, parameterized queries only |
| Migrations | Numbered `.sql` files + tiny runner script |
| Frontend | React + Vite, react-router-dom, useState/useContext |
| Styling | Plain CSS, CSS variables (design tokens), CSS modules |
| Auth | jsonwebtoken + bcrypt, JWT in httpOnly cookies |
| Maps | Leaflet via react-leaflet + OpenStreetMap |
| PDFs | pdfkit |
| Uploads | multer → local uploads/, storage wrapper for future swap |
| EXIF | Strip EXIF/GPS from uploaded photos |
| Cron | node-cron |
| Email | nodemailer (dev → console) |
| Security | helmet, cors, express-rate-limit |
| Extras | canvas-confetti, zod (validation) |
| Backend deps | ~10–12 |
| Frontend deps | ~6–8 |

---

## 5. Assumptions & Defaults

1. **One role per user account.** A student who is a leader cannot also submit citizen reports from the same account. They would need a separate citizen account.
2. **One team per leader.** A leader cannot create multiple teams.
3. **Only teams from routed universities can apply** to a problem. "Any team can apply to ANY problem" refers to difficulty level, not geographic restriction.
4. **University location** is entered as a map pin (lat/lng) during registration. No geocoding service in MVP.
5. **Platform admin is bootstrapped** via a seed script (email/password from env vars).
6. **Priority score** = `report_count × 2 + upvote_count`. Simple, configurable later.
7. **Proposal rating phase** (default 48h) occurs after the application window closes. University admins rate proposals from their own teams. Unrated proposals after the deadline get a default score of 3/5.
8. **Email verification for citizens**: a verification token sent to email. No phone SMS in MVP — phone is stored but not verified.
9. **Enrollment number uniqueness**: enforced per university across ALL teams. One enrollment number = one person = one team at most.
10. **Leader transfer**: the university admin can reassign the leader role to another existing member of the same team. The old leader's user account is deactivated (or set to a non-leader state).
11. **Merge radius** is looked up by domain/category, not by individual problem. Each domain has a default radius.
12. **Comment visibility**: comments on problems are public. Flagged comments go to the moderation queue.
13. **Certificate co-signature**: includes the university name and optionally a sponsor name. No digital signature in MVP — just text fields on the PDF.
14. **Anonymous display**: the citizen's name is hidden from public view, but the platform admin can still see the reporter's identity for moderation purposes.
15. **The review phase** is a new sub-state I'm introducing: after the application window closes, the problem status stays at `window_closed` until admins have rated proposals (or the rating deadline passes). Then the system ranks and moves to `pending_approval`. This avoids the conflict of needing admin-rated proposal scores at ranking time.

---

## 6. Questions for Your Approval

These are the ambiguities I found. I've proposed default answers (above) — confirm or override:

1. **Review phase after window closes**: I've added a configurable "review phase" (default 48h) where admins rate proposals before the system ranks. This is not in your original prompt but is necessary because the ranking formula requires `proposal_score` (admin-rated 1–5), yet ranking is supposed to happen "when the window closes." Without a review phase, we'd need to either (a) require admins to rate during the open window (risky — they might miss it) or (b) use a default score (unfair). **Do you approve the review phase approach?**

2. **Can a leader also be a citizen?** I'm going with "no — one role per account." A student who wants to report problems needs a separate citizen account. Is that acceptable, or should leaders also be able to submit reports?

3. **Application visibility**: When the window is open, can applicants see who else has applied? I'm going with: applicants can see how many teams have applied but not who they are. After ranking, they see their own score breakdown. Admins see everything.

4. **Stale project → runner-up flow**: When a project goes stale (no milestone in 21 days), the problem goes to `reopened`. If there's a runner-up from the original application round, the system automatically offers it to them (their application status changes to `selected`). If no runner-up, the problem goes back to `open_for_applications` with a new window. **Correct?**

5. **Leader transfer — what happens to the old leader's user account?** I'm proposing: the old leader's user role is set to a deactivated state. They can no longer log in as a leader. They're still a member record on the team (and receive certificates). Is that right?

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Cross-university proposal rating bias (different admins, different scales) | MVP limitation. AI-assisted scoring in phase 6. Transparent score breakdowns. |
| Stale/abandoned teams blocking problems | Automated stale detection cron. Runner-up fallback. Cap of 2 active projects. |
| Duplicate merge false positives | Three-band system with human confirmation for medium confidence. Admin split capability. |
| Photo upload abuse | File type + size validation, EXIF stripping, rate limiting, moderation queue. |
| Promo code sharing | Join limit, expiry, admin can revoke. Leader approval gate adds a human check. |
