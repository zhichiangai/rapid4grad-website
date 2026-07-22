-- Restore the table-level privileges required for RLS-protected profile reads.
-- Authenticated users receive SELECT only; their UPDATE access remains limited
-- to the explicit basic-profile columns granted by migration 20260710230403.
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Server-only operations use service_role for controlled administration,
-- billing synchronization, and profile lifecycle operations.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;

-- Manual local validation (run with disposable users only):
-- 1. SET LOCAL ROLE authenticated with request.jwt.claims for student A.
-- 2. SELECT student A succeeds; SELECT student B returns zero rows by RLS.
-- 3. UPDATE full_name for student A succeeds.
-- 4. UPDATE role, is_paid, paid_at, or course_expires_at is permission denied.
-- 5. service_role retains server-only SELECT/INSERT/UPDATE/DELETE access.
