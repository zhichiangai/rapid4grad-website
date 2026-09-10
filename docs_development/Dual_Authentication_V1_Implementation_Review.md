# Dual Authentication V1 Implementation Review

## Scope

- Add Supabase Email + Password sign-in to `/login`.
- Preserve the existing Google OAuth start and callback flow.
- Add public `/signup` using Supabase Auth email signup.
- New public signup does not accept a client-selected role; the existing database trigger creates `student` profiles.

## Security Boundaries

- Authentication uses Supabase Auth `signInWithPassword` and `signUp`.
- No password table, password hashing, service-role client, or secret is exposed to the browser.
- Existing relative-path `next` validation remains the redirect boundary.
- Existing role-based workspace routing remains server-derived from `profiles.role`.
- No Supabase migration or RLS change is included.
- Existing Google OAuth and Admin login code remain separate and unchanged.

## Verification

- `npm test`: PASS (180 tests)
- `npm run lint`: PASS
- `npx tsc --noEmit --incremental false`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS

## Auth Password Credential Fix V1

### Root Cause

- A Google-only Supabase user has an authenticated session but no password credential.
- Calling `/login` with Email + Password therefore correctly returns a generic `401`.
- Public signup is not a safe substitute for linking credentials because it creates a different Auth user.

### Implemented Fix

- Added authenticated `/account/security`.
- The page uses the existing server-side active-user guard and browser Supabase client.
- Password creation calls only `supabase.auth.updateUser({ password })` for the current session.
- No client-provided user ID, custom password table, service-role client, JWT bypass, migration, or RLS change is used.
- Added the student navigation entry and generic failure/success states.
- Added environment-aware signup `emailRedirectTo` using the current request origin and safe relative `next`.
- Added safe Auth diagnostics that record only operation, HTTP status, and Supabase error code.

### Release Checkpoint

- Branch: `auth-password-credential-fix-v1`
- Commit: `52d98e0`
- Preview deployment: READY (`rapid4grad-website-j0x0l1ixh-zhichiang-ai-s-projects.vercel.app`)
- Production merge/deploy: not started
- Manual QA still required: fresh Email signup and Google-only user -> Account Security -> password login.

## Release Status

- Feature branch: `dual-authentication-v1`
- Preview deployment: pending
- Production merge/deploy: pending Preview verification
