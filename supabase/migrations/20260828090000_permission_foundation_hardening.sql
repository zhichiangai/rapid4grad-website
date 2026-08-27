-- RAPID4GRAD Permission Foundation Hardening
-- Forward-only role invariants and active-account policy helper.

CREATE OR REPLACE FUNCTION app_private.is_active_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = target_user_id
      AND profile.account_status = 'active'::public.account_status
  );
$$;

REVOKE ALL ON FUNCTION app_private.is_active_user(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_active_user(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_update_profile_role(
  target_admin_user_id UUID,
  target_user_id UUID,
  target_role public.profile_role,
  target_reason TEXT,
  target_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_profile public.profiles%ROWTYPE;
  updated_profile public.profiles%ROWTYPE;
BEGIN
  PERFORM app_private.assert_admin_operation(
    target_admin_user_id, target_reason, target_request_id
  );

  IF target_role NOT IN ('student'::public.profile_role, 'professor'::public.profile_role) THEN
    RAISE EXCEPTION 'admin_role_change_not_supported';
  END IF;

  SELECT * INTO selected_profile
  FROM public.profiles
  WHERE id = target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF selected_profile.role = 'admin'::public.profile_role THEN
    RAISE EXCEPTION 'admin_role_protected';
  END IF;
  IF selected_profile.role = target_role THEN
    RAISE EXCEPTION 'profile_role_unchanged';
  END IF;

  IF selected_profile.role = 'student'::public.profile_role
     AND target_role = 'professor'::public.profile_role
     AND EXISTS (
       SELECT 1 FROM public.lab_memberships AS membership
       WHERE membership.user_id = selected_profile.id
         AND membership.role = 'student'::public.lab_role
         AND membership.status = 'active'::public.lab_membership_status
     ) THEN
    RAISE EXCEPTION 'active_student_membership_blocks_professor_role';
  END IF;

  IF selected_profile.role = 'professor'::public.profile_role
     AND target_role = 'student'::public.profile_role
     AND (
       EXISTS (
         SELECT 1 FROM public.labs AS lab
         WHERE lab.owner_professor_id = selected_profile.id
           AND lab.status = 'active'::public.lab_status
       )
       OR EXISTS (
         SELECT 1 FROM public.lab_memberships AS membership
         WHERE membership.user_id = selected_profile.id
           AND membership.role IN ('professor'::public.lab_role, 'assistant'::public.lab_role)
           AND membership.status = 'active'::public.lab_membership_status
       )
       OR EXISTS (
         SELECT 1 FROM public.subscriptions AS subscription
         WHERE subscription.payer_user_id = selected_profile.id
           AND subscription.status IN (
             'incomplete'::public.subscription_status,
             'trialing'::public.subscription_status,
             'active'::public.subscription_status,
             'past_due'::public.subscription_status,
             'unpaid'::public.subscription_status
           )
       )
     ) THEN
    RAISE EXCEPTION 'professor_resources_block_student_role';
  END IF;

  UPDATE public.profiles
  SET role = target_role
  WHERE id = selected_profile.id
  RETURNING * INTO updated_profile;

  PERFORM public.record_admin_action(
    target_admin_user_id,
    'profile_role_changed',
    'user',
    selected_profile.id,
    target_reason,
    jsonb_build_object('role', selected_profile.role, 'account_status', selected_profile.account_status),
    jsonb_build_object('role', updated_profile.role, 'account_status', updated_profile.account_status),
    target_request_id
  );

  RETURN jsonb_build_object(
    'id', updated_profile.id,
    'role', updated_profile.role,
    'account_status', updated_profile.account_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_profile_role(UUID, UUID, public.profile_role, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_profile_role(UUID, UUID, public.profile_role, TEXT, TEXT)
  TO service_role;

DROP POLICY IF EXISTS "advisor_memories_select_owner" ON public.advisor_memories;
DROP POLICY IF EXISTS "advisor_memories_insert_owner" ON public.advisor_memories;
DROP POLICY IF EXISTS "advisor_memories_update_owner" ON public.advisor_memories;
DROP POLICY IF EXISTS "advisor_memories_delete_owner" ON public.advisor_memories;

CREATE POLICY "advisor_memories_select_active_owner"
ON public.advisor_memories FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) AND app_private.is_active_user((SELECT auth.uid())));

CREATE POLICY "advisor_memories_insert_active_owner"
ON public.advisor_memories FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()) AND app_private.is_active_user((SELECT auth.uid())));

CREATE POLICY "advisor_memories_update_active_owner"
ON public.advisor_memories FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()) AND app_private.is_active_user((SELECT auth.uid())))
WITH CHECK (user_id = (SELECT auth.uid()) AND app_private.is_active_user((SELECT auth.uid())));

CREATE POLICY "advisor_memories_delete_active_owner"
ON public.advisor_memories FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()) AND app_private.is_active_user((SELECT auth.uid())));

-- Manual validation, execute as an authenticated non-admin test role:
-- UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT auth.uid());
-- UPDATE public.profiles SET is_paid = TRUE WHERE id = (SELECT auth.uid());
-- Both statements must fail because authenticated has no sensitive-column UPDATE grant.
