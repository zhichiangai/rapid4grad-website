-- RAPID4GRAD V2 Task 7
-- Lab-funded PDF audit pool with monthly non-rollover credits and idempotent jobs.

ALTER TABLE public.ai_audit_jobs
  ADD COLUMN idempotency_key UUID;

UPDATE public.ai_audit_jobs
SET idempotency_key = id
WHERE idempotency_key IS NULL;

ALTER TABLE public.ai_audit_jobs
  ALTER COLUMN idempotency_key SET NOT NULL;

CREATE UNIQUE INDEX ai_audit_jobs_user_idempotency_unique
  ON public.ai_audit_jobs(user_id, idempotency_key);

UPDATE public.products
SET metadata = metadata || '{"pdf_audit_limit_per_month":30,"pdf_audit_rollover":false}'::JSONB
WHERE slug = 'professor-lab-standard';

UPDATE public.products
SET metadata = metadata || '{"pdf_audit_limit_per_month":100,"pdf_audit_rollover":false}'::JSONB
WHERE slug = 'professor-lab-plus';

UPDATE public.products
SET metadata = metadata || '{"pdf_audit_limit_per_month":0,"pdf_audit_rollover":false,"requires_manual_limit":true}'::JSONB
WHERE slug = 'professor-lab-enterprise';

CREATE OR REPLACE FUNCTION app_private.ensure_lab_pdf_credit_period(
  target_user_id UUID
)
RETURNS public.lab_usage_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_lab_id UUID;
  selected_subscription public.subscriptions%ROWTYPE;
  selected_product_metadata JSONB;
  selected_credit public.lab_usage_credits%ROWTYPE;
  effective_subscription_end TIMESTAMPTZ;
  credit_period_start TIMESTAMPTZ;
  credit_period_end TIMESTAMPTZ;
  month_index INTEGER;
  configured_limit_text TEXT;
  configured_limit INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = target_user_id
      AND profile.role = 'student'::public.profile_role
      AND profile.account_status = 'active'::public.account_status
  ) THEN
    RAISE EXCEPTION 'active_student_profile_required';
  END IF;

  SELECT membership.lab_id
  INTO selected_lab_id
  FROM public.lab_memberships AS membership
  JOIN public.labs AS lab
    ON lab.id = membership.lab_id
   AND lab.status = 'active'::public.lab_status
  WHERE membership.user_id = target_user_id
    AND membership.role = 'student'::public.lab_role
    AND membership.status = 'active'::public.lab_membership_status;

  IF selected_lab_id IS NULL THEN
    RAISE EXCEPTION 'active_student_lab_membership_required';
  END IF;

  SELECT subscription.*
  INTO selected_subscription
  FROM public.subscriptions AS subscription
  WHERE subscription.lab_id = selected_lab_id
    AND app_private.subscription_is_functional(
      subscription.status,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.grace_ends_at
    )
  ORDER BY subscription.current_period_end DESC
  LIMIT 1
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'functional_lab_subscription_required';
  END IF;

  effective_subscription_end := CASE
    WHEN selected_subscription.status = 'past_due'::public.subscription_status
      THEN selected_subscription.grace_ends_at
    ELSE selected_subscription.current_period_end
  END;

  IF effective_subscription_end IS NULL
     OR effective_subscription_end <= timezone('utc', now()) THEN
    RAISE EXCEPTION 'functional_lab_subscription_required';
  END IF;

  month_index := GREATEST(
    0,
    (
      extract(YEAR FROM timezone('utc', now()))::INTEGER * 12
      + extract(MONTH FROM timezone('utc', now()))::INTEGER
    ) - (
      extract(YEAR FROM selected_subscription.current_period_start)::INTEGER * 12
      + extract(MONTH FROM selected_subscription.current_period_start)::INTEGER
    )
  );

  credit_period_start := selected_subscription.current_period_start
    + make_interval(months => month_index);

  IF credit_period_start > timezone('utc', now()) THEN
    month_index := GREATEST(month_index - 1, 0);
    credit_period_start := selected_subscription.current_period_start
      + make_interval(months => month_index);
  END IF;

  credit_period_end := LEAST(
    selected_subscription.current_period_start
      + make_interval(months => month_index + 1),
    effective_subscription_end
  );

  IF credit_period_end <= credit_period_start THEN
    RAISE EXCEPTION 'invalid_lab_credit_period';
  END IF;

  SELECT product.metadata
  INTO selected_product_metadata
  FROM public.products AS product
  WHERE product.id = selected_subscription.product_id;

  configured_limit_text := COALESCE(
    selected_subscription.metadata ->> 'pdfAuditLimitOverride',
    selected_product_metadata ->> 'pdf_audit_limit_per_month'
  );

  configured_limit := CASE
    WHEN configured_limit_text ~ '^[0-9]+$'
      THEN configured_limit_text::INTEGER
    WHEN selected_subscription.plan_key = 'professor_lab_standard'::public.professor_plan_key
      THEN 30
    WHEN selected_subscription.plan_key = 'professor_lab_plus'::public.professor_plan_key
      THEN 100
    ELSE 0
  END;

  INSERT INTO public.lab_usage_credits(
    lab_id,
    subscription_id,
    period_start,
    period_end,
    pdf_audit_limit
  )
  VALUES (
    selected_lab_id,
    selected_subscription.id,
    credit_period_start,
    credit_period_end,
    configured_limit
  )
  ON CONFLICT (lab_id, period_start, period_end) DO NOTHING;

  SELECT credit.*
  INTO selected_credit
  FROM public.lab_usage_credits AS credit
  WHERE credit.lab_id = selected_lab_id
    AND credit.subscription_id = selected_subscription.id
    AND credit.period_start = credit_period_start
    AND credit.period_end = credit_period_end
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lab_credit_period_conflict';
  END IF;

  RETURN selected_credit;
END;
$$;

DROP FUNCTION public.reserve_lab_pdf_audit_credit(
  UUID,
  UUID,
  public.ai_audit_type,
  public.ai_audit_provider,
  TEXT,
  TEXT
);

CREATE OR REPLACE FUNCTION public.reserve_lab_pdf_audit_job(
  target_user_id UUID,
  target_document_id UUID,
  target_audit_type public.ai_audit_type,
  target_provider public.ai_audit_provider,
  target_model TEXT,
  target_input_prompt TEXT,
  target_idempotency_key UUID
)
RETURNS TABLE (
  job_id UUID,
  created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_document public.student_documents%ROWTYPE;
  selected_credit public.lab_usage_credits%ROWTYPE;
  existing_job public.ai_audit_jobs%ROWTYPE;
  new_job_id UUID;
BEGIN
  IF target_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'audit_idempotency_key_required';
  END IF;

  IF char_length(trim(target_model)) NOT BETWEEN 1 AND 200
     OR char_length(target_input_prompt) NOT BETWEEN 1 AND 20000 THEN
    RAISE EXCEPTION 'invalid_audit_job_input';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      target_user_id::TEXT || ':' || target_idempotency_key::TEXT,
      0
    )
  );

  SELECT audit_job.*
  INTO existing_job
  FROM public.ai_audit_jobs AS audit_job
  WHERE audit_job.user_id = target_user_id
    AND audit_job.idempotency_key = target_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF existing_job.document_id <> target_document_id
       OR existing_job.audit_type <> target_audit_type
       OR existing_job.provider <> target_provider
       OR existing_job.model <> trim(target_model) THEN
      RAISE EXCEPTION 'audit_idempotency_conflict';
    END IF;

    RETURN QUERY SELECT existing_job.id, FALSE;
    RETURN;
  END IF;

  SELECT document.*
  INTO selected_document
  FROM public.student_documents AS document
  WHERE document.id = target_document_id
    AND document.user_id = target_user_id
    AND document.storage_bucket = 'student-documents'
    AND document.mime_type = 'application/pdf'
    AND document.upload_status = 'ready'::public.document_upload_status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ready_owned_document_required';
  END IF;

  SELECT ensured_credit.*
  INTO selected_credit
  FROM app_private.ensure_lab_pdf_credit_period(target_user_id) AS ensured_credit;

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
    input_prompt,
    idempotency_key
  )
  VALUES (
    target_user_id,
    target_document_id,
    selected_credit.lab_id,
    selected_credit.id,
    target_audit_type,
    target_provider,
    trim(target_model),
    'streaming'::public.ai_audit_job_status,
    'reserved'::public.audit_credit_state,
    target_input_prompt,
    target_idempotency_key
  )
  RETURNING id INTO new_job_id;

  UPDATE public.lab_usage_credits
  SET pdf_audit_reserved = pdf_audit_reserved + 1
  WHERE id = selected_credit.id
    AND pdf_audit_reserved + pdf_audit_used < pdf_audit_limit;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lab_pdf_audit_limit_reached';
  END IF;

  RETURN QUERY SELECT new_job_id, TRUE;
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
  SELECT audit_job.*
  INTO selected_job
  FROM public.ai_audit_jobs AS audit_job
  WHERE audit_job.id = target_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'audit_job_not_found';
  END IF;

  IF selected_job.credit_state = 'refunded'::public.audit_credit_state
     AND selected_job.status IN (
       'failed'::public.ai_audit_job_status,
       'cancelled'::public.ai_audit_job_status
     ) THEN
    RETURN TRUE;
  END IF;

  IF selected_job.credit_state = 'settled'::public.audit_credit_state THEN
    RAISE EXCEPTION 'completed_audit_cannot_be_refunded';
  END IF;

  IF selected_job.credit_state = 'reserved'::public.audit_credit_state THEN
    PERFORM 1
    FROM public.lab_usage_credits AS credit
    WHERE credit.id = selected_job.credit_id
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
    status = CASE
      WHEN failure_code = 'user_aborted'
        THEN 'cancelled'::public.ai_audit_job_status
      ELSE 'failed'::public.ai_audit_job_status
    END,
    credit_state = 'refunded'::public.audit_credit_state,
    quota_refunded_at = COALESCE(quota_refunded_at, timezone('utc', now())),
    completed_at = COALESCE(completed_at, timezone('utc', now())),
    error_code = left(COALESCE(failure_code, 'audit_failed'), 120),
    error_message = left(COALESCE(failure_message, 'AI audit failed.'), 2000)
  WHERE id = selected_job.id;

  RETURN TRUE;
END;
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_user_id UUID := (SELECT auth.uid());
  selected_credit public.lab_usage_credits%ROWTYPE;
BEGIN
  IF selected_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  SELECT ensured_credit.*
  INTO selected_credit
  FROM app_private.ensure_lab_pdf_credit_period(selected_user_id) AS ensured_credit;

  RETURN QUERY
  SELECT
    selected_credit.lab_id,
    selected_credit.pdf_audit_limit,
    selected_credit.pdf_audit_reserved,
    selected_credit.pdf_audit_used,
    GREATEST(
      selected_credit.pdf_audit_limit
        - selected_credit.pdf_audit_reserved
        - selected_credit.pdf_audit_used,
      0
    ),
    selected_credit.period_start,
    selected_credit.period_end;
END;
$$;

REVOKE ALL ON FUNCTION app_private.ensure_lab_pdf_credit_period(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.reserve_lab_pdf_audit_job(
  UUID,
  UUID,
  public.ai_audit_type,
  public.ai_audit_provider,
  TEXT,
  TEXT,
  UUID
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_lab_pdf_audit_job(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_lab_pdf_credit_balance()
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.reserve_lab_pdf_audit_job(
  UUID,
  UUID,
  public.ai_audit_type,
  public.ai_audit_provider,
  TEXT,
  TEXT,
  UUID
) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_lab_pdf_audit_job(UUID, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_lab_pdf_credit_balance()
  TO authenticated, service_role;

COMMENT ON FUNCTION app_private.ensure_lab_pdf_credit_period(UUID) IS
  'Creates one non-rollover monthly Lab PDF credit period on demand. Product metadata supplies Standard 30 and Plus 100 defaults; subscription metadata may hold an Admin override.';
COMMENT ON FUNCTION public.reserve_lab_pdf_audit_job(
  UUID,
  UUID,
  public.ai_audit_type,
  public.ai_audit_provider,
  TEXT,
  TEXT,
  UUID
) IS
  'Service-only atomic reservation. Repeated user/idempotency keys return the same job without consuming another shared credit.';
COMMENT ON FUNCTION public.fail_lab_pdf_audit_job(UUID, TEXT, TEXT) IS
  'Service-only idempotent refund. User aborts become cancelled jobs; provider, stream, persistence and setup failures become failed jobs.';
