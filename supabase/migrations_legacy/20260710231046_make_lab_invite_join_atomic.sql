-- ============================================================
-- RAPID4GRAD Phase 2 Security Closure
-- Atomically redeem a Lab invite and create/reactivate membership.
-- ============================================================

CREATE OR REPLACE FUNCTION public.join_lab_with_invite(
  target_hash TEXT,
  target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invite public.lab_invite_codes%ROWTYPE;
  membership public.lab_memberships%ROWTYPE;
  lab public.labs%ROWTYPE;
  target_role TEXT;
  already_joined BOOLEAN := FALSE;
BEGIN
  IF target_hash IS NULL OR length(target_hash) <> 64 OR target_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = 'P0001';
  END IF;

  SELECT profile.role INTO target_role
  FROM public.profiles AS profile
  WHERE profile.id = target_user_id;

  IF target_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'student_role_required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO invite
  FROM public.lab_invite_codes
  WHERE code_hash = target_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF invite.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'invite_revoked' USING ERRCODE = 'P0001';
  END IF;
  IF invite.expires_at <= NOW() THEN
    RAISE EXCEPTION 'invite_expired' USING ERRCODE = 'P0001';
  END IF;
  IF invite.max_uses IS NOT NULL AND invite.used_count >= invite.max_uses THEN
    RAISE EXCEPTION 'invite_limit_reached' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO lab
  FROM public.labs
  WHERE id = invite.lab_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lab_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO membership
  FROM public.lab_memberships
  WHERE lab_id = invite.lab_id AND user_id = target_user_id
  FOR UPDATE;

  IF FOUND AND membership.status = 'active' THEN
    already_joined := TRUE;
  ELSIF FOUND THEN
    UPDATE public.lab_memberships
    SET role = 'student', status = 'active', joined_at = NOW()
    WHERE id = membership.id;
  ELSE
    INSERT INTO public.lab_memberships (lab_id, user_id, role, status)
    VALUES (invite.lab_id, target_user_id, 'student', 'active');
  END IF;

  IF NOT already_joined THEN
    UPDATE public.lab_invite_codes
    SET used_count = used_count + 1
    WHERE id = invite.id;
  END IF;

  RETURN jsonb_build_object(
    'labId', lab.id,
    'labName', lab.name,
    'institution', lab.institution,
    'alreadyJoined', already_joined
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_lab_with_invite(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_lab_with_invite(TEXT, UUID)
  TO service_role;

-- Manual transaction validation (do not execute automatically):
-- 1. Valid student + valid code => one active membership, used_count + 1.
-- 2. Same student/code again => alreadyJoined=true, used_count unchanged.
-- 3. revoked/expired/full code => exception and no membership/usage changes.
-- 4. admin/professor target user => student_role_required and no changes.
-- 5. Run two concurrent service_role calls for the final available use; exactly
--    one succeeds because the invite row is locked FOR UPDATE.
