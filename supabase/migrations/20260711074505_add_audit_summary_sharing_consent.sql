-- Phase 2: explicit, revocable audit-summary consent per document and Lab.

CREATE TABLE public.audit_summary_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, lab_id)
);

CREATE INDEX idx_audit_summary_shares_student
  ON public.audit_summary_shares(student_user_id, revoked_at);
CREATE INDEX idx_audit_summary_shares_lab
  ON public.audit_summary_shares(lab_id, revoked_at);

ALTER TABLE public.audit_summary_shares ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.audit_summary_shares FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.audit_summary_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_summary_shares TO service_role;

CREATE POLICY "audit_summary_shares: student reads own consent"
  ON public.audit_summary_shares FOR SELECT TO authenticated
  USING (student_user_id = (SELECT auth.uid()));

CREATE POLICY "audit_summary_shares: admin reads all consent"
  ON public.audit_summary_shares FOR SELECT TO authenticated
  USING (public.app_is_admin());

CREATE OR REPLACE FUNCTION public.app_can_read_ai_audit_job(target_job_id UUID)
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
        OR public.app_is_admin()
        OR EXISTS (
          SELECT 1
          FROM public.audit_summary_shares AS share
          JOIN public.lab_memberships AS viewer
            ON viewer.lab_id = share.lab_id
          WHERE share.document_id = job.document_id
            AND share.student_user_id = job.user_id
            AND share.revoked_at IS NULL
            AND viewer.user_id = (SELECT auth.uid())
            AND viewer.role IN ('professor', 'assistant')
            AND viewer.status = 'active'
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.app_can_read_ai_audit_job(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_can_read_ai_audit_job(UUID)
  TO authenticated, service_role;

-- PDF metadata and Storage remain private to the student owner and admin.
DROP POLICY IF EXISTS "student_documents: authorized current user can read"
  ON public.student_documents;
DROP POLICY IF EXISTS "student_documents: lab professor can read metadata"
  ON public.student_documents;
CREATE POLICY "student_documents: owner can read"
  ON public.student_documents FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "student_documents: admin can read all"
  ON public.student_documents FOR SELECT TO authenticated
  USING (public.app_is_admin());

DROP POLICY IF EXISTS "storage student-documents: lab professor can read"
  ON storage.objects;

-- Existing job/result policies call app_can_read_ai_audit_job(), so revocation
-- takes effect on the next query without copying lab_id onto the document/job.

-- Manual validation (do not execute automatically):
-- 1. With no share row, same-Lab professor SELECT on job/result returns zero rows.
-- 2. Student grants an active membership Lab; same-Lab professor sees job/result summary.
-- 3. Cross-Lab professor still sees zero rows.
-- 4. Set revoked_at = NOW(); the same professor immediately sees zero rows.
-- 5. Professor SELECT on student_documents or storage.objects remains denied/zero rows.
-- 6. Admin can observe shares/jobs/results but consent never grants PDF Storage access.
