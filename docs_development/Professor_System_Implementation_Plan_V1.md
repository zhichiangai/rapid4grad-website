# RAPID4GRAD — Professor System Implementation Plan V1

> Status: Data Foundation V1.1 — FROZEN
> Architecture baseline: `Professor_System_Architecture_V1.md` (FROZEN)
> Freeze baseline: V1.1 clarification incorporated; implementation must follow this document.
> This is the future coding sequence; it does not implement features.

## 1. Required Gates

1. Data Model approved.
2. RLS / Authorization Design approved.
3. Migration Plan approved.
4. Safe Local Supabase environment available.
5. Schema implementation and fresh replay pass.
6. Security verification passes for owner, cross-Lab, removed and suspended actors.

No Professor UI is built before the first five gates pass.

## 2. Coding Order

1. Implement the approved three-table migration, including table-specific immutable-column triggers.
2. Implement domain validation and server authorization using the existing `app_private.has_active_lab_subscription(lab_id)` helper.
3. Add Weekly Check-in MVP.
4. Add Meeting Center.
5. Add Meeting Actions.
6. Add rule-based Attention Engine as derived output.
7. Extend Student Research 360 using real fields only.
8. Integrate the Professor Dashboard.

The order is intentionally data-first. No Kanban, Gantt, chat, file drive, calendar replacement, CRM, complex analytics, notification center or AI Professor Assistant is added.

## 3. Weekly Check-in MVP

The form contains only completed work, blockers, next plan, status and Professor help request. The Server Boundary validates the active student/Lab relationship, functional mode, Monday week and canonical upsert. The database also rejects changes to `lab_id`, `student_user_id` and `week_start` after insert. Professors and assistants read but do not edit. Removed students may read their own historical rows but cannot create or update rows.

No attachments, comments, approval, rating, AI rewrite, rich text or file upload.

## 4. Meeting Center MVP

The feature supports `meeting_at`, summary, decisions, next meeting and linked actions. It supports student-created Meeting Assistant records and valid supervisor records. It preserves the owner and Lab/student context on update. `next_meeting_at` is historical/proposed context; dashboard and Student 360 upcoming-meeting queries use future `scheduled` Meeting rows only. Removed students retain own history reads; removed supervisors lose access immediately.

No recording, Zoom, Google Meet, calendar sync or transcription pipeline.

## 5. Meeting Actions MVP

Each action has exactly one `owner_user_id`, with `owner_type` `student` or `supervisor`. Students update their own student actions; supervisors manage actions in valid Lab scope and functional mode. Database integrity triggers make `meeting_id`, Lab/student scope and owner columns immutable. V1 has no reassignment, multi-assignee, watchers or delegation.

## 6. Attention Engine

Rule-based derived queries consume Weekly Updates, Meetings, Actions and existing Shared Audit summaries. They produce Needs Attention without an `attention`, `alerts`, `notifications` or `risk_signals` table. `update_overdue` takes precedence over `no_recent_update`.

## 7. Student Research 360

P0 displays Student, Degree, Research Area, Overall Status, Latest Weekly Update, Current Blocker, Next Plan, Next Meeting, open/overdue action counts, Risk and safe AI Shared Audit Summary. It does not invent progress percentages or current stages. Milestones are P1.

## 8. Security and Quality Gates Per Feature

Every feature must add server authorization, RLS coverage, input validation, generalized client errors and tests for same-Lab/cross-Lab, immutable-column attacks, removed membership including own-history reads, suspended account, read-only subscription and private-data boundaries. Run the repository test suite, lint, TypeScript, build, `git diff --check`, fresh Local replay and integration fixtures before review.

No Client Component may directly update roles, membership, entitlement, subscription, credits or action logs. Admin remains observation/support through existing controlled actions and does not become an automatic supervisor.

## 9. Definition of Done

- Architecture invariants remain unchanged.
- Only the approved three core tables exist.
- No private PDF/raw audit exposure.
- Summary consent and revoke remain immediate.
- No product hard delete.
- All role and Lab boundaries are verified by database-backed tests.
- Identity and scope columns cannot be reassigned through UPDATE even when a user belongs to more than one Lab.
- Upcoming meetings are derived only from future scheduled Meeting rows.
- Removed students retain own historical reads; removed supervisors lose Lab access.
- New supervision mutation gates reuse the existing functional subscription helper.
- Preview and Production remain untouched until a separate release task is approved.
