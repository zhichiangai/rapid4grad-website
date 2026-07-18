-- ============================================================
-- RAPID4GRAD Phase 2 Security Closure
-- Protect profile billing/role fields and remove public quota access.
-- This migration is local-only until manually reviewed and applied.
-- ============================================================

-- Authenticated users may update only their own basic profile fields. RLS still
-- decides which row is writable; column privileges decide which fields can be
-- changed. The service_role keeps its existing table-level privileges for
-- Stripe webhooks and controlled server-side administration.
REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;

GRANT UPDATE (
  full_name,
  avatar_url,
  degree,
  department,
  research_area,
  advisor_name,
  advisor_style
) ON TABLE public.profiles TO authenticated;

-- Quota data contains email identifiers and administrative unlock state. It is
-- exclusively accessed through server-only routes/actions using service_role.
DROP POLICY IF EXISTS "free_quotas: public can insert and update"
  ON public.free_usage_quotas;
DROP POLICY IF EXISTS "free_quotas: user can view own by email"
  ON public.free_usage_quotas;
DROP POLICY IF EXISTS "free_quotas: admin can update all"
  ON public.free_usage_quotas;

REVOKE ALL PRIVILEGES ON TABLE public.free_usage_quotas FROM anon, authenticated;

-- ============================================================
-- Manual validation SQL (do not execute as part of this migration)
-- ============================================================
-- Use Supabase RLS Tester or a transaction with a real test user's JWT claims.
-- Replace the UUID/email placeholders only in a non-production verification
-- transaction and always ROLLBACK.
--
-- BEGIN;
-- SET LOCAL ROLE authenticated;
-- SELECT set_config('request.jwt.claims',
--   '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',
--   true);
--
-- -- Expected: succeeds for the current user's row.
-- UPDATE public.profiles
-- SET full_name = 'Security validation'
-- WHERE id = '00000000-0000-0000-0000-000000000001';
--
-- -- Expected: permission denied for each protected column.
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = '00000000-0000-0000-0000-000000000001';
-- UPDATE public.profiles
-- SET is_paid = true
-- WHERE id = '00000000-0000-0000-0000-000000000001';
-- UPDATE public.profiles
-- SET course_expires_at = now() + interval '1 year'
-- WHERE id = '00000000-0000-0000-0000-000000000001';
--
-- -- Expected: permission denied; quota data is not client-readable/writable.
-- SELECT * FROM public.free_usage_quotas LIMIT 1;
-- INSERT INTO public.free_usage_quotas (email) VALUES ('rls-test@example.com');
-- UPDATE public.free_usage_quotas SET unlocked_by_admin = true
-- WHERE email = 'rls-test@example.com';
-- ROLLBACK;
