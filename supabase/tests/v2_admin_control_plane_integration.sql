\set ON_ERROR_STOP on
\set admin_user '93000000-0000-0000-0000-000000000001'
\set student_user '91000000-0000-0000-0000-000000000001'
\set professor_user '92000000-0000-0000-0000-000000000001'
\set lab_id '94000000-0000-0000-0000-000000000001'
\set subscription_id '95000000-0000-0000-0000-000000000001'
\set credit_id '96000000-0000-0000-0000-000000000001'
\set lead_id '97000000-0000-0000-0000-000000000001'

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF condition IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'assertion_failed: %', message;
  END IF;
END;
$$;

INSERT INTO auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
SELECT id, 'authenticated', 'authenticated', email, 'local-test-only',
  timezone('utc', now()), '{"provider":"email","providers":["email"]}'::JSONB,
  jsonb_build_object('full_name', display_name), timezone('utc', now()), timezone('utc', now())
FROM (VALUES
  (:'admin_user'::UUID, 'task8-admin@local.test', 'Task 8 Admin'),
  (:'student_user'::UUID, 'task8-student@local.test', 'Task 8 Student'),
  (:'professor_user'::UUID, 'task8-professor@local.test', 'Task 8 Professor')
) AS fixture(id, email, display_name);

UPDATE public.profiles SET role = 'admin' WHERE id = :'admin_user'::UUID;
UPDATE public.profiles SET role = 'professor' WHERE id = :'professor_user'::UUID;

INSERT INTO public.labs(id, owner_professor_id, name, institution)
VALUES (:'lab_id'::UUID, :'professor_user'::UUID, 'Task 8 Local Lab', 'Local University');

INSERT INTO public.subscriptions(
  id, lab_id, payer_user_id, product_id, provider, plan_key, status,
  billing_interval, current_period_start, current_period_end
)
VALUES (
  :'subscription_id'::UUID, :'lab_id'::UUID, :'professor_user'::UUID,
  (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
  'manual', 'professor_lab_standard', 'active', 'manual',
  timezone('utc', now()) - interval '1 day', timezone('utc', now()) + interval '29 days'
);

INSERT INTO public.lab_usage_credits(
  id, lab_id, subscription_id, period_start, period_end,
  pdf_audit_limit, pdf_audit_reserved, pdf_audit_used
)
VALUES (
  :'credit_id'::UUID, :'lab_id'::UUID, :'subscription_id'::UUID,
  timezone('utc', now()) - interval '1 day', timezone('utc', now()) + interval '29 days',
  30, 2, 3
);

INSERT INTO public.leads(id, email, name)
VALUES (:'lead_id'::UUID, 'task8-lead@local.test', 'Task 8 Lead');

SELECT pg_temp.assert_true(
  NOT has_function_privilege(
    'authenticated',
    'public.admin_update_profile_role(uuid,uuid,public.profile_role,text,text)',
    'EXECUTE'
  ),
  'authenticated must not execute role correction RPC'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated', 'public.admin_action_logs', 'SELECT'),
  'authenticated must not read Admin action logs directly'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated', 'public.entitlements', 'INSERT'),
  'authenticated must not insert entitlements directly'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated', 'public.subscriptions', 'UPDATE'),
  'authenticated must not update subscriptions directly'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated', 'public.lab_usage_credits', 'UPDATE'),
  'authenticated must not update shared credits directly'
);

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_user', true);
DO $$
BEGIN
  BEGIN
    UPDATE public.profiles SET role = 'admin' WHERE id = '91000000-0000-0000-0000-000000000001'::UUID;
    RAISE EXCEPTION 'authenticated role escalation unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    PERFORM public.admin_update_profile_role(
      '93000000-0000-0000-0000-000000000001'::UUID,
      '91000000-0000-0000-0000-000000000001'::UUID,
      'professor', 'forbidden', 'forbidden-request'
    );
    RAISE EXCEPTION 'authenticated RPC execution unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
ROLLBACK;

SELECT public.admin_update_profile_role(
  :'admin_user'::UUID, :'student_user'::UUID, 'professor',
  'Verified professor workspace correction', 'task8-role-0001'
);
SELECT public.admin_update_account_status(
  :'admin_user'::UUID, :'student_user'::UUID, 'suspended',
  'Temporary support suspension', 'task8-status-0001'
);
SELECT public.admin_update_account_status(
  :'admin_user'::UUID, :'student_user'::UUID, 'active',
  'Support verification completed', 'task8-status-0002'
);

SELECT public.admin_grant_course_entitlement(
  :'admin_user'::UUID, :'student_user'::UUID,
  (SELECT id FROM public.products WHERE slug = 'student-course-full'),
  'Verified one-time course purchase', 'task8-entitlement-0001'
) AS entitlement_id \gset
SELECT public.admin_revoke_course_entitlement(
  :'admin_user'::UUID, :'entitlement_id'::UUID,
  'Approved manual refund', 'task8-entitlement-0002'
);

SELECT public.admin_extend_subscription(
  :'admin_user'::UUID, :'subscription_id'::UUID, 7,
  'Seven day service interruption compensation', 'task8-subscription-0001'
);
SELECT public.admin_compensate_pdf_credits(
  :'admin_user'::UUID, :'credit_id'::UUID, 5,
  'Five failed audits compensated', 'task8-credit-0001'
);
SELECT public.admin_update_lead_status(
  :'admin_user'::UUID, :'lead_id'::UUID, 'contacted',
  'Email contact completed', 'task8-lead-0001'
);
SELECT public.admin_unlock_free_usage_quota(
  :'admin_user'::UUID, 'task8-quota@local.test',
  'Legacy trial support compensation', 'task8-quota-0001'
);
SELECT public.admin_update_prompt_template(
  :'admin_user'::UUID,
  (SELECT id FROM public.prompt_templates WHERE is_active ORDER BY created_at LIMIT 1),
  'Updated system role', 'Updated context', 'Updated task', 'Updated output',
  'Official notes', 'Model documentation alignment', 'task8-template-0001'
);

SELECT pg_temp.assert_true(
  (SELECT role = 'professor' AND account_status = 'active' FROM public.profiles WHERE id = :'student_user'::UUID),
  'role and account support mutations must persist'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'revoked' AND ends_at IS NULL FROM public.entitlements WHERE id = :'entitlement_id'::UUID),
  'permanent entitlement must be revoked without an expiry rewrite'
);
SELECT pg_temp.assert_true(
  (SELECT current_period_end > timezone('utc', now()) + interval '35 days' FROM public.subscriptions WHERE id = :'subscription_id'::UUID),
  'subscription must be extended by seven days'
);
SELECT pg_temp.assert_true(
  (SELECT pdf_audit_limit = 35 AND pdf_audit_reserved = 2 AND pdf_audit_used = 3 FROM public.lab_usage_credits WHERE id = :'credit_id'::UUID),
  'credit compensation must only increase the limit'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 10 FROM public.admin_action_logs WHERE admin_user_id = :'admin_user'::UUID),
  'every successful mutation must have one action log'
);
SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1 FROM public.admin_action_logs AS log,
    LATERAL jsonb_object_keys(COALESCE(log.before_state, '{}'::JSONB) || COALESCE(log.after_state, '{}'::JSONB)) AS key
    WHERE key IN ('email', 'input_prompt', 'result_markdown', 'storage_path', 'raw_payload', 'raw_checkout_payload', 'token_input', 'token_output')
  ),
  'Admin snapshots must exclude sensitive fields'
);

DO $$
DECLARE before_count BIGINT;
BEGIN
  SELECT count(*) INTO before_count FROM public.admin_action_logs;
  BEGIN
    PERFORM public.admin_extend_subscription(
      '93000000-0000-0000-0000-000000000001'::UUID,
      '95000000-0000-0000-0000-000000000001'::UUID,
      31, 'Invalid extension', 'task8-invalid-0001'
    );
    RAISE EXCEPTION '31-day extension unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%subscription_extension_days_invalid%' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM public.admin_action_logs) <> before_count THEN
    RAISE EXCEPTION 'failed mutation unexpectedly wrote an action log';
  END IF;
END;
$$;

UPDATE public.subscriptions SET status = 'canceled' WHERE id = :'subscription_id'::UUID;
DO $$
BEGIN
  BEGIN
    PERFORM public.admin_extend_subscription(
      '93000000-0000-0000-0000-000000000001'::UUID,
      '95000000-0000-0000-0000-000000000001'::UUID,
      1, 'Forbidden revival attempt', 'task8-invalid-0002'
    );
    RAISE EXCEPTION 'terminal subscription unexpectedly revived';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%subscription_status_not_extendable%' THEN RAISE; END IF;
  END;
END;
$$;

SELECT 'V2 Admin control plane integration passed.' AS result;
