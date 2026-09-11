-- RAPID4GRAD Professor Supervision OS V1 additive foundation.
-- No existing table, column, policy or data is dropped or rewritten.

CREATE TABLE public.lab_milestones (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  description TEXT,
  target_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'canceled', 'archived')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX lab_milestones_lab_target_idx
  ON public.lab_milestones(lab_id, target_date);
CREATE INDEX lab_milestones_lab_status_target_idx
  ON public.lab_milestones(lab_id, status, target_date);

CREATE TABLE public.lab_resources (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (btrim(title) <> ''),
  description TEXT,
  category TEXT,
  resource_url TEXT NOT NULL CHECK (btrim(resource_url) <> ''),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  archived_at TIMESTAMPTZ
);

CREATE INDEX lab_resources_lab_archived_created_idx
  ON public.lab_resources(lab_id, archived_at, created_at DESC);

CREATE TABLE public.ai_operations (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  lab_id UUID REFERENCES public.labs(id) ON DELETE RESTRICT,
  context_type TEXT NOT NULL,
  context_id UUID,
  intent TEXT NOT NULL,
  proposal JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'executing', 'confirmed', 'canceled', 'failed', 'expired')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  audio_seconds NUMERIC(10, 2),
  cost_estimate_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  confirmed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc', now()) + interval '90 days'),
  CONSTRAINT ai_operations_proposal_object CHECK (jsonb_typeof(proposal) = 'object'),
  CONSTRAINT ai_operations_non_negative_usage CHECK (
    (input_tokens IS NULL OR input_tokens >= 0)
    AND (output_tokens IS NULL OR output_tokens >= 0)
    AND (audio_seconds IS NULL OR audio_seconds >= 0)
    AND (cost_estimate_cents IS NULL OR cost_estimate_cents >= 0)
  )
);

CREATE INDEX ai_operations_user_created_idx
  ON public.ai_operations(user_id, created_at DESC);
CREATE INDEX ai_operations_lab_created_idx
  ON public.ai_operations(lab_id, created_at DESC)
  WHERE lab_id IS NOT NULL;
CREATE INDEX ai_operations_expires_idx
  ON public.ai_operations(expires_at);

CREATE OR REPLACE FUNCTION public.prevent_lab_milestone_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.lab_id IS DISTINCT FROM NEW.lab_id
     OR OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'lab_milestone_identity_immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_lab_resource_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.lab_id IS DISTINCT FROM NEW.lab_id
     OR OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'lab_resource_identity_immutable';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_lab_milestone_identity_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_lab_resource_identity_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_lab_milestone_identity_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_lab_resource_identity_change() TO service_role;

CREATE TRIGGER lab_milestones_identity_immutable
BEFORE UPDATE ON public.lab_milestones
FOR EACH ROW EXECUTE FUNCTION public.prevent_lab_milestone_identity_change();

CREATE TRIGGER lab_milestones_set_updated_at
BEFORE UPDATE ON public.lab_milestones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER lab_resources_identity_immutable
BEFORE UPDATE ON public.lab_resources
FOR EACH ROW EXECUTE FUNCTION public.prevent_lab_resource_identity_change();

CREATE TRIGGER lab_resources_set_updated_at
BEFORE UPDATE ON public.lab_resources
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lab_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_milestones_select_active_lab_members"
ON public.lab_milestones FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (
    app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role, 'student'::public.lab_role]
    )
  )
);

CREATE POLICY "lab_milestones_insert_professor"
ON public.lab_milestones FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND app_private.has_active_lab_subscription(lab_id)
  AND (
    app_private.owns_lab(lab_id)
    OR EXISTS (
      SELECT 1 FROM public.lab_memberships AS membership
      WHERE membership.lab_id = lab_milestones.lab_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role = 'professor'::public.lab_role
        AND membership.status = 'active'::public.lab_membership_status
    )
  )
);

CREATE POLICY "lab_milestones_update_professor"
ON public.lab_milestones FOR UPDATE TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND app_private.has_active_lab_subscription(lab_id)
  AND (
    app_private.owns_lab(lab_id)
    OR EXISTS (
      SELECT 1 FROM public.lab_memberships AS membership
      WHERE membership.lab_id = lab_milestones.lab_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role = 'professor'::public.lab_role
        AND membership.status = 'active'::public.lab_membership_status
    )
  )
)
WITH CHECK (
  app_private.is_active_user((SELECT auth.uid()))
  AND app_private.has_active_lab_subscription(lab_id)
  AND (
    app_private.owns_lab(lab_id)
    OR EXISTS (
      SELECT 1 FROM public.lab_memberships AS membership
      WHERE membership.lab_id = lab_milestones.lab_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role = 'professor'::public.lab_role
        AND membership.status = 'active'::public.lab_membership_status
    )
  )
);

CREATE POLICY "lab_resources_select_active_lab_members"
ON public.lab_resources FOR SELECT TO authenticated
USING (
  archived_at IS NULL
  AND app_private.is_active_user((SELECT auth.uid()))
  AND (
    app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role, 'student'::public.lab_role]
    )
  )
);

CREATE POLICY "lab_resources_insert_professor"
ON public.lab_resources FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND archived_at IS NULL
  AND app_private.is_active_user((SELECT auth.uid()))
  AND app_private.has_active_lab_subscription(lab_id)
  AND (
    app_private.owns_lab(lab_id)
    OR EXISTS (
      SELECT 1 FROM public.lab_memberships AS membership
      WHERE membership.lab_id = lab_resources.lab_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role = 'professor'::public.lab_role
        AND membership.status = 'active'::public.lab_membership_status
    )
  )
);

CREATE POLICY "lab_resources_update_professor"
ON public.lab_resources FOR UPDATE TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND app_private.has_active_lab_subscription(lab_id)
  AND (
    app_private.owns_lab(lab_id)
    OR EXISTS (
      SELECT 1 FROM public.lab_memberships AS membership
      WHERE membership.lab_id = lab_resources.lab_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role = 'professor'::public.lab_role
        AND membership.status = 'active'::public.lab_membership_status
    )
  )
)
WITH CHECK (
  app_private.is_active_user((SELECT auth.uid()))
  AND app_private.has_active_lab_subscription(lab_id)
  AND (
    app_private.owns_lab(lab_id)
    OR EXISTS (
      SELECT 1 FROM public.lab_memberships AS membership
      WHERE membership.lab_id = lab_resources.lab_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.role = 'professor'::public.lab_role
        AND membership.status = 'active'::public.lab_membership_status
    )
  )
);

CREATE POLICY "ai_operations_select_authorized_unexpired"
ON public.ai_operations FOR SELECT TO authenticated
USING (
  expires_at > timezone('utc', now())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND (
    user_id = (SELECT auth.uid())
    OR app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
  )
);

CREATE POLICY "ai_operations_insert_self"
ON public.ai_operations FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND (
    lab_id IS NULL
    OR app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
  )
);

GRANT SELECT, INSERT, UPDATE ON TABLE public.lab_milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lab_resources TO authenticated;
GRANT SELECT, INSERT ON TABLE public.ai_operations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lab_milestones TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lab_resources TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_operations TO service_role;
