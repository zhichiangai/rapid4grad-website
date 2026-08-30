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
\set weekly_b '64000000-0000-0000-0000-000000000002'
\set meeting_a '65000000-0000-0000-0000-000000000001'
\set meeting_b '65000000-0000-0000-0000-000000000002'
\set meeting_student '65000000-0000-0000-0000-000000000003'
\set meeting_upcoming '65000000-0000-0000-0000-000000000004'
\set action_student '66000000-0000-0000-0000-000000000001'
\set action_supervisor '66000000-0000-0000-0000-000000000002'
\set action_b '66000000-0000-0000-0000-000000000003'
\set action_student_created '66000000-0000-0000-0000-000000000004'

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
  next_plan, self_status, needs_professor_help
)
VALUES (
  :'weekly_b'::UUID,
  :'lab_b'::UUID,
  :'student_b'::UUID,
  DATE '2026-08-24',
  'Completed the Lab B fixture.',
  'Keep the Lab B boundary isolated.',
  'on_track',
  'none'
);

INSERT INTO public.meetings(
  id, lab_id, student_user_id, meeting_at, status, summary,
  decisions, created_by
)
VALUES (
  :'meeting_b'::UUID,
  :'lab_b'::UUID,
  :'student_b'::UUID,
  timezone('utc', now()) - interval '2 days',
  'completed',
  'Reviewed the Lab B fixture.',
  'Keep the Lab boundary explicit.',
  :'professor_b'::UUID
);

INSERT INTO public.meeting_actions(
  id, meeting_id, lab_id, student_user_id, title, owner_type,
  owner_user_id, due_date, status
)
VALUES (
  :'action_b'::UUID,
  :'meeting_b'::UUID,
  :'lab_b'::UUID,
  :'student_b'::UUID,
  'Review Lab B report',
  'supervisor',
  :'professor_b'::UUID,
  CURRENT_DATE + 7,
  'todo'
);

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

INSERT INTO public.meetings(
  id, lab_id, student_user_id, meeting_at, status, summary,
  decisions, created_by
)
VALUES (
  :'meeting_upcoming'::UUID,
  :'lab_a'::UUID,
  :'student_a'::UUID,
  timezone('utc', now()) + interval '7 days',
  'scheduled',
  NULL,
  NULL,
  :'professor_a'::UUID
);

SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public.weekly_updates', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.weekly_updates', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.weekly_updates', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.weekly_updates', 'DELETE')
  AND NOT has_table_privilege('anon', 'public.meetings', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.meetings', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.meetings', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.meetings', 'DELETE')
  AND NOT has_table_privilege('anon', 'public.meeting_actions', 'SELECT'),
  'anon must not have supervision table SELECT grants'
);

SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public.meeting_actions', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.meeting_actions', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.meeting_actions', 'DELETE'),
  'anon must not have supervision table write grants'
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
  (SELECT count(*) = 1 FROM public.meetings WHERE id = :'meeting_a'::UUID),
  'student must read own meeting history'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.meeting_actions
   WHERE id IN (:'action_student'::UUID, :'action_supervisor'::UUID)),
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

WITH inserted AS (
  INSERT INTO public.meetings(
    id, lab_id, student_user_id, meeting_at, status, created_by
  )
  VALUES (
    :'meeting_student'::UUID,
    :'lab_a'::UUID,
    :'student_a'::UUID,
    timezone('utc', now()) - interval '3 days',
    'completed',
    :'student_a'::UUID
  )
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM inserted),
  'active student must create own meeting'
);

WITH inserted AS (
  INSERT INTO public.meeting_actions(
    id, meeting_id, lab_id, student_user_id, title, owner_type,
    owner_user_id, due_date, status
  )
  VALUES (
    :'action_student_created'::UUID,
    :'meeting_student'::UUID,
    :'lab_a'::UUID,
    :'student_a'::UUID,
    'Student-owned action',
    'student',
    :'student_a'::UUID,
    CURRENT_DATE + 7,
    'todo'
  )
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM inserted),
  'active student must create own action'
);

WITH updated AS (
  UPDATE public.meetings
  SET summary = 'Student-created meeting updated'
  WHERE id = :'meeting_student'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM updated),
  'student must update own-created meeting'
);

WITH updated AS (
  UPDATE public.meeting_actions
  SET status = 'done', completed_at = timezone('utc', now())
  WHERE id = :'action_student_created'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM updated),
  'student must update own action'
);

DO $$
BEGIN
  BEGIN
    UPDATE public.meeting_actions
    SET status = 'done', completed_at = timezone('utc', now())
    WHERE id = '66000000-0000-0000-0000-000000000002'::UUID;
    IF FOUND THEN
      RAISE EXCEPTION 'student updated supervisor action unexpectedly';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

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
  (SELECT count(*) = 3 FROM public.meetings WHERE lab_id = :'lab_a'::UUID),
  format('same-Lab professor must read meetings; actual=%s',
    (SELECT count(*) FROM public.meetings WHERE lab_id = :'lab_a'::UUID))
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

WITH inserted AS (
  INSERT INTO public.meeting_actions(
    meeting_id, lab_id, student_user_id, title, owner_type,
    owner_user_id, due_date, status
  )
  VALUES (
    :'meeting_a'::UUID,
    :'lab_a'::UUID,
    :'student_a'::UUID,
    'Professor assignment for student',
    'student',
    :'student_a'::UUID,
    CURRENT_DATE + 7,
    'todo'
  )
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM inserted),
  'professor must create a student-owned action'
);

WITH inserted AS (
  INSERT INTO public.meeting_actions(
    meeting_id, lab_id, student_user_id, title, owner_type,
    owner_user_id, due_date, status
  )
  VALUES (
    :'meeting_a'::UUID,
    :'lab_a'::UUID,
    :'student_a'::UUID,
    'Professor-owned supervision action',
    'supervisor',
    :'professor_a'::UUID,
    CURRENT_DATE + 7,
    'todo'
  )
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM inserted),
  'professor must create a supervisor-owned action'
);

WITH inserted AS (
  INSERT INTO public.meeting_actions(
    meeting_id, lab_id, student_user_id, title, owner_type,
    owner_user_id, due_date, status
  )
  VALUES (
    :'meeting_a'::UUID,
    :'lab_a'::UUID,
    :'student_a'::UUID,
    'Assistant-owned supervision action',
    'supervisor',
    :'assistant_a'::UUID,
    CURRENT_DATE + 7,
    'todo'
  )
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM inserted),
  'professor must create an assistant-owned action'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.meeting_actions(
      meeting_id, lab_id, student_user_id, title, owner_type,
      owner_user_id, due_date, status
    )
    VALUES (
      '65000000-0000-0000-0000-000000000001'::UUID,
      '00000000-0000-0000-0000-000000000002'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      'Cross-Lab owner attack',
      'supervisor',
      '62000000-0000-0000-0000-000000000002'::UUID,
      CURRENT_DATE + 7,
      'todo'
    );
    RAISE EXCEPTION 'cross-Lab supervisor owner unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

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
  (SELECT count(*) = 0 FROM public.weekly_updates WHERE lab_id = :'lab_a'::UUID)
  AND (SELECT count(*) = 0 FROM public.meetings WHERE lab_id = :'lab_a'::UUID)
  AND (SELECT count(*) = 0 FROM public.meeting_actions WHERE lab_id = :'lab_a'::UUID),
  'cross-Lab professor must not read Lab A data'
);

RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT :'lab_a'::UUID <> :'lab_b'::UUID)
  AND (SELECT lab_id = :'lab_a'::UUID FROM public.meetings
       WHERE id = :'meeting_a'::UUID),
  'cross-Lab fixture must use distinct Lab A and Lab B records'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_b', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);

WITH attempted AS (
  UPDATE public.meetings
  SET summary = 'Cross-Lab update must fail'
  WHERE id = :'meeting_a'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM attempted),
  'cross-Lab professor must not update Lab A meeting'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.meetings(
      lab_id, student_user_id, meeting_at, status, created_by
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      timezone('utc', now()), 'scheduled',
      '62000000-0000-0000-0000-000000000002'::UUID
    );
    RAISE EXCEPTION 'cross-Lab meeting insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.meeting_actions(
      meeting_id, lab_id, student_user_id, title, owner_type,
      owner_user_id, status
    )
    VALUES (
      '65000000-0000-0000-0000-000000000001'::UUID,
      '00000000-0000-0000-0000-000000000001'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      'Cross-Lab action insert', 'supervisor',
      '62000000-0000-0000-0000-000000000002'::UUID, 'todo'
    );
    RAISE EXCEPTION 'cross-Lab action insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
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
SELECT pg_temp.assert_true(
  (SELECT count(*) = 4 FROM public.meetings WHERE student_user_id = :'student_a'::UUID),
  format('removed student must retain own meeting history; actual=%s',
    (SELECT count(*) FROM public.meetings WHERE student_user_id = :'student_a'::UUID))
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 6 FROM public.meeting_actions WHERE student_user_id = :'student_a'::UUID),
  format('removed student must retain own action history; actual=%s',
    (SELECT count(*) FROM public.meeting_actions WHERE student_user_id = :'student_a'::UUID))
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

WITH attempted AS (
  UPDATE public.meetings
  SET summary = 'Removed student meeting must fail'
  WHERE id = :'meeting_a'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM attempted),
  'removed student must not update meetings'
);

WITH attempted AS (
  UPDATE public.meeting_actions
  SET status = 'doing'
  WHERE id = :'action_student'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM attempted),
  'removed student must not update actions'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.weekly_updates(
      lab_id, student_user_id, week_start, completed_summary,
      next_plan, self_status, needs_professor_help
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      DATE '2026-09-07', 'Removed student insert', 'Must fail',
      'on_track', 'none'
    );
    RAISE EXCEPTION 'removed student weekly insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.meetings(
      lab_id, student_user_id, meeting_at, status, created_by
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      timezone('utc', now()), 'scheduled',
      '61000000-0000-0000-0000-000000000001'::UUID
    );
    RAISE EXCEPTION 'removed student meeting insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.meeting_actions(
      meeting_id, lab_id, student_user_id, title, owner_type,
      owner_user_id, status
    )
    VALUES (
      '65000000-0000-0000-0000-000000000001'::UUID,
      '00000000-0000-0000-0000-000000000001'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      'Removed student action insert', 'student',
      '61000000-0000-0000-0000-000000000001'::UUID, 'todo'
    );
    RAISE EXCEPTION 'removed student action insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
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
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.meetings)
  AND (SELECT count(*) = 0 FROM public.meeting_actions),
  'removed assistant must lose all supervision reads'
);
WITH attempted AS (
  UPDATE public.meetings
  SET summary = 'Removed assistant meeting must fail'
  WHERE id = :'meeting_a'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM attempted),
  'removed assistant must not update meetings'
);
WITH attempted AS (
  UPDATE public.meeting_actions
  SET status = 'doing'
  WHERE id = :'action_supervisor'::UUID
  RETURNING id
)
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM attempted),
  'removed assistant must not update actions'
);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.meeting_actions(
      meeting_id, lab_id, student_user_id, title, owner_type,
      owner_user_id, status
    )
    VALUES (
      '65000000-0000-0000-0000-000000000001'::UUID,
      '00000000-0000-0000-0000-000000000001'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      'Removed assistant action insert', 'supervisor',
      '62000000-0000-0000-0000-000000000003'::UUID, 'todo'
    );
    RAISE EXCEPTION 'removed assistant action insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

-- Suspended accounts are denied by the shared active-account helper.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_b', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.weekly_updates)
  AND (SELECT count(*) = 1 FROM public.meetings)
  AND (SELECT count(*) = 1 FROM public.meeting_actions),
  'active student B must read existing Lab B history'
);
RESET ROLE;

UPDATE public.profiles
SET account_status = 'suspended'::public.account_status
WHERE id = :'student_b'::UUID;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_b', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.weekly_updates)
  AND (SELECT count(*) = 0 FROM public.meetings)
  AND (SELECT count(*) = 0 FROM public.meeting_actions),
  'suspended student must not read supervision data'
);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.meeting_actions(
      meeting_id, lab_id, student_user_id, title, owner_type,
      owner_user_id, status
    )
    VALUES (
      '65000000-0000-0000-0000-000000000002'::UUID,
      '00000000-0000-0000-0000-000000000002'::UUID,
      '61000000-0000-0000-0000-000000000002'::UUID,
      'Suspended student action insert', 'student',
      '61000000-0000-0000-0000-000000000002'::UUID, 'todo'
    );
    RAISE EXCEPTION 'suspended student action insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.meetings
    SET summary = 'Suspended student meeting update must fail'
    WHERE id = '65000000-0000-0000-0000-000000000002'::UUID;
    IF FOUND THEN RAISE EXCEPTION 'suspended student meeting update unexpectedly succeeded'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.meeting_actions
    SET status = 'doing'
    WHERE id = '66000000-0000-0000-0000-000000000003'::UUID;
    IF FOUND THEN RAISE EXCEPTION 'suspended student action update unexpectedly succeeded'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
DO $$
BEGIN
  BEGIN
    UPDATE public.weekly_updates
    SET completed_summary = 'Suspended student update must fail'
    WHERE id = '64000000-0000-0000-0000-000000000002'::UUID;
    IF FOUND THEN
      RAISE EXCEPTION 'suspended student weekly update unexpectedly succeeded';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    INSERT INTO public.meetings(
      lab_id, student_user_id, meeting_at, status, created_by
    )
    VALUES (
      '00000000-0000-0000-0000-000000000002'::UUID,
      '61000000-0000-0000-0000-000000000002'::UUID,
      timezone('utc', now()), 'scheduled',
      '61000000-0000-0000-0000-000000000002'::UUID
    );
    RAISE EXCEPTION 'suspended student meeting insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
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

-- Restore the local accounts and memberships before integrity and Lab-state tests.
UPDATE public.profiles
SET account_status = 'active'::public.account_status
WHERE id IN (:'student_b'::UUID, :'professor_a'::UUID);

UPDATE public.lab_memberships
SET status = 'active'::public.lab_membership_status
  , removed_at = NULL
  , removed_by = NULL
  , removal_reason = NULL
WHERE lab_id = :'lab_a'::UUID AND user_id = :'student_a'::UUID;

UPDATE public.lab_memberships
SET status = 'active'::public.lab_membership_status
  , removed_at = NULL
  , removed_by = NULL
  , removal_reason = NULL
WHERE lab_id = :'lab_a'::UUID AND user_id = :'assistant_a'::UUID;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.weekly_updates WHERE lab_id = :'lab_a'::UUID)
  AND (SELECT count(*) = 4 FROM public.meetings WHERE lab_id = :'lab_a'::UUID)
  AND (SELECT count(*) = 6 FROM public.meeting_actions WHERE lab_id = :'lab_a'::UUID),
  'active professor must read Lab A supervision data'
);
SELECT pg_temp.assert_true(
  (
    SELECT id = :'meeting_upcoming'::UUID
    FROM public.meetings
    WHERE lab_id = :'lab_a'::UUID
      AND student_user_id = :'student_a'::UUID
      AND status = 'scheduled'
      AND meeting_at > timezone('utc', now())
    ORDER BY meeting_at
    LIMIT 1
  ),
  'canonical upcoming meeting must come from scheduled meeting rows'
);
RESET ROLE;

UPDATE public.profiles
SET account_status = 'suspended'::public.account_status
WHERE id = :'professor_a'::UUID;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.weekly_updates WHERE lab_id = :'lab_a'::UUID)
  AND (SELECT count(*) = 0 FROM public.meetings WHERE lab_id = :'lab_a'::UUID)
  AND (SELECT count(*) = 0 FROM public.meeting_actions WHERE lab_id = :'lab_a'::UUID),
  'suspended professor must lose Lab A supervision reads'
);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.meetings(
      lab_id, student_user_id, meeting_at, status, created_by
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      timezone('utc', now()), 'scheduled',
      '62000000-0000-0000-0000-000000000001'::UUID
    );
    RAISE EXCEPTION 'suspended professor meeting insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    UPDATE public.meeting_actions
    SET status = 'doing'
    WHERE id = '66000000-0000-0000-0000-000000000002'::UUID;
    IF FOUND THEN
      RAISE EXCEPTION 'suspended professor action update unexpectedly succeeded';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    INSERT INTO public.meeting_actions(
      meeting_id, lab_id, student_user_id, title, owner_type,
      owner_user_id, status
    )
    VALUES (
      '65000000-0000-0000-0000-000000000001'::UUID,
      '00000000-0000-0000-0000-000000000001'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      'Suspended professor action insert', 'supervisor',
      '62000000-0000-0000-0000-000000000001'::UUID, 'todo'
    );
    RAISE EXCEPTION 'suspended professor action insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
RESET ROLE;

UPDATE public.profiles
SET account_status = 'active'::public.account_status
WHERE id = :'professor_a'::UUID;

-- Archived Labs retain history reads but block every new supervision mutation.
UPDATE public.labs
SET status = 'archived'::public.lab_status,
    archived_at = timezone('utc', now())
WHERE id = :'lab_a'::UUID;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.weekly_updates(
      lab_id, student_user_id, week_start, completed_summary,
      next_plan, self_status, needs_professor_help
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      DATE '2026-09-07', 'Archived Lab write', 'Must fail',
      'on_track', 'none'
    );
    RAISE EXCEPTION 'archived Lab weekly insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.weekly_updates
    SET completed_summary = 'Archived Lab update must fail'
    WHERE id = '64000000-0000-0000-0000-000000000001'::UUID;
    IF FOUND THEN
      RAISE EXCEPTION 'archived Lab weekly update unexpectedly succeeded';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.meetings(
      lab_id, student_user_id, meeting_at, status, created_by
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      timezone('utc', now()), 'scheduled',
      '62000000-0000-0000-0000-000000000001'::UUID
    );
    RAISE EXCEPTION 'archived Lab professor meeting insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.meetings
    SET summary = 'Archived Lab meeting update must fail'
    WHERE id = '65000000-0000-0000-0000-000000000001'::UUID;
    IF FOUND THEN
      RAISE EXCEPTION 'archived Lab professor meeting update unexpectedly succeeded';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'assistant_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.meeting_actions(
      meeting_id, lab_id, student_user_id, title, owner_type,
      owner_user_id, status
    )
    VALUES (
      '65000000-0000-0000-0000-000000000001'::UUID,
      '00000000-0000-0000-0000-000000000001'::UUID,
      '61000000-0000-0000-0000-000000000001'::UUID,
      'Archived Lab assistant action', 'supervisor',
      '62000000-0000-0000-0000-000000000003'::UUID, 'todo'
    );
    RAISE EXCEPTION 'archived Lab assistant action unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

UPDATE public.labs
SET status = 'active'::public.lab_status, archived_at = NULL
WHERE id = :'lab_a'::UUID;

-- Restore the active Lab A student for direct integrity and subscription checks.

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
    IF NOT FOUND THEN RAISE EXCEPTION 'weekly Lab update was not executed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'weekly_update_identity_immutable' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE public.weekly_updates
    SET student_user_id = '61000000-0000-0000-0000-000000000002'::UUID
    WHERE id = '64000000-0000-0000-0000-000000000001'::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'weekly student update was not executed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'weekly_update_identity_immutable' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.weekly_updates
    SET week_start = DATE '2026-08-31'
    WHERE id = '64000000-0000-0000-0000-000000000001'::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'weekly week update was not executed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'weekly_update_identity_immutable' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.meetings
    SET created_by = '61000000-0000-0000-0000-000000000001'::UUID
    WHERE id = '65000000-0000-0000-0000-000000000001'::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'meeting creator update was not executed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'meeting_identity_immutable' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE public.meetings
    SET lab_id = '00000000-0000-0000-0000-000000000002'::UUID
    WHERE id = '65000000-0000-0000-0000-000000000001'::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'meeting Lab update was not executed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'meeting_identity_immutable' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.meetings
    SET student_user_id = '61000000-0000-0000-0000-000000000002'::UUID
    WHERE id = '65000000-0000-0000-0000-000000000001'::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'meeting student update was not executed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'meeting_identity_immutable' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.meeting_actions
    SET owner_user_id = '61000000-0000-0000-0000-000000000001'::UUID
    WHERE id = '66000000-0000-0000-0000-000000000002'::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'action owner update was not executed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'meeting_action_identity_immutable' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE public.meeting_actions
    SET meeting_id = '65000000-0000-0000-0000-000000000002'::UUID
    WHERE id = '66000000-0000-0000-0000-000000000002'::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'action meeting update was not executed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'meeting_action_identity_immutable' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.meeting_actions
    SET lab_id = '00000000-0000-0000-0000-000000000002'::UUID
    WHERE id = '66000000-0000-0000-0000-000000000002'::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'action Lab update was not executed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'meeting_action_identity_immutable' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.meeting_actions
    SET student_user_id = '61000000-0000-0000-0000-000000000002'::UUID
    WHERE id = '66000000-0000-0000-0000-000000000002'::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'action student update was not executed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'meeting_action_identity_immutable' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.meeting_actions
    SET owner_type = 'student'
    WHERE id = '66000000-0000-0000-0000-000000000002'::UUID;
    IF NOT FOUND THEN RAISE EXCEPTION 'action type update was not executed'; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'meeting_action_identity_immutable' THEN RAISE; END IF;
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
