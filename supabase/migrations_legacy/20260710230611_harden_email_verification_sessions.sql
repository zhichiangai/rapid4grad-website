-- ============================================================
-- RAPID4GRAD Phase 2 Security Closure
-- Server-side email verification challenges and rate limits.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_verification_challenges (
  id UUID PRIMARY KEY,
  email_hash TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts SMALLINT NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_email_challenges_email_created
  ON public.email_verification_challenges(email_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_challenges_ip_created
  ON public.email_verification_challenges(ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_challenges_expires
  ON public.email_verification_challenges(expires_at);

ALTER TABLE public.email_verification_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.email_verification_challenges
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.email_verification_challenges TO service_role;

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
BEGIN
  SELECT * INTO challenge
  FROM public.email_verification_challenges
  WHERE id = target_id
  FOR UPDATE;

  IF NOT FOUND OR challenge.email_hash <> target_email_hash THEN
    RETURN 'invalid';
  END IF;

  IF challenge.verified_at IS NOT NULL THEN
    RETURN 'verified';
  END IF;

  IF challenge.expires_at <= NOW() THEN
    RETURN 'expired';
  END IF;

  IF challenge.attempts >= challenge.max_attempts THEN
    RETURN 'locked';
  END IF;

  UPDATE public.email_verification_challenges
  SET attempts = attempts + 1
  WHERE id = target_id;

  IF challenge.pin_hash <> target_pin_hash THEN
    RETURN 'invalid';
  END IF;

  UPDATE public.email_verification_challenges
  SET verified_at = NOW()
  WHERE id = target_id;

  RETURN 'verified';
END;
$$;

REVOKE ALL ON FUNCTION public.verify_email_challenge(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_email_challenge(UUID, TEXT, TEXT)
  TO service_role;

-- Manual validation (do not execute automatically):
-- 1. anon/authenticated SELECT/INSERT/UPDATE must return permission denied.
-- 2. service_role can insert a challenge and call verify_email_challenge().
-- 3. Five invalid calls return invalid; subsequent call returns locked.
-- 4. Expired challenge returns expired and never sets verified_at.
