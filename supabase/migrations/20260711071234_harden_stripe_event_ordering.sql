-- ============================================================
-- RAPID4GRAD Phase 2 Security Closure
-- Stripe event ordering and two-phase webhook idempotency.
-- ============================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_stripe_event_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_stripe_event_id TEXT;

ALTER TABLE public.stripe_events
  ALTER COLUMN processed_at DROP NOT NULL,
  ALTER COLUMN processed_at DROP DEFAULT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'processed',
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS event_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.stripe_events
  DROP CONSTRAINT IF EXISTS stripe_events_status_check;
ALTER TABLE public.stripe_events
  ADD CONSTRAINT stripe_events_status_check
  CHECK (status IN ('processing', 'processed', 'failed'));
ALTER TABLE public.stripe_events
  DROP CONSTRAINT IF EXISTS stripe_events_attempts_check;
ALTER TABLE public.stripe_events
  ADD CONSTRAINT stripe_events_attempts_check CHECK (attempts > 0);

CREATE INDEX IF NOT EXISTS idx_stripe_events_status
  ON public.stripe_events(status, processing_started_at);

CREATE OR REPLACE FUNCTION public.claim_stripe_event(
  target_event_id TEXT,
  target_event_type TEXT,
  target_event_created_at TIMESTAMPTZ,
  target_payload JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing public.stripe_events%ROWTYPE;
BEGIN
  INSERT INTO public.stripe_events (
    stripe_event_id,
    event_type,
    status,
    processing_started_at,
    processed_at,
    event_created_at,
    payload,
    attempts
  ) VALUES (
    target_event_id,
    target_event_type,
    'processing',
    NOW(),
    NULL,
    target_event_created_at,
    target_payload,
    1
  )
  ON CONFLICT (stripe_event_id) DO NOTHING;

  IF FOUND THEN
    RETURN TRUE;
  END IF;

  SELECT * INTO existing
  FROM public.stripe_events
  WHERE stripe_event_id = target_event_id
  FOR UPDATE;

  IF existing.status = 'processed' THEN
    RETURN FALSE;
  END IF;

  IF existing.status = 'processing'
     AND existing.processing_started_at > NOW() - INTERVAL '10 minutes' THEN
    RETURN FALSE;
  END IF;

  UPDATE public.stripe_events
  SET status = 'processing',
      processing_started_at = NOW(),
      processed_at = NULL,
      error_message = NULL,
      event_type = target_event_type,
      event_created_at = target_event_created_at,
      payload = target_payload,
      attempts = attempts + 1
  WHERE stripe_event_id = target_event_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_stripe_event(
  target_event_id TEXT,
  succeeded BOOLEAN,
  failure_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.stripe_events
  SET status = CASE WHEN succeeded THEN 'processed' ELSE 'failed' END,
      processed_at = CASE WHEN succeeded THEN NOW() ELSE NULL END,
      error_message = CASE
        WHEN succeeded THEN NULL
        ELSE left(COALESCE(failure_message, 'Webhook processing failed.'), 500)
      END
  WHERE stripe_event_id = target_event_id
    AND status = 'processing';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_event(TEXT, TEXT, TIMESTAMPTZ, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_stripe_event(TEXT, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_event(TEXT, TEXT, TIMESTAMPTZ, JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_stripe_event(TEXT, BOOLEAN, TEXT)
  TO service_role;

-- Manual validation (do not execute automatically):
-- 1. Two concurrent claim calls for one event id: exactly one returns true.
-- 2. A processed event cannot be reclaimed.
-- 3. A failed or processing-stale event can be reclaimed and attempts + 1.
-- 4. Newer event_created_at updates subscription state even when period end is
--    unchanged; an older/equal event never overwrites newer local state.
