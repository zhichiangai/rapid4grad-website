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

## Deferred Security Work

The next security pass should add explicit consent lifecycle tests for document sharing, reserve/settle/refund integration coverage for AI credits, server-side quiz score recomputation, security headers, OAuth E2E, RLS integration tests, Stripe fixtures, and CI enforcement.
