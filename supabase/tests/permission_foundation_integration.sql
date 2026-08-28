\set ON_ERROR_STOP on

-- Run only against an empty or disposable Local Supabase database after all
-- V2 migrations. This script wraps its fixtures in a transaction and rolls
-- them back, so it never creates lasting test identities or product records.

\set student_member 'e9000000-0000-0000-0000-000000000001'
\set clean_student 'e9000000-0000-0000-0000-000000000002'
\set professor_owner 'e9000000-0000-0000-0000-000000000003'
\set clean_professor 'e9000000-0000-0000-0000-000000000004'
\set admin_user 'e9000000-0000-0000-0000-000000000005'
\set document_id 'e9000000-0000-0000-0000-000000000101'

BEGIN;

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
    (:'student_member'::UUID, 'permission-student-member@local.test', 'Permission Student Member'),
    (:'clean_student'::UUID, 'permission-clean-student@local.test', 'Permission Clean Student'),
    (:'professor_owner'::UUID, 'permission-professor-owner@local.test', 'Permission Professor Owner'),
    (:'clean_professor'::UUID, 'permission-clean-professor@local.test', 'Permission Clean Professor'),
    (:'admin_user'::UUID, 'permission-admin@local.test', 'Permission Admin')
) AS fixture(id, email, name);

UPDATE public.profiles
SET role = 'professor'::public.profile_role
WHERE id IN (:'professor_owner'::UUID, :'clean_professor'::UUID);

UPDATE public.profiles
SET role = 'admin'::public.profile_role
WHERE id = :'admin_user'::UUID;

SELECT public.create_professor_lab(
  :'professor_owner'::UUID,
  'Permission Foundation Lab',
  'Local Test University'
) AS lab_id \gset

INSERT INTO public.subscriptions(
  lab_id, payer_user_id, product_id, provider, plan_key, status,
  billing_interval, current_period_start, current_period_end
)
VALUES (
  :'lab_id'::UUID,
  :'professor_owner'::UUID,
  (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
  'manual'::public.payment_provider,
  'professor_lab_standard'::public.professor_plan_key,
  'active'::public.subscription_status,
  'manual'::public.subscription_interval,
  timezone('utc', now()) - interval '1 day',
  timezone('utc', now()) + interval '30 days'
);

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
VALUES (:'lab_id'::UUID, :'student_member'::UUID, 'student', 'active');

INSERT INTO public.student_documents(
  id, user_id, storage_bucket, storage_path, original_filename,
  mime_type, file_size_bytes, document_type, upload_status, sha256_hex
)
VALUES (
  :'document_id'::UUID,
  :'student_member'::UUID,
  'student-documents',
  :'student_member' || '/' || :'document_id' || '/permission-test.pdf',
  'permission-test.pdf',
  'application/pdf',
  1024,
  'thesis',
  'ready',
  repeat('a', 64)
);

-- The role mutation RPC remains service-only and rejects unsafe transitions.
SELECT pg_temp.assert_true(
  NOT has_function_privilege(
    'authenticated',
    'public.admin_update_profile_role(uuid,uuid,public.profile_role,text,text)',
    'EXECUTE'
  ),
  'authenticated must not execute admin role mutation RPC'
);

DO $$
BEGIN
  BEGIN
    PERFORM public.admin_update_profile_role(
      'e9000000-0000-0000-0000-000000000005'::UUID,
      'e9000000-0000-0000-0000-000000000001'::UUID,
      'professor'::public.profile_role,
      'Local role safety test',
      'permission-role-member-to-professor'
    );
    RAISE EXCEPTION 'member student unexpectedly became professor';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'active_student_membership_blocks_professor_role' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM public.admin_update_profile_role(
      'e9000000-0000-0000-0000-000000000005'::UUID,
      'e9000000-0000-0000-0000-000000000003'::UUID,
      'student'::public.profile_role,
      'Local role safety test',
      'permission-role-owner-to-student'
    );
    RAISE EXCEPTION 'Lab owner unexpectedly became student';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'professor_resources_block_student_role' THEN
      RAISE;
    END IF;
  END;
END;
$$;

SELECT pg_temp.assert_true(
  (public.admin_update_profile_role(
    :'admin_user'::UUID,
    :'clean_student'::UUID,
    'professor'::public.profile_role,
    'Clean student role correction',
    'permission-clean-student-to-professor'
  ) ->> 'role') = 'professor',
  'clean student must be eligible for professor role'
);

SELECT pg_temp.assert_true(
  (public.admin_update_profile_role(
    :'admin_user'::UUID,
    :'clean_professor'::UUID,
    'student'::public.profile_role,
    'Clean professor role correction',
    'permission-clean-professor-to-student'
  ) ->> 'role') = 'student',
  'clean professor without Lab resources must be eligible for student role'
);

-- Active user remains able to read their own private document and update an
-- allowed basic profile field.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_member', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.student_documents),
  'active owner must read their own document metadata'
);
WITH updated AS (
  UPDATE public.profiles
  SET full_name = 'Active profile update allowed'
  WHERE id = :'student_member'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM updated),
  'active user must update an allowed basic profile field'
);
RESET ROLE;

-- Suspend the same user as trusted server context, then prove the RLS boundary
-- hides private product data but keeps profile self-read available.
UPDATE public.profiles
SET account_status = 'suspended'::public.account_status
WHERE id = :'student_member'::UUID;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_member', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.profiles),
  'suspended user must retain profile self-read for authorization'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.student_documents),
  'suspended user must not read private document metadata'
);
DO $$
BEGIN
  BEGIN
    PERFORM public.get_my_lab_pdf_credit_balance();
    RAISE EXCEPTION 'suspended user unexpectedly read Lab credit balance';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'account_suspended' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    PERFORM public.get_shared_audit_summaries(
      (SELECT id FROM public.labs WHERE owner_professor_id = 'e9000000-0000-0000-0000-000000000003'::UUID),
      'e9000000-0000-0000-0000-000000000001'::UUID
    );
    RAISE EXCEPTION 'suspended user unexpectedly read shared audit summaries';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'account_suspended' THEN
      RAISE;
    END IF;
  END;
END;
$$;
WITH updated AS (
  UPDATE public.profiles
  SET full_name = 'Suspended profile update denied'
  WHERE id = :'student_member'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM updated),
  'suspended user must not update profile fields'
);
RESET ROLE;

-- Verify every new private policy contains the active-account gate and public
-- preview access remains deliberately separate.
SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM (VALUES
      ('public', 'leads', 'leads_select_active_owner_or_admin'),
      ('public', 'quiz_answers', 'quiz_answers_select_active_owner_or_admin'),
      ('public', 'ai_instruction_usages', 'ai_instruction_usages_select_active_owner_or_admin'),
      ('public', 'orders', 'orders_select_active_owner_or_admin'),
      ('public', 'payments', 'payments_select_active_owner_or_admin'),
      ('public', 'entitlements', 'entitlements_select_active_owner_or_admin'),
      ('public', 'course_access', 'course_access_select_active_owner_or_admin'),
      ('public', 'course_progress', 'course_progress_select_active_owner'),
      ('public', 'labs', 'labs_select_active_member_owner_or_admin'),
      ('public', 'lab_memberships', 'lab_memberships_select_active_scoped'),
      ('public', 'subscriptions', 'subscriptions_select_active_owner_or_admin'),
      ('public', 'subscription_items', 'subscription_items_select_active_owner_or_admin'),
      ('public', 'student_documents', 'student_documents_select_active_owner'),
      ('public', 'ai_audit_jobs', 'ai_audit_jobs_select_active_owner'),
      ('public', 'ai_audit_results', 'ai_audit_results_select_active_owner'),
      ('public', 'audit_summary_shares', 'audit_summary_shares_select_active_owner'),
      ('storage', 'objects', 'student_documents_storage_select_active_owner'),
      ('storage', 'objects', 'ai_audit_exports_storage_select_active_owner')
    ) AS expected(schema_name, table_name, policy_name)
    LEFT JOIN pg_policies AS policy
      ON policy.schemaname = expected.schema_name
      AND policy.tablename = expected.table_name
      AND policy.policyname = expected.policy_name
    WHERE policy.policyname IS NULL
      OR policy.qual NOT LIKE '%is_active_user%'
  ),
  'all suspended data-layer select policies must include is_active_user'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'course_lessons'
      AND policyname = 'course_lessons_select_public_preview'
      AND roles @> ARRAY['anon'::name]
  ),
  'public course preview policy must remain available to anonymous visitors'
);

ROLLBACK;
