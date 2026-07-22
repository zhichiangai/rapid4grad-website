-- RAPID4GRAD V2 Task 6
-- Lab member actions are service-only and remain atomic with membership changes.

CREATE TABLE public.lab_membership_action_logs (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
  membership_id UUID NOT NULL REFERENCES public.lab_memberships(id) ON DELETE RESTRICT,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL CHECK (
    action_type IN ('member_removed', 'member_role_changed')
  ),
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 3 AND 500),
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX lab_membership_action_logs_lab_created_idx
  ON public.lab_membership_action_logs(lab_id, created_at DESC);
CREATE INDEX lab_membership_action_logs_target_created_idx
  ON public.lab_membership_action_logs(target_user_id, created_at DESC);

ALTER TABLE public.lab_membership_action_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lab_membership_action_logs
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.lab_membership_action_logs
  TO service_role;

CREATE OR REPLACE FUNCTION public.remove_lab_member(
  target_actor_id UUID,
  target_lab_id UUID,
  target_member_user_id UUID,
  target_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_lab public.labs%ROWTYPE;
  selected_membership public.lab_memberships%ROWTYPE;
  normalized_reason TEXT := trim(target_reason);
  removed_timestamp TIMESTAMPTZ := timezone('utc', now());
  before_snapshot JSONB;
  after_snapshot JSONB;
BEGIN
  IF char_length(normalized_reason) < 3
     OR char_length(normalized_reason) > 500 THEN
    RAISE EXCEPTION 'removal_reason_invalid';
  END IF;

  SELECT *
  INTO selected_lab
  FROM public.labs
  WHERE id = target_lab_id
  FOR UPDATE;

  IF NOT FOUND
     OR selected_lab.status <> 'active'::public.lab_status
     OR selected_lab.owner_professor_id <> target_actor_id THEN
    RAISE EXCEPTION 'lab_owner_required';
  END IF;

  IF NOT app_private.has_active_lab_subscription(target_lab_id) THEN
    RAISE EXCEPTION 'active_lab_subscription_required';
  END IF;

  IF target_member_user_id = selected_lab.owner_professor_id THEN
    RAISE EXCEPTION 'lab_owner_cannot_be_removed';
  END IF;

  SELECT *
  INTO selected_membership
  FROM public.lab_memberships
  WHERE lab_id = target_lab_id
    AND user_id = target_member_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lab_membership_not_found';
  END IF;

  IF selected_membership.status = 'removed'::public.lab_membership_status THEN
    RETURN TRUE;
  END IF;

  before_snapshot := jsonb_build_object(
    'membershipId', selected_membership.id,
    'labId', selected_membership.lab_id,
    'userId', selected_membership.user_id,
    'role', selected_membership.role,
    'status', selected_membership.status,
    'joinedAt', selected_membership.joined_at,
    'removedAt', selected_membership.removed_at
  );

  UPDATE public.lab_memberships
  SET
    status = 'removed'::public.lab_membership_status,
    removed_at = removed_timestamp,
    removed_by = target_actor_id,
    removal_reason = normalized_reason
  WHERE id = selected_membership.id;

  UPDATE public.audit_summary_shares
  SET revoked_at = COALESCE(revoked_at, removed_timestamp)
  WHERE lab_id = target_lab_id
    AND student_user_id = target_member_user_id
    AND revoked_at IS NULL;

  after_snapshot := jsonb_build_object(
    'membershipId', selected_membership.id,
    'labId', selected_membership.lab_id,
    'userId', selected_membership.user_id,
    'role', selected_membership.role,
    'status', 'removed',
    'joinedAt', selected_membership.joined_at,
    'removedAt', removed_timestamp,
    'removedBy', target_actor_id,
    'removalReason', normalized_reason
  );

  INSERT INTO public.lab_membership_action_logs(
    lab_id,
    membership_id,
    actor_user_id,
    target_user_id,
    action_type,
    reason,
    before_state,
    after_state
  )
  VALUES (
    target_lab_id,
    selected_membership.id,
    target_actor_id,
    target_member_user_id,
    'member_removed',
    normalized_reason,
    before_snapshot,
    after_snapshot
  );

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.change_lab_member_role(
  target_actor_id UUID,
  target_lab_id UUID,
  target_member_user_id UUID,
  target_role public.lab_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_lab public.labs%ROWTYPE;
  selected_membership public.lab_memberships%ROWTYPE;
  role_change_reason TEXT := 'Owner changed Lab member role';
  before_snapshot JSONB;
  after_snapshot JSONB;
BEGIN
  SELECT *
  INTO selected_lab
  FROM public.labs
  WHERE id = target_lab_id
  FOR UPDATE;

  IF NOT FOUND
     OR selected_lab.status <> 'active'::public.lab_status
     OR selected_lab.owner_professor_id <> target_actor_id THEN
    RAISE EXCEPTION 'lab_owner_required';
  END IF;

  IF NOT app_private.has_active_lab_subscription(target_lab_id) THEN
    RAISE EXCEPTION 'active_lab_subscription_required';
  END IF;

  IF target_member_user_id = selected_lab.owner_professor_id THEN
    RAISE EXCEPTION 'lab_owner_role_cannot_change';
  END IF;

  SELECT *
  INTO selected_membership
  FROM public.lab_memberships
  WHERE lab_id = target_lab_id
    AND user_id = target_member_user_id
  FOR UPDATE;

  IF NOT FOUND
     OR selected_membership.status <> 'active'::public.lab_membership_status THEN
    RAISE EXCEPTION 'active_lab_membership_not_found';
  END IF;

  IF selected_membership.role = 'student'::public.lab_role
     OR target_role = 'student'::public.lab_role THEN
    RAISE EXCEPTION 'student_membership_role_is_fixed';
  END IF;

  IF selected_membership.role = target_role THEN
    RETURN TRUE;
  END IF;

  before_snapshot := jsonb_build_object(
    'membershipId', selected_membership.id,
    'labId', selected_membership.lab_id,
    'userId', selected_membership.user_id,
    'role', selected_membership.role,
    'status', selected_membership.status
  );

  UPDATE public.lab_memberships
  SET role = target_role
  WHERE id = selected_membership.id;

  after_snapshot := jsonb_build_object(
    'membershipId', selected_membership.id,
    'labId', selected_membership.lab_id,
    'userId', selected_membership.user_id,
    'role', target_role,
    'status', selected_membership.status
  );

  INSERT INTO public.lab_membership_action_logs(
    lab_id,
    membership_id,
    actor_user_id,
    target_user_id,
    action_type,
    reason,
    before_state,
    after_state
  )
  VALUES (
    target_lab_id,
    selected_membership.id,
    target_actor_id,
    target_member_user_id,
    'member_role_changed',
    role_change_reason,
    before_snapshot,
    after_snapshot
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_lab_member(UUID, UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.change_lab_member_role(UUID, UUID, UUID, public.lab_role)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_lab_member(UUID, UUID, UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.change_lab_member_role(UUID, UUID, UUID, public.lab_role)
  TO service_role;

COMMENT ON TABLE public.lab_membership_action_logs IS
  'Immutable server-side audit trail for Professor Lab membership removals and staff role changes. It stores no PDF, payment, or course-progress data.';
COMMENT ON FUNCTION public.remove_lab_member(UUID, UUID, UUID, TEXT) IS
  'Service-only atomic member removal: locks the Lab/member, revokes old-Lab summary consent, and writes the action log in one transaction.';
COMMENT ON FUNCTION public.change_lab_member_role(UUID, UUID, UUID, public.lab_role) IS
  'Service-only owner action for professor/assistant role changes. Student membership roles remain fixed.';
