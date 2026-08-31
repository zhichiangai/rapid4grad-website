\set ON_ERROR_STOP on
\set student_a '91000000-0000-0000-0000-000000000001'
\set student_b '91000000-0000-0000-0000-000000000002'
\set professor_a '92000000-0000-0000-0000-000000000001'
\set admin_a '93000000-0000-0000-0000-000000000001'

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
  (:'student_a'::UUID, 'authenticated', 'authenticated', 'thesis-a@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', now(), now()),
  (:'student_b'::UUID, 'authenticated', 'authenticated', 'thesis-b@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', now(), now()),
  (:'professor_a'::UUID, 'authenticated', 'authenticated', 'thesis-professor@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', now(), now()),
  (:'admin_a'::UUID, 'authenticated', 'authenticated', 'thesis-admin@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', now(), now());

UPDATE public.profiles SET role = 'professor' WHERE id = :'professor_a'::UUID;
UPDATE public.profiles SET role = 'admin' WHERE id = :'admin_a'::UUID;

SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated', 'public.thesis_milestones', 'DELETE'),
  'authenticated must not have thesis milestone delete privilege'
);
SELECT pg_temp.assert_true(
  NOT has_column_privilege('authenticated', 'public.thesis_milestones', 'student_user_id', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'public.thesis_milestones', 'milestone_key', 'UPDATE')
  AND has_column_privilege('authenticated', 'public.thesis_milestones', 'status', 'UPDATE'),
  'identity columns must be immutable while progress fields remain editable'
);

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);

INSERT INTO public.thesis_milestones(student_user_id, milestone_key, status, note)
VALUES (:'student_a'::UUID, 'research_direction', 'completed', 'local-only note');

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.thesis_milestones),
  'student can insert own milestone'
);
SELECT pg_temp.assert_true(
  (SELECT completed_at IS NOT NULL FROM public.thesis_milestones),
  'completed_at is derived by the database trigger'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.thesis_milestones WHERE student_user_id = :'student_b'::UUID),
  'student cannot read another student milestone'
);

UPDATE public.thesis_milestones
SET status = 'in_progress', target_date = current_date + 14, note = 'updated locally'
WHERE student_user_id = :'student_a'::UUID AND milestone_key = 'research_direction';
SELECT pg_temp.assert_true(
  (SELECT status = 'in_progress' AND completed_at IS NULL FROM public.thesis_milestones),
  'student can update safe fields and completed_at clears'
);

DO $$
BEGIN
  BEGIN
    UPDATE public.thesis_milestones SET student_user_id = '91000000-0000-0000-0000-000000000002'::UUID;
    RAISE EXCEPTION 'identity update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.thesis_milestones), 'professor must not read private thesis progress');
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'admin_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.thesis_milestones), 'admin must not receive automatic thesis progress access');
ROLLBACK;

SELECT 'v2 thesis progress integration passed' AS result;
