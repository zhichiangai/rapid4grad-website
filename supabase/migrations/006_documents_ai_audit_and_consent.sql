-- RAPID4GRAD V2 baseline 006
-- Private student documents, Lab-funded AI audits, summary consent, and action logs.

CREATE TYPE public.document_type AS ENUM ('thesis', 'slides', 'draft', 'paper');
CREATE TYPE public.document_upload_status AS ENUM (
  'uploaded',
  'processing',
  'ready',
  'failed'
);
CREATE TYPE public.ai_audit_type AS ENUM (
  'advisor_questions',
  'logic_check',
  'presentation_review',
  'english_polish',
  'full_review'
);
CREATE TYPE public.ai_audit_provider AS ENUM ('openai', 'anthropic');
CREATE TYPE public.ai_audit_job_status AS ENUM (
  'queued',
  'streaming',
  'completed',
  'failed',
  'cancelled'
);
CREATE TYPE public.audit_credit_state AS ENUM ('reserved', 'settled', 'refunded');

CREATE TABLE public.student_documents (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  storage_bucket TEXT NOT NULL DEFAULT 'student-documents'
    CHECK (storage_bucket = 'student-documents'),
  storage_path TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type = 'application/pdf'),
  file_size_bytes BIGINT NOT NULL CHECK (
    file_size_bytes > 0 AND file_size_bytes <= 10485760
  ),
  document_type public.document_type NOT NULL,
  upload_status public.document_upload_status NOT NULL DEFAULT 'uploaded',
  sha256_hex TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT student_document_owner_path CHECK (
    split_part(storage_path, '/', 1) = user_id::TEXT
  )
);

CREATE INDEX student_documents_user_created_idx
  ON public.student_documents(user_id, created_at DESC);

CREATE TRIGGER student_documents_set_updated_at
BEFORE UPDATE ON public.student_documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lab_usage_credits (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  pdf_audit_limit INTEGER NOT NULL CHECK (pdf_audit_limit >= 0),
  pdf_audit_reserved INTEGER NOT NULL DEFAULT 0 CHECK (pdf_audit_reserved >= 0),
  pdf_audit_used INTEGER NOT NULL DEFAULT 0 CHECK (pdf_audit_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (lab_id, period_start, period_end),
  CONSTRAINT lab_usage_credit_period_valid CHECK (period_end > period_start),
  CONSTRAINT lab_usage_credit_within_limit CHECK (
    pdf_audit_reserved + pdf_audit_used <= pdf_audit_limit
  )
);

CREATE INDEX lab_usage_credits_lab_period_idx
  ON public.lab_usage_credits(lab_id, period_end DESC);

CREATE TRIGGER lab_usage_credits_set_updated_at
BEFORE UPDATE ON public.lab_usage_credits
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_audit_jobs (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE RESTRICT,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
  credit_id UUID NOT NULL REFERENCES public.lab_usage_credits(id) ON DELETE RESTRICT,
  audit_type public.ai_audit_type NOT NULL,
  provider public.ai_audit_provider NOT NULL,
  model TEXT NOT NULL,
  status public.ai_audit_job_status NOT NULL DEFAULT 'queued',
  credit_state public.audit_credit_state NOT NULL DEFAULT 'reserved',
  input_prompt TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  quota_reserved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  quota_settled_at TIMESTAMPTZ,
  quota_refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ,
  CONSTRAINT ai_audit_job_credit_state_consistent CHECK (
    (credit_state = 'reserved' AND quota_settled_at IS NULL AND quota_refunded_at IS NULL)
    OR (credit_state = 'settled' AND quota_settled_at IS NOT NULL AND quota_refunded_at IS NULL)
    OR (credit_state = 'refunded' AND quota_refunded_at IS NOT NULL AND quota_settled_at IS NULL)
  )
);

CREATE INDEX ai_audit_jobs_user_created_idx
  ON public.ai_audit_jobs(user_id, created_at DESC);
CREATE INDEX ai_audit_jobs_lab_created_idx
  ON public.ai_audit_jobs(lab_id, created_at DESC);
CREATE INDEX ai_audit_jobs_credit_state_idx
  ON public.ai_audit_jobs(credit_id, credit_state);

CREATE TRIGGER ai_audit_jobs_set_updated_at
BEFORE UPDATE ON public.ai_audit_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_audit_results (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.ai_audit_jobs(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  summary TEXT NOT NULL,
  result_markdown TEXT NOT NULL,
  risk_level public.risk_level,
  issue_tags TEXT[] NOT NULL DEFAULT '{}',
  token_input INTEGER NOT NULL DEFAULT 0 CHECK (token_input >= 0),
  token_output INTEGER NOT NULL DEFAULT 0 CHECK (token_output >= 0),
  cost_estimate_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_estimate_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX ai_audit_results_user_created_idx
  ON public.ai_audit_results(user_id, created_at DESC);

CREATE TABLE public.audit_summary_shares (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (document_id, lab_id)
);

CREATE INDEX audit_summary_shares_lab_active_idx
  ON public.audit_summary_shares(lab_id, student_user_id)
  WHERE revoked_at IS NULL;
CREATE INDEX audit_summary_shares_student_idx
  ON public.audit_summary_shares(student_user_id, updated_at DESC);

CREATE TRIGGER audit_summary_shares_set_updated_at
BEFORE UPDATE ON public.audit_summary_shares
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.admin_action_logs (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 3),
  before_state JSONB,
  after_state JSONB,
  request_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX admin_action_logs_admin_created_idx
  ON public.admin_action_logs(admin_user_id, created_at DESC);
CREATE INDEX admin_action_logs_target_idx
  ON public.admin_action_logs(target_type, target_id, created_at DESC);
CREATE INDEX admin_action_logs_request_idx
  ON public.admin_action_logs(request_id);

CREATE OR REPLACE FUNCTION public.reserve_lab_pdf_audit_credit(
  target_user_id UUID,
  target_document_id UUID,
  target_audit_type public.ai_audit_type,
  target_provider public.ai_audit_provider,
  target_model TEXT,
  target_input_prompt TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_document public.student_documents%ROWTYPE;
  selected_lab_id UUID;
  selected_subscription_id UUID;
  selected_credit public.lab_usage_credits%ROWTYPE;
  new_job_id UUID;
BEGIN
  SELECT *
  INTO selected_document
  FROM public.student_documents
  WHERE id = target_document_id
    AND user_id = target_user_id
    AND upload_status = 'ready'::public.document_upload_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ready_owned_document_required';
  END IF;

  SELECT membership.lab_id
  INTO selected_lab_id
  FROM public.lab_memberships AS membership
  WHERE membership.user_id = target_user_id
    AND membership.role = 'student'::public.lab_role
    AND membership.status = 'active'::public.lab_membership_status;

  IF selected_lab_id IS NULL THEN
    RAISE EXCEPTION 'active_student_lab_membership_required';
  END IF;

  SELECT subscription.id
  INTO selected_subscription_id
  FROM public.subscriptions AS subscription
  WHERE subscription.lab_id = selected_lab_id
    AND subscription.status IN (
      'active'::public.subscription_status,
      'trialing'::public.subscription_status
    )
    AND subscription.current_period_start <= timezone('utc', now())
    AND subscription.current_period_end > timezone('utc', now())
  ORDER BY subscription.current_period_end DESC
  LIMIT 1;

  IF selected_subscription_id IS NULL THEN
    RAISE EXCEPTION 'active_lab_subscription_required';
  END IF;

  SELECT *
  INTO selected_credit
  FROM public.lab_usage_credits AS credit
  WHERE credit.lab_id = selected_lab_id
    AND credit.subscription_id = selected_subscription_id
    AND credit.period_start <= timezone('utc', now())
    AND credit.period_end > timezone('utc', now())
  ORDER BY credit.period_end DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_lab_credit_period_required';
  END IF;

  IF selected_credit.pdf_audit_reserved + selected_credit.pdf_audit_used
     >= selected_credit.pdf_audit_limit THEN
    RAISE EXCEPTION 'lab_pdf_audit_limit_reached';
  END IF;

  INSERT INTO public.ai_audit_jobs(
    user_id,
    document_id,
    lab_id,
    credit_id,
    audit_type,
    provider,
    model,
    status,
    credit_state,
    input_prompt
  )
  VALUES (
    target_user_id,
    target_document_id,
    selected_lab_id,
    selected_credit.id,
    target_audit_type,
    target_provider,
    trim(target_model),
    'queued'::public.ai_audit_job_status,
    'reserved'::public.audit_credit_state,
    target_input_prompt
  )
  RETURNING id INTO new_job_id;

  UPDATE public.lab_usage_credits
  SET pdf_audit_reserved = pdf_audit_reserved + 1
  WHERE id = selected_credit.id;

  RETURN new_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_lab_pdf_audit_job(
  target_job_id UUID,
  result_summary TEXT,
  result_markdown TEXT,
  result_risk_level public.risk_level,
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
  selected_job public.ai_audit_jobs%ROWTYPE;
BEGIN
  SELECT *
  INTO selected_job
  FROM public.ai_audit_jobs
  WHERE id = target_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'audit_job_not_found';
  END IF;

  IF selected_job.status = 'completed'::public.ai_audit_job_status
     AND selected_job.credit_state = 'settled'::public.audit_credit_state THEN
    RETURN TRUE;
  END IF;

  IF selected_job.credit_state <> 'reserved'::public.audit_credit_state THEN
    RAISE EXCEPTION 'audit_credit_not_reserved';
  END IF;

  PERFORM 1
  FROM public.lab_usage_credits
  WHERE id = selected_job.credit_id
  FOR UPDATE;

  INSERT INTO public.ai_audit_results(
    job_id,
    user_id,
    summary,
    result_markdown,
    risk_level,
    issue_tags,
    token_input,
    token_output,
    cost_estimate_cents
  )
  VALUES (
    selected_job.id,
    selected_job.user_id,
    result_summary,
    result_markdown,
    result_risk_level,
    COALESCE(result_issue_tags, '{}'::TEXT[]),
    GREATEST(result_token_input, 0),
    GREATEST(result_token_output, 0),
    GREATEST(result_cost_estimate_cents, 0)
  );

  UPDATE public.lab_usage_credits
  SET
    pdf_audit_reserved = pdf_audit_reserved - 1,
    pdf_audit_used = pdf_audit_used + 1
  WHERE id = selected_job.credit_id
    AND pdf_audit_reserved > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reserved_credit_counter_missing';
  END IF;

  UPDATE public.ai_audit_jobs
  SET
    status = 'completed'::public.ai_audit_job_status,
    credit_state = 'settled'::public.audit_credit_state,
    quota_settled_at = timezone('utc', now()),
    completed_at = timezone('utc', now()),
    error_code = NULL,
    error_message = NULL
  WHERE id = selected_job.id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_lab_pdf_audit_job(
  target_job_id UUID,
  failure_code TEXT,
  failure_message TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_job public.ai_audit_jobs%ROWTYPE;
BEGIN
  SELECT *
  INTO selected_job
  FROM public.ai_audit_jobs
  WHERE id = target_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'audit_job_not_found';
  END IF;

  IF selected_job.status = 'failed'::public.ai_audit_job_status
     AND selected_job.credit_state = 'refunded'::public.audit_credit_state THEN
    RETURN TRUE;
  END IF;

  IF selected_job.credit_state = 'settled'::public.audit_credit_state THEN
    RAISE EXCEPTION 'completed_audit_cannot_be_refunded';
  END IF;

  IF selected_job.credit_state = 'reserved'::public.audit_credit_state THEN
    PERFORM 1
    FROM public.lab_usage_credits
    WHERE id = selected_job.credit_id
    FOR UPDATE;

    UPDATE public.lab_usage_credits
    SET pdf_audit_reserved = pdf_audit_reserved - 1
    WHERE id = selected_job.credit_id
      AND pdf_audit_reserved > 0;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'reserved_credit_counter_missing';
    END IF;
  END IF;

  UPDATE public.ai_audit_jobs
  SET
    status = 'failed'::public.ai_audit_job_status,
    credit_state = 'refunded'::public.audit_credit_state,
    quota_refunded_at = COALESCE(quota_refunded_at, timezone('utc', now())),
    error_code = left(failure_code, 120),
    error_message = left(failure_message, 2000)
  WHERE id = selected_job.id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_audit_summary_consent(
  target_student_id UUID,
  target_document_id UUID,
  target_lab_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  share_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.student_documents AS document
    WHERE document.id = target_document_id
      AND document.user_id = target_student_id
  ) THEN
    RAISE EXCEPTION 'owned_document_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.lab_memberships AS membership
    WHERE membership.lab_id = target_lab_id
      AND membership.user_id = target_student_id
      AND membership.role = 'student'::public.lab_role
      AND membership.status = 'active'::public.lab_membership_status
  ) THEN
    RAISE EXCEPTION 'active_student_lab_membership_required';
  END IF;

  INSERT INTO public.audit_summary_shares(
    document_id,
    student_user_id,
    lab_id,
    consented_at,
    revoked_at
  )
  VALUES (
    target_document_id,
    target_student_id,
    target_lab_id,
    timezone('utc', now()),
    NULL
  )
  ON CONFLICT (document_id, lab_id) DO UPDATE
  SET
    student_user_id = EXCLUDED.student_user_id,
    consented_at = timezone('utc', now()),
    revoked_at = NULL,
    updated_at = timezone('utc', now())
  RETURNING id INTO share_id;

  RETURN share_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_audit_summary_consent(
  target_student_id UUID,
  target_document_id UUID,
  target_lab_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.audit_summary_shares
  SET revoked_at = COALESCE(revoked_at, timezone('utc', now()))
  WHERE document_id = target_document_id
    AND student_user_id = target_student_id
    AND lab_id = target_lab_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'summary_consent_not_found';
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_lab_member(
  target_actor_id UUID,
  target_lab_id UUID,
  target_member_user_id UUID,
  target_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_lab public.labs%ROWTYPE;
  selected_membership public.lab_memberships%ROWTYPE;
BEGIN
  IF char_length(trim(target_reason)) < 3 THEN
    RAISE EXCEPTION 'removal_reason_required';
  END IF;

  SELECT *
  INTO selected_lab
  FROM public.labs
  WHERE id = target_lab_id
  FOR UPDATE;

  IF NOT FOUND OR selected_lab.owner_professor_id <> target_actor_id THEN
    RAISE EXCEPTION 'lab_owner_required';
  END IF;

  IF target_member_user_id = selected_lab.owner_professor_id THEN
    RAISE EXCEPTION 'lab_owner_cannot_be_removed';
  END IF;

  SELECT *
  INTO selected_membership
  FROM public.lab_memberships
  WHERE lab_id = target_lab_id
    AND user_id = target_member_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lab_membership_not_found';
  END IF;

  IF selected_membership.status = 'removed'::public.lab_membership_status THEN
    RETURN TRUE;
  END IF;

  UPDATE public.lab_memberships
  SET
    status = 'removed'::public.lab_membership_status,
    removed_at = timezone('utc', now()),
    removed_by = target_actor_id,
    removal_reason = trim(target_reason)
  WHERE id = selected_membership.id;

  UPDATE public.audit_summary_shares
  SET revoked_at = COALESCE(revoked_at, timezone('utc', now()))
  WHERE lab_id = target_lab_id
    AND student_user_id = target_member_user_id
    AND revoked_at IS NULL;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.change_lab_member_role(
  target_actor_id UUID,
  target_lab_id UUID,
  target_member_user_id UUID,
  target_role public.lab_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_lab public.labs%ROWTYPE;
BEGIN
  SELECT *
  INTO selected_lab
  FROM public.labs
  WHERE id = target_lab_id
  FOR UPDATE;

  IF NOT FOUND OR selected_lab.owner_professor_id <> target_actor_id THEN
    RAISE EXCEPTION 'lab_owner_required';
  END IF;

  IF target_member_user_id = selected_lab.owner_professor_id THEN
    RAISE EXCEPTION 'lab_owner_role_cannot_change';
  END IF;

  UPDATE public.lab_memberships
  SET role = target_role
  WHERE lab_id = target_lab_id
    AND user_id = target_member_user_id
    AND status = 'active'::public.lab_membership_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_lab_membership_not_found';
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_audit_summaries(
  target_lab_id UUID,
  target_student_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  student_user_id UUID,
  summary TEXT,
  risk_level public.risk_level,
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
  JOIN public.student_documents AS document
    ON document.id = share.document_id
   AND document.user_id = share.student_user_id
  JOIN public.ai_audit_jobs AS job
    ON job.document_id = document.id
   AND job.user_id = share.student_user_id
   AND job.lab_id = share.lab_id
   AND job.status = 'completed'::public.ai_audit_job_status
  JOIN public.ai_audit_results AS result
    ON result.job_id = job.id
   AND result.user_id = job.user_id
  JOIN public.lab_memberships AS student_membership
    ON student_membership.lab_id = share.lab_id
   AND student_membership.user_id = share.student_user_id
   AND student_membership.role = 'student'::public.lab_role
   AND student_membership.status = 'active'::public.lab_membership_status
  WHERE share.lab_id = target_lab_id
    AND share.revoked_at IS NULL
    AND (
      target_student_user_id IS NULL
      OR share.student_user_id = target_student_user_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.labs AS lab
        WHERE lab.id = target_lab_id
          AND lab.owner_professor_id = (SELECT auth.uid())
          AND lab.status = 'active'::public.lab_status
      )
      OR EXISTS (
        SELECT 1
        FROM public.lab_memberships AS viewer_membership
        WHERE viewer_membership.lab_id = target_lab_id
          AND viewer_membership.user_id = (SELECT auth.uid())
          AND viewer_membership.role IN (
            'professor'::public.lab_role,
            'assistant'::public.lab_role
          )
          AND viewer_membership.status = 'active'::public.lab_membership_status
      )
      OR app_private.is_admin()
    )
  ORDER BY result.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_my_lab_pdf_credit_balance()
RETURNS TABLE (
  lab_id UUID,
  pdf_audit_limit INTEGER,
  pdf_audit_reserved INTEGER,
  pdf_audit_used INTEGER,
  pdf_audit_remaining INTEGER,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    credit.lab_id,
    credit.pdf_audit_limit,
    credit.pdf_audit_reserved,
    credit.pdf_audit_used,
    GREATEST(
      credit.pdf_audit_limit - credit.pdf_audit_reserved - credit.pdf_audit_used,
      0
    ) AS pdf_audit_remaining,
    credit.period_start,
    credit.period_end
  FROM public.lab_usage_credits AS credit
  JOIN public.lab_memberships AS membership
    ON membership.lab_id = credit.lab_id
   AND membership.user_id = (SELECT auth.uid())
   AND membership.status = 'active'::public.lab_membership_status
  JOIN public.subscriptions AS subscription
    ON subscription.id = credit.subscription_id
   AND subscription.status IN (
     'active'::public.subscription_status,
     'trialing'::public.subscription_status
   )
  WHERE credit.period_start <= timezone('utc', now())
    AND credit.period_end > timezone('utc', now())
  ORDER BY credit.period_end DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.record_admin_action(
  target_admin_user_id UUID,
  target_action_type TEXT,
  target_type TEXT,
  target_id UUID,
  target_reason TEXT,
  target_before_state JSONB,
  target_after_state JSONB,
  target_request_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  log_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = target_admin_user_id
      AND profile.role = 'admin'::public.profile_role
      AND profile.account_status = 'active'::public.account_status
  ) THEN
    RAISE EXCEPTION 'active_admin_required';
  END IF;

  IF char_length(trim(target_reason)) < 3 THEN
    RAISE EXCEPTION 'admin_action_reason_required';
  END IF;

  INSERT INTO public.admin_action_logs(
    admin_user_id,
    action_type,
    target_type,
    target_id,
    reason,
    before_state,
    after_state,
    request_id
  )
  VALUES (
    target_admin_user_id,
    trim(target_action_type),
    trim(target_type),
    target_id,
    trim(target_reason),
    target_before_state,
    target_after_state,
    trim(target_request_id)
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_lab_pdf_audit_credit(
  UUID, UUID, public.ai_audit_type, public.ai_audit_provider, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_lab_pdf_audit_job(
  UUID, TEXT, TEXT, public.risk_level, TEXT[], INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_lab_pdf_audit_job(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_audit_summary_consent(UUID, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_audit_summary_consent(UUID, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_lab_member(UUID, UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_lab_member_role(UUID, UUID, UUID, public.lab_role)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_shared_audit_summaries(UUID, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_lab_pdf_credit_balance()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_admin_action(
  UUID, TEXT, TEXT, UUID, TEXT, JSONB, JSONB, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_lab_pdf_audit_credit(
  UUID, UUID, public.ai_audit_type, public.ai_audit_provider, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_lab_pdf_audit_job(
  UUID, TEXT, TEXT, public.risk_level, TEXT[], INTEGER, INTEGER, INTEGER
) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_lab_pdf_audit_job(UUID, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_audit_summary_consent(UUID, UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_audit_summary_consent(UUID, UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_lab_member(UUID, UUID, UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.change_lab_member_role(UUID, UUID, UUID, public.lab_role)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_shared_audit_summaries(UUID, UUID)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_lab_pdf_credit_balance()
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_admin_action(
  UUID, TEXT, TEXT, UUID, TEXT, JSONB, JSONB, TEXT
) TO service_role;

ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_usage_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_summary_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON FUNCTION public.get_shared_audit_summaries(UUID, UUID) IS
  'Summary-only interface. Returns exactly seven safe fields and never exposes PDF metadata or raw audit content.';
