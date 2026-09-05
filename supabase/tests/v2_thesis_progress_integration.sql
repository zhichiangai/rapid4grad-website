\set ON_ERROR_STOP on

-- Local-only disposable fixture. Student rows are committed before privacy checks
-- so every zero-row assertion is made against data that really exists.
\set student_a '71000000-0000-0000-0000-000000000001'
\set student_b '71000000-0000-0000-0000-000000000002'
\set professor_a '72000000-0000-0000-0000-000000000001'
\set assistant_a '72000000-0000-0000-0000-000000000002'
\set admin_a '73000000-0000-0000-0000-000000000001'

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
  (:'student_a'::UUID, 'authenticated', 'authenticated', 'thesis-privacy-a@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', now(), now()),
  (:'student_b'::UUID, 'authenticated', 'authenticated', 'thesis-privacy-b@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', now(), now()),
  (:'professor_a'::UUID, 'authenticated', 'authenticated', 'thesis-privacy-professor@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', now(), now()),
  (:'assistant_a'::UUID, 'authenticated', 'authenticated', 'thesis-privacy-assistant@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', now(), now()),
  (:'admin_a'::UUID, 'authenticated', 'authenticated', 'thesis-privacy-admin@local.test', 'local-test-only', timezone('utc', now()), '{}', '{}', now(), now());

UPDATE public.profiles SET role = 'professor'::public.profile_role
WHERE id IN (:'professor_a'::UUID, :'assistant_a'::UUID);
UPDATE public.profiles SET role = 'admin'::public.profile_role
WHERE id = :'admin_a'::UUID;

SELECT public.create_professor_lab(:'professor_a'::UUID, 'Thesis Privacy Lab', 'Local University') AS lab_id \gset

INSERT INTO public.subscriptions(
  lab_id, payer_user_id, product_id, provider, plan_key, status,
  billing_interval, current_period_start, current_period_end
)
VALUES (
  :'lab_id'::UUID, :'professor_a'::UUID,
  (SELECT id FROM public.products WHERE slug = 'professor-lab-standard'),
  'manual'::public.payment_provider,
  'professor_lab_standard'::public.professor_plan_key,
  'active'::public.subscription_status,
  'manual'::public.subscription_interval,
  timezone('utc', now()) - interval '1 day', timezone('utc', now()) + interval '30 days'
);

INSERT INTO public.lab_memberships(lab_id, user_id, role, status)
VALUES (:'lab_id'::UUID, :'assistant_a'::UUID, 'assistant', 'active');

-- Commit Student A's real private row before any isolation assertion.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
INSERT INTO public.thesis_milestones(student_user_id, milestone_key, status, note)
VALUES (:'student_a'::UUID, 'research_direction', 'completed', 'Student A private milestone');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.thesis_milestones WHERE student_user_id = :'student_a'::UUID), 'Student A own milestone must exist after committed setup');
SELECT pg_temp.assert_true((SELECT completed_at IS NOT NULL FROM public.thesis_milestones WHERE student_user_id = :'student_a'::UUID), 'completed_at must be derived for Student A');
COMMIT;

-- Commit Student B's different real private row before cross-student checks.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_b', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
INSERT INTO public.thesis_milestones(student_user_id, milestone_key, status, note)
VALUES (:'student_b'::UUID, 'literature_review', 'in_progress', 'Student B private milestone');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.thesis_milestones WHERE student_user_id = :'student_b'::UUID), 'Student B own milestone must exist after committed setup');
COMMIT;

SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.thesis_milestones WHERE student_user_id IN (:'student_a'::UUID, :'student_b'::UUID)), 'both real student rows must exist before privacy tests');

-- Student A sees only A while both A and B rows exist.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.thesis_milestones), 'Student A must see exactly one existing row');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.thesis_milestones WHERE student_user_id = :'student_a'::UUID), 'Student A own row must be visible');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.thesis_milestones WHERE student_user_id = :'student_b'::UUID), 'Student B row must be hidden from Student A');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.thesis_milestones(student_user_id, milestone_key, status)
    VALUES ('71000000-0000-0000-0000-000000000002'::UUID, 'methodology', 'in_progress');
    RAISE EXCEPTION 'cross-student insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
UPDATE public.thesis_milestones SET note = 'cross-student tamper attempt' WHERE student_user_id = :'student_b'::UUID;
COMMIT;
SELECT pg_temp.assert_true((SELECT note = 'Student B private milestone' FROM public.thesis_milestones WHERE student_user_id = :'student_b'::UUID), 'cross-student update must leave Student B unchanged');

-- Student B has its own row and cannot see A.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_b', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.thesis_milestones), 'Student B must see exactly one existing row');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.thesis_milestones WHERE student_user_id = :'student_b'::UUID), 'Student B own row must be visible');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.thesis_milestones WHERE student_user_id = :'student_a'::UUID), 'Student A row must be hidden from Student B');
COMMIT;

-- Professor isolation and direct mutation denial while both rows still exist.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'professor_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.thesis_milestones), 'Professor must see zero while student rows exist');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.thesis_milestones(student_user_id, milestone_key, status)
    VALUES ('72000000-0000-0000-0000-000000000001'::UUID, 'methodology', 'in_progress');
    RAISE EXCEPTION 'professor insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.thesis_milestones;
    RAISE EXCEPTION 'professor delete unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
UPDATE public.thesis_milestones SET note = 'professor tamper attempt';
COMMIT;
SELECT pg_temp.assert_true((SELECT count(*) = 2 AND bool_and(note <> 'professor tamper attempt') FROM public.thesis_milestones), 'Professor mutation must not change either student row');

-- Assistant is a professor-profile user with a same-Lab assistant membership.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'assistant_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.thesis_milestones), 'Assistant must see zero while student rows exist');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.thesis_milestones(student_user_id, milestone_key, status)
    VALUES ('71000000-0000-0000-0000-000000000002'::UUID, 'methodology', 'in_progress');
    RAISE EXCEPTION 'assistant insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.thesis_milestones;
    RAISE EXCEPTION 'assistant delete unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
UPDATE public.thesis_milestones SET note = 'assistant tamper attempt';
COMMIT;
SELECT pg_temp.assert_true((SELECT count(*) = 2 AND bool_and(note <> 'assistant tamper attempt') FROM public.thesis_milestones), 'Assistant mutation must not change either student row');

-- Admin has no automatic Thesis access or CRUD bypass.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'admin_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.thesis_milestones), 'Admin must see zero while student rows exist');
DO $$
BEGIN
  BEGIN
    INSERT INTO public.thesis_milestones(student_user_id, milestone_key, status)
    VALUES ('71000000-0000-0000-0000-000000000002'::UUID, 'methodology', 'in_progress');
    RAISE EXCEPTION 'admin insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.thesis_milestones;
    RAISE EXCEPTION 'admin delete unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
UPDATE public.thesis_milestones SET note = 'admin tamper attempt';
COMMIT;
SELECT pg_temp.assert_true((SELECT count(*) = 2 AND bool_and(note NOT IN ('admin tamper attempt', 'professor tamper attempt', 'assistant tamper attempt')) FROM public.thesis_milestones), 'Admin mutation must not change either student row');

-- Student A verifies identity immutability and completed_at transitions.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'student_a', TRUE);
SELECT set_config('request.jwt.claim.role', 'authenticated', TRUE);
DO $$
BEGIN
  BEGIN
    UPDATE public.thesis_milestones SET student_user_id = '71000000-0000-0000-0000-000000000002'::UUID;
    RAISE EXCEPTION 'student_user_id update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.thesis_milestones SET milestone_key = 'methodology';
    RAISE EXCEPTION 'milestone_key update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.thesis_milestones WHERE student_user_id = '71000000-0000-0000-0000-000000000001'::UUID;
    RAISE EXCEPTION 'student delete unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
UPDATE public.thesis_milestones SET status = 'in_progress', target_date = current_date + 14, note = 'Student A reopened milestone' WHERE student_user_id = :'student_a'::UUID;
SELECT pg_temp.assert_true((SELECT completed_at IS NULL FROM public.thesis_milestones WHERE student_user_id = :'student_a'::UUID), 'reopening must clear completed_at');
UPDATE public.thesis_milestones SET status = 'completed' WHERE student_user_id = :'student_a'::UUID;
SELECT pg_temp.assert_true((SELECT completed_at IS NOT NULL FROM public.thesis_milestones WHERE student_user_id = :'student_a'::UUID), 'completing must derive completed_at');
COMMIT;

-- Cleanup is privileged and happens only after all assertions ran.
DELETE FROM public.thesis_milestones WHERE student_user_id IN (:'student_a'::UUID, :'student_b'::UUID);
DELETE FROM public.lab_memberships WHERE lab_id = :'lab_id'::UUID;
DELETE FROM public.subscriptions WHERE lab_id = :'lab_id'::UUID;
DELETE FROM public.labs WHERE id = :'lab_id'::UUID;
DELETE FROM auth.users WHERE id IN (:'student_a'::UUID, :'student_b'::UUID, :'professor_a'::UUID, :'assistant_a'::UUID, :'admin_a'::UUID);

SELECT 'v2 thesis progress privacy integration passed' AS result;
