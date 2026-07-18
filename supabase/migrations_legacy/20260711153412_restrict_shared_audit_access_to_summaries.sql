-- Phase 2 P0: shared consent exposes summary fields only, never raw audit rows.

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
      )
  )
$$;

REVOKE ALL ON FUNCTION public.app_can_read_ai_audit_job(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_can_read_ai_audit_job(UUID)
  TO authenticated, service_role;

DROP POLICY IF EXISTS "ai_audit_jobs: lab professor can read"
  ON public.ai_audit_jobs;
DROP POLICY IF EXISTS "ai_audit_results: lab professor can read"
  ON public.ai_audit_results;

CREATE OR REPLACE FUNCTION public.get_shared_audit_summaries(
  target_lab_id UUID,
  target_student_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  student_user_id UUID,
  summary TEXT,
  risk_level TEXT,
  issue_tags TEXT[],
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    job.id AS job_id,
    job.user_id AS student_user_id,
    result.summary,
    result.risk_level,
    result.issue_tags,
    job.completed_at,
    result.created_at
  FROM public.audit_summary_shares AS share
  JOIN public.ai_audit_jobs AS job
    ON job.document_id = share.document_id
   AND job.user_id = share.student_user_id
  JOIN public.ai_audit_results AS result
    ON result.job_id = job.id
   AND result.user_id = job.user_id
  WHERE share.lab_id = target_lab_id
    AND share.revoked_at IS NULL
    AND job.status = 'completed'
    AND (
      target_student_user_id IS NULL
      OR share.student_user_id = target_student_user_id
    )
    AND (
      public.app_is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.lab_memberships AS viewer
        WHERE viewer.lab_id = target_lab_id
          AND viewer.user_id = (SELECT auth.uid())
          AND viewer.role IN ('professor', 'assistant')
          AND viewer.status = 'active'
      )
    )
  ORDER BY COALESCE(job.completed_at, result.created_at) DESC
$$;

REVOKE ALL ON FUNCTION public.get_shared_audit_summaries(UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_audit_summaries(UUID, UUID)
  TO authenticated, service_role;

-- Manual validation (do not execute automatically):
-- 1. Active same-Lab professor RPC returns exactly the seven declared columns.
-- 2. Direct SELECT ai_audit_jobs/ai_audit_results as professor returns zero rows.
-- 3. RPC output never contains input_prompt, error_message, result_markdown,
--    token_input, token_output, cost_estimate_cents, document/storage metadata.
-- 4. Cross-Lab and inactive professor/assistant RPC calls return zero rows.
-- 5. UPDATE share SET revoked_at = NOW(); next RPC call returns zero rows.
-- 6. Student owner still reads own raw rows; admin still reads all raw rows.
--
-- Role validation template (replace UUIDs, run only in a disposable/local DB):
-- BEGIN;
-- SET LOCAL ROLE authenticated;
-- SELECT set_config('request.jwt.claims',
--   '{"sub":"PROFESSOR_UUID","role":"authenticated"}', true);
-- SELECT * FROM public.ai_audit_jobs WHERE id = 'SHARED_JOB_UUID'; -- 0 rows
-- SELECT * FROM public.ai_audit_results WHERE job_id = 'SHARED_JOB_UUID'; -- 0 rows
-- SELECT * FROM public.get_shared_audit_summaries('LAB_UUID', 'STUDENT_UUID');
-- -- Exactly seven columns and at least one row before revoke.
-- RESET ROLE;
-- UPDATE public.audit_summary_shares SET revoked_at = NOW()
-- WHERE document_id = 'DOCUMENT_UUID' AND lab_id = 'LAB_UUID';
-- SET LOCAL ROLE authenticated;
-- SELECT set_config('request.jwt.claims',
--   '{"sub":"PROFESSOR_UUID","role":"authenticated"}', true);
-- SELECT * FROM public.get_shared_audit_summaries('LAB_UUID', 'STUDENT_UUID');
-- -- 0 rows immediately after revoke.
-- ROLLBACK;
