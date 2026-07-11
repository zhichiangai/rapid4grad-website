-- ============================================================
-- RAPID4GRAD Phase 2 Security Closure
-- Replace recursive audit SELECT policy chains with scalar decisions.
-- ============================================================

CREATE OR REPLACE FUNCTION public.app_can_read_student_document(
  target_document_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_documents AS document
    WHERE document.id = target_document_id
      AND (
        document.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles AS profile
          WHERE profile.id = (SELECT auth.uid()) AND profile.role = 'admin'
        )
        OR (
          document.lab_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.lab_memberships AS membership
            WHERE membership.lab_id = document.lab_id
              AND membership.user_id = (SELECT auth.uid())
              AND membership.role IN ('professor', 'assistant')
              AND membership.status = 'active'
          )
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.app_can_read_ai_audit_job(
  target_job_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ai_audit_jobs AS job
    WHERE job.id = target_job_id
      AND (
        job.user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.profiles AS profile
          WHERE profile.id = (SELECT auth.uid()) AND profile.role = 'admin'
        )
        OR (
          job.lab_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.lab_memberships AS membership
            WHERE membership.lab_id = job.lab_id
              AND membership.user_id = (SELECT auth.uid())
              AND membership.role IN ('professor', 'assistant')
              AND membership.status = 'active'
          )
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.app_can_read_student_document(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_can_read_ai_audit_job(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_can_read_student_document(UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.app_can_read_ai_audit_job(UUID)
  TO authenticated, service_role;

DROP POLICY IF EXISTS "student_documents: owner can read" ON public.student_documents;
DROP POLICY IF EXISTS "student_documents: lab professor can read metadata" ON public.student_documents;
DROP POLICY IF EXISTS "student_documents: admin can read all" ON public.student_documents;
CREATE POLICY "student_documents: authorized current user can read"
  ON public.student_documents FOR SELECT
  TO authenticated
  USING (public.app_can_read_student_document(id));

DROP POLICY IF EXISTS "ai_audit_jobs: owner can read" ON public.ai_audit_jobs;
DROP POLICY IF EXISTS "ai_audit_jobs: lab professor can read" ON public.ai_audit_jobs;
DROP POLICY IF EXISTS "ai_audit_jobs: admin can read all" ON public.ai_audit_jobs;
CREATE POLICY "ai_audit_jobs: authorized current user can read"
  ON public.ai_audit_jobs FOR SELECT
  TO authenticated
  USING (public.app_can_read_ai_audit_job(id));

DROP POLICY IF EXISTS "ai_audit_results: owner can read" ON public.ai_audit_results;
DROP POLICY IF EXISTS "ai_audit_results: lab professor can read" ON public.ai_audit_results;
DROP POLICY IF EXISTS "ai_audit_results: admin can read all" ON public.ai_audit_results;
CREATE POLICY "ai_audit_results: authorized current user can read"
  ON public.ai_audit_results FOR SELECT
  TO authenticated
  USING (public.app_can_read_ai_audit_job(job_id));

-- Manual validation (do not execute automatically):
-- 1. Student owner can read only own documents/jobs/results.
-- 2. Active professor/assistant can read only records with the same lab_id.
-- 3. Professor from another lab receives zero rows.
-- 4. Admin can read all three tables.
-- 5. SELECT from ai_audit_jobs no longer returns PostgreSQL 42P17.
