# Account Security V1 Implementation Review

## Scope

- Add password update for the authenticated user.
- Add public password recovery and reset routes.
- Add Supabase Auth Google identity status and manual linking.
- Add password re-authentication before Google unlinking.
- Preserve existing role routing, suspension checks, Google login, Email login, signup, and safe relative redirects.

## Implementation

- `/forgot-password` uses `supabase.auth.resetPasswordForEmail` and always shows the same generic success message for existing, unknown, OAuth-only, and suspended email addresses.
- `/reset-password` only renders the update form when the browser has a valid recovery session. Invalid or expired recovery callbacks return a friendly retry state.
- `/auth/callback` keeps one PKCE session exchange and distinguishes only the internal `recovery` and `link` flows. Both return to same-origin routes.
- `/account/security` reads Google state from `getUserIdentities()`, never from `profiles`.
- Google linking uses `linkIdentity({ provider: "google" })` and records a short-lived pending user id in session storage only to verify that the authenticated user id remains unchanged after the OAuth round trip.
- Google unlinking requires `signInWithPassword`, matching the original authenticated user id, a current Google identity, and an Email identity before calling `unlinkIdentity`.
- Password input is cleared after update and unlink attempts. Passwords, tokens, sessions, and identity metadata are not logged or persisted.

## Data and Security Boundaries

- No database migration.
- No RLS change.
- No profile, role, entitlement, payment, course, Lab, or learner-data mutation.
- No service-role client in browser code.
- `isSafeNextPath` rejects absolute URLs, protocol-relative URLs, backslashes, and control characters.
- Recovery page is marked `noindex`.

## Automated Verification

- `npm test`: PASS (`186/186`)
- `npm run lint`: PASS
- `npx tsc --noEmit --incremental false`: PASS
- `git diff --check`: PASS
- `npm run build`: PASS

## External QA Gate

Real Supabase recovery-email delivery and Google manual linking/unlinking require an authenticated QA user and, for linking, Supabase Manual Linking enabled. No Admin or production user was modified during implementation. Preview deployment and authenticated QA remain release gates; no Production deployment has been made from this branch.
