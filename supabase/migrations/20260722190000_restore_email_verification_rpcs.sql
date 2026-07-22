-- RAPID4GRAD V2 Task 9
-- Restore the server-only, atomic Email verification RPC boundary required by
-- app/api/email/verify. The V2 table stores failed attempts directly and does
-- not expose challenge rows to browser roles.

CREATE OR REPLACE FUNCTION public.create_email_verification_challenge(
  target_id UUID,
  target_email_hash TEXT,
  target_pin_hash TEXT,
  target_ip_hash TEXT,
  target_expires_at TIMESTAMPTZ,
  target_cooldown_seconds INTEGER DEFAULT 60,
  target_window_seconds INTEGER DEFAULT 900,
  target_max_email_sends INTEGER DEFAULT 3,
  target_max_ip_sends INTEGER DEFAULT 8
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  challenge_now TIMESTAMPTZ := clock_timestamp();
  email_count INTEGER;
  ip_count INTEGER;
BEGIN
  IF target_id IS NULL
    OR NULLIF(target_email_hash, '') IS NULL
    OR NULLIF(target_pin_hash, '') IS NULL
    OR NULLIF(target_ip_hash, '') IS NULL THEN
    RAISE EXCEPTION 'invalid_challenge_input';
  END IF;

  IF target_expires_at <= challenge_now
    OR target_cooldown_seconds NOT BETWEEN 1 AND 3600
    OR target_window_seconds NOT BETWEEN 60 AND 86400
    OR target_max_email_sends NOT BETWEEN 1 AND 20
    OR target_max_ip_sends NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'invalid_challenge_limits';
  END IF;

  -- Serialize requests sharing either identity. A stable lock order prevents
  -- parallel requests from passing the count checks before either inserts.
  PERFORM pg_advisory_xact_lock(
    LEAST(
      hashtextextended('email:' || target_email_hash, 0),
      hashtextextended('ip:' || target_ip_hash, 0)
    )
  );
  PERFORM pg_advisory_xact_lock(
    GREATEST(
      hashtextextended('email:' || target_email_hash, 0),
      hashtextextended('ip:' || target_ip_hash, 0)
    )
  );

  IF EXISTS (
    SELECT 1
    FROM public.email_verification_challenges AS challenge
    WHERE challenge.email_hash = target_email_hash
      AND challenge.created_at >= challenge_now
        - make_interval(secs => target_cooldown_seconds)
  ) THEN
    RETURN 'cooldown';
  END IF;

  SELECT count(*)
  INTO email_count
  FROM public.email_verification_challenges AS challenge
  WHERE challenge.email_hash = target_email_hash
    AND challenge.created_at >= challenge_now
      - make_interval(secs => target_window_seconds);

  SELECT count(*)
  INTO ip_count
  FROM public.email_verification_challenges AS challenge
  WHERE challenge.ip_hash = target_ip_hash
    AND challenge.created_at >= challenge_now
      - make_interval(secs => target_window_seconds);

  IF email_count >= target_max_email_sends THEN
    RETURN 'email_limited';
  END IF;

  IF ip_count >= target_max_ip_sends THEN
    RETURN 'ip_limited';
  END IF;

  INSERT INTO public.email_verification_challenges (
    id,
    email_hash,
    pin_hash,
    ip_hash,
    expires_at,
    created_at
  ) VALUES (
    target_id,
    target_email_hash,
    target_pin_hash,
    target_ip_hash,
    target_expires_at,
    challenge_now
  );

  RETURN 'created';
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_email_challenge(
  target_id UUID,
  target_email_hash TEXT,
  target_pin_hash TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  challenge public.email_verification_challenges%ROWTYPE;
  next_failed_attempts INTEGER;
BEGIN
  IF target_id IS NULL
    OR NULLIF(target_email_hash, '') IS NULL
    OR NULLIF(target_pin_hash, '') IS NULL THEN
    RETURN 'invalid';
  END IF;

  SELECT *
  INTO challenge
  FROM public.email_verification_challenges
  WHERE id = target_id
  FOR UPDATE;

  IF NOT FOUND OR challenge.email_hash <> target_email_hash THEN
    RETURN 'invalid';
  END IF;

  IF challenge.verified_at IS NOT NULL THEN
    RETURN 'verified';
  END IF;

  IF challenge.expires_at <= clock_timestamp() THEN
    RETURN 'expired';
  END IF;

  IF challenge.failed_attempts >= 5 THEN
    RETURN 'locked';
  END IF;

  IF challenge.pin_hash <> target_pin_hash THEN
    next_failed_attempts := challenge.failed_attempts + 1;

    UPDATE public.email_verification_challenges
    SET failed_attempts = next_failed_attempts
    WHERE id = target_id;

    IF next_failed_attempts >= 5 THEN
      RETURN 'locked';
    END IF;

    RETURN 'invalid';
  END IF;

  UPDATE public.email_verification_challenges
  SET verified_at = clock_timestamp()
  WHERE id = target_id;

  RETURN 'verified';
END;
$$;

REVOKE ALL ON FUNCTION public.create_email_verification_challenge(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  INTEGER,
  INTEGER,
  INTEGER,
  INTEGER
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.verify_email_challenge(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_email_verification_challenge(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  INTEGER,
  INTEGER,
  INTEGER,
  INTEGER
) TO service_role;

GRANT EXECUTE ON FUNCTION public.verify_email_challenge(UUID, TEXT, TEXT)
  TO service_role;

COMMENT ON FUNCTION public.create_email_verification_challenge(
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  INTEGER,
  INTEGER,
  INTEGER,
  INTEGER
) IS 'Atomically enforces Email/IP verification challenge limits for server-side callers.';

COMMENT ON FUNCTION public.verify_email_challenge(UUID, TEXT, TEXT)
IS 'Atomically verifies an Email PIN and locks the challenge after five failed attempts.';
