\set ON_ERROR_STOP on

-- Local-only disposable fixture. Run after `supabase db reset --local`.
\set personal_student '71000000-0000-0000-0000-000000000001'
\set lab_student '71000000-0000-0000-0000-000000000002'
\set readonly_student '71000000-0000-0000-0000-000000000003'
\set professor '72000000-0000-0000-0000-000000000001'
\set readonly_professor '72000000-0000-0000-0000-000000000002'
\set personal_meeting '73000000-0000-0000-0000-000000000001'
\set lab_meeting '73000000-0000-0000-0000-000000000002'
\set personal_action '74000000-0000-0000-0000-000000000001'

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
  (:'personal_student'::UUID, 'authenticated', 'authenticated', 'personal-student@local.test', 'local-only', timezone('utc', now()), '{}', '{}', timezone('utc', now()), timezone('utc', now())),
  (:'lab_student'::UUID, 'authenticated', 'authenticated', 'lab-student@local.test', 'local-only', timezone('utc', now()), '{}', '{}', timezone('utc', now()), timezone('utc', now())),
  (:'readonly_student'::UUID, 'authenticated', 'authenticated', 'readonly-student@local.test', 'local-only', timezone('utc', now()), '{}', '{}', timezone('utc', now()), timezone('utc', now())),
  (:'professor'::UUID, 'authenticated', 'authenticated', 'personal-lab-professor@local.test', 'local-only', timezone('utc', now()), '{}', '{}', timezone('utc', now()), timezone('utc', now())),
  (:'readonly_professor'::UUID, 'authenticated', 'authenticated', 'readonly-lab-professor@local.test', 'local-only', timezone('utc', now()), '{}', '{}', timezone('utc', now()), timezone('utc', now()));

UPDATE public.profiles
SET role = 'professor'::public.profile_role
WHERE id IN (:'professor'::UUID, :'readonly_professor'::UUID);

SELECT public.create_professor_lab(:'professor'::UUID, 'Personal Boundary QA Lab', 'Local') AS lab_id \gset
SELECT public.create_professor_lab(:'readonly_professor'::UUID, 'Read-only Boundary QA Lab', 'Local') AS readonly_lab_id \gset

INSERT INTO public.subscriptions(
  lab_id, payer_user_id, product_id, provider, plan_key, status,
  billing_interval, current_period_start, current_period_end
)
VALUES (
  :'lab_id'::UUID,
  :'professor'::UUID,
  (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
  'manual'::public.payment_provider,
  'professor_lab_standard'::public.professor_plan_key,
  'active'::public.subscription_status,
  'manual'::public.subscription_interval,
  timezone('utc', now()) - interval '1 day',
  timezone('utc', now()) + interval '30 days'
);

INSERT INTO public.subscriptions(
  lab_id, payer_user_id, product_id, provider, plan_key, status,
  billing_interval, current_period_start, current_period_end
)
VALUES (
  :'readonly_lab_id'::UUID,
  :'readonly_professor'::UUID,
  (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
  'manual'::public.payment_provider,
  'professor_lab_standard'::public.professor_plan_key,
  'active'::public.subscription_status,
  'manual'::public.subscription_interval,
  timezone('utc', now()) - interval '1 day',
  timezone('utc', now()) + interval '30 days'
);

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
VALUES
  (:'lab_id'::UUID, :'lab_student'::UUID, 'student', 'active'),
  (:'readonly_lab_id'::UUID, :'readonly_student'::UUID, 'student', 'active');

UPDATE public.subscriptions
SET status = 'past_due'::public.subscription_status,
    current_period_end = timezone('utc', now()) - interval '1 minute'
WHERE lab_id = :'readonly_lab_id'::UUID;

-- A student without a Lab can create all Personal records.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'personal_student', FALSE);
SELECT set_config('request.jwt.claim.role', 'authenticated', FALSE);

INSERT INTO public.weekly_updates(
  lab_id, student_user_id, week_start, completed_summary,
  next_plan, self_status, needs_professor_help
)
VALUES (NULL, :'personal_student'::UUID, DATE '2026-09-07', 'Personal progress', 'Personal next step', 'on_track', 'none');

INSERT INTO public.meetings(
  id, lab_id, student_user_id, meeting_at, status, summary, created_by
)
VALUES (:'personal_meeting'::UUID, NULL, :'personal_student'::UUID, timezone('utc', now()), 'completed', 'Personal meeting', :'personal_student'::UUID);

INSERT INTO public.meeting_actions(
  meeting_id, lab_id, student_user_id, title, owner_type,
  owner_user_id, status
)
VALUES (:'personal_meeting'::UUID, NULL, :'personal_student'::UUID, 'Personal next step', 'student', :'personal_student'::UUID, 'todo');

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.weekly_updates WHERE student_user_id = :'personal_student'::UUID AND lab_id IS NULL)
  AND (SELECT count(*) = 1 FROM public.meetings WHERE id = :'personal_meeting'::UUID AND lab_id IS NULL)
  AND (SELECT count(*) = 1 FROM public.meeting_actions WHERE meeting_id = :'personal_meeting'::UUID AND lab_id IS NULL),
  'no-Lab student can create Personal Weekly, Meeting and Action'
);

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'lab_student', FALSE);
SELECT set_config('request.jwt.claim.role', 'authenticated', FALSE);

INSERT INTO public.weekly_updates(
  lab_id, student_user_id, week_start, completed_summary,
  next_plan, self_status, needs_professor_help
)
VALUES (:'lab_id'::UUID, :'lab_student'::UUID, DATE '2026-09-07', 'Lab progress', 'Lab next step', 'on_track', 'none');

INSERT INTO public.meetings(
  id, lab_id, student_user_id, meeting_at, status, summary, created_by
)
VALUES (:'lab_meeting'::UUID, :'lab_id'::UUID, :'lab_student'::UUID, timezone('utc', now()), 'completed', 'Lab meeting', :'lab_student'::UUID);

-- Personal Action must not be able to point at a Lab Meeting.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.meeting_actions(
      meeting_id, lab_id, student_user_id, title, owner_type,
      owner_user_id, status
    )
    VALUES ('73000000-0000-0000-0000-000000000002'::UUID, NULL, '71000000-0000-0000-0000-000000000002'::UUID, 'Forged scope', 'student', '71000000-0000-0000-0000-000000000002'::UUID, 'todo');
    RAISE EXCEPTION 'scope mismatch unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'scope mismatch unexpectedly succeeded' THEN
      RAISE;
    END IF;
  END;
END;
$$;

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'readonly_student', FALSE);
SELECT set_config('request.jwt.claim.role', 'authenticated', FALSE);

INSERT INTO public.weekly_updates(
  lab_id, student_user_id, week_start, completed_summary,
  next_plan, self_status, needs_professor_help
)
VALUES (NULL, :'readonly_student'::UUID, DATE '2026-09-07', 'Read-only Lab Personal progress', 'Keep working personally', 'on_track', 'none');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.weekly_updates(
      lab_id, student_user_id, week_start, completed_summary,
      next_plan, self_status, needs_professor_help
    )
    VALUES ((SELECT lab_id FROM public.lab_memberships WHERE user_id = '71000000-0000-0000-0000-000000000003'::UUID AND status = 'active'), '71000000-0000-0000-0000-000000000003'::UUID, DATE '2026-09-14', 'Blocked Lab write', 'Blocked Lab next step', 'on_track', 'none');
    RAISE EXCEPTION 'read-only Lab write unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor', FALSE);
SELECT set_config('request.jwt.claim.role', 'authenticated', FALSE);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.weekly_updates WHERE student_user_id = :'personal_student'::UUID)
  AND (SELECT count(*) = 0 FROM public.meetings WHERE student_user_id = :'personal_student'::UUID)
  AND (SELECT count(*) = 0 FROM public.meeting_actions WHERE student_user_id = :'personal_student'::UUID),
  'professor cannot read another student Personal records'
);

RESET ROLE;
SELECT 'Student Personal + Lab collaboration integration passed.' AS result;
