\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition BOOLEAN, message TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT condition THEN
    RAISE EXCEPTION 'assertion_failed: %', message;
  END IF;
END;
$$;

SELECT pg_temp.assert_true(
  NOT has_function_privilege(
    'anon',
    'public.create_email_verification_challenge(uuid,text,text,text,timestamptz,integer,integer,integer,integer)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.create_email_verification_challenge(uuid,text,text,text,timestamptz,integer,integer,integer,integer)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'service_role',
    'public.create_email_verification_challenge(uuid,text,text,text,timestamptz,integer,integer,integer,integer)',
    'EXECUTE'
  ),
  'challenge creation RPC must be service-role only'
);

SELECT pg_temp.assert_true(
  NOT has_function_privilege(
    'anon',
    'public.verify_email_challenge(uuid,text,text)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'authenticated',
    'public.verify_email_challenge(uuid,text,text)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'service_role',
    'public.verify_email_challenge(uuid,text,text)',
    'EXECUTE'
  ),
  'challenge verification RPC must be service-role only'
);

TRUNCATE TABLE public.email_verification_challenges;

SET ROLE service_role;
SELECT pg_temp.assert_true(
  public.create_email_verification_challenge(
    'e1000000-0000-0000-0000-000000000001',
    'cooldown-email',
    'pin-one',
    'cooldown-ip',
    timezone('utc', now()) + interval '10 minutes'
  ) = 'created',
  'first challenge must be created'
);
SELECT pg_temp.assert_true(
  public.create_email_verification_challenge(
    'e1000000-0000-0000-0000-000000000002',
    'cooldown-email',
    'pin-two',
    'cooldown-ip',
    timezone('utc', now()) + interval '10 minutes'
  ) = 'cooldown',
  'same Email inside cooldown must be rejected'
);
RESET ROLE;

UPDATE public.email_verification_challenges
SET created_at = timezone('utc', now()) - interval '2 minutes'
WHERE email_hash = 'cooldown-email';

SET ROLE service_role;
SELECT pg_temp.assert_true(
  public.create_email_verification_challenge(
    'e1000000-0000-0000-0000-000000000003',
    'cooldown-email',
    'pin-three',
    'email-limit-ip-two',
    timezone('utc', now()) + interval '10 minutes',
    60,
    900,
    2,
    8
  ) = 'created',
  'second Email request outside cooldown must be created'
);
RESET ROLE;

UPDATE public.email_verification_challenges
SET created_at = timezone('utc', now()) - interval '2 minutes'
WHERE email_hash = 'cooldown-email';

SET ROLE service_role;
SELECT pg_temp.assert_true(
  public.create_email_verification_challenge(
    'e1000000-0000-0000-0000-000000000004',
    'cooldown-email',
    'pin-four',
    'email-limit-ip-three',
    timezone('utc', now()) + interval '10 minutes',
    60,
    900,
    2,
    8
  ) = 'email_limited',
  'Email request window limit must be enforced'
);
RESET ROLE;

INSERT INTO public.email_verification_challenges (
  id,
  email_hash,
  pin_hash,
  ip_hash,
  expires_at,
  created_at
) VALUES
  (
    'e2000000-0000-0000-0000-000000000001',
    'ip-limit-email-one',
    'pin-one',
    'shared-limit-ip',
    timezone('utc', now()) + interval '10 minutes',
    timezone('utc', now()) - interval '2 minutes'
  ),
  (
    'e2000000-0000-0000-0000-000000000002',
    'ip-limit-email-two',
    'pin-two',
    'shared-limit-ip',
    timezone('utc', now()) + interval '10 minutes',
    timezone('utc', now()) - interval '2 minutes'
  );

SET ROLE service_role;
SELECT pg_temp.assert_true(
  public.create_email_verification_challenge(
    'e2000000-0000-0000-0000-000000000003',
    'ip-limit-email-three',
    'pin-three',
    'shared-limit-ip',
    timezone('utc', now()) + interval '10 minutes',
    60,
    900,
    20,
    2
  ) = 'ip_limited',
  'IP request window limit must be enforced'
);
RESET ROLE;

INSERT INTO public.email_verification_challenges (
  id,
  email_hash,
  pin_hash,
  ip_hash,
  expires_at
) VALUES
  (
    'e3000000-0000-0000-0000-000000000001',
    'locked-email',
    'correct-pin',
    'verify-ip-one',
    timezone('utc', now()) + interval '10 minutes'
  ),
  (
    'e3000000-0000-0000-0000-000000000002',
    'verified-email',
    'correct-pin',
    'verify-ip-two',
    timezone('utc', now()) + interval '10 minutes'
  ),
  (
    'e3000000-0000-0000-0000-000000000003',
    'expired-email',
    'correct-pin',
    'verify-ip-three',
    timezone('utc', now()) - interval '1 minute'
  );

SET ROLE service_role;
SELECT pg_temp.assert_true(
  public.verify_email_challenge(
    'e3000000-0000-0000-0000-000000000001',
    'locked-email',
    'wrong-pin'
  ) = 'invalid',
  'first invalid PIN must be rejected'
);
SELECT public.verify_email_challenge(
  'e3000000-0000-0000-0000-000000000001',
  'locked-email',
  'wrong-pin'
);
SELECT public.verify_email_challenge(
  'e3000000-0000-0000-0000-000000000001',
  'locked-email',
  'wrong-pin'
);
SELECT public.verify_email_challenge(
  'e3000000-0000-0000-0000-000000000001',
  'locked-email',
  'wrong-pin'
);
SELECT pg_temp.assert_true(
  public.verify_email_challenge(
    'e3000000-0000-0000-0000-000000000001',
    'locked-email',
    'wrong-pin'
  ) = 'locked',
  'fifth invalid PIN must lock the challenge'
);
SELECT pg_temp.assert_true(
  public.verify_email_challenge(
    'e3000000-0000-0000-0000-000000000001',
    'locked-email',
    'correct-pin'
  ) = 'locked',
  'locked challenge must reject a later correct PIN'
);
SELECT pg_temp.assert_true(
  public.verify_email_challenge(
    'e3000000-0000-0000-0000-000000000002',
    'verified-email',
    'correct-pin'
  ) = 'verified',
  'correct PIN must verify the challenge'
);
SELECT pg_temp.assert_true(
  public.verify_email_challenge(
    'e3000000-0000-0000-0000-000000000002',
    'verified-email',
    'correct-pin'
  ) = 'verified',
  'verified challenge replay must remain idempotent'
);
SELECT pg_temp.assert_true(
  public.verify_email_challenge(
    'e3000000-0000-0000-0000-000000000003',
    'expired-email',
    'correct-pin'
  ) = 'expired',
  'expired challenge must not verify'
);
RESET ROLE;

SELECT pg_temp.assert_true(
  (
    SELECT failed_attempts = 5 AND verified_at IS NULL
    FROM public.email_verification_challenges
    WHERE id = 'e3000000-0000-0000-0000-000000000001'
  ),
  'locked challenge must persist exactly five failed attempts'
);

DELETE FROM public.email_verification_challenges
WHERE email_hash = 'concurrent-email' OR ip_hash = 'concurrent-ip';
