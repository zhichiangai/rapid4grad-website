# RAPID4GRAD — Professor System RLS / Authorization Design V1

> Status: Data Foundation V1.1 — FROZEN
> Architecture baseline: `Professor_System_Architecture_V1.md` (FROZEN)
> Design only: no policy, RPC or schema is created by this file.

## 1. Security Model

Every user-facing operation uses three layers:

1. Next.js Server Boundary validates session, request shape and product mode.
2. Domain authorization validates role, active account, Lab membership, ownership and parent-child invariants.
3. Supabase RLS enforces the same tenant boundary for direct authenticated access.

Frontend filtering is never an authorization control. Service role is reserved for internal workflows and does not replace ordinary user RLS.

## 2. Existing Helpers To Reuse

The implementation should reuse `app_private.owns_lab(...)`, `app_private.is_active_lab_member(...)`, existing active-account checks and the existing subscription functional/read-only decision. It must not create a second membership or Professor ownership model. Any new helper requires a separate security review and fixed `search_path` if it is SECURITY DEFINER.

All policies include the existing `profiles.account_status` gate through the established helper/domain path. Suspended users must not gain access through these tables.

## 3. Weekly Update Policies

### SELECT

- Student: `student_user_id = auth.uid()` and membership/scope checks for the Lab.
- Professor or assistant: active valid supervisor scope for the Lab; historical reads may remain available in read-only subscription mode.
- Admin: no automatic new access solely from `profile.role = admin`; support access, if later needed, is explicit and separately audited.

### INSERT

Only a student may insert their own row, with active student membership and functional Lab supervision mode. `student_user_id`, `lab_id` and canonical week validation are checked by both server authorization and `WITH CHECK`.

### UPDATE

Only the owning student may update while the student has an active Lab membership, active account and functional subscription mode. `USING` and `WITH CHECK` both require the original/current student and Lab scope. A table-specific integrity trigger additionally rejects changes to `lab_id`, `student_user_id` or `week_start`; this is row-integrity enforcement, not authorization. Professors and assistants have no update policy.

### DELETE

No authenticated product DELETE policy in V1.

## 4. Meeting Policies

### SELECT

The student can read their own meetings while active, including historical meetings after Lab removal when the account remains active. A valid Lab owner Professor or active Professor/Assistant supervisor can read within that Lab. Admin is not automatically granted supervision data. The canonical upcoming meeting is selected only from `status = scheduled AND meeting_at > now()`; `next_meeting_at` is never used as the current source of truth.

### INSERT

- Student: own `student_user_id`, active student membership, functional mode and `created_by = auth.uid()`.
- Supervisor: valid Lab supervisor scope, functional mode and `created_by = auth.uid()`.

### UPDATE

- Student: only meetings with own `student_user_id` and own `created_by`.
- Supervisor: valid Lab supervisor scope and functional mode.
- Any update must preserve `lab_id`, `student_user_id` and `created_by`; no reassignment through UPDATE. A table-specific integrity trigger rejects any attempt to change those columns without reading authorization state.

### DELETE

No product DELETE policy. Use `canceled`.

## 5. Meeting Action Policies

### SELECT

Students read actions in their own meeting context. Valid Lab supervisors read actions in their Lab scope. The composite parent relationship must be preserved.

### INSERT

The Server Boundary validates parent Meeting scope, Lab/student equality, owner type and owner user, active account, membership and functional mode. RLS repeats the Lab and account boundary. Student-owned actions must point to the student; supervisor-owned actions must point to the Lab owner or active professor/assistant.

### UPDATE

- Student can update only editable fields of a student-owned action where `owner_user_id = auth.uid()` and `owner_type = student`.
- Supervisor can update within valid Lab scope and functional mode.
- `meeting_id`, `lab_id`, `student_user_id`, `owner_type` and `owner_user_id` cannot be changed in V1. A table-specific integrity trigger enforces this invariant independently of RLS.
- `status`/`completed_at` consistency is enforced by database constraint and server validation.

### DELETE

No product DELETE policy. Use `canceled`.

## 6. Removed Membership and Historical Access

- Removed Professor or Assistant immediately loses all supervision-table read and write access for that Lab.
- Removed Student retains active-account, own-history `SELECT` access to existing Weekly Updates, Meetings and Meeting Actions.
- Removed Student cannot insert or update any supervision row because all mutations require active student membership and functional Lab subscription mode.
- Membership removal does not erase the student's own research history.

## 7. Consent and Data Classification

Joining a Lab does not share private student data. A Weekly Update submitted to a Lab and a Meeting saved to Lab supervision context are explicit sharing actions for those records. AI audit remains a separate Shared Audit boundary: Professor/Assistant only receive fixed safe summary fields after active, Lab-specific student consent. They never receive private PDF, raw audit, prompt, token/cost or internal error.

Member removal and consent revocation must invalidate subsequent reads immediately. Existing summary-only RPC remains the preferred interface; raw audit tables must not receive a new supervisor SELECT policy.

## 8. Subscription and Account State

- Functional mode: existing active/trialing valid period or existing valid grace rule, evaluated through `app_private.has_active_lab_subscription(lab_id)`.
- Read-only mode: existing authorized historical rows remain readable; new mutations are denied.
- No/invalid mode: existing authorization rules apply.
- Suspended account: all new Professor feature reads and writes are denied by the existing global account gate.
- Admin observation is not automatic Student supervision access and does not grant raw private data.

## 9. Test Matrix

| Actor | Same Lab | Cross Lab | Removed | Suspended |
|---|---:|---:|---:|---:|
| Student A own rows | allow | deny | deny new Lab-scoped access | deny |
| Student A other student rows | deny | deny | deny | deny |
| Professor A / Lab A | allow | deny | deny | deny |
| Assistant A active / Lab A | allow | deny | deny | deny |
| Professor B / Lab B | allow in B | deny A | deny | deny |
| Admin | no automatic new supervision access | no automatic access | no automatic access | deny through account gate |

Additional checks: Professor/Assistant raw audit SELECT returns zero rows, private Storage PDF access is denied, consent revoke removes the next summary RPC result, and read-only subscription denies new writes but permits authorized history.

## 10. Implementation Safety

The implementation must preserve existing grants, private Storage policies, summary-only RPC shape and Phase 1 fallback. Do not add broad `TO authenticated` access without a row predicate. Do not place `OR is_admin()` on every new supervision policy. Do not use SECURITY DEFINER as a generic permission bypass. Each new security test must include immutable identity/scope update attacks, canonical upcoming-meeting selection, removed-student history reads, removed-supervisor denial, suspended-account denial and functional/read-only subscription behavior.
