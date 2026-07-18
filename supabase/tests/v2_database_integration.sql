\set ON_ERROR_STOP on
\set student_owner '10000000-0000-0000-0000-000000000001'
\set student_other '10000000-0000-0000-0000-000000000002'
\set student_cross '10000000-0000-0000-0000-000000000003'
\set contender_one '10000000-0000-0000-0000-000000000015'
\set contender_two '10000000-0000-0000-0000-000000000016'
\set professor_one '20000000-0000-0000-0000-000000000001'
\set professor_two '20000000-0000-0000-0000-000000000002'
\set assistant_one '20000000-0000-0000-0000-000000000003'
\set admin_one '30000000-0000-0000-0000-000000000001'
\set document_one '40000000-0000-0000-0000-000000000001'
\set document_two '40000000-0000-0000-0000-000000000002'
\set subscription_one '50000000-0000-0000-0000-000000000001'
\set subscription_two '50000000-0000-0000-0000-000000000002'
\set credit_one '60000000-0000-0000-0000-000000000001'
\set order_one '70000000-0000-0000-0000-000000000001'
\set payment_one '80000000-0000-0000-0000-000000000001'

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition BOOLEAN, message TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
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
SELECT
  fixture.id,
  'authenticated',
  'authenticated',
  fixture.email,
  'local-test-only',
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::JSONB,
  jsonb_build_object('full_name', fixture.name),
  timezone('utc', now()),
  timezone('utc', now())
FROM (
  VALUES
    (:'student_owner'::UUID, 'student-owner@local.test', 'Student Owner'),
    (:'student_other'::UUID, 'student-other@local.test', 'Student Other'),
    (:'student_cross'::UUID, 'student-cross@local.test', 'Student Cross'),
    (:'contender_one'::UUID, 'contender-one@local.test', 'Contender One'),
    (:'contender_two'::UUID, 'contender-two@local.test', 'Contender Two'),
    (:'professor_one'::UUID, 'professor-one@local.test', 'Professor One'),
    (:'professor_two'::UUID, 'professor-two@local.test', 'Professor Two'),
    (:'assistant_one'::UUID, 'assistant-one@local.test', 'Assistant One'),
    (:'admin_one'::UUID, 'admin-one@local.test', 'Admin One')
) AS fixture(id, email, name);

INSERT INTO auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
SELECT
  ('10000000-0000-0000-0000-' || lpad(series::TEXT, 12, '0'))::UUID,
  'authenticated',
  'authenticated',
  'filler-' || series || '@local.test',
  'local-test-only',
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::JSONB,
  jsonb_build_object('full_name', 'Filler ' || series),
  timezone('utc', now()),
  timezone('utc', now())
FROM generate_series(201, 213) AS series;

UPDATE public.profiles
SET role = 'professor'::public.profile_role
WHERE id IN (:'professor_one'::UUID, :'professor_two'::UUID, :'assistant_one'::UUID);

UPDATE public.profiles
SET role = 'admin'::public.profile_role
WHERE id = :'admin_one'::UUID;

SELECT public.create_professor_lab(
  :'professor_one'::UUID,
  'Local Lab One',
  'Local University'
) AS lab_one \gset

SELECT public.create_professor_lab(
  :'professor_two'::UUID,
  'Local Lab Two',
  'Local University'
) AS lab_two \gset

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.labs WHERE owner_professor_id = :'professor_one'::UUID AND status = 'active'),
  'professor must own exactly one active Lab'
);

DO $$
BEGIN
  BEGIN
    PERFORM public.create_professor_lab(
      '20000000-0000-0000-0000-000000000001'::UUID,
      'Forbidden Second Lab',
      NULL
    );
    RAISE EXCEPTION 'second active Lab unexpectedly created';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%professor_already_owns_active_lab%' THEN
      RAISE;
    END IF;
  END;
END;
$$;

INSERT INTO public.subscriptions(
  id, lab_id, payer_user_id, product_id, provider, plan_key, status,
  billing_interval, current_period_start, current_period_end
)
VALUES
  (
    :'subscription_one'::UUID,
    :'lab_one'::UUID,
    :'professor_one'::UUID,
    (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
    'manual'::public.payment_provider,
    'professor_lab_standard'::public.professor_plan_key,
    'active'::public.subscription_status,
    'manual'::public.subscription_interval,
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '30 days'
  ),
  (
    :'subscription_two'::UUID,
    :'lab_two'::UUID,
    :'professor_two'::UUID,
    (SELECT id FROM public.products WHERE slug = 'professor-lab-plus'),
    'manual'::public.payment_provider,
    'professor_lab_plus'::public.professor_plan_key,
    'active'::public.subscription_status,
    'manual'::public.subscription_interval,
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '30 days'
  );

INSERT INTO public.lab_usage_credits(
  id, lab_id, subscription_id, period_start, period_end, pdf_audit_limit
)
VALUES (
  :'credit_one'::UUID,
  :'lab_one'::UUID,
  :'subscription_one'::UUID,
  timezone('utc', now()) - interval '1 day',
  timezone('utc', now()) + interval '30 days',
  10
);

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
VALUES
  (:'lab_one'::UUID, :'student_owner'::UUID, 'student', 'active'),
  (:'lab_one'::UUID, :'assistant_one'::UUID, 'assistant', 'active'),
  (:'lab_two'::UUID, :'student_cross'::UUID, 'student', 'active');

INSERT INTO public.student_documents(
  id, user_id, storage_bucket, storage_path, original_filename,
  mime_type, file_size_bytes, document_type, upload_status, sha256_hex
)
VALUES
  (
    :'document_one'::UUID,
    :'student_owner'::UUID,
    'student-documents',
    :'student_owner' || '/' || :'document_one' || '/thesis.pdf',
    'thesis.pdf',
    'application/pdf',
    1024,
    'thesis',
    'ready',
    repeat('a', 64)
  ),
  (
    :'document_two'::UUID,
    :'student_owner'::UUID,
    'student-documents',
    :'student_owner' || '/' || :'document_two' || '/draft.pdf',
    'draft.pdf',
    'application/pdf',
    2048,
    'draft',
    'ready',
    repeat('b', 64)
  );

SELECT public.reserve_lab_pdf_audit_credit(
  :'student_owner'::UUID,
  :'document_one'::UUID,
  'logic_check',
  'openai',
  'local-model',
  'local prompt'
) AS completed_job \gset

SELECT pg_temp.assert_true(
  (SELECT pdf_audit_reserved = 1 AND pdf_audit_used = 0 FROM public.lab_usage_credits WHERE id = :'credit_one'::UUID),
  'audit reservation must increment reserved counter'
);

SELECT public.complete_lab_pdf_audit_job(
  :'completed_job'::UUID,
  'Safe summary',
  '# Private full result',
  'medium',
  ARRAY['logic'],
  100,
  50,
  2
);

SELECT public.complete_lab_pdf_audit_job(
  :'completed_job'::UUID,
  'Safe summary',
  '# Private full result',
  'medium',
  ARRAY['logic'],
  100,
  50,
  2
);

SELECT pg_temp.assert_true(
  (SELECT pdf_audit_reserved = 0 AND pdf_audit_used = 1 FROM public.lab_usage_credits WHERE id = :'credit_one'::UUID),
  'audit completion must settle exactly once'
);

SELECT public.reserve_lab_pdf_audit_credit(
  :'student_owner'::UUID,
  :'document_two'::UUID,
  'advisor_questions',
  'anthropic',
  'local-model',
  'local prompt two'
) AS failed_job \gset

SELECT public.fail_lab_pdf_audit_job(:'failed_job'::UUID, 'provider_failure', 'local failure');
SELECT public.fail_lab_pdf_audit_job(:'failed_job'::UUID, 'provider_failure', 'local failure');

SELECT pg_temp.assert_true(
  (SELECT pdf_audit_reserved = 0 AND pdf_audit_used = 1 FROM public.lab_usage_credits WHERE id = :'credit_one'::UUID),
  'failed audit must refund reserved credit exactly once'
);

SELECT public.grant_audit_summary_consent(
  :'student_owner'::UUID,
  :'document_one'::UUID,
  :'lab_one'::UUID
);

-- Owner RLS: own profile and raw audit are visible; unrelated records are not.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_owner', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.profiles), 'student must read own profile only');
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.student_documents), 'owner must read own PDF metadata');
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.ai_audit_jobs), 'owner must read own audit jobs');
UPDATE public.profiles SET full_name = 'Updated Owner' WHERE id = :'student_owner'::UUID;
SELECT pg_temp.assert_true((SELECT full_name = 'Updated Owner' FROM public.profiles), 'safe profile field must update');
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_owner', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
DO $$
BEGIN
  BEGIN
    UPDATE public.profiles
    SET role = 'admin'::public.profile_role
    WHERE id = '10000000-0000-0000-0000-000000000001'::UUID;
    RAISE EXCEPTION 'sensitive profile update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
ROLLBACK;

SELECT pg_temp.assert_true(
  has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE'),
  'authenticated must update safe profile fields'
);
SELECT pg_temp.assert_true(
  NOT has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.profiles', 'is_paid', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.profiles', 'course_expires_at', 'UPDATE'),
  'authenticated must not update role or billing compatibility fields'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public.free_usage_quotas', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.free_usage_quotas', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.free_usage_quotas', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.free_usage_quotas', 'UPDATE'),
  'free usage quotas must remain server-only'
);

-- Professor and assistant can only use the seven-field summary RPC.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_one', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.student_documents), 'professor must not read PDF metadata');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.ai_audit_jobs), 'professor must not read raw jobs');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.ai_audit_results), 'professor must not read raw results');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.get_shared_audit_summaries(:'lab_one'::UUID, NULL)), 'same-Lab professor must read consented summary');
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'assistant_one', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.student_documents), 'assistant must not read PDF metadata');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.get_shared_audit_summaries(:'lab_one'::UUID, NULL)), 'active assistant must read consented summary');
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_two', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.get_shared_audit_summaries(:'lab_one'::UUID, NULL)), 'cross-Lab professor must read zero summaries');
COMMIT;

SELECT public.revoke_audit_summary_consent(
  :'student_owner'::UUID,
  :'document_one'::UUID,
  :'lab_one'::UUID
);

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_one', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.get_shared_audit_summaries(:'lab_one'::UUID, NULL)), 'revoked consent must disappear immediately');
COMMIT;

-- Storage is owner-only, including for professor and Admin roles.
INSERT INTO storage.objects(bucket_id, name, owner_id, metadata)
VALUES (
  'student-documents',
  :'student_owner' || '/' || :'document_one' || '/thesis.pdf',
  :'student_owner',
  '{"mimetype":"application/pdf","size":1024}'::JSONB
);

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_owner', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM storage.objects WHERE bucket_id = 'student-documents'), 'owner must read own Storage object');
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_one', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM storage.objects WHERE bucket_id = 'student-documents'), 'professor must not read student Storage object');
COMMIT;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'admin_one', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM storage.objects WHERE bucket_id = 'student-documents'), 'Admin must not read student Storage object');
COMMIT;

-- Permanent course entitlement remains active after Lab membership removal.
UPDATE public.products SET is_active = TRUE WHERE slug = 'student-course-full';
INSERT INTO public.product_prices(
  id, product_id, provider, currency, amount, interval, is_active
)
VALUES (
  '71000000-0000-0000-0000-000000000001'::UUID,
  (SELECT id FROM public.products WHERE slug = 'student-course-full'),
  'manual', 'TWD', 2400, 'one_time', TRUE
);
INSERT INTO public.orders(
  id, user_id, product_id, product_price_id, amount, currency, status,
  provider, idempotency_key, paid_at
)
VALUES (
  :'order_one'::UUID,
  :'student_owner'::UUID,
  (SELECT id FROM public.products WHERE slug = 'student-course-full'),
  '71000000-0000-0000-0000-000000000001'::UUID,
  2400, 'TWD', 'paid', 'manual', 'local-order-1', timezone('utc', now())
);
INSERT INTO public.payments(
  id, order_id, user_id, email, provider, provider_payment_id,
  amount, currency, status, paid_at
)
VALUES (
  :'payment_one'::UUID, :'order_one'::UUID, :'student_owner'::UUID,
  'student-owner@local.test', 'manual', 'local-payment-1',
  2400, 'TWD', 'completed', timezone('utc', now())
);
SELECT public.grant_course_entitlement_for_order(:'order_one'::UUID, :'payment_one'::UUID);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 AND bool_and(ends_at IS NULL) FROM public.entitlements WHERE user_id = :'student_owner'::UUID AND entitlement_type = 'course_full' AND status = 'active'),
  'course_full entitlement must be unique and permanent'
);

SELECT public.grant_audit_summary_consent(
  :'student_owner'::UUID,
  :'document_one'::UUID,
  :'lab_one'::UUID
);
SELECT public.remove_lab_member(
  :'professor_one'::UUID,
  :'lab_one'::UUID,
  :'student_owner'::UUID,
  'Local removal validation'
);
SELECT pg_temp.assert_true(
  (SELECT status = 'removed' AND removed_at IS NOT NULL FROM public.lab_memberships WHERE lab_id = :'lab_one'::UUID AND user_id = :'student_owner'::UUID),
  'Lab removal must change membership status without deleting the account'
);
SELECT pg_temp.assert_true(
  (SELECT revoked_at IS NOT NULL FROM public.audit_summary_shares WHERE document_id = :'document_one'::UUID AND lab_id = :'lab_one'::UUID),
  'Lab removal must revoke summary consent in the same transaction'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.entitlements WHERE user_id = :'student_owner'::UUID AND entitlement_type = 'course_full' AND status = 'active' AND ends_at IS NULL),
  'Lab removal must not revoke permanent course_full entitlement'
);
UPDATE public.lab_memberships
SET
  status = 'active',
  joined_at = timezone('utc', now()),
  removed_at = NULL,
  removed_by = NULL,
  removal_reason = NULL
WHERE lab_id = :'lab_one'::UUID
  AND user_id = :'student_owner'::UUID;

-- Prepare Standard plan at 14 active students for an external two-session final-seat test.
INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
SELECT
  :'lab_one'::UUID,
  ('10000000-0000-0000-0000-' || lpad(series::TEXT, 12, '0'))::UUID,
  'student'::public.lab_role,
  'active'::public.lab_membership_status
FROM generate_series(201, 213) AS series;

SELECT public.create_lab_invite(
  :'professor_one'::UUID,
  :'lab_one'::UUID,
  'v2-final-seat-invite-hash',
  'student',
  timezone('utc', now()) + interval '1 day',
  2
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 14 FROM public.lab_memberships WHERE lab_id = :'lab_one'::UUID AND role = 'student' AND status = 'active'),
  'final-seat fixture must start with fourteen students'
);

SELECT :'lab_one'::UUID AS lab_one_id;
