# RAPID4GRAD — Professor System Migration Plan V1

> Status: READY FOR REVIEW
> Design only: no `.sql` migration is created or applied by this file.
> Baseline: `Professor_System_Architecture_V1.md` (FROZEN)

## 1. Forward-only Order

The future implementation migration is planned in this order:

1. Create `weekly_updates`.
2. Create `meetings`.
3. Create `meeting_actions`.
4. Add CHECK constraints, canonical-week invariant and composite Meeting scope protection.
5. Add only the minimum required indexes.
6. Enable RLS on the three tables.
7. Create scoped policies from `Professor_System_RLS_Authorization_V1.md`.
8. Apply grants and confirm Data API does not expose unintended operations.
9. Run verification SQL and Local integration tests.

The eventual file must be created with `supabase migration new <name>` after design approval. Suggested logical name: `add_professor_supervision_data_v1`. Existing migrations are never edited or renamed.

## 2. Physical Requirements

`weekly_updates` requires restricted Lab/user FKs, canonical Monday `week_start`, unique `(lab_id, student_user_id, week_start)`, non-empty summary/plan and text CHECK values.

`meetings` requires restricted Lab/user FKs and the three fixed status values. `created_by` supports both student-created and supervisor-created meetings.

`meeting_actions` requires restricted FKs, composite parent Meeting scope, fixed owner/status values, single-owner invariant and `done`/`completed_at` consistency. Cross-Lab and cross-student combinations must fail in the database.

## 3. Safety Checklist

- Existing data unaffected.
- No destructive column changes.
- No profile role changes.
- No Lab membership semantic changes.
- No subscription semantic changes.
- No existing RLS removal.
- No existing RPC revoke.
- No private PDF exposure.
- No raw AI audit exposure.
- No automatic Admin access to new supervision data.
- No hard-delete product operation.

## 4. Local Verification Plan

Replay the complete repository migration set from an empty Local Supabase database before and after the future migration. Verify table structure, FKs, CHECK constraints, indexes, RLS enabled state, grants and policy coverage.

Required fixtures:

| Fixture | Purpose |
|---|---|
| Student A / Lab A | own access and writes |
| Student B / Lab B | cross-tenant denial |
| Professor A / Lab A owner | supervisor scope |
| Assistant A / Lab A active | assistant scope |
| Professor B / Lab B | separate tenant |
| Removed member | immediate scope loss |
| Suspended user | global account denial |
| Admin | observation boundary, no automatic access |

Required assertions:

- Same-Lab supervisor reads pass; cross-Lab reads return zero rows.
- Student self reads/writes pass; other student reads fail.
- Professor/assistant cannot update Weekly Updates.
- Student cannot change Lab, student identity or action owner through UPDATE.
- Removed membership and suspended account deny new access.
- Functional mode permits writes; read-only mode permits authorized history but rejects writes.
- No authenticated DELETE policy exists for the three tables.
- Raw audit and private PDF remain inaccessible.
- Existing Shared Audit summary consent/revoke behavior remains unchanged.

## 5. Rollback / Recovery Boundary

Before applying an implementation migration, take the normal schema backup and verify the Local replay. Production recovery must use the approved forward migration/recovery process; this design does not authorize remote SQL, migration repair, data deletion or destructive rollback.

## 6. Approval Gate

Do not create or apply the implementation migration until Data Model, RLS design and this plan are externally approved. Any conflict with the frozen Architecture is a blocker, not an invitation to add another table or redesign ownership.
