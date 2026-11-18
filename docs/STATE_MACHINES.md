# CivicPulse — State Machines

All state machines are enforced by a **single central module** (`server/lib/stateMachine.js`).
For every transition the module checks:
1. Is the current status a valid source for this transition?
2. Is the requesting actor's role allowed to trigger it?
3. Are all guard conditions met?

Everything else is rejected with a `403` or `409`.

---

## 1. Problem State Machine

```
                                     ┌────────────────┐
                                     │ rejected_spam  │
                                     └────────────────┘
                                           ▲
                                           │ platform_admin
              ┌───────────┐                │
  ┌──────────►│ unrouted  │◄───── (system, no matching universities)
  │           └───────────┘                │
  │                                        │
  │           ┌──────────────────┐         │
  │     ┌────►│resolved_duplicate│         │
  │     │     └──────────────────┘         │
  │     │                                  │
  │     │     ┌──────────┐    system (admin confirms    ┌─────────────────────┐
  │     │     │ reported │───────────────────────────────►open_for_applications│
  │     │     └──────────┘    difficulty + routes)       └──────────┬──────────┘
  │     │          │                                                │
  │     │          │ (merge)                     system cron        │
  │     │          ▼                          (window_closes_at)    │
  │     │     (attach to parent)                                   ▼
  │     │                                              ┌───────────────────┐
  │     │                                              │  window_closed    │
  │     │                                              └────────┬──────────┘
  │     │                                                       │
  │     │                                   system (after review │ phase +
  │     │                                     ranking)           │
  │     │                                                       ▼
  │     │                                              ┌───────────────────┐
  │     │                                              │ pending_approval  │◄────┐
  │     │                                              └────────┬──────────┘     │
  │     │                                                       │                │
  │     │                              university_admin         │                │
  │     │                              (approves selected       │                │
  │     │                               team's application)     │                │
  │     │                                                       ▼                │
  │     │                                              ┌──────────┐              │
  │     │                                              │ claimed  │              │
  │     │                                              └────┬─────┘              │
  │     │                                                   │                    │
  │     │                                    leader         │                    │
  │     │                                   (first          │                    │
  │     │                                   milestone)      │                    │
  │     │                                                   ▼                    │
  │     │                                              ┌─────────────┐           │
  │     │                                              │ in_progress │           │
  │     │                                              └──────┬──────┘           │
  │     │                                                     │                  │
  │     │                                  university_admin   │   system cron    │
  │     │                                  (verifies          │   (stale)        │
  │     │                                   completion)       │                  │
  │     │                                          ┌──────────┴───────┐          │
  │     │                                          ▼                  ▼          │
  │     │                                   ┌───────────┐      ┌──────────┐     │
  │     │                                   │ completed │      │ reopened │─────┘
  │     │                                   └───────────┘      └──────────┘
  │     │                                                       (also can go to
  │     │                                                        open_for_applications
  │     │                                                        if no runner-up)
  │     │
  │     └─── system/admin (merge detected)
  │
  └─── system (routing found no matches)
```

### Transition Table

| From | To | Actor | Guard / Notes |
|------|----|-------|--------------|
| `reported` | `open_for_applications` | system | Admin has set difficulty + domain; routing found ≥ 1 university. Sets `window_closes_at`. |
| `reported` | `unrouted` | system | Routing found no matching universities after widening to max radius. |
| `reported` | `resolved_duplicate` | system / platform_admin | Merged into an existing problem (auto or manual). |
| `reported` | `rejected_spam` | platform_admin | Flagged content removed. |
| `open_for_applications` | `window_closed` | system (cron) | `NOW() >= window_closes_at`. Idempotent. |
| `open_for_applications` | `rejected_spam` | platform_admin | Late moderation. |
| `window_closed` | `pending_approval` | system | Review phase complete (all proposals rated OR review deadline passed). System ranks applicants and selects top team. |
| `window_closed` | `open_for_applications` | system | No applications received → reopen with new window. |
| `pending_approval` | `claimed` | university_admin | Approves the selected team's application. Must be the admin of the selected team's university. Creates the project. |
| `pending_approval` | `pending_approval` | university_admin | Rejects the selected team → system selects next ranked team. Same admin or different admin depending on next team's university. |
| `pending_approval` | `open_for_applications` | system | All ranked teams exhausted (all rejected or withdrawn) → reopen window. |
| `claimed` | `in_progress` | leader | Leader posts the first milestone. Must be the leader of the claimed team. |
| `in_progress` | `completed` | university_admin | Verifies the final report/proof. Must be admin of the team's university. |
| `in_progress` | `reopened` | system (cron) | No milestone update for `stale_days` (default 21). Idempotent. |
| `reopened` | `pending_approval` | system | Runner-up exists from original ranking → offer to them. |
| `reopened` | `open_for_applications` | system | No runner-up → reopen with new window. |
| `unrouted` | `open_for_applications` | platform_admin | Admin manually routes the problem or adjusts domain. |
| `completed` | — | — | Terminal state. |
| `resolved_duplicate` | `reported` | platform_admin | Admin splits a report back out → creates new problem as `reported`. |
| `rejected_spam` | — | — | Terminal state. |

---

## 2. Application State Machine

```
  ┌───────────┐    system      ┌────────┐
  │ submitted │───────────────►│ ranked │
  └─────┬─────┘  (window       └───┬────┘
        │         closes +         │
        │         review done)     ├──── system ──► selected ──► approved (uni admin)
        │                         │                    │
        │                         │                    └──► rejected (uni admin)
        │                         │
        │                         └──── system ──► not_selected
        │
        └──── leader ──► withdrawn
```

### Transition Table

| From | To | Actor | Guard / Notes |
|------|----|-------|--------------|
| `submitted` | `ranked` | system | Window closed + review phase done. All submitted applications are ranked. |
| `submitted` | `withdrawn` | leader | Before window closes. Must be the leader of the applying team. |
| `ranked` | `selected` | system | Top-ranked application for this problem. |
| `ranked` | `not_selected` | system | Not top-ranked. |
| `selected` | `approved` | university_admin | Admin of the selected team's university approves. |
| `selected` | `rejected` | university_admin | Admin of the selected team's university rejects. |
| `not_selected` | `selected` | system | Previous selected was rejected → next in rank. |
| `withdrawn` | — | — | Terminal state. |
| `approved` | — | — | Terminal state. Triggers project creation. |
| `rejected` | — | — | Terminal state for this application. |

---

## 3. Project State Machine

```
  ┌──────────────────┐    leader starts     ┌────────┐
  │ pending_approval │─────────────────────►│ active │
  └──────────────────┘    (auto on claim)    └───┬────┘
                                                 │
                           leader submits        │    system cron
                           final report          │    (stale)
                                    ┌────────────┴─────────┐
                                    ▼                       ▼
                          ┌────────────────────┐     ┌──────────┐
                          │submitted_for_review│     │ reopened │
                          └─────────┬──────────┘     └──────────┘
                                    │
                    uni admin       │     uni admin
                    approves        │     sends back
                           ┌───────┴────────┐
                           ▼                 ▼
                    ┌───────────┐       ┌────────┐
                    │ completed │       │ active │ (revision)
                    └───────────┘       └────────┘
```

### Transition Table

| From | To | Actor | Guard / Notes |
|------|----|-------|--------------|
| `pending_approval` | `active` | system | Auto-created when application is approved and problem is claimed. |
| `active` | `submitted_for_review` | leader | Leader submits final report with proof. Must be the project's team leader. |
| `active` | `reopened` | system (cron) | No milestone for `stale_days`. |
| `submitted_for_review` | `completed` | university_admin | Verifies proof. Admin of the team's university. Triggers certificate generation. |
| `submitted_for_review` | `active` | university_admin | Sends back for revisions with feedback. |
| `reopened` | — | — | Terminal for this project. Problem state machine handles the re-offer. |
| `completed` | — | — | Terminal state. |

---

## 4. Sponsorship State Machine

```
  ┌─────────┐   company    ┌───────────┐   company/admin   ┌───────────┐
  │ pledged │─────────────►│ confirmed │───────────────────►│ fulfilled │
  └────┬────┘              └─────┬─────┘                    └───────────┘
       │                         │
       │ company/admin           │ company/admin
       ▼                         ▼
  ┌───────────┐            ┌───────────┐
  │ cancelled │            │ cancelled │
  └───────────┘            └───────────┘
```

### Transition Table

| From | To | Actor | Guard / Notes |
|------|----|-------|--------------|
| `pledged` | `confirmed` | company | Company confirms their pledge. Must be the sponsoring company. |
| `pledged` | `cancelled` | company / platform_admin | Company withdraws or admin cancels. |
| `confirmed` | `fulfilled` | company / platform_admin | Sponsorship fulfilled. |
| `confirmed` | `cancelled` | company / platform_admin | Late cancellation. |
| `fulfilled` | — | — | Terminal state. |
| `cancelled` | — | — | Terminal state. |

---

## 5. Leader Status Machine

```
  ┌─────────┐   uni admin   ┌──────────┐
  │ pending │───────────────►│ approved │◄────┐
  └────┬────┘               └────┬─────┘     │
       │                         │            │ uni admin
       │ uni admin               │ uni admin  │ (reinstate)
       ▼                         ▼            │
  ┌──────────┐             ┌───────────┐     │
  │ rejected │             │ suspended │─────┘
  └──────────┘             └───────────┘
```

### Transition Table

| From | To | Actor | Guard / Notes |
|------|----|-------|--------------|
| `pending` | `approved` | university_admin | Admin of the leader's linked university. |
| `pending` | `rejected` | university_admin | Admin of the leader's linked university. |
| `approved` | `suspended` | university_admin / platform_admin | Misconduct, graduation, etc. |
| `suspended` | `approved` | university_admin | Reinstatement. |
| `rejected` | — | — | Terminal state. User can re-register if needed. |

---

## 6. User Verification Status

Email verification is planned for Phase 3. The current schema includes the `email_verified` boolean on `users`, but the verification-token lifecycle, delivery mechanism and confirmation endpoint are not implemented in the current Phase 1–2 code. No transition should be assumed to occur yet.

---

## 7. Report Status

| From | To | Actor | Notes |
|------|----|-------|-------|
| `active` | `merged` | system | Attached to a parent problem (auto or confirmed). |
| `active` | `deleted` | citizen (owner) | Citizen deletes their own report. |
| `merged` | `active` | platform_admin | Admin splits the report back out. |

---

## 8. Scheduled Jobs (Cron)

All jobs are **idempotent** and **deadline-driven**: they query for rows past their deadline and still in the relevant status, then act. Safe to run repeatedly and after downtime.

| Job | Schedule | Logic |
|-----|----------|-------|
| `closeApplicationWindows` | Every 5 min | Find problems where `status = 'open_for_applications' AND window_closes_at <= NOW()`. Transition to `window_closed`. |
| `closeReviewPhase` | Every 5 min | Find problems where `status = 'window_closed' AND review_deadline <= NOW()`. Rank applicants, select top, transition to `pending_approval`. |
| `detectStaleProjects` | Every hour | Find projects where `status = 'active' AND last_milestone_at + stale_days <= NOW()`. Transition project to `reopened`, problem to `reopened`. |
| `backstopDedupe` | Daily | Scan recent problems for potential duplicates missed on insert. Flag candidates for admin review. |

All jobs use `SELECT ... FOR UPDATE SKIP LOCKED` to prevent double-processing in case of overlapping runs.

---

## 9. Implementation Notes

- The state machine module exports a function:
  ```js
  transition(entityType, entityId, toStatus, actorRole, actorId) → { success, error }
  ```
- It reads the current status from DB, checks the transition table, applies guards, updates the status, and writes to the audit log — all in a single transaction.
- Guards are functions that receive context (the entity, the actor) and return true/false with an error message.
- Invalid transitions return `{ success: false, error: 'Cannot transition from X to Y' }` with HTTP 409.
- Unauthorized actors return `{ success: false, error: 'Role X cannot trigger this transition' }` with HTTP 403.
