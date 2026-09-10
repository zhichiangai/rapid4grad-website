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

- `npm test`: PASS (179 tests)
- `npm run lint`: PASS
- `npx tsc --noEmit --incremental false`: PASS
- `npm run build`: PASS
- `git diff --check`: PASS

## Release Status

- Feature branch: `dual-authentication-v1`
- Preview deployment: pending
- Production merge/deploy: pending Preview verification
