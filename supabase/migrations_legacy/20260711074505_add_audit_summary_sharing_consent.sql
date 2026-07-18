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

-- This migration deliberately does not modify the raw audit authorization
-- helper or raw table policies. Professor/assistant access remains denied until
-- the later summary-only RPC migration is applied.

-- Manual validation (do not execute automatically):
-- 1. With no share row, same-Lab professor SELECT on job/result returns zero rows.
-- 2. Student grants an active membership Lab; same-Lab professor still receives
--    zero rows from raw job/result tables.
-- 3. Cross-Lab professor still sees zero rows.
-- 4. Set revoked_at = NOW(); the consent row is immediately inactive.
-- 5. Professor SELECT on student_documents or storage.objects remains denied/zero rows.
-- 6. Admin can observe shares/jobs/results, while consent never grants professor
--    or assistant raw audit/PDF Storage access.
