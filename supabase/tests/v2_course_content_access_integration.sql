\set ON_ERROR_STOP on
\set free_student 'a1000000-0000-0000-0000-000000000001'
\set lab_student 'a1000000-0000-0000-0000-000000000002'
\set full_student 'a1000000-0000-0000-0000-000000000003'
\set expired_student 'a1000000-0000-0000-0000-000000000004'
\set professor_one 'a2000000-0000-0000-0000-000000000001'
\set professor_expired 'a2000000-0000-0000-0000-000000000002'
\set assistant_one 'a2000000-0000-0000-0000-000000000003'
\set admin_one 'a3000000-0000-0000-0000-000000000001'

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
    (:'free_student'::UUID, 'course-free@local.test', 'Free Student'),
    (:'lab_student'::UUID, 'course-lab@local.test', 'Lab Student'),
    (:'full_student'::UUID, 'course-full@local.test', 'Full Student'),
    (:'expired_student'::UUID, 'course-expired@local.test', 'Expired Student'),
    (:'professor_one'::UUID, 'course-professor@local.test', 'Professor One'),
    (:'professor_expired'::UUID, 'course-professor-expired@local.test', 'Professor Expired'),
    (:'assistant_one'::UUID, 'course-assistant@local.test', 'Assistant One'),
    (:'admin_one'::UUID, 'course-admin@local.test', 'Admin One')
) AS fixture(id, email, name);

UPDATE public.profiles
SET role = 'professor'::public.profile_role
WHERE id IN (
  :'professor_one'::UUID,
  :'professor_expired'::UUID,
  :'assistant_one'::UUID
);

UPDATE public.profiles
SET role = 'admin'::public.profile_role
WHERE id = :'admin_one'::UUID;

SELECT public.create_professor_lab(
  :'professor_one'::UUID,
  'Course Active Lab',
  'Local University'
) AS active_lab \gset

SELECT public.create_professor_lab(
  :'professor_expired'::UUID,
  'Course Expired Lab',
  'Local University'
) AS expired_lab \gset

INSERT INTO public.subscriptions(
  lab_id,
  payer_user_id,
  product_id,
  provider,
  plan_key,
  status,
  billing_interval,
  current_period_start,
  current_period_end
)
VALUES
  (
    :'active_lab'::UUID,
    :'professor_one'::UUID,
    (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
    'manual',
    'professor_lab_standard',
    'active',
    'manual',
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '30 days'
  ),
  (
    :'expired_lab'::UUID,
    :'professor_expired'::UUID,
    (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
    'manual',
    'professor_lab_standard',
    'active',
    'manual',
    timezone('utc', now()) - interval '1 day',
    timezone('utc', now()) + interval '30 days'
  );

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
VALUES
  (:'active_lab'::UUID, :'lab_student'::UUID, 'student', 'active'),
  (:'active_lab'::UUID, :'assistant_one'::UUID, 'assistant', 'active'),
  (:'expired_lab'::UUID, :'expired_student'::UUID, 'student', 'active');

UPDATE public.subscriptions
SET
  current_period_start = timezone('utc', now()) - interval '31 days',
  current_period_end = timezone('utc', now()) - interval '1 day'
WHERE lab_id = :'expired_lab'::UUID;

INSERT INTO public.entitlements(
  user_id,
  product_id,
  entitlement_type,
  status,
  starts_at,
  ends_at
)
VALUES (
  :'full_student'::UUID,
  (SELECT id FROM public.products WHERE slug = 'student-course-full'),
  'course_full',
  'active',
  timezone('utc', now()) - interval '1 day',
  NULL
);

UPDATE public.courses
SET is_published = TRUE
WHERE slug = 'rapid4grad-core';

INSERT INTO public.course_lessons(
  course_id,
  slug,
  module_key,
  title,
  description,
  sort_order,
  access_level,
  video_provider,
  video_external_id,
  is_published
)
VALUES
  (
    (SELECT id FROM public.courses WHERE slug = 'rapid4grad-core'),
    'fixture-public-preview',
    'Research',
    'Fixture Public Preview',
    'Local integration fixture only.',
    1,
    'public_preview',
    'html5',
    'https://media.local.test/public-preview.mp4',
    TRUE
  ),
  (
    (SELECT id FROM public.courses WHERE slug = 'rapid4grad-core'),
    'fixture-lab-basic',
    'Interpersonal',
    'Fixture Lab Basic',
    'Local integration fixture only.',
    2,
    'lab_basic',
    'html5',
    'https://media.local.test/lab-basic.mp4',
    TRUE
  ),
  (
    (SELECT id FROM public.courses WHERE slug = 'rapid4grad-core'),
    'fixture-full-course',
    'Direction',
    'Fixture Full Course',
    'Local integration fixture only.',
    3,
    'full_course',
    'html5',
    'https://media.local.test/full-course.mp4',
    TRUE
  );

INSERT INTO public.course_progress(
  user_id,
  lesson_id,
  status,
  progress_seconds
)
VALUES (
  :'lab_student'::UUID,
  (SELECT id FROM public.course_lessons WHERE slug = 'fixture-lab-basic'),
  'in_progress',
  120
);

BEGIN;
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.course_lessons),
  'anonymous must see only public_preview'
);
SELECT pg_temp.assert_true(
  (SELECT bool_and(access_level = 'public_preview') FROM public.course_lessons),
  'anonymous lesson must be public_preview'
);
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'free_student', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.course_lessons),
  'free student must see only public_preview'
);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.course_progress(user_id, lesson_id, status)
    VALUES (
      'a1000000-0000-0000-0000-000000000001'::UUID,
      (SELECT id FROM public.course_lessons WHERE slug = 'fixture-full-course'),
      'in_progress'
    );
    RAISE EXCEPTION 'free student unexpectedly recorded full-course progress';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'lab_student', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.course_lessons),
  'active Lab student must see public_preview and lab_basic'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.course_lessons WHERE access_level = 'full_course'),
  'active Lab student must not see full_course without entitlement'
);
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'full_student', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 3 FROM public.course_lessons),
  'permanent course_full student must see all access levels'
);
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_one', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.course_lessons),
  'active Lab professor must see public_preview and lab_basic'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.course_progress),
  'professor must not see student watch progress'
);
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'assistant_one', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.course_lessons),
  'active Lab assistant must see public_preview and lab_basic'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.course_progress),
  'assistant must not see student watch progress'
);
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'expired_student', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.course_lessons),
  'expired Lab student must immediately lose lab_basic'
);
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_expired', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.course_lessons),
  'expired Lab professor must immediately lose lab_basic'
);
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'admin_one', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.course_lessons),
  'Admin role alone must not grant lab_basic or full_course'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.course_progress),
  'Admin role alone must not expose student watch progress'
);
ROLLBACK;

SELECT 'V2 course content access integration fixtures passed.' AS result;
