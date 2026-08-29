# RAPID4GRAD — Professor System Data Model V1

> Status: READY FOR REVIEW
> Architecture baseline: `Professor_System_Architecture_V1.md`
> Architecture status: FROZEN
> Scope: physical data model design only; this file is not a migration.

## 1. Scope and Boundary

The only new Professor System core tables in V1 are:

1. `weekly_updates`
2. `meetings`
3. `meeting_actions`

`Attention` and `Risk` remain derived query output. `research_milestones` is Future / P1 and is not required by P0 Student 360. No projects, boards, sprints, comments, chat, documents, folders, alerts or notification tables are introduced.

Existing `profiles`, `labs`, `lab_memberships`, `subscriptions`, AI audit and consent entities remain the foundation. The new tables reference that foundation; they do not create a second Professor-specific user or relationship model.

## 2. Existing Foundation Reuse

| Existing entity/helper | Use in this model |
|---|---|
| `profiles` | identity, workspace role and account status |
| `labs` | supervision container and Lab scope |
| `lab_memberships` | student/supervisor relationship and active membership |
| `subscriptions` | Lab access mode; reuse existing functional/read-only rules |
| `app_private.owns_lab(...)` | owner scope |
| `app_private.is_active_lab_member(...)` | active Lab membership scope |
| existing account-status helper | suspended-account gate |
| existing audit summary consent/RPC | safe Shared Audit only; raw audit remains private |

No duplicate membership helper or Professor ownership column is planned.

## 3. `weekly_updates`

| Column | Type / rule |
|---|---|
| `id` | `uuid` primary key |
| `lab_id` | `uuid` not null, FK `labs.id`, `ON DELETE RESTRICT` |
| `student_user_id` | `uuid` not null, FK `auth.users.id`, `ON DELETE RESTRICT` |
| `week_start` | `date` not null; canonical Monday |
| `completed_summary` | `text` not null; `btrim(...) <> ''` |
| `blockers` | `text` nullable |
| `next_plan` | `text` not null; `btrim(...) <> ''` |
| `self_status` | `text` plus CHECK: `on_track`, `slightly_behind`, `blocked` |
| `needs_professor_help` | `text` plus CHECK: `none`, `next_meeting`, `soon` |
| `created_at` | `timestamptz` not null |
| `updated_at` | `timestamptz` not null; reuse repository convention |

Canonical invariant: `UNIQUE (lab_id, student_user_id, week_start)`. The application validates Monday, and the database design should add a CHECK that the date is ISO Monday when the implementation migration is approved. A student can update the same canonical row; V1 has no draft/submitted/reviewed lifecycle.

Submitting the update to a Lab is the explicit sharing intent. Lab membership alone does not share private student data.

## 4. `meetings`

| Column | Type / rule |
|---|---|
| `id` | `uuid` primary key |
| `lab_id` | `uuid` not null, FK `labs.id`, `ON DELETE RESTRICT` |
| `student_user_id` | `uuid` not null, FK `auth.users.id`, `ON DELETE RESTRICT` |
| `meeting_at` | `timestamptz` not null |
| `status` | `text` plus CHECK: `scheduled`, `completed`, `canceled` |
| `summary` | `text` nullable |
| `decisions` | `text` nullable |
| `next_meeting_at` | `timestamptz` nullable |
| `created_by` | `uuid` not null, FK `auth.users.id`, `ON DELETE RESTRICT` |
| `created_at` | `timestamptz` not null |
| `updated_at` | `timestamptz` not null |

A meeting may be created by the student Meeting Assistant or by a valid Professor/Assistant supervision flow. Saving it into the Lab context is the explicit sharing action. Upcoming means `status = scheduled AND meeting_at > now()`. Latest valid meeting means `status = completed`, ordered by `meeting_at DESC`.

V1 does not add draft, approval, rescheduled, missed, recording, calendar or transcription states.

## 5. `meeting_actions`

| Column | Type / rule |
|---|---|
| `id` | `uuid` primary key |
| `meeting_id` | `uuid` not null, FK `meetings.id`, `ON DELETE RESTRICT` |
| `lab_id` | `uuid` not null, FK `labs.id`, `ON DELETE RESTRICT` |
| `student_user_id` | `uuid` not null, FK `auth.users.id`, `ON DELETE RESTRICT` |
| `title` | `text` not null; `btrim(...) <> ''` |
| `owner_type` | `text` plus CHECK: `student`, `supervisor` |
| `owner_user_id` | `uuid` not null, FK `auth.users.id`, `ON DELETE RESTRICT` |
| `due_date` | `date` nullable |
| `status` | `text` plus CHECK: `todo`, `doing`, `done`, `canceled` |
| `completed_at` | `timestamptz` nullable |
| `created_at` | `timestamptz` not null |
| `updated_at` | `timestamptz` not null |

The implementation must provide a composite unique key on `meetings (id, lab_id, student_user_id)` and a composite FK from `(meeting_id, lab_id, student_user_id)` to it. This prevents a Meeting A / Lab B / Student C pollution combination. `owner_type = student` requires `owner_user_id = student_user_id`. `owner_type = supervisor` requires the owner to be the Lab owner or an active professor/assistant membership; this is enforced by server authorization plus RLS/domain helper, not a cross-table CHECK.

If `status = done`, `completed_at` is required. If `status <> done`, `completed_at` is null. There is one owner only: no multi-assignee, watchers, delegation or mentions.

## 6. Foreign Keys, Lifecycle and Timestamp Policy

- All user and Lab relationships use `ON DELETE RESTRICT`.
- V1 has no product hard delete for these records.
- Meeting cancellation, action cancellation, Lab archival and membership removal preserve history.
- New tables reuse the existing `updated_at` convention and trigger if the implementation review confirms it; no new global trigger is created in this design document.
- Existing data, roles, subscription semantics, private PDF and raw AI audit boundaries remain unchanged.

## 7. Minimum Index Plan

| Table | Index |
|---|---|
| `weekly_updates` | unique `(lab_id, student_user_id, week_start)` |
| `meetings` | `(lab_id, student_user_id, meeting_at DESC)` |
| `meetings` | `(lab_id, status, meeting_at)` |
| `meeting_actions` | `(meeting_id)` |
| `meeting_actions` | `(lab_id, student_user_id, status, due_date)` |

No full-text, vector or speculative analytics indexes are part of V1.

## 8. Derived Query Support

The model supports these derived signals without an attention/risk table:

- `no_recent_update`: no update for 7–13 days.
- `update_overdue`: no update for at least 14 days; replaces `no_recent_update`.
- `overdue_action`: action is not `done`/`canceled` and `due_date < today`.
- `deadline_soon`: action is not `done`/`canceled` and due date is today through today + 14 days.
- `no_recent_meeting`: latest completed meeting is at least 21 days old and there is no upcoming scheduled meeting.

## 9. Data Ownership Matrix

| Data | Student | Professor | Assistant | Admin |
|---|---|---|---|---|
| Weekly Update | own Lab row: read/create/update | Lab-scope read; no update | Lab-scope read; no update | no automatic new access |
| Meeting | read own Lab meetings; create/update own-created meeting | Lab-scope read/create/update in functional mode | same valid supervisor scope | no automatic new access |
| Meeting Action | read own context; update own student-owned action | Lab-scope read/create/update in functional mode | same valid supervisor scope | no automatic new access |
| Private PDF/raw audit | own existing rights only | never | never | never by default |
| Shared Audit Summary | own data and consent control | fixed summary only with active consent and Lab scope | fixed summary only with active consent and Lab scope | existing minimum observation rules only |

Subscription controls functional versus read-only mutation mode; it does not change ownership. Functional mode permits new supervision mutations. Read-only mode permits historical reads already authorized. No/invalid mode follows the existing subscription authorization rules.

## 10. Implementation Boundary

This document creates no table, constraint, index, policy, RPC or trigger. Implementation requires separate approval of the RLS design and migration plan, followed by a fresh Local replay and owner/cross-Lab/suspended-account tests.
