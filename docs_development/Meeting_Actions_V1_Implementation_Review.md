# Meeting Actions V1 Implementation Review

## Product Goal

Meeting Actions turns a completed supervision Meeting decision into one clear next action that can be completed and carried into the next Weekly check-in. It is not a project-management system.

## Scope

- Student Action Center: `/dashboard/actions`.
- Completed Meeting action creation and shared action list in `/dashboard/meetings` and the Professor/Assistant Lab Meeting Center.
- Student-owned and supervisor-owned actions reuse `public.meeting_actions`.
- No new migration, table, enum, policy or service-role Action CRUD.

## Rules

- Actions can only be created from a completed Meeting.
- Browser input contains only Meeting ID, title, due date and supervisor owner choice. Server code derives Lab, student and owner identity.
- Students can create and mutate their own actions only. Supervisor-owned actions are read-only to students.
- Same-Lab Professor/Assistant can create a student action or an action owned by the current supervisor. Owner identity is immutable.
- `todo`, `doing`, `done` and `canceled` are supported. `done` and `canceled` are terminal; cancel preserves the row and there is no delete UI or server delete.
- `completed_at` is derived by the server from status. Due dates are Taipei calendar dates.

## Authorization and Privacy

Action reads and writes use the authenticated Supabase client and existing `meeting_actions` RLS. Action content does not load private PDFs, raw AI results, prompts, tokens, costs, storage paths or private notes. Admin has no unrestricted Action dashboard or Action mutation path. Expired, archived, removed-membership and suspended boundaries continue to rely on existing guards and RLS.

## Attention Integration

The existing Attention loader already derives `overdue_action` and `deadline_soon` from `meeting_actions`; this feature does not modify the Attention engine, create alert tables, cron jobs or webhooks.

## Local Validation

- Docker Engine: available.
- Fresh Local Supabase replay: passed through `20260830064359_add_professor_supervision_data_v1.sql`.
- Existing disposable integration suites: passed for V2 database/RLS, email, course purchase, course access, Professor subscription, Lab PDF shared pool, Admin control plane and Professor Data Foundation.
- Professor Data Foundation fixture passed with student, same-Lab assistant, cross-Lab Professor, removed membership, action RLS and historical access checks.
- `npm test`: 108/108 passed.
- `npm run lint`: passed.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
- Authenticated browser QA, responsive browser QA and keyboard QA: not yet executed; no disposable browser Auth harness is present and no Production account was used.

## Explicit Exclusions

No migration, RLS change, Professor Action Center route, delete, reassignment, Kanban, reminders, notifications, calendar, AI extraction, attachments, chat, CRM or Admin redesign.

## Release Record

- Branch: `meeting-actions-v1`.
- Preview: pending until the implementation branch is pushed.
- Production: unchanged and not targeted.
