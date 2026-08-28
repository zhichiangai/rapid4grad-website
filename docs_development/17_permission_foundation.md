# RAPID4GRAD Permission Foundation

## Purpose

This document defines the Phase 2 permission boundary. It does not introduce a second RBAC system or replace the existing global roles.

## Global Roles And Account Status

Global roles remain `student`, `professor`, and `admin`. `account_status` is `active` or `suspended`.

- `active`: may use the workspace and authenticated product APIs allowed by role and resource scope.
- `suspended`: may use public/authentication flows and the account suspension page only. Protected pages and authenticated product APIs return to the suspension boundary.
- `admin`: internal observation and controlled administration; admin mutations remain server-side, require a reason and confirmation, and are logged.

## Workspace Matrix

| Workspace | Student | Professor | Admin |
|---|---:|---:|---:|
| `/dashboard` | allowed | redirect to Professor workspace | allowed for observation |
| `/professor/dashboard` | redirect to Student workspace | allowed | allowed for observation |
| `/admin` | denied | denied | allowed |

The authorization order is: authentication, account status, global workspace role, then resource scope. Lab membership and ownership checks are still required after the workspace check.

## Server Enforcement

`lib/auth/authorization.ts` is server-only. Pages use `requireActiveUser`, `requireStudentWorkspace`, or `requireProfessorWorkspace`; authenticated API routes use `getActiveApiUser`. Client state is never the authorization source.

Suspended users receive the generic `ACCOUNT_SUSPENDED` API response. API responses do not expose raw database errors.

## Profile And Role Transitions

Authenticated users may update only the existing basic profile columns. Sensitive role, billing, entitlement, and subscription columns are not granted to authenticated users. Admin role changes remain an audited service-role RPC.

- Student to Professor is blocked while an active student Lab membership exists.
- Professor to Student is blocked while the user owns an active Lab, has an active Professor/assistant Lab membership, or has a subscription in `incomplete`, `trialing`, `active`, `past_due`, or `unpaid` status.
- Admin role promotion or demotion is not supported by the role mutation RPC.

Migration `20260828090000_permission_foundation_hardening.sql` is forward-only and must be applied after the existing V2 migrations. It also prevents suspended users from changing `advisor_memories` through authenticated RLS.

## Suspended Data Layer

Migration `20260828090001_suspended_data_layer_enforcement.sql` is applied after Permission Foundation and extends the suspension boundary beyond the Next.js app.

| Layer | Active account | Suspended account |
|---|---|---|
| App / middleware | Role-routed workspace access | Redirected to `/account-suspended` before role routing |
| Product APIs | `getActiveApiUser()` permits authenticated operations | Returns `403 ACCOUNT_SUSPENDED` without exposing database errors |
| Supabase RLS | Owner/resource-scoped private reads and writes remain available | Private product rows return no rows; public catalog and previews remain available |
| Private Storage | Own private object reads/deletes remain available under existing owner scope | Direct private object access is denied and no new signed URL can be issued through protected APIs |

`profiles` is intentionally exceptional: a suspended user may still read their own row so the authorization layer can read `account_status`. Self updates require an active account. Cross-profile admin observation also requires an active account.

The following data remains private to active authenticated accounts with the pre-existing owner, Lab, or admin scope preserved: funnel history, commerce records, course progress, Labs, memberships, subscriptions, student document metadata, raw AI audit rows, and student summary-share controls. The migration does not add a raw PDF or raw audit bypass for admin, professor, or assistant.

Public products, active public prompt templates, published courses, and `public_preview` lessons remain readable for suspended and anonymous visitors. `course_full` and `lab_basic` lessons require both their existing entitlement check and an active account.

Previously issued signed URLs may remain usable until their normal expiration. Suspended users cannot request new signed URLs. Immediate signed-URL revocation is intentionally deferred.

## SECURITY DEFINER RPC Guards

Migration `20260828090001_suspended_data_layer_enforcement.sql` also hardens the two
private Lab PDF RPC boundaries. `get_my_lab_pdf_credit_balance()` and
`get_shared_audit_summaries(UUID, UUID)` require an authenticated, active account
before reading private Lab data; suspended or unauthenticated calls fail with a
generic authorization error. The summary RPC retains its fixed seven-column
contract and its existing consent, active-membership, Lab-scope, and admin rules.

The Local course-purchase integration fixture is self-contained: it creates its
own test-only professor, active Lab, trial subscription, and test prices through
the production workflows. It does not weaken Lab or subscription invariants.

## Deferred Security Work

The next security pass should add explicit consent lifecycle tests for document sharing, reserve/settle/refund integration coverage for AI credits, server-side quiz score recomputation, security headers, OAuth E2E, RLS integration tests, Stripe fixtures, and CI enforcement.

Deferred identity and access design remains out of scope: `system_admin`, granular admin roles, assistant identity redesign, admin impersonation, full service-role read reduction, and immediate signed-URL revocation.
