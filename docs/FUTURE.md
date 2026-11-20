# SamajX — Future Ideas

Ideas that are out of scope for the current phase plan but worth considering later.

---

## Feature Ideas
- **SMS notifications** via a provider like Twilio for citizens who prefer phone over email.
- **Progressive Web App (PWA)** with offline report drafting and sync when online.
- **Government authority integration** — official API to forward `needs_authority` problems to municipal bodies.
- **Multi-language UI** (i18n) — full Hindi/regional language interface, not just Hindi input.
- **Analytics dashboard** for platform admins — problem heatmaps, resolution times, team performance trends.
- **Inter-university collaboration** — allow teams from different universities to form joint teams for Hard problems.
- **Citizen karma/reputation** — reward citizens who report accurate, well-described problems.
- **Photo comparison slider** — before/after slider on completed problems for visual impact.
- **Public leaderboard** (opt-in) — university and team leaderboards for completed projects.
- **Export/API** — public API for researchers to query anonymized problem/solution data.
- **Mobile app** (React Native) — native app for citizens to report on-the-go with camera integration.
- **Docker compose** — containerized deployment for easier setup.
- **Object storage** — swap local uploads for S3/GCS/MinIO via the storage wrapper.
- **Digital certificate signatures** — actual cryptographic signatures on PDF certificates.
- **OAuth/SSO** — university SSO integration for leader login.
- **Webhook notifications** — allow companies to receive webhooks for new approved projects.
- **Batch certificate download** — ZIP download of all certificates for a project.
- **Problem urgency escalation** — auto-escalate problems that reach a high report count without being claimed.
- **Faculty portal** — lightweight view for faculty mentors to track mentee teams.
- **Audit log viewer** — admin UI to browse the audit log with filters and export.

## Technical Improvements
- **Full-text search** with PostgreSQL `tsvector` for problem/report search.
- **Connection pooling** tuning for production.
- **CDN** for static assets and uploaded photos.
- **Rate limiting per-user** in addition to per-IP.
- **CSRF protection** (if cookies are used beyond httpOnly JWT).
- **Content Security Policy** headers via helmet.
- **Database backup automation** with pg_dump cron.
- **Load testing** with k6 or Artillery.
- **E2E tests** with Playwright.
- **CI/CD pipeline** with GitHub Actions.
