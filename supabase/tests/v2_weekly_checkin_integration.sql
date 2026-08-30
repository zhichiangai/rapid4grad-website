\set ON_ERROR_STOP on
\set student '91000000-0000-0000-0000-000000000001'
\set professor '92000000-0000-0000-0000-000000000001'
\set subscription '94000000-0000-0000-0000-000000000001'

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
VALUES
  (:'student'::UUID, 'authenticated', 'authenticated', 'weekly-student@local.test', 'local-only', timezone('utc', now()), '{"provider":"email","providers":["email"]}'::JSONB, '{}'::JSONB, timezone('utc', now()), timezone('utc', now())),
  (:'professor'::UUID, 'authenticated', 'authenticated', 'weekly-professor@local.test', 'local-only', timezone('utc', now()), '{"provider":"email","providers":["email"]}'::JSONB, '{}'::JSONB, timezone('utc', now()), timezone('utc', now()));

UPDATE public.profiles SET role = 'professor' WHERE id = :'professor'::UUID;

SELECT public.create_professor_lab(:'professor'::UUID, 'Weekly QA Lab', 'Local') AS created_lab \gset
\set lab :created_lab

INSERT INTO public.subscriptions(
  id, lab_id, payer_user_id, product_id, provider, plan_key, status,
  billing_interval, current_period_start, current_period_end
)
VALUES (
  :'subscription'::UUID, :'lab'::UUID, :'professor'::UUID,
  (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
  'manual', 'professor_lab_standard', 'active', 'manual',
  timezone('utc', now()) - interval '1 day', timezone('utc', now()) + interval '30 days'
);

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
VALUES (:'lab'::UUID, :'student'::UUID, 'student', 'active');

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student', FALSE);
SELECT set_config('request.jwt.claim.role', 'authenticated', FALSE);

INSERT INTO public.weekly_updates(
  lab_id, student_user_id, week_start, completed_summary, blockers,
  next_plan, self_status, needs_professor_help
)
VALUES (:'lab'::UUID, :'student'::UUID, DATE '2026-08-24', '完成第一輪分析', NULL, '確認異常來源', 'on_track', 'none');

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.weekly_updates WHERE student_user_id = :'student'::UUID),
  'student can create one current weekly update'
);

UPDATE public.weekly_updates
SET completed_summary = '完成第一輪分析並補充圖表'
WHERE student_user_id = :'student'::UUID AND lab_id = :'lab'::UUID;

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 AND max(completed_summary) = '完成第一輪分析並補充圖表' FROM public.weekly_updates WHERE student_user_id = :'student'::UUID),
  'student can update the same weekly row without duplication'
);

RESET ROLE;
UPDATE public.lab_memberships
SET status = 'removed', removed_at = timezone('utc', now()),
    removed_by = :'professor'::UUID, removal_reason = 'weekly fixture'
WHERE lab_id = :'lab'::UUID AND user_id = :'student'::UUID;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor', FALSE);
SELECT set_config('request.jwt.claim.role', 'authenticated', FALSE);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.weekly_updates WHERE student_user_id = :'student'::UUID),
  'same-Lab professor can read student weekly history'
);

DO $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.weekly_updates SET completed_summary = 'forbidden' WHERE student_user_id = '91000000-0000-0000-0000-000000000001'::UUID;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'professor weekly update mutation unexpectedly succeeded';
  END IF;
END;
$$;

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student', FALSE);
SELECT set_config('request.jwt.claim.role', 'authenticated', FALSE);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.weekly_updates WHERE student_user_id = :'student'::UUID),
  'removed student retains historical read access'
);

DO $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.weekly_updates SET completed_summary = 'removed write' WHERE student_user_id = '91000000-0000-0000-0000-000000000001'::UUID;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'removed student mutation unexpectedly succeeded';
  END IF;
END;
$$;

RESET role;
SELECT 'V2 Weekly Check-in integration passed.' AS result;
