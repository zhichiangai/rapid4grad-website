-- ============================================================
-- RAPID4GRAD Phase 2 Security Closure
-- Atomic PDF audit quota reservation, completion, and refund.
-- ============================================================

ALTER TABLE public.ai_audit_jobs
  ADD COLUMN IF NOT EXISTS credit_id UUID REFERENCES public.ai_usage_credits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quota_reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quota_settled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quota_refunded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ai_audit_jobs_credit_id
  ON public.ai_audit_jobs(credit_id);

CREATE OR REPLACE FUNCTION public.reserve_pdf_audit_credit(
  target_credit_id UUID,
  target_job_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  job public.ai_audit_jobs%ROWTYPE;
  credit public.ai_usage_credits%ROWTYPE;
BEGIN
  SELECT * INTO job
  FROM public.ai_audit_jobs
  WHERE id = target_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'audit_job_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF job.quota_reserved_at IS NOT NULL THEN
    RETURN job.credit_id = target_credit_id AND job.quota_refunded_at IS NULL;
  END IF;

  SELECT * INTO credit
  FROM public.ai_usage_credits
  WHERE id = target_credit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'audit_credit_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF credit.period_start > NOW() OR credit.period_end <= NOW() THEN
    RAISE EXCEPTION 'audit_credit_inactive' USING ERRCODE = 'P0001';
  END IF;
  IF credit.pdf_audit_used >= credit.pdf_audit_limit THEN
    RAISE EXCEPTION 'audit_credit_exhausted' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.ai_usage_credits
  SET pdf_audit_used = pdf_audit_used + 1
  WHERE id = credit.id;

  UPDATE public.ai_audit_jobs
  SET credit_id = credit.id, quota_reserved_at = NOW()
  WHERE id = job.id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_ai_audit_job(
  target_job_id UUID,
  result_summary TEXT,
  result_markdown TEXT,
  result_risk_level TEXT,
  result_issue_tags TEXT[],
  result_token_input INTEGER,
  result_token_output INTEGER,
  result_cost_estimate_cents INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  job public.ai_audit_jobs%ROWTYPE;
BEGIN
  SELECT * INTO job
  FROM public.ai_audit_jobs
  WHERE id = target_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'audit_job_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF job.quota_refunded_at IS NOT NULL THEN
    RAISE EXCEPTION 'audit_credit_already_refunded' USING ERRCODE = 'P0001';
  END IF;
  IF job.quota_reserved_at IS NULL OR job.credit_id IS NULL THEN
    RAISE EXCEPTION 'audit_credit_not_reserved' USING ERRCODE = 'P0001';
  END IF;
  IF result_risk_level NOT IN ('low', 'medium', 'high') THEN
    RAISE EXCEPTION 'invalid_risk_level' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.ai_audit_results (
    job_id,
    user_id,
    summary,
    result_markdown,
    risk_level,
    issue_tags,
    token_input,
    token_output,
    cost_estimate_cents
  ) VALUES (
    job.id,
    job.user_id,
    result_summary,
    result_markdown,
    result_risk_level,
    COALESCE(result_issue_tags, '{}'),
    GREATEST(result_token_input, 0),
    GREATEST(result_token_output, 0),
    GREATEST(result_cost_estimate_cents, 0)
  )
  ON CONFLICT (job_id) DO UPDATE SET
    summary = EXCLUDED.summary,
    result_markdown = EXCLUDED.result_markdown,
    risk_level = EXCLUDED.risk_level,
    issue_tags = EXCLUDED.issue_tags,
    token_input = EXCLUDED.token_input,
    token_output = EXCLUDED.token_output,
    cost_estimate_cents = EXCLUDED.cost_estimate_cents;

  UPDATE public.ai_audit_jobs
  SET status = 'completed',
      error_message = NULL,
      completed_at = NOW(),
      quota_settled_at = COALESCE(quota_settled_at, NOW())
  WHERE id = job.id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_ai_audit_job(
  target_job_id UUID,
  failure_message TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  job public.ai_audit_jobs%ROWTYPE;
BEGIN
  SELECT * INTO job
  FROM public.ai_audit_jobs
  WHERE id = target_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  IF job.status = 'completed' OR job.quota_settled_at IS NOT NULL THEN
    RETURN FALSE;
  END IF;

  IF job.credit_id IS NOT NULL
     AND job.quota_reserved_at IS NOT NULL
     AND job.quota_refunded_at IS NULL THEN
    UPDATE public.ai_usage_credits
    SET pdf_audit_used = GREATEST(pdf_audit_used - 1, 0)
    WHERE id = job.credit_id;

    UPDATE public.ai_audit_jobs
    SET quota_refunded_at = NOW()
    WHERE id = job.id;
  END IF;

  UPDATE public.ai_audit_jobs
  SET status = 'failed',
      error_message = left(COALESCE(failure_message, 'AI audit failed.'), 500),
      completed_at = NOW()
  WHERE id = job.id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_pdf_audit_credit(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_ai_audit_job(
  UUID, TEXT, TEXT, TEXT, TEXT[], INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_ai_audit_job(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_pdf_audit_credit(UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_ai_audit_job(
  UUID, TEXT, TEXT, TEXT, TEXT[], INTEGER, INTEGER, INTEGER
) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_ai_audit_job(UUID, TEXT)
  TO service_role;

-- Manual validation (do not execute automatically):
-- 1. Concurrent reserve calls for the final available credit: one succeeds.
-- 2. fail_ai_audit_job called twice refunds at most once.
-- 3. complete_ai_audit_job called twice keeps one result and one settlement.
-- 4. A completed/settled job cannot be refunded.
