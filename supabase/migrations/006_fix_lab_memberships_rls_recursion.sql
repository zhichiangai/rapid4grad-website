-- ============================================================
-- RAPID4GRAD Phase 2 — Fix labs / lab_memberships RLS recursion
-- Migration: 006_fix_lab_memberships_rls_recursion.sql
-- Scope:
--   1. Break recursive RLS path between labs and lab_memberships.
--   2. Move lab access checks into SECURITY DEFINER boolean helpers.
--   3. Rebuild only lab-related policies that can trigger recursion.
-- ============================================================

-- These role helpers are included here to keep this hotfix self-contained.
-- Some environments may not have executed the previous profiles recursion fix.
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

CREATE OR REPLACE FUNCTION public.app_can_manage_lab(target_lab_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.app_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.labs AS lab
      WHERE lab.id = target_lab_id
        AND lab.owner_professor_id = (SELECT auth.uid())
    )
$$;

CREATE OR REPLACE FUNCTION public.app_can_access_lab(target_lab_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.app_can_manage_lab(target_lab_id)
    OR EXISTS (
      SELECT 1
      FROM public.lab_memberships AS membership
      WHERE membership.lab_id = target_lab_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.status = 'active'
    )
$$;

CREATE OR REPLACE FUNCTION public.app_has_lab_role(
  target_lab_id UUID,
  allowed_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.app_can_manage_lab(target_lab_id)
    OR EXISTS (
      SELECT 1
      FROM public.lab_memberships AS membership
      WHERE membership.lab_id = target_lab_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role = ANY(allowed_roles)
        AND membership.status = 'active'
    )
$$;

REVOKE ALL ON FUNCTION public.app_can_manage_lab(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_access_lab(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_has_lab_role(UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_is_professor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_is_professor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_manage_lab(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_can_access_lab(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_has_lab_role(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_current_user_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.app_is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.app_is_professor() TO service_role;
GRANT EXECUTE ON FUNCTION public.app_can_manage_lab(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.app_can_access_lab(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.app_has_lab_role(UUID, TEXT[]) TO service_role;

-- ============================================================
-- labs policies
-- ============================================================
DROP POLICY IF EXISTS "labs: owner professor can read" ON public.labs;
DROP POLICY IF EXISTS "labs: active lab members can read" ON public.labs;
DROP POLICY IF EXISTS "labs: owner professor can update" ON public.labs;
DROP POLICY IF EXISTS "labs: admin can manage all" ON public.labs;

CREATE POLICY "labs: owner professor can read"
  ON public.labs FOR SELECT
  TO authenticated
  USING (owner_professor_id = (SELECT auth.uid()));

CREATE POLICY "labs: active lab members can read"
  ON public.labs FOR SELECT
  TO authenticated
  USING (public.app_can_access_lab(id));

CREATE POLICY "labs: owner professor can update"
  ON public.labs FOR UPDATE
  TO authenticated
  USING (public.app_can_manage_lab(id))
  WITH CHECK (
    public.app_can_manage_lab(id)
    AND owner_professor_id = (SELECT auth.uid())
  );

CREATE POLICY "labs: admin can manage all"
  ON public.labs FOR ALL
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

-- ============================================================
-- lab_invite_codes policies
-- ============================================================
DROP POLICY IF EXISTS "lab_invite_codes: lab professor can manage" ON public.lab_invite_codes;
DROP POLICY IF EXISTS "lab_invite_codes: admin can manage all" ON public.lab_invite_codes;

CREATE POLICY "lab_invite_codes: lab professor can manage"
  ON public.lab_invite_codes FOR ALL
  TO authenticated
  USING (public.app_can_manage_lab(lab_id))
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND public.app_can_manage_lab(lab_id)
  );

CREATE POLICY "lab_invite_codes: admin can manage all"
  ON public.lab_invite_codes FOR ALL
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

-- ============================================================
-- lab_memberships policies
-- ============================================================
DROP POLICY IF EXISTS "lab_memberships: user can read own" ON public.lab_memberships;
DROP POLICY IF EXISTS "lab_memberships: lab professor can read lab" ON public.lab_memberships;
DROP POLICY IF EXISTS "lab_memberships: lab professor can insert lab" ON public.lab_memberships;
DROP POLICY IF EXISTS "lab_memberships: lab professor can update lab" ON public.lab_memberships;
DROP POLICY IF EXISTS "lab_memberships: admin can manage all" ON public.lab_memberships;

CREATE POLICY "lab_memberships: user can read own"
  ON public.lab_memberships FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "lab_memberships: lab manager can read lab"
  ON public.lab_memberships FOR SELECT
  TO authenticated
  USING (public.app_can_manage_lab(lab_id));

CREATE POLICY "lab_memberships: lab manager can insert lab"
  ON public.lab_memberships FOR INSERT
  TO authenticated
  WITH CHECK (public.app_can_manage_lab(lab_id));

CREATE POLICY "lab_memberships: lab manager can update lab"
  ON public.lab_memberships FOR UPDATE
  TO authenticated
  USING (public.app_can_manage_lab(lab_id))
  WITH CHECK (public.app_can_manage_lab(lab_id));

CREATE POLICY "lab_memberships: admin can manage all"
  ON public.lab_memberships FOR ALL
  TO authenticated
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

-- ============================================================
-- AI audit policies that depend on lab membership checks
-- ============================================================
DROP POLICY IF EXISTS "student_documents: lab professor can read metadata" ON public.student_documents;
DROP POLICY IF EXISTS "ai_audit_jobs: lab professor can read" ON public.ai_audit_jobs;
DROP POLICY IF EXISTS "ai_audit_results: lab professor can read" ON public.ai_audit_results;

CREATE POLICY "student_documents: lab professor can read metadata"
  ON public.student_documents FOR SELECT
  TO authenticated
  USING (
    lab_id IS NOT NULL
    AND public.app_has_lab_role(lab_id, ARRAY['professor', 'assistant'])
  );

CREATE POLICY "ai_audit_jobs: lab professor can read"
  ON public.ai_audit_jobs FOR SELECT
  TO authenticated
  USING (
    lab_id IS NOT NULL
    AND public.app_has_lab_role(lab_id, ARRAY['professor', 'assistant'])
  );

CREATE POLICY "ai_audit_results: lab professor can read"
  ON public.ai_audit_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ai_audit_jobs AS job
      WHERE job.id = ai_audit_results.job_id
        AND job.lab_id IS NOT NULL
        AND public.app_has_lab_role(job.lab_id, ARRAY['professor', 'assistant'])
    )
  );

-- ============================================================
-- END OF MIGRATION 006 FIX LAB MEMBERSHIPS RLS RECURSION
-- ============================================================
