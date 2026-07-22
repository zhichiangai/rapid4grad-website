-- RAPID4GRAD V2 Task 8
-- Server-only Admin mutations with atomic action logging.

CREATE OR REPLACE FUNCTION app_private.assert_admin_operation(
  target_admin_user_id UUID,
  target_reason TEXT,
  target_request_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

  IF target_reason IS NULL
     OR char_length(trim(target_reason)) < 3
     OR char_length(trim(target_reason)) > 500 THEN
    RAISE EXCEPTION 'admin_action_reason_invalid';
  END IF;

  IF target_request_id IS NULL
     OR char_length(trim(target_request_id)) < 8
     OR char_length(trim(target_request_id)) > 120 THEN
    RAISE EXCEPTION 'admin_action_request_id_invalid';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_profile_role(
  target_admin_user_id UUID,
  target_user_id UUID,
  target_role public.profile_role,
  target_reason TEXT,
  target_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_profile public.profiles%ROWTYPE;
  updated_profile public.profiles%ROWTYPE;
BEGIN
  PERFORM app_private.assert_admin_operation(
    target_admin_user_id,
    target_reason,
    target_request_id
  );

  IF target_role NOT IN (
    'student'::public.profile_role,
    'professor'::public.profile_role
  ) THEN
    RAISE EXCEPTION 'admin_role_change_not_supported';
  END IF;

  SELECT *
  INTO selected_profile
  FROM public.profiles
  WHERE id = target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF selected_profile.role = 'admin'::public.profile_role THEN
    RAISE EXCEPTION 'admin_role_protected';
  END IF;

  IF selected_profile.role = target_role THEN
    RAISE EXCEPTION 'profile_role_unchanged';
  END IF;

  UPDATE public.profiles
  SET role = target_role
  WHERE id = selected_profile.id
  RETURNING * INTO updated_profile;

  PERFORM public.record_admin_action(
    target_admin_user_id,
    'profile_role_changed',
    'user',
    selected_profile.id,
    target_reason,
    jsonb_build_object(
      'role', selected_profile.role,
      'account_status', selected_profile.account_status
    ),
    jsonb_build_object(
      'role', updated_profile.role,
      'account_status', updated_profile.account_status
    ),
    target_request_id
  );

  RETURN jsonb_build_object(
    'id', updated_profile.id,
    'role', updated_profile.role,
    'account_status', updated_profile.account_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_account_status(
  target_admin_user_id UUID,
  target_user_id UUID,
  target_status public.account_status,
  target_reason TEXT,
  target_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_profile public.profiles%ROWTYPE;
  updated_profile public.profiles%ROWTYPE;
BEGIN
  PERFORM app_private.assert_admin_operation(
    target_admin_user_id,
    target_reason,
    target_request_id
  );

  SELECT *
  INTO selected_profile
  FROM public.profiles
  WHERE id = target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF selected_profile.role = 'admin'::public.profile_role THEN
    RAISE EXCEPTION 'admin_account_protected';
  END IF;

  IF selected_profile.account_status = target_status THEN
    RAISE EXCEPTION 'account_status_unchanged';
  END IF;

  UPDATE public.profiles
  SET account_status = target_status
  WHERE id = selected_profile.id
  RETURNING * INTO updated_profile;

  PERFORM public.record_admin_action(
    target_admin_user_id,
    'account_status_changed',
    'user',
    selected_profile.id,
    target_reason,
    jsonb_build_object(
      'role', selected_profile.role,
      'account_status', selected_profile.account_status
    ),
    jsonb_build_object(
      'role', updated_profile.role,
      'account_status', updated_profile.account_status
    ),
    target_request_id
  );

  RETURN jsonb_build_object(
    'id', updated_profile.id,
    'role', updated_profile.role,
    'account_status', updated_profile.account_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_course_entitlement(
  target_admin_user_id UUID,
  target_user_id UUID,
  target_product_id UUID,
  target_reason TEXT,
  target_request_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_profile public.profiles%ROWTYPE;
  selected_product public.products%ROWTYPE;
  created_entitlement public.entitlements%ROWTYPE;
BEGIN
  PERFORM app_private.assert_admin_operation(
    target_admin_user_id,
    target_reason,
    target_request_id
  );

  SELECT *
  INTO selected_profile
  FROM public.profiles
  WHERE id = target_user_id
  FOR SHARE;

  IF NOT FOUND OR selected_profile.account_status <> 'active'::public.account_status THEN
    RAISE EXCEPTION 'active_profile_required';
  END IF;

  SELECT *
  INTO selected_product
  FROM public.products
  WHERE id = target_product_id
    AND product_type = 'course'::public.product_type
    AND metadata ->> 'entitlement_type' = 'course_full';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_full_product_not_found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.entitlements AS entitlement
    WHERE entitlement.user_id = target_user_id
      AND entitlement.entitlement_type = 'course_full'::public.entitlement_type
      AND entitlement.status = 'active'::public.entitlement_status
  ) THEN
    RAISE EXCEPTION 'course_entitlement_already_active';
  END IF;

  INSERT INTO public.entitlements(
    user_id,
    product_id,
    entitlement_type,
    status,
    starts_at,
    ends_at,
    source_order_id,
    source_payment_id
  )
  VALUES (
    target_user_id,
    selected_product.id,
    'course_full'::public.entitlement_type,
    'active'::public.entitlement_status,
    timezone('utc', now()),
    NULL,
    NULL,
    NULL
  )
  RETURNING * INTO created_entitlement;

  PERFORM public.record_admin_action(
    target_admin_user_id,
    'course_entitlement_granted',
    'entitlement',
    created_entitlement.id,
    target_reason,
    NULL,
    jsonb_build_object(
      'user_id', created_entitlement.user_id,
      'product_id', created_entitlement.product_id,
      'entitlement_type', created_entitlement.entitlement_type,
      'status', created_entitlement.status,
      'starts_at', created_entitlement.starts_at,
      'ends_at', created_entitlement.ends_at,
      'revoked_at', created_entitlement.revoked_at
    ),
    target_request_id
  );

  RETURN created_entitlement.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_course_entitlement(
  target_admin_user_id UUID,
  target_entitlement_id UUID,
  target_reason TEXT,
  target_request_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_entitlement public.entitlements%ROWTYPE;
  updated_entitlement public.entitlements%ROWTYPE;
BEGIN
  PERFORM app_private.assert_admin_operation(
    target_admin_user_id,
    target_reason,
    target_request_id
  );

  SELECT *
  INTO selected_entitlement
  FROM public.entitlements
  WHERE id = target_entitlement_id
  FOR UPDATE;

  IF NOT FOUND
     OR selected_entitlement.entitlement_type <> 'course_full'::public.entitlement_type THEN
    RAISE EXCEPTION 'active_course_entitlement_not_found';
  END IF;

  IF selected_entitlement.status <> 'active'::public.entitlement_status THEN
    RAISE EXCEPTION 'active_course_entitlement_not_found';
  END IF;

  UPDATE public.entitlements
  SET
    status = 'revoked'::public.entitlement_status,
    revoked_at = timezone('utc', now()),
    revoked_reason = trim(target_reason)
  WHERE id = selected_entitlement.id
  RETURNING * INTO updated_entitlement;

  PERFORM public.record_admin_action(
    target_admin_user_id,
    'course_entitlement_revoked',
    'entitlement',
    selected_entitlement.id,
    target_reason,
    jsonb_build_object(
      'user_id', selected_entitlement.user_id,
      'product_id', selected_entitlement.product_id,
      'entitlement_type', selected_entitlement.entitlement_type,
      'status', selected_entitlement.status,
      'starts_at', selected_entitlement.starts_at,
      'ends_at', selected_entitlement.ends_at,
      'revoked_at', selected_entitlement.revoked_at
    ),
    jsonb_build_object(
      'user_id', updated_entitlement.user_id,
      'product_id', updated_entitlement.product_id,
      'entitlement_type', updated_entitlement.entitlement_type,
      'status', updated_entitlement.status,
      'starts_at', updated_entitlement.starts_at,
      'ends_at', updated_entitlement.ends_at,
      'revoked_at', updated_entitlement.revoked_at
    ),
    target_request_id
  );

  RETURN updated_entitlement.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_extend_subscription(
  target_admin_user_id UUID,
  target_subscription_id UUID,
  target_extension_days INTEGER,
  target_reason TEXT,
  target_request_id TEXT
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_subscription public.subscriptions%ROWTYPE;
  updated_subscription public.subscriptions%ROWTYPE;
  extension_interval INTERVAL;
BEGIN
  PERFORM app_private.assert_admin_operation(
    target_admin_user_id,
    target_reason,
    target_request_id
  );

  IF target_extension_days IS NULL
     OR target_extension_days < 1
     OR target_extension_days > 30 THEN
    RAISE EXCEPTION 'subscription_extension_days_invalid';
  END IF;

  SELECT *
  INTO selected_subscription
  FROM public.subscriptions
  WHERE id = target_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_not_found';
  END IF;

  IF selected_subscription.status NOT IN (
    'active'::public.subscription_status,
    'trialing'::public.subscription_status,
    'past_due'::public.subscription_status
  ) THEN
    RAISE EXCEPTION 'subscription_status_not_extendable';
  END IF;

  IF selected_subscription.status IN (
    'active'::public.subscription_status,
    'trialing'::public.subscription_status
  ) AND selected_subscription.current_period_end <= timezone('utc', now()) THEN
    RAISE EXCEPTION 'subscription_period_not_functional';
  END IF;

  IF selected_subscription.status = 'past_due'::public.subscription_status
     AND (
       selected_subscription.grace_ends_at IS NULL
       OR selected_subscription.grace_ends_at <= timezone('utc', now())
     ) THEN
    RAISE EXCEPTION 'subscription_grace_not_functional';
  END IF;

  extension_interval := make_interval(days => target_extension_days);

  UPDATE public.subscriptions
  SET
    current_period_end = current_period_end + extension_interval,
    trial_ends_at = CASE
      WHEN status = 'trialing'::public.subscription_status AND trial_ends_at IS NOT NULL
        THEN trial_ends_at + extension_interval
      ELSE trial_ends_at
    END,
    grace_ends_at = CASE
      WHEN status = 'past_due'::public.subscription_status AND grace_ends_at IS NOT NULL
        THEN grace_ends_at + extension_interval
      ELSE grace_ends_at
    END
  WHERE id = selected_subscription.id
  RETURNING * INTO updated_subscription;

  PERFORM public.record_admin_action(
    target_admin_user_id,
    'subscription_extended',
    'subscription',
    selected_subscription.id,
    target_reason,
    jsonb_build_object(
      'lab_id', selected_subscription.lab_id,
      'plan_key', selected_subscription.plan_key,
      'status', selected_subscription.status,
      'current_period_end', selected_subscription.current_period_end,
      'trial_ends_at', selected_subscription.trial_ends_at,
      'grace_ends_at', selected_subscription.grace_ends_at,
      'cancel_at_period_end', selected_subscription.cancel_at_period_end
    ),
    jsonb_build_object(
      'lab_id', updated_subscription.lab_id,
      'plan_key', updated_subscription.plan_key,
      'status', updated_subscription.status,
      'current_period_end', updated_subscription.current_period_end,
      'trial_ends_at', updated_subscription.trial_ends_at,
      'grace_ends_at', updated_subscription.grace_ends_at,
      'cancel_at_period_end', updated_subscription.cancel_at_period_end,
      'extension_days', target_extension_days
    ),
    target_request_id
  );

  RETURN updated_subscription.current_period_end;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_compensate_pdf_credits(
  target_admin_user_id UUID,
  target_credit_id UUID,
  target_credit_amount INTEGER,
  target_reason TEXT,
  target_request_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_credit public.lab_usage_credits%ROWTYPE;
  selected_subscription public.subscriptions%ROWTYPE;
  updated_credit public.lab_usage_credits%ROWTYPE;
BEGIN
  PERFORM app_private.assert_admin_operation(
    target_admin_user_id,
    target_reason,
    target_request_id
  );

  IF target_credit_amount IS NULL
     OR target_credit_amount < 1
     OR target_credit_amount > 100 THEN
    RAISE EXCEPTION 'pdf_credit_compensation_invalid';
  END IF;

  SELECT *
  INTO selected_credit
  FROM public.lab_usage_credits
  WHERE id = target_credit_id
  FOR UPDATE;

  IF NOT FOUND
     OR selected_credit.period_start > timezone('utc', now())
     OR selected_credit.period_end <= timezone('utc', now()) THEN
    RAISE EXCEPTION 'current_pdf_credit_period_required';
  END IF;

  SELECT *
  INTO selected_subscription
  FROM public.subscriptions
  WHERE id = selected_credit.subscription_id;

  IF NOT FOUND OR NOT (
    (
      selected_subscription.status IN (
        'active'::public.subscription_status,
        'trialing'::public.subscription_status
      )
      AND selected_subscription.current_period_end > timezone('utc', now())
    )
    OR (
      selected_subscription.status = 'past_due'::public.subscription_status
      AND selected_subscription.grace_ends_at IS NOT NULL
      AND selected_subscription.grace_ends_at > timezone('utc', now())
    )
  ) THEN
    RAISE EXCEPTION 'functional_subscription_required';
  END IF;

  UPDATE public.lab_usage_credits
  SET pdf_audit_limit = pdf_audit_limit + target_credit_amount
  WHERE id = selected_credit.id
  RETURNING * INTO updated_credit;

  PERFORM public.record_admin_action(
    target_admin_user_id,
    'pdf_credits_compensated',
    'pdf_credit',
    selected_credit.id,
    target_reason,
    jsonb_build_object(
      'lab_id', selected_credit.lab_id,
      'subscription_id', selected_credit.subscription_id,
      'period_start', selected_credit.period_start,
      'period_end', selected_credit.period_end,
      'pdf_audit_limit', selected_credit.pdf_audit_limit,
      'pdf_audit_reserved', selected_credit.pdf_audit_reserved,
      'pdf_audit_used', selected_credit.pdf_audit_used
    ),
    jsonb_build_object(
      'lab_id', updated_credit.lab_id,
      'subscription_id', updated_credit.subscription_id,
      'period_start', updated_credit.period_start,
      'period_end', updated_credit.period_end,
      'pdf_audit_limit', updated_credit.pdf_audit_limit,
      'pdf_audit_reserved', updated_credit.pdf_audit_reserved,
      'pdf_audit_used', updated_credit.pdf_audit_used,
      'compensation_amount', target_credit_amount
    ),
    target_request_id
  );

  RETURN updated_credit.pdf_audit_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_lead_status(
  target_admin_user_id UUID,
  target_lead_id UUID,
  target_status public.lead_status,
  target_reason TEXT,
  target_request_id TEXT
)
RETURNS public.lead_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_lead public.leads%ROWTYPE;
BEGIN
  PERFORM app_private.assert_admin_operation(
    target_admin_user_id,
    target_reason,
    target_request_id
  );

  SELECT *
  INTO selected_lead
  FROM public.leads
  WHERE id = target_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead_not_found';
  END IF;

  IF selected_lead.lead_status = target_status THEN
    RAISE EXCEPTION 'lead_status_unchanged';
  END IF;

  UPDATE public.leads
  SET lead_status = target_status
  WHERE id = selected_lead.id;

  PERFORM public.record_admin_action(
    target_admin_user_id,
    'lead_status_changed',
    'lead',
    selected_lead.id,
    target_reason,
    jsonb_build_object('lead_status', selected_lead.lead_status),
    jsonb_build_object('lead_status', target_status),
    target_request_id
  );

  RETURN target_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unlock_free_usage_quota(
  target_admin_user_id UUID,
  target_email TEXT,
  target_reason TEXT,
  target_request_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_email TEXT;
  selected_quota public.free_usage_quotas%ROWTYPE;
  updated_quota public.free_usage_quotas%ROWTYPE;
  before_snapshot JSONB;
BEGIN
  PERFORM app_private.assert_admin_operation(
    target_admin_user_id,
    target_reason,
    target_request_id
  );

  normalized_email := lower(trim(COALESCE(target_email, '')));
  IF char_length(normalized_email) < 3
     OR char_length(normalized_email) > 320
     OR position('@' IN normalized_email) <= 1 THEN
    RAISE EXCEPTION 'quota_email_invalid';
  END IF;

  SELECT *
  INTO selected_quota
  FROM public.free_usage_quotas
  WHERE lower(email) = normalized_email
  FOR UPDATE;

  IF FOUND THEN
    before_snapshot := jsonb_build_object(
      'daily_limit', selected_quota.daily_limit,
      'total_limit', selected_quota.total_limit,
      'unlocked_by_admin', selected_quota.unlocked_by_admin,
      'admin_unlocked_total', selected_quota.admin_unlocked_total
    );

    UPDATE public.free_usage_quotas
    SET
      unlocked_by_admin = TRUE,
      admin_unlocked_total = admin_unlocked_total + 1,
      admin_note = trim(target_reason)
    WHERE id = selected_quota.id
    RETURNING * INTO updated_quota;
  ELSE
    before_snapshot := NULL;
    INSERT INTO public.free_usage_quotas(
      email,
      daily_limit,
      total_limit,
      unlocked_by_admin,
      admin_unlocked_total,
      admin_note
    )
    VALUES (
      normalized_email,
      2,
      3,
      TRUE,
      1,
      trim(target_reason)
    )
    RETURNING * INTO updated_quota;
  END IF;

  PERFORM public.record_admin_action(
    target_admin_user_id,
    'legacy_quota_unlocked',
    'free_usage_quota',
    updated_quota.id,
    target_reason,
    before_snapshot,
    jsonb_build_object(
      'daily_limit', updated_quota.daily_limit,
      'total_limit', updated_quota.total_limit,
      'unlocked_by_admin', updated_quota.unlocked_by_admin,
      'admin_unlocked_total', updated_quota.admin_unlocked_total
    ),
    target_request_id
  );

  RETURN updated_quota.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_prompt_template(
  target_admin_user_id UUID,
  target_template_id UUID,
  target_system_role TEXT,
  target_context_template TEXT,
  target_task_template TEXT,
  target_output_template TEXT,
  target_official_doc_notes TEXT,
  target_reason TEXT,
  target_request_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_template public.prompt_templates%ROWTYPE;
  updated_template public.prompt_templates%ROWTYPE;
BEGIN
  PERFORM app_private.assert_admin_operation(
    target_admin_user_id,
    target_reason,
    target_request_id
  );

  IF target_system_role IS NULL OR char_length(trim(target_system_role)) NOT BETWEEN 1 AND 12000
     OR target_context_template IS NULL OR char_length(trim(target_context_template)) NOT BETWEEN 1 AND 12000
     OR target_task_template IS NULL OR char_length(trim(target_task_template)) NOT BETWEEN 1 AND 12000
     OR target_output_template IS NULL OR char_length(trim(target_output_template)) NOT BETWEEN 1 AND 12000
     OR char_length(COALESCE(target_official_doc_notes, '')) > 12000 THEN
    RAISE EXCEPTION 'prompt_template_fields_invalid';
  END IF;

  SELECT *
  INTO selected_template
  FROM public.prompt_templates
  WHERE id = target_template_id
    AND is_active
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_prompt_template_not_found';
  END IF;

  UPDATE public.prompt_templates
  SET
    system_role = trim(target_system_role),
    context_template = trim(target_context_template),
    task_template = trim(target_task_template),
    output_template = trim(target_output_template),
    official_doc_notes = NULLIF(trim(COALESCE(target_official_doc_notes, '')), ''),
    version = version + 1,
    updated_by = target_admin_user_id
  WHERE id = selected_template.id
  RETURNING * INTO updated_template;

  PERFORM public.record_admin_action(
    target_admin_user_id,
    'prompt_template_updated',
    'prompt_template',
    selected_template.id,
    target_reason,
    jsonb_build_object(
      'target_ai', selected_template.target_ai,
      'template_type', selected_template.template_type,
      'version', selected_template.version,
      'is_active', selected_template.is_active
    ),
    jsonb_build_object(
      'target_ai', updated_template.target_ai,
      'template_type', updated_template.template_type,
      'version', updated_template.version,
      'is_active', updated_template.is_active
    ),
    target_request_id
  );

  RETURN updated_template.version;
END;
$$;

REVOKE ALL ON FUNCTION app_private.assert_admin_operation(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_update_profile_role(
  UUID, UUID, public.profile_role, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_account_status(
  UUID, UUID, public.account_status, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_grant_course_entitlement(
  UUID, UUID, UUID, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_revoke_course_entitlement(
  UUID, UUID, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_extend_subscription(
  UUID, UUID, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_compensate_pdf_credits(
  UUID, UUID, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_lead_status(
  UUID, UUID, public.lead_status, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_unlock_free_usage_quota(
  UUID, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_prompt_template(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_update_profile_role(
  UUID, UUID, public.profile_role, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_account_status(
  UUID, UUID, public.account_status, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_grant_course_entitlement(
  UUID, UUID, UUID, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_course_entitlement(
  UUID, UUID, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_extend_subscription(
  UUID, UUID, INTEGER, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_compensate_pdf_credits(
  UUID, UUID, INTEGER, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_lead_status(
  UUID, UUID, public.lead_status, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_unlock_free_usage_quota(
  UUID, TEXT, TEXT, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_prompt_template(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;

COMMENT ON FUNCTION public.admin_update_profile_role(
  UUID, UUID, public.profile_role, TEXT, TEXT
) IS 'Service-only role correction. Admin roles are intentionally protected.';
COMMENT ON FUNCTION public.admin_extend_subscription(
  UUID, UUID, INTEGER, TEXT, TEXT
) IS 'Service-only support extension, limited to 30 days and functional subscriptions.';
COMMENT ON FUNCTION public.admin_compensate_pdf_credits(
  UUID, UUID, INTEGER, TEXT, TEXT
) IS 'Service-only current-period compensation. Never edits used or reserved counters.';
