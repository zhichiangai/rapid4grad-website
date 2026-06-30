-- ============================================================
-- RAPID4GRAD Phase 2 — Atomic invite and quota operations
-- Migration: 004_atomic_operations.sql
-- Scope: prevent race conditions on invite usage and PDF audit quota usage.
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_invite_code_usage(target_hash TEXT)
RETURNS public.lab_invite_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_row public.lab_invite_codes;
BEGIN
  UPDATE public.lab_invite_codes AS invite
  SET used_count = invite.used_count + 1
  WHERE invite.code_hash = target_hash
    AND invite.revoked_at IS NULL
    AND invite.expires_at > NOW()
    AND (invite.max_uses IS NULL OR invite.used_count < invite.max_uses)
  RETURNING invite.*
  INTO updated_row;

  IF updated_row.id IS NOT NULL THEN
    RETURN updated_row;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.lab_invite_codes AS invite
    WHERE invite.code_hash = target_hash
  ) THEN
    RAISE EXCEPTION 'Invite code was not found.'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lab_invite_codes AS invite
    WHERE invite.code_hash = target_hash
      AND invite.revoked_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Invite code has been revoked.'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lab_invite_codes AS invite
    WHERE invite.code_hash = target_hash
      AND invite.expires_at <= NOW()
  ) THEN
    RAISE EXCEPTION 'Invite code has expired.'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.lab_invite_codes AS invite
    WHERE invite.code_hash = target_hash
      AND invite.max_uses IS NOT NULL
      AND invite.used_count >= invite.max_uses
  ) THEN
    RAISE EXCEPTION 'Invite code has reached its usage limit.'
      USING ERRCODE = 'P0001';
  END IF;

  RAISE EXCEPTION 'Invite code could not be incremented.'
    USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_pdf_audit_usage(target_credit_id UUID)
RETURNS public.ai_usage_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_row public.ai_usage_credits;
BEGIN
  UPDATE public.ai_usage_credits AS credit
  SET pdf_audit_used = credit.pdf_audit_used + 1
  WHERE credit.id = target_credit_id
    AND credit.pdf_audit_used < credit.pdf_audit_limit
  RETURNING credit.*
  INTO updated_row;

  IF updated_row.id IS NOT NULL THEN
    RETURN updated_row;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.ai_usage_credits AS credit
    WHERE credit.id = target_credit_id
  ) THEN
    RAISE EXCEPTION 'AI usage credit was not found.'
      USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.ai_usage_credits AS credit
    WHERE credit.id = target_credit_id
      AND credit.pdf_audit_used >= credit.pdf_audit_limit
  ) THEN
    RAISE EXCEPTION 'PDF audit quota has been exhausted.'
      USING ERRCODE = 'P0001';
  END IF;

  RAISE EXCEPTION 'PDF audit usage could not be incremented.'
    USING ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.increment_invite_code_usage(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_invite_code_usage(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.increment_invite_code_usage(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.increment_pdf_audit_usage(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_pdf_audit_usage(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.increment_pdf_audit_usage(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_invite_code_usage(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_pdf_audit_usage(UUID) TO service_role;

-- ============================================================
-- END OF MIGRATION 004 ATOMIC OPERATIONS
-- ============================================================
