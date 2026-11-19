# CivicPulse — API Reference

All endpoints return JSON. Standard response shape:

```json
// Success
{ "ok": true, "data": { ... } }

// Error
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

Pagination: `?page=1&limit=20` → response includes `{ data: [...], meta: { page, limit, total } }`. Page and limit must be positive integers; page size is capped at 100.

Auth: JWT in httpOnly cookie named `token`. Sent automatically. No `Authorization` header.

**Implementation status:** Sections 1–5 describe the currently mounted Phase 1–2 API. Sections 6 onward are the planned API contract for later phases and are not available in this build unless explicitly marked otherwise. Email verification is planned for Phase 3 (see Auth below).

---

## 1. Auth

### POST /api/auth/register
Register a new user. Role-specific fields vary.
- **Public**
- **Body (citizen)**:
```json
{
  "email": "citizen@example.com",
  "password": "min8chars",
  "display_name": "Ravi Kumar",
  "phone": "9876543210",
  "role": "citizen"
}
```
- **Body (university_admin)**: same + `university` object:
```json
{
  "email": "admin@university.edu",
  "password": "...",
  "display_name": "Prof. Sharma",
  "role": "university_admin",
  "university": {
    "name": "IIT Delhi",
    "address": "Hauz Khas, New Delhi",
    "city": "New Delhi",
    "state": "Delhi",
    "country": "India",
    "lat": 28.5459,
    "lng": 77.1926,
    "website": "https://iitd.ac.in",
    "departments": [
      { "domain_slug": "civil", "name": "Dept of Civil Engineering" },
      { "domain_slug": "software_it", "name": "Dept of CSE" }
    ]
  }
}
```
- **Body (company)**: same + `company` object:
```json
{
  "email": "hr@techcorp.com",
  "password": "...",
  "display_name": "TechCorp",
  "role": "company",
  "company": {
    "name": "TechCorp India",
    "description": "...",
    "website": "https://techcorp.in",
    "industry": "Technology"
  }
}
```
- **Response** `201`: `{ ok, data: { user, university?, company? } }`. University registration also returns the initial promo-code details to the newly created owning admin. Company registration creates its company profile in the same transaction. Sets httpOnly cookie.
- **Errors**: `409` email taken, `400` validation.

### POST /api/auth/register/leader
Leader signup with promo code. Separate endpoint for clarity.
- **Public**
- **Body**:
```json
{
  "email": "student@gmail.com",
  "password": "...",
  "display_name": "Ankit Verma",
  "phone": "...",
  "promo_code": "A1B2C3D4E5F60718",
  "enrollment_number": "2024CS001",
  "branch": "Computer Science",
  "year": 3
}
```
- **Response** `201`: `{ ok, data: { user, leader: { id, university_id, status: 'pending' } } }`
- **Errors**: `401` invalid, expired, revoked, unverified or full promo code; `409` duplicate email/enrollment number.

### POST /api/auth/login
- **Public**
- **Body**: `{ "email": "...", "password": "..." }`
- **Response** `200`: `{ ok, data: { user } }`. Sets httpOnly cookie.
- **Errors**: `401` invalid credentials. Rate limited (10 attempts / 15 min, shared across registration and login routes).

### POST /api/auth/logout
- **Public** (safe to call with an expired or missing session)
- **Response** `200`: `{ ok }`. Clears the authentication cookie.

### GET /api/auth/me
- **Any authenticated user**
- **Response** `200`: `{ ok, data: { user, roleProfile, leader?, university?, company? } }`

> **Planned — Phase 3:** Email verification is specified in `SPEC.md`, but the endpoint, token lifecycle and email delivery are not implemented or mounted in the current Phase 1–2 code. The `email_verified` database column is present; do not treat it as proof that a verification flow is available.

---

## 2. Universities

### GET /api/universities
List universities.
- **platform_admin**: all. **Others**: verified only.
- **Query**: `?verified=true&page=1&limit=20`
- **Response**: `{ ok, data: [university], meta }`

### GET /api/universities/me
- **university_admin** (own account)
- Returns own university details, departments and promo-code metadata.

### GET /api/universities/:id
- **Any authenticated user** for verified universities; Platform Admin and the university's own University Admin may also view an unverified university. Other roles receive `404`.
- **Response**: `{ ok, data: { university } }`; the public university object omits promo-code fields and includes its department list.

### PATCH /api/universities/:id/verify
- **platform_admin**
- **Response**: `{ ok, data: { university } }`
- **Audit log**: yes

### GET /api/universities/:id/promo-code
- **university_admin** (own university only)
- Returns the current promo code and join/expiry metadata. Never returned by the public university detail endpoint.

### POST /api/universities/:id/promo-code/regenerate
- **university_admin** (own university only)
- **Body**: `{ "expires_in_days": 30, "join_limit": 50 }`
- **Response**: `{ ok, data: { promo_code, expires_at, join_limit } }`
- **Audit log**: yes

### POST /api/universities/:id/promo-code/revoke
- **university_admin** (own)
- **Response**: `{ ok }`
- **Audit log**: yes

### GET /api/universities/:id/departments
- **Any authenticated user** for verified universities; Platform Admin and the university's own University Admin may also view departments for an unverified university. Other roles receive `404`.
- **Response**: `{ ok, data: [{ id, domain, name }] }`

### POST /api/universities/:id/departments
- **university_admin** (own)
- **Body**: `{ "domain_slug": "civil", "name": "Dept of Civil Engineering" }`
- **Response** `201`: `{ ok, data: { department } }`

### DELETE /api/universities/:id/departments/:deptId
- **university_admin** (own)
- **Response**: `{ ok }`

---

## 3. Leaders

### GET /api/leaders
List leaders for a university.
- **university_admin**: leaders of own university.
- **platform_admin**: all leaders.
- **Query**: `?status=pending&page=1&limit=20`
- **Response**: `{ ok, data: [leader], meta }`

### GET /api/leaders/me
- **leader** (self)
- Returns leader approval state and their team, if created.

### GET /api/leaders/:id
- **university_admin** (own uni) / **leader** (self) / **platform_admin**
- **Response**: `{ ok, data: { leader } }`

Leader signup requires `enrollment_number`, `branch` and `year` in addition to the promo code. The promo code is locked and its join count incremented in the same database transaction as user/leader creation.

### PATCH /api/leaders/:id/approve
- **university_admin** (own uni)
- **Response**: `{ ok, data: { leader } }`
- **Audit log**: yes

### PATCH /api/leaders/:id/reject
- **university_admin** (own uni)
- **Body**: `{ "reason": "..." }` (optional)
- **Response**: `{ ok, data: { leader } }`
- **Audit log**: yes

### PATCH /api/leaders/:id/suspend
- **university_admin** (own uni) / **platform_admin**
- **Body**: `{ "reason": "..." }`
- **Response**: `{ ok, data: { leader } }`
- **Audit log**: yes

### POST /api/leaders/:id/transfer
Transfer leadership to another team member.
- **university_admin** (own uni)
- **Body**: `{ "new_leader_member_id": 42, "new_leader_email": "...", "new_leader_password": "..." }`
- **Response**: `{ ok, data: { old_leader, new_leader } }`
- **Audit log**: yes

---

## 4. Teams

### POST /api/teams
- **leader** (approved, no existing team)
- **Body**: `{ "name": "Team Alpha" }`
- **Response** `201`: `{ ok, data: { team } }`

### GET /api/teams/:id
- **leader** (own) / **university_admin** (own uni) / **platform_admin**. Company and citizen access is denied because team member records contain personal information.
- **Response**: `{ ok, data: { id, name, members: [...], level, level_score, ... } }`

### PATCH /api/teams/:id
- **leader** (own)
- **Body**: `{ "name": "...", "avatar_url": "..." }`
- **Response**: `{ ok, data: { team } }`

### GET /api/teams/:id/members
- **leader** (own) / **university_admin** (own uni) / **platform_admin**
- **Response**: `{ ok, data: [member] }`

### POST /api/teams/:id/members
- **leader** (own team)
- **Body**:
```json
{
  "name": "Priya Singh",
  "email": "priya@gmail.com",
  "enrollment_number": "2024CS001",
  "branch": "Computer Science",
  "year": 3,
  "speciality": "Web Development",
  "interests": "frontend, design"
}
```
- **Response** `201`: `{ ok, data: { member } }`
- **Errors**: `409` enrollment number already in use at this university.

### PATCH /api/teams/:id/members/:memberId
- **leader** (own team)
- **Body**: any updatable fields (name, email, enrollment_number, branch, year, speciality, interests)
- **Response**: `{ ok, data: { member } }`

### DELETE /api/teams/:id/members/:memberId
- **leader** (own team, not self if is_leader)
- **Response**: `{ ok }`
- Recalculates team level.

---

## 5. Member Evidence

### POST /api/members/:memberId/evidence
- **leader** (member belongs to own team)
- **Body**:
```json
{
  "type": "project",
  "title": "Smart Waste Bin",
  "description": "IoT-based waste level monitoring",
  "link": "https://github.com/...",
  "faculty_name": null
}
```
- **Response** `201`: `{ ok, data: { evidence } }`

### GET /api/members/:memberId/evidence
- **leader** (own team) / **university_admin** (own uni) / **platform_admin**
- **Response**: `{ ok, data: [evidence] }`

### PATCH /api/evidence/:id/verify
- **university_admin** (member's university)
- **Body**: empty JSON object (verification is the action)
- **Response**: `{ ok, data: { evidence } }`
- Updates member's `credential_score` and team's `level_score` / `level`.
- **Audit log**: yes

### GET /api/evidence/queue/:uniId
- **university_admin** (own university only)
- Returns pending evidence with member/team context and pagination metadata.

### PATCH /api/evidence/:id/reject
- **university_admin** (member's university)
- Deletes only unverified evidence and records one audit event.

### DELETE /api/evidence/:id
- **leader** (member belongs to own team, evidence not yet verified)
- **Response**: `{ ok }`

---

### GET /api/domains
- **Public** reference list used by university registration and later problem classification.

---

## 6. Reports (Citizen Submissions)

### POST /api/reports
- **citizen** (email verified)
- **Body** (multipart/form-data):
  - `title` (string)
  - `description` (string)
  - `category` (string — domain slug)
  - `lat` (number)
  - `lng` (number)
  - `anonymous` (boolean, optional)
  - `photos` (files, max 5, max 5MB each, jpg/png/webp)
- **Response** `201`: `{ ok, data: { report, problem_id, merge_action: 'new' | 'auto_merged' | 'pending_confirmation' } }`
- Internally: runs dedupe check, creates or merges problem in a transaction.
- Rate limited: 5 reports / hour per user.

### GET /api/reports
- **citizen**: own reports. **platform_admin**: all.
- **Query**: `?status=active&page=1&limit=20`
- **Response**: `{ ok, data: [report], meta }`

### GET /api/reports/:id
- **citizen** (own) / **platform_admin**
- **Response**: `{ ok, data: { report, problem } }`

### DELETE /api/reports/:id
- **citizen** (own, status = active)
- **Response**: `{ ok }`
- If this was the last report on a problem, the problem is also cleaned up.

### POST /api/reports/:id/confirm-merge
- **citizen** (own report, merge_action was pending_confirmation)
- **Body**: `{ "confirmed": true | false }`
- **Response**: `{ ok, data: { report, problem_id } }`
- If confirmed: merge. If not: create new problem.

---

## 7. Problems

### GET /api/problems
Browse problems. Public but filtered by role.
- **citizen**: all non-spam, non-duplicate.
- **leader**: routed to own university.
- **university_admin**: routed to own university + all in own area.
- **platform_admin**: all.
- **Query**: `?status=open_for_applications&domain=civil&lat=28.5&lng=77.2&radius_km=50&sort=priority&page=1&limit=20`
- **Response**: `{ ok, data: [problem], meta }`

### GET /api/problems/:id
- **Any authenticated user**
- **Response**: `{ ok, data: { problem, reports: [...], routes: [...], upvote_count, user_upvoted, comment_count } }`

### PATCH /api/problems/:id/classify
Set domain, difficulty, solution types, needs_authority flag.
- **university_admin** (problem routed to own uni) / **platform_admin**
- **Body**:
```json
{
  "domain_id": 1,
  "difficulty": "medium",
  "solution_types": ["design_proposal", "survey"],
  "needs_authority": true
}
```
- **Response**: `{ ok, data: { problem } }`
- Triggers routing if domain was just set. Transitions status to `open_for_applications` if difficulty + domain are both set and routes exist.
- **Audit log**: yes

### POST /api/problems/:id/split/:reportId
Split a report out of a parent problem, creating a new problem.
- **platform_admin**
- **Response**: `{ ok, data: { new_problem, old_problem } }`
- **Audit log**: yes

### GET /api/problems/:id/reports
- **Any authenticated user**
- **Response**: `{ ok, data: [report] }`
- Anonymous reports show without reporter info (except to platform_admin).

### POST /api/problems/:id/upvote
- **citizen**
- **Response**: `{ ok, data: { upvote_count } }`

### DELETE /api/problems/:id/upvote
- **citizen**
- **Response**: `{ ok, data: { upvote_count } }`

### GET /api/problems/:id/comments
- **Any authenticated user**
- **Query**: `?page=1&limit=50`
- **Response**: `{ ok, data: [comment], meta }`

### POST /api/problems/:id/comments
- **Any authenticated user** (email verified)
- **Body**: `{ "content": "..." }`
- **Response** `201`: `{ ok, data: { comment } }`
- Rate limited: 10 comments / hour per user.

### POST /api/problems/:id/confirm-fix
Citizen confirms the fix after project completion.
- **citizen** (must be the reporter of a report linked to this problem)
- **Response**: `{ ok }`

---

## 8. Routing

### GET /api/problems/:id/routes
- **university_admin** / **platform_admin**
- **Response**: `{ ok, data: [{ university, distance_km }] }`

### POST /api/problems/:id/route
Manually trigger routing (or re-route).
- **platform_admin**
- **Response**: `{ ok, data: { routes: [...], status } }`
- **Audit log**: yes

---

## 9. Applications

### POST /api/problems/:id/applications
Apply to a problem.
- **leader** (approved, team exists, team's university is routed, < 2 active projects)
- **Body**:
```json
{
  "approach": "We will survey the drainage system and create a GIS map...",
  "timeline": "4 weeks: survey, analysis, report, presentation",
  "skills": "GIS mapping, AutoCAD, field survey experience",
  "budget_resources": "Survey equipment from university lab, ~₹5000 for transport",
  "solution_type": "survey",
  "mentor_member_id": null,
  "mentor_is_faculty": false,
  "mentor_name": null
}
```
- **Response** `201`: `{ ok, data: { application } }`
- **Errors**: `400` window closed, `409` already applied, `403` not routed / cap reached.

### GET /api/problems/:id/applications
- **leader**: own application + count of others (during window). Own + all rankings (after ranking).
- **university_admin** (routed): applications from own university's teams.
- **platform_admin**: all.
- **Response**: `{ ok, data: [application] }`

### GET /api/applications/:id
- **leader** (own) / **university_admin** (own uni team) / **platform_admin**
- **Response**: `{ ok, data: { application, score_breakdown, feedback } }`

### PATCH /api/applications/:id/withdraw
- **leader** (own, status = submitted)
- **Response**: `{ ok, data: { application } }`

### PATCH /api/applications/:id/rate-proposal
Rate a proposal 1–5.
- **university_admin** (application team belongs to own university)
- **Body**: `{ "proposal_score": 4 }`
- **Response**: `{ ok, data: { application } }`
- **Audit log**: yes

### PATCH /api/applications/:id/approve
Approve the selected team.
- **university_admin** (application team belongs to own university, application status = selected)
- **Response**: `{ ok, data: { application, project } }`
- Transitions: application → approved, problem → claimed, creates project.
- **Audit log**: yes

### PATCH /api/applications/:id/reject
Reject the selected team.
- **university_admin** (application team belongs to own university, application status = selected)
- **Body**: `{ "reason": "..." }` (optional)
- **Response**: `{ ok, data: { application } }`
- System automatically selects next ranked team (or reopens window if none left).
- **Audit log**: yes

---

## 10. Projects

### GET /api/projects
- **leader**: own team's projects. **university_admin**: projects at own uni. **company**: approved/active+ projects (for sponsoring). **platform_admin**: all.
- **Query**: `?status=active&page=1&limit=20`
- **Response**: `{ ok, data: [project], meta }`

### GET /api/projects/:id
- **leader** (own) / **university_admin** (own uni) / **company** (active+) / **platform_admin**
- **Response**: `{ ok, data: { project, problem, team, milestones: [...], sponsorships: [...] } }`

### POST /api/projects/:id/milestones
Post a milestone.
- **leader** (own project, project status = active)
- **Body** (multipart/form-data):
  - `title` (string)
  - `description` (string)
  - `proof` (files, optional)
- **Response** `201`: `{ ok, data: { milestone } }`
- Updates `project.last_milestone_at` and `project.stale_deadline`.
- If this is the first milestone and problem status = claimed → problem transitions to `in_progress`.

### GET /api/projects/:id/milestones
- **Any authenticated user**
- **Response**: `{ ok, data: [milestone] }`

### POST /api/projects/:id/submit
Submit final report.
- **leader** (own project, project status = active)
- **Body** (multipart/form-data):
  - `final_report` (string — text content)
  - `demo_link` (string, optional)
  - `proof` (files)
- **Response**: `{ ok, data: { project } }`
- Transitions project → `submitted_for_review`.

### PATCH /api/projects/:id/complete
Mark project complete.
- **university_admin** (team belongs to own uni, project status = submitted_for_review)
- **Response**: `{ ok, data: { project, certificates: [...] } }`
- Transitions: project → completed, problem → completed.
- Generates certificates for all team members.
- **Audit log**: yes

### PATCH /api/projects/:id/revise
Send project back for revisions.
- **university_admin** (team belongs to own uni, project status = submitted_for_review)
- **Body**: `{ "feedback": "..." }`
- **Response**: `{ ok, data: { project } }`
- Transitions project → active.

---

## 11. Certificates

### GET /api/projects/:id/certificates
- **leader** (own project) / **university_admin** (own uni)
- **Response**: `{ ok, data: [certificate] }`

### GET /api/certificates/:id/download
Download the PDF.
- **leader** (own project) / **university_admin** (own uni)
- **Response**: PDF file (application/pdf)

### GET /api/verify/:code
**Public** — no auth required.
- **Response**: `{ ok, data: { member_name, team_name, university_name, problem_title, solution_type, sponsor_name, issued_at } }`

---

## 12. Sponsorships

### POST /api/projects/:id/sponsorships
Pledge sponsorship.
- **company** (verified)
- **Body**:
```json
{
  "type": "funding",
  "description": "Equipment grant for the survey project",
  "amount": 25000
}
```
- **Response** `201`: `{ ok, data: { sponsorship } }`

### GET /api/sponsorships
- **company**: own sponsorships. **university_admin**: sponsorships on own uni's projects. **platform_admin**: all.
- **Query**: `?status=pledged&page=1&limit=20`
- **Response**: `{ ok, data: [sponsorship], meta }`

### PATCH /api/sponsorships/:id/confirm
- **company** (own)
- **Response**: `{ ok, data: { sponsorship } }`

### PATCH /api/sponsorships/:id/fulfill
- **company** (own) / **platform_admin**
- **Response**: `{ ok, data: { sponsorship } }`

### PATCH /api/sponsorships/:id/cancel
- **company** (own) / **platform_admin**
- **Body**: `{ "reason": "..." }` (optional)
- **Response**: `{ ok, data: { sponsorship } }`

---

## 13. Companies

### GET /api/companies
- **platform_admin**: all. **Others**: verified only.
- **Response**: `{ ok, data: [company], meta }`

### GET /api/companies/:id
- **Any authenticated user**
- **Response**: `{ ok, data: { company } }`

### PATCH /api/companies/:id/verify
- **platform_admin**
- **Response**: `{ ok, data: { company } }`
- **Audit log**: yes

---

## 14. Flags

### POST /api/flags
Flag content for moderation.
- **Any authenticated user** (email verified)
- **Body**: `{ "entity_type": "report", "entity_id": 42, "reason": "Spam/inappropriate" }`
- **Response** `201`: `{ ok, data: { flag } }`

### GET /api/flags
Moderation queue.
- **platform_admin**
- **Query**: `?status=pending&entity_type=report&page=1&limit=20`
- **Response**: `{ ok, data: [flag], meta }`

### PATCH /api/flags/:id/review
- **platform_admin**
- **Body**: `{ "status": "reviewed" | "dismissed" }`
- **Response**: `{ ok, data: { flag } }`
- **Audit log**: yes

---

## 15. Notifications

### GET /api/notifications
- **Any authenticated user**
- **Query**: `?read=false&page=1&limit=30`
- **Response**: `{ ok, data: [notification], meta: { ...meta, unread_count } }`

### PATCH /api/notifications/:id/read
- **Own**
- **Response**: `{ ok }`

### PATCH /api/notifications/read-all
- **Own**
- **Response**: `{ ok }`

---

## 16. Domains (Reference Data)

### GET /api/domains
List all domains.
- **Public**
- **Response**: `{ ok, data: [domain] }`

---

## 17. Admin Dashboard

### GET /api/admin/stats
- **platform_admin**
- **Response**:
```json
{
  "ok": true,
  "data": {
    "total_users": 1234,
    "total_problems": 567,
    "active_projects": 89,
    "pending_universities": 3,
    "pending_companies": 5,
    "unrouted_problems": 12,
    "pending_flags": 7
  }
}
```

### GET /api/admin/unrouted
- **platform_admin**
- **Response**: `{ ok, data: [problem] }`

---

## 18. File Uploads

### POST /api/uploads
Generic file upload endpoint (used by forms that need pre-upload).
- **Any authenticated user**
- **Body** (multipart/form-data): `file` (max 5MB, jpg/png/webp/pdf)
- **Response**: `{ ok, data: { path: "/uploads/abc123.jpg" } }`

### GET /uploads/:filename
Static file serving.
- **Public**


## Phase 3 — reports and problems (implemented; migration 003 required)

- `POST /api/reports` — citizen-only report submission. Requires `title`, `description`, `category` (domain slug), `lat`, `lng`; accepts up to five HTTPS `photos` URLs and `anonymous`; uploaded image URLs returned by `/api/reports/photos` may also be included. Rate limited per user.
- `POST /api/reports/photos` — citizen-only raw JPEG/PNG upload (5 MB per file); strips JPEG APP1 / PNG eXIf metadata and returns a `/uploads/...` URL.
- `GET /api/reports/mine` — citizen's own reports, including pending duplicate suggestions.
- `POST /api/reports/:id/duplicate-decision` — citizen resolves a medium-confidence suggestion with `{ "sameProblem": true|false }`.
- `DELETE /api/reports/:id` — soft-delete an owned report; updates its canonical problem's report count and priority without deleting the problem.
- `GET /api/problems` — authenticated problem feed. Optional filters: `domain`, `status`, `q`, and paired `lat`/`lng` with `radiusKm` (1–200).
- `GET /api/problems/:id` — problem detail.
- `GET /api/problems/:id/comments` and `POST /api/problems/:id/comments` — public discussion, with authenticated posting and per-user rate limiting.
- `POST /api/problems/:id/comments/:commentId/flag` — flag a comment for moderation.
- `POST /api/problems/:id/upvote` — citizen toggle-upvote.
- `POST /api/problems/:id/flag` — authenticated content flag with a reason.
- `GET /api/problems/moderation/flags` and `PATCH /api/problems/moderation/flags/:id` — Platform Admin moderation queue and review action.

Duplicate matching uses category/domain merge radius and term-frequency cosine similarity. Scores >= 0.85 auto-attach; 0.65–<0.85 wait for citizen confirmation; lower scores create a new problem. A late confirmation cannot attach to a no-longer-open problem; it creates a recurrence-linked problem instead. Reports matched to claimed or in-progress work attach without changing the claim and create an in-app notification for the team leader. Newly created problems are routed stepwise to verified universities with a matching department or relevant team-member discipline; no match marks the problem `unrouted`.

**Migration note:** `003_report_merge_candidates.sql` is new. Existing databases that have migrations 001 and 002 recorded must apply migration 003 once before using these endpoints. Do not rerun 001 or 002.
