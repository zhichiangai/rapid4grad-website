-- Atomically enforce Email/IP send limits and create a verification challenge.
CREATE OR REPLACE FUNCTION public.create_email_verification_challenge(
  target_id UUID, target_email_hash TEXT, target_pin_hash TEXT,
  target_ip_hash TEXT, target_expires_at TIMESTAMPTZ,
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
  current_time TIMESTAMPTZ := clock_timestamp();
  email_count INTEGER;
  ip_count INTEGER;
BEGIN
  IF target_email_hash = '' OR target_ip_hash = '' OR target_pin_hash = '' THEN
    RAISE EXCEPTION 'invalid_challenge_hash';
  END IF;
  IF target_expires_at <= current_time
    OR target_cooldown_seconds NOT BETWEEN 1 AND 3600
    OR target_window_seconds NOT BETWEEN 60 AND 86400
    OR target_max_email_sends NOT BETWEEN 1 AND 20
    OR target_max_ip_sends NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'invalid_challenge_limits';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('email:' || target_email_hash, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('ip:' || target_ip_hash, 0));

  IF EXISTS (
    SELECT 1 FROM public.email_verification_challenges
    WHERE email_hash = target_email_hash
      AND created_at >= current_time - make_interval(secs => target_cooldown_seconds)
  ) THEN RETURN 'cooldown'; END IF;

  SELECT COUNT(*) INTO email_count FROM public.email_verification_challenges
  WHERE email_hash = target_email_hash
    AND created_at >= current_time - make_interval(secs => target_window_seconds);
  SELECT COUNT(*) INTO ip_count FROM public.email_verification_challenges
  WHERE ip_hash = target_ip_hash
    AND created_at >= current_time - make_interval(secs => target_window_seconds);

  IF email_count >= target_max_email_sends THEN RETURN 'email_limited'; END IF;
  IF ip_count >= target_max_ip_sends THEN RETURN 'ip_limited'; END IF;

  INSERT INTO public.email_verification_challenges (
    id, email_hash, pin_hash, ip_hash, expires_at, created_at
  ) VALUES (
    target_id, target_email_hash, target_pin_hash, target_ip_hash,
    target_expires_at, current_time
  );
  RETURN 'created';
END;
$$;

REVOKE ALL ON FUNCTION public.create_email_verification_challenge(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER, INTEGER
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_email_verification_challenge(
  UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER, INTEGER
) TO service_role;

-- Manual validation (do not execute automatically):
-- 1. Two concurrent service_role calls with one email_hash: one returns
--    created, one cooldown, and exactly one row is inserted.
-- 2. Different emails sharing one ip_hash cannot exceed the IP window limit.
-- 3. anon/authenticated EXECUTE returns permission denied.
-- 4. No raw Email or raw IP exists in the challenge table.
