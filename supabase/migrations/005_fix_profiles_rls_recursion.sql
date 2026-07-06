-- ============================================================
-- RAPID4GRAD Phase 2 — Fix profiles RLS recursion
-- Migration: 005_fix_profiles_rls_recursion.sql
-- Scope:
--   1. Remove policies that query public.profiles from inside profiles RLS.
--   2. Replace admin/professor role checks with SECURITY DEFINER helpers.
--   3. Keep Phase 1/2 access rules while preventing infinite recursion.
-- ============================================================

-- Helper functions intentionally bypass RLS for role and lab-visibility checks.
-- They only return scalar authorization decisions for the current auth.uid().
CREATE OR REPLACE FUNCTION public.app_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.role
  FROM public.profiles AS p
  WHERE p.id = (SELECT auth.uid())
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.app_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(public.app_current_user_role() = 'admin', FALSE)
$$;

CREATE OR REPLACE FUNCTION public.app_is_professor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(public.app_current_user_role() = 'professor', FALSE)
$$;

CREATE OR REPLACE FUNCTION public.app_can_view_profile(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    target_profile_id = (SELECT auth.uid())
    OR public.app_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.lab_memberships AS student_membership
      JOIN public.labs AS lab
        ON lab.id = student_membership.lab_id
      WHERE student_membership.user_id = target_profile_id
        AND student_membership.role = 'student'
        AND student_membership.status = 'active'
        AND (
          lab.owner_professor_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.lab_memberships AS viewer_membership
            WHERE viewer_membership.lab_id = student_membership.lab_id
              AND viewer_membership.user_id = (SELECT auth.uid())
              AND viewer_membership.role IN ('professor', 'assistant')
              AND viewer_membership.status = 'active'
          )
        )
    )
$$;

REVOKE ALL ON FUNCTION public.app_current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_professor() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_view_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_professor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_view_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.app_is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.app_is_professor() TO service_role;
GRANT EXECUTE ON FUNCTION public.app_can_view_profile(UUID) TO service_role;

-- ============================================================
-- profiles policies
-- ============================================================
DROP POLICY IF EXISTS "profiles: user can view own" ON public.profiles;
DROP POLICY IF EXISTS "profiles: user can update own" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin can view all" ON public.profiles;
DROP POLICY IF EXISTS "profiles: lab professor can view active lab students" ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin can update all" ON public.profiles;

CREATE POLICY "profiles: user can view own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles: admin can view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.app_is_admin());

CREATE POLICY "profiles: lab professor can view active lab students"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.app_can_view_profile(id));

CREATE POLICY "profiles: user can update own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles: admin can update all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

-- ============================================================
-- Phase 1 admin policies
-- ============================================================
DROP POLICY IF EXISTS "leads: admin can view all" ON public.leads;
DROP POLICY IF EXISTS "leads: admin can update all" ON public.leads;
DROP POLICY IF EXISTS "quiz_answers: admin can view all" ON public.quiz_answers;
DROP POLICY IF EXISTS "ai_usages: admin can view all" ON public.ai_instruction_usages;
DROP POLICY IF EXISTS "free_quotas: admin can update all" ON public.free_usage_quotas;
DROP POLICY IF EXISTS "prompt_templates: admin can write" ON public.prompt_templates;
DROP POLICY IF EXISTS "course_access: admin can view all" ON public.course_access;
DROP POLICY IF EXISTS "payments: admin can view all" ON public.payments;
DROP POLICY IF EXISTS "visitor_logs: admin can view all" ON public.visitor_logs;

CREATE POLICY "leads: admin can view all"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.app_is_admin());

CREATE POLICY "leads: admin can update all"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

CREATE POLICY "quiz_answers: admin can view all"
  ON public.quiz_answers FOR SELECT
  TO authenticated
  USING (public.app_is_admin());

CREATE POLICY "ai_usages: admin can view all"
  ON public.ai_instruction_usages FOR SELECT
  TO authenticated
  USING (public.app_is_admin());

CREATE POLICY "free_quotas: admin can update all"
  ON public.free_usage_quotas FOR UPDATE
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

CREATE POLICY "prompt_templates: admin can write"
  ON public.prompt_templates FOR ALL
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

CREATE POLICY "course_access: admin can view all"
  ON public.course_access FOR SELECT
  TO authenticated
  USING (public.app_is_admin());

CREATE POLICY "payments: admin can view all"
  ON public.payments FOR SELECT
  TO authenticated
  USING (public.app_is_admin());

CREATE POLICY "visitor_logs: admin can view all"
  ON public.visitor_logs FOR SELECT
  TO authenticated
  USING (public.app_is_admin());

-- ============================================================
-- Payment foundation admin policies
-- These tables are optional in current production because payment provider
-- abstraction was separated from Stripe fallback. Guard with to_regclass().
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    DROP POLICY IF EXISTS "products: admin can manage all" ON public.products;
    CREATE POLICY "products: admin can manage all"
      ON public.products FOR ALL
      TO authenticated
      USING (public.app_is_admin())
      WITH CHECK (public.app_is_admin());
  END IF;

  IF to_regclass('public.orders') IS NOT NULL THEN
    DROP POLICY IF EXISTS "orders: admin can view all" ON public.orders;
    CREATE POLICY "orders: admin can view all"
      ON public.orders FOR SELECT
      TO authenticated
      USING (public.app_is_admin());
  END IF;

  IF to_regclass('public.entitlements') IS NOT NULL THEN
    DROP POLICY IF EXISTS "entitlements: admin can view all" ON public.entitlements;
    CREATE POLICY "entitlements: admin can view all"
      ON public.entitlements FOR SELECT
      TO authenticated
      USING (public.app_is_admin());
  END IF;
END
$$;

-- ============================================================
-- Phase 2 lab and AI audit policies
-- ============================================================
DROP POLICY IF EXISTS "labs: owner professor can insert" ON public.labs;
DROP POLICY IF EXISTS "labs: admin can manage all" ON public.labs;
DROP POLICY IF EXISTS "lab_invite_codes: admin can manage all" ON public.lab_invite_codes;
DROP POLICY IF EXISTS "lab_memberships: admin can manage all" ON public.lab_memberships;
DROP POLICY IF EXISTS "student_documents: admin can read all" ON public.student_documents;
DROP POLICY IF EXISTS "ai_audit_jobs: admin can read all" ON public.ai_audit_jobs;
DROP POLICY IF EXISTS "ai_audit_results: admin can read all" ON public.ai_audit_results;
DROP POLICY IF EXISTS "ai_usage_credits: admin can manage all" ON public.ai_usage_credits;
DROP POLICY IF EXISTS "subscriptions: admin can manage all" ON public.subscriptions;
DROP POLICY IF EXISTS "subscription_items: admin can manage all" ON public.subscription_items;
DROP POLICY IF EXISTS "stripe_events: admin can read all" ON public.stripe_events;

CREATE POLICY "labs: owner professor can insert"
  ON public.labs FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_professor_id = (SELECT auth.uid())
    AND public.app_is_professor()
  );

CREATE POLICY "labs: admin can manage all"
  ON public.labs FOR ALL
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

CREATE POLICY "lab_invite_codes: admin can manage all"
  ON public.lab_invite_codes FOR ALL
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

CREATE POLICY "lab_memberships: admin can manage all"
  ON public.lab_memberships FOR ALL
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

CREATE POLICY "student_documents: admin can read all"
  ON public.student_documents FOR SELECT
  TO authenticated
  USING (public.app_is_admin());

CREATE POLICY "ai_audit_jobs: admin can read all"
  ON public.ai_audit_jobs FOR SELECT
  TO authenticated
  USING (public.app_is_admin());

CREATE POLICY "ai_audit_results: admin can read all"
  ON public.ai_audit_results FOR SELECT
  TO authenticated
  USING (public.app_is_admin());

CREATE POLICY "ai_usage_credits: admin can manage all"
  ON public.ai_usage_credits FOR ALL
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

CREATE POLICY "subscriptions: admin can manage all"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

CREATE POLICY "subscription_items: admin can manage all"
  ON public.subscription_items FOR ALL
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

CREATE POLICY "stripe_events: admin can read all"
  ON public.stripe_events FOR SELECT
  TO authenticated
  USING (public.app_is_admin());

-- ============================================================
-- Storage admin read policies
-- ============================================================
DROP POLICY IF EXISTS "storage student-documents: admin can read" ON storage.objects;
DROP POLICY IF EXISTS "storage ai-audit-exports: admin can read" ON storage.objects;

CREATE POLICY "storage student-documents: admin can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND public.app_is_admin()
  );

CREATE POLICY "storage ai-audit-exports: admin can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ai-audit-exports'
    AND public.app_is_admin()
  );

-- ============================================================
-- END OF MIGRATION 005 FIX PROFILES RLS RECURSION
-- ============================================================
