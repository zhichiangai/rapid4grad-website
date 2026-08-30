\set ON_ERROR_STOP on

-- Local-only, disposable integration fixture for the Professor Data Foundation.
-- Every fixture row is rolled back before the script exits.
\set student_a '61000000-0000-0000-0000-000000000001'
\set student_b '61000000-0000-0000-0000-000000000002'
\set professor_a '62000000-0000-0000-0000-000000000001'
\set professor_b '62000000-0000-0000-0000-000000000002'
\set assistant_a '62000000-0000-0000-0000-000000000003'
\set admin_user '63000000-0000-0000-0000-000000000001'
\set weekly_a '64000000-0000-0000-0000-000000000001'
\set meeting_a '65000000-0000-0000-0000-000000000001'
\set action_student '66000000-0000-0000-0000-000000000001'
\set action_supervisor '66000000-0000-0000-0000-000000000002'

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
VALUES
  (:'student_a'::UUID, 'authenticated', 'authenticated', 'supervision-student-a@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', timezone('utc', now()), timezone('utc', now())),
  (:'student_b'::UUID, 'authenticated', 'authenticated', 'supervision-student-b@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', timezone('utc', now()), timezone('utc', now())),
  (:'professor_a'::UUID, 'authenticated', 'authenticated', 'supervision-professor-a@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', timezone('utc', now()), timezone('utc', now())),
  (:'professor_b'::UUID, 'authenticated', 'authenticated', 'supervision-professor-b@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', timezone('utc', now()), timezone('utc', now())),
  (:'assistant_a'::UUID, 'authenticated', 'authenticated', 'supervision-assistant-a@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', timezone('utc', now()), timezone('utc', now())),
  (:'admin_user'::UUID, 'authenticated', 'authenticated', 'supervision-admin@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', timezone('utc', now()), timezone('utc', now()));

UPDATE public.profiles
SET role = 'professor'::public.profile_role
WHERE id IN (:'professor_a'::UUID, :'professor_b'::UUID, :'assistant_a'::UUID);

UPDATE public.profiles
SET role = 'admin'::public.profile_role
WHERE id = :'admin_user'::UUID;

SELECT public.create_professor_lab(
  :'professor_a'::UUID,
  'Supervision Lab A',
  'Local University'
) AS lab_a \gset

SELECT public.create_professor_lab(
  :'professor_b'::UUID,
  'Supervision Lab B',
  'Local University'
) AS lab_b \gset

INSERT INTO public.subscriptions(
  lab_id, payer_user_id, product_id, provider, plan_key, status,
  billing_interval, current_period_start, current_period_end
)
VALUES (
  :'lab_a'::UUID,
  :'professor_a'::UUID,
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
  :'lab_b'::UUID,
  :'professor_b'::UUID,
  (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
  'manual'::public.payment_provider,
  'professor_lab_standard'::public.professor_plan_key,
  'active'::public.subscription_status,
  'manual'::public.subscription_interval,
  timezone('utc', now()) - interval '1 day',
  timezone('utc', now()) + interval '30 days'
);

SELECT pg_temp.assert_true(
  app_private.has_active_lab_subscription(:'lab_a'::UUID),
  'Lab A subscription must be functional before member fixtures'
);

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
VALUES (:'lab_a'::UUID, :'student_a'::UUID, 'student', 'active');

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
VALUES (:'lab_a'::UUID, :'assistant_a'::UUID, 'assistant', 'active');

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
VALUES (:'lab_b'::UUID, :'student_b'::UUID, 'student', 'active');

INSERT INTO public.weekly_updates(
  id, lab_id, student_user_id, week_start, completed_summary,
  blockers, next_plan, self_status, needs_professor_help
)
VALUES (
  :'weekly_a'::UUID,
  :'lab_a'::UUID,
  :'student_a'::UUID,
  DATE '2026-08-24',
  'Completed the local security fixture.',
  NULL,
  'Run the browser regression.',
  'on_track',
  'none'
);

INSERT INTO public.meetings(
  id, lab_id, student_user_id, meeting_at, status, summary,
  decisions, next_meeting_at, created_by
)
VALUES (
  :'meeting_a'::UUID,
  :'lab_a'::UUID,
  :'student_a'::UUID,
  timezone('utc', now()) - interval '1 day',
  'completed',
  'Reviewed the security fixture.',
  'Keep the Lab boundary explicit.',
  timezone('utc', now()) + interval '7 days',
  :'professor_a'::UUID
);

INSERT INTO public.meeting_actions(
  id, meeting_id, lab_id, student_user_id, title, owner_type,
  owner_user_id, due_date, status, completed_at
)
VALUES
  (
    :'action_student'::UUID,
    :'meeting_a'::UUID,
    :'lab_a'::UUID,
    :'student_a'::UUID,
    'Run local regression',
    'student',
    :'student_a'::UUID,
    CURRENT_DATE + 7,
    'todo',
    NULL
  ),
  (
    :'action_supervisor'::UUID,
    :'meeting_a'::UUID,
    :'lab_a'::UUID,
    :'student_a'::UUID,
    'Review test report',
    'supervisor',
    :'professor_a'::UUID,
    CURRENT_DATE + 7,
    'done',
    timezone('utc', now())
  );

SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public.weekly_updates', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.meetings', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.meeting_actions', 'SELECT'),
  'anon must not have supervision table SELECT grants'
);

SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated', 'public.weekly_updates', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.meetings', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.meeting_actions', 'DELETE'),
  'authenticated must not have supervision table DELETE grants'
);

SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claim.sub', :'student_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.weekly_updates),
  'student must read own weekly update'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.weekly_updates WHERE student_user_id = :'student_b'::UUID),
  'student must not read another student weekly update'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.meetings),
  'student must read own meeting history'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.meeting_actions),
  'student must read own meeting actions'
);

WITH updated AS (
  UPDATE public.weekly_updates
  SET completed_summary = 'Student update allowed'
  WHERE id = :'weekly_a'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM updated),
  'active student must update own weekly update'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.weekly_updates
   WHERE id = :'weekly_a'::UUID AND lab_id = :'lab_b'::UUID),
  'student scope update must not change Lab identity'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.weekly_updates),
  'same-Lab professor must read weekly updates'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.meetings),
  'same-Lab professor must read meetings'
);

WITH attempted AS (
  UPDATE public.weekly_updates
  SET completed_summary = 'Professor must not edit student update'
  WHERE id = :'weekly_a'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM attempted),
  'professor must not update weekly updates'
);

WITH inserted AS (
  INSERT INTO public.meetings(
    lab_id, student_user_id, meeting_at, status, created_by
  )
  VALUES (
    :'lab_a'::UUID, :'student_a'::UUID, timezone('utc', now()),
    'scheduled', :'professor_a'::UUID
  )
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM inserted),
  'functional same-Lab professor must create a meeting'
);

RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'assistant_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.weekly_updates),
  'active same-Lab assistant must read weekly updates'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_b', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.weekly_updates),
  'cross-Lab professor must not read Lab A data'
);
RESET ROLE;

-- Removed students retain active-account own history but lose all mutations.
UPDATE public.lab_memberships
SET status = 'removed'::public.lab_membership_status
  , removed_at = timezone('utc', now())
  , removed_by = :'professor_a'::UUID
  , removal_reason = 'Local historical access test'
WHERE lab_id = :'lab_a'::UUID AND user_id = :'student_a'::UUID;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.weekly_updates),
  'removed student must retain own weekly history'
);
WITH attempted AS (
  UPDATE public.weekly_updates
  SET completed_summary = 'Removed student update must fail'
  WHERE id = :'weekly_a'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM attempted),
  'removed student must not update history'
);
RESET ROLE;

UPDATE public.lab_memberships
SET status = 'removed'::public.lab_membership_status
  , removed_at = timezone('utc', now())
  , removed_by = :'professor_a'::UUID
  , removal_reason = 'Local supervisor access test'
WHERE lab_id = :'lab_a'::UUID AND user_id = :'assistant_a'::UUID;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'assistant_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.weekly_updates),
  'removed assistant must lose Lab reads'
);
RESET ROLE;

-- Suspended accounts are denied by the shared active-account helper.
UPDATE public.profiles
SET account_status = 'suspended'::public.account_status
WHERE id = :'student_b'::UUID;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_b', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.weekly_updates),
  'suspended student must not read supervision data'
);
RESET ROLE;

-- Admin does not automatically receive new supervision access.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'admin_user', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.weekly_updates)
  AND (SELECT count(*) = 0 FROM public.meetings)
  AND (SELECT count(*) = 0 FROM public.meeting_actions),
  'admin must not automatically read supervision tables'
);
RESET ROLE;

-- Restore the active Lab A student for direct integrity and subscription checks.
UPDATE public.lab_memberships
SET status = 'active'::public.lab_membership_status
  , removed_at = NULL
  , removed_by = NULL
  , removal_reason = NULL
WHERE lab_id = :'lab_a'::UUID AND user_id = :'student_a'::UUID;

DO $$
DECLARE
  lab_a_id UUID;
BEGIN
  SELECT id INTO lab_a_id
  FROM public.labs
  WHERE owner_professor_id = '62000000-0000-0000-0000-000000000001'::UUID;

  BEGIN
    UPDATE public.weekly_updates
    SET lab_id = '00000000-0000-0000-0000-000000000000'::UUID
    WHERE id = '64000000-0000-0000-0000-000000000001'::UUID;
    RAISE EXCEPTION 'weekly Lab identity unexpectedly changed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'weekly_update_identity_immutable' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE public.meetings
    SET created_by = '61000000-0000-0000-0000-000000000001'::UUID
    WHERE id = '65000000-0000-0000-0000-000000000001'::UUID;
    RAISE EXCEPTION 'meeting creator unexpectedly changed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'meeting_identity_immutable' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE public.meeting_actions
    SET owner_user_id = '61000000-0000-0000-0000-000000000001'::UUID
    WHERE id = '66000000-0000-0000-0000-000000000002'::UUID;
    RAISE EXCEPTION 'action owner unexpectedly changed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'meeting_action_identity_immutable' THEN
      RAISE;
    END IF;
  END;
END;
$$;

DO $$
DECLARE
  lab_a_id UUID;
BEGIN
  SELECT id INTO lab_a_id
  FROM public.labs
  WHERE owner_professor_id = '62000000-0000-0000-0000-000000000001'::UUID;

  BEGIN
    INSERT INTO public.meeting_actions(
      meeting_id, lab_id, student_user_id, title, owner_type,
      owner_user_id, status
    )
    VALUES (
      '65000000-0000-0000-0000-000000000001'::UUID,
      lab_a_id,
      '61000000-0000-0000-0000-000000000002'::UUID,
      'Composite scope attack', 'student',
      '61000000-0000-0000-0000-000000000002'::UUID, 'todo'
    );
    RAISE EXCEPTION 'composite scope attack unexpectedly succeeded';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.meeting_actions(
      meeting_id, lab_id, student_user_id, title, owner_type,
      owner_user_id, status
    )
    VALUES (
      '65000000-0000-0000-0000-000000000001'::UUID,
      lab_a_id,
      '61000000-0000-0000-0000-000000000001'::UUID,
      'Owner mismatch', 'student',
      '62000000-0000-0000-0000-000000000001'::UUID, 'todo'
    );
    RAISE EXCEPTION 'student owner mismatch unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.weekly_updates(
      lab_id, student_user_id, week_start, completed_summary,
      next_plan, self_status, needs_professor_help
    )
    VALUES (
      lab_a_id,
      '61000000-0000-0000-0000-000000000001'::UUID, DATE '2026-08-25',
      'Tuesday is invalid', 'Invalid week', 'on_track', 'none'
    );
    RAISE EXCEPTION 'non-Monday update unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.meeting_actions(
      meeting_id, lab_id, student_user_id, title, owner_type,
      owner_user_id, status, completed_at
    )
    VALUES (
      '65000000-0000-0000-0000-000000000001'::UUID,
      lab_a_id,
      '61000000-0000-0000-0000-000000000001'::UUID,
      'Completion mismatch', 'student',
      '61000000-0000-0000-0000-000000000001'::UUID, 'done', NULL
    );
    RAISE EXCEPTION 'completion mismatch unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END;
$$;

-- Expired subscription keeps authorized history readable but blocks new writes.
UPDATE public.subscriptions
SET current_period_end = timezone('utc', now()) - interval '1 minute'
WHERE lab_id = :'lab_a'::UUID;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.weekly_updates),
  'read-only subscription must retain authorized history'
);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.meetings(
      lab_id, student_user_id, meeting_at, status, created_by
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      timezone('utc', now()),
      'scheduled',
      '62000000-0000-0000-0000-000000000001'::UUID
    );
    RAISE EXCEPTION 'read-only subscription unexpectedly allowed a new meeting';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

ROLLBACK;

SELECT 'V2 Professor data foundation integration passed.' AS result;
