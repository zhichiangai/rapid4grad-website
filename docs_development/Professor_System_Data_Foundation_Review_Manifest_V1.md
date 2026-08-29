# RAPID4GRAD — Professor System Data Foundation Review Manifest V1.1

> Status: Data Foundation V1.1 — FROZEN
> Database state: unchanged
> Generated on: 2026-08-30

## 1. Baseline

| Item | Value |
|---|---|
| Architecture frozen commit | `3fe0e7e` (`docs(professor): freeze system architecture v1.1`) |
| Main SHA after architecture freeze | `3fe0e7e` |
| Review branch | `professor-data-model-v1-review` |
| Review branch base SHA | `3fe0e7e` |
| Production code/database baseline | `88b78c20a2084a51af03401220eabeb91ca88424` before docs freeze |

## 2. Deliverables

| Document | Status |
|---|---|
| `Professor_System_Architecture_V1.md` | FROZEN on main |
| `Professor_System_Data_Model_V1.md` | V1.1 FROZEN |
| `Professor_System_RLS_Authorization_V1.md` | V1.1 FROZEN |
| `Professor_System_Migration_Plan_V1.md` | V1.1 FROZEN |
| `Professor_System_Implementation_Plan_V1.md` | V1.1 FROZEN |
| `Professor_System_Data_Foundation_Review_Manifest_V1.md` | V1.1 FROZEN |

## 3. Immutable Decisions Checklist

| Decision | Status |
|---|---|
| Three P0 tables only | PASS |
| One canonical Weekly Update per Lab/student/week | PASS |
| Monday `week_start` | PASS |
| No draft lifecycle | PASS |
| Meeting has three statuses | PASS |
| Action has four statuses | PASS |
| Single Action owner | PASS |
| `student` / `supervisor` owner types | PASS |
| Explicit `owner_user_id` | PASS |
| Composite Meeting/action scope protection | PASS |
| No hard delete | PASS |
| RESTRICT FKs | PASS |
| New status uses text + CHECK | PASS |
| No attention table | PASS |
| No risk table | PASS |
| No milestones in P0 | PASS |
| Professor cannot edit Weekly Update | PASS |
| Shared supervision data classification | PASS |
| Private PDF unchanged | PASS |
| Raw AI audit unchanged | PASS |
| Shared Audit consent unchanged | PASS |
| Server boundary preferred | PASS |
| RLS required | PASS |
| Admin does not automatically gain new supervision data | PASS |
| Weekly Update identity/scope columns immutable after insert | PASS |
| Meeting identity columns immutable after insert | PASS |
| Meeting Action identity/owner columns immutable after insert | PASS |
| `next_meeting_at` is not canonical upcoming source | PASS |
| Removed student retains own historical reads only | PASS |
| Existing functional subscription helper is reused | PASS |

## 4. Current Foundation Findings

- `weekly_updates`, `meetings` and `meeting_actions` are not currently implemented; they remain Planned.
- Existing Lab, membership, subscription and summary-only audit foundations are reused.
- Existing raw audit and private Storage boundaries remain unchanged.
- Attention and Risk remain derived; no core table is introduced.
- V1.1 clarification adds table-specific row-integrity triggers; triggers do not authorize users or inspect membership, subscription or role.
- Canonical upcoming Meeting is a future `scheduled` row; `next_meeting_at` remains historical/proposed context.
- Removed students retain active-account own-history reads but cannot mutate or use Lab-scoped access.
- New mutation gates reuse `app_private.has_active_lab_subscription(lab_id)`.

## 5. Scope Diff Versus Main

The review branch is docs-only relative to `main` after the Architecture freeze. The five deliverables are under `docs_development/`. No `app/`, `components/`, `lib/`, `supabase/`, migration, `package.json` or `middleware.ts` change is part of this design package. The next implementation branch may add one generated migration and tests only after this frozen baseline is approved.

## 6. Database and Production State

```text
Production DB changed: NO
Supabase migration applied: NO
RLS changed: NO
RPC changed: NO
Schema changed: NO
Production data mutation: NO
```

## 7. V1.1 Clarification Record

| Clarification | Decision |
|---|---|
| Immutable identity/scope fields | Enforced by table-specific `BEFORE UPDATE` integrity triggers; authorization remains in Server Boundary and RLS. |
| Upcoming meeting truth source | Future rows with `status = scheduled`; `next_meeting_at` is not canonical. |
| Removed student history | Own historical Weekly Updates, Meetings and Actions remain readable while account is active; all writes are denied. |
| Subscription helper | Reuse `app_private.has_active_lab_subscription(lab_id)`; no duplicate Professor helper. |
| Implementation boundary | Three core tables only; no UI, fourth table, raw audit access or private PDF access. |

## 8. Review Questions

Open questions: NONE. External clarification has been incorporated. Implementation may proceed only against this frozen baseline. Any future conflict with the frozen Architecture must be recorded as a blocker and reviewed before implementation. This package does not authorize SQL, migration creation, RLS changes, UI work, Preview deployment or Production changes.
