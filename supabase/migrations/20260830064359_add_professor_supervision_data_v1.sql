-- RAPID4GRAD Professor System Data Foundation V1.1
--
-- This migration adds only the three approved supervision tables. Authorization
-- stays split between the Next.js server boundary and RLS. The table-specific
-- integrity triggers below protect row identity only; they do not inspect auth,
-- membership, subscription or role state.

CREATE TABLE public.weekly_updates (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
  student_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  week_start DATE NOT NULL,
  completed_summary TEXT NOT NULL,
  blockers TEXT,
  next_plan TEXT NOT NULL,
  self_status TEXT NOT NULL CHECK (
    self_status IN ('on_track', 'slightly_behind', 'blocked')
  ),
  needs_professor_help TEXT NOT NULL CHECK (
    needs_professor_help IN ('none', 'next_meeting', 'soon')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT weekly_updates_week_start_monday CHECK (
    EXTRACT(ISODOW FROM week_start) = 1
  ),
  CONSTRAINT weekly_updates_summary_non_empty CHECK (
    btrim(completed_summary) <> ''
  ),
  CONSTRAINT weekly_updates_next_plan_non_empty CHECK (
    btrim(next_plan) <> ''
  ),
  CONSTRAINT weekly_updates_lab_student_week_key UNIQUE (
    lab_id, student_user_id, week_start
  )
);

CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
  student_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  meeting_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('scheduled', 'completed', 'canceled')
  ),
  summary TEXT,
  decisions TEXT,
  next_meeting_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT meetings_scope_key UNIQUE (id, lab_id, student_user_id)
);

CREATE TABLE public.meeting_actions (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  meeting_id UUID NOT NULL,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
  student_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('student', 'supervisor')),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  due_date DATE,
  status TEXT NOT NULL CHECK (
    status IN ('todo', 'doing', 'done', 'canceled')
  ),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT meeting_actions_title_non_empty CHECK (btrim(title) <> ''),
  CONSTRAINT meeting_actions_student_owner CHECK (
    owner_type <> 'student' OR owner_user_id = student_user_id
  ),
  CONSTRAINT meeting_actions_completion_consistency CHECK (
    (status = 'done' AND completed_at IS NOT NULL)
    OR (status <> 'done' AND completed_at IS NULL)
  ),
  CONSTRAINT meeting_actions_meeting_scope_fk
    FOREIGN KEY (meeting_id, lab_id, student_user_id)
    REFERENCES public.meetings(id, lab_id, student_user_id)
    ON DELETE RESTRICT
);

CREATE INDEX weekly_updates_lab_week_idx
  ON public.weekly_updates(lab_id, week_start DESC);

CREATE INDEX meetings_lab_student_at_idx
  ON public.meetings(lab_id, student_user_id, meeting_at DESC);

CREATE INDEX meetings_lab_status_at_idx
  ON public.meetings(lab_id, status, meeting_at);

CREATE INDEX meeting_actions_meeting_idx
  ON public.meeting_actions(meeting_id);

CREATE INDEX meeting_actions_lab_student_status_due_idx
  ON public.meeting_actions(lab_id, student_user_id, status, due_date);

CREATE OR REPLACE FUNCTION public.prevent_weekly_update_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.lab_id IS DISTINCT FROM NEW.lab_id
     OR OLD.student_user_id IS DISTINCT FROM NEW.student_user_id
     OR OLD.week_start IS DISTINCT FROM NEW.week_start THEN
    RAISE EXCEPTION 'weekly_update_identity_immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_meeting_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.lab_id IS DISTINCT FROM NEW.lab_id
     OR OLD.student_user_id IS DISTINCT FROM NEW.student_user_id
     OR OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'meeting_identity_immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_meeting_action_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.meeting_id IS DISTINCT FROM NEW.meeting_id
     OR OLD.lab_id IS DISTINCT FROM NEW.lab_id
     OR OLD.student_user_id IS DISTINCT FROM NEW.student_user_id
     OR OLD.owner_type IS DISTINCT FROM NEW.owner_type
     OR OLD.owner_user_id IS DISTINCT FROM NEW.owner_user_id THEN
    RAISE EXCEPTION 'meeting_action_identity_immutable';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_weekly_update_identity_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_meeting_identity_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_meeting_action_identity_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_weekly_update_identity_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_meeting_identity_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_meeting_action_identity_change() TO service_role;

CREATE TRIGGER weekly_updates_identity_immutable
BEFORE UPDATE ON public.weekly_updates
FOR EACH ROW EXECUTE FUNCTION public.prevent_weekly_update_identity_change();

CREATE TRIGGER weekly_updates_set_updated_at
BEFORE UPDATE ON public.weekly_updates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER meetings_identity_immutable
BEFORE UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.prevent_meeting_identity_change();

CREATE TRIGGER meetings_set_updated_at
BEFORE UPDATE ON public.meetings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER meeting_actions_identity_immutable
BEFORE UPDATE ON public.meeting_actions
FOR EACH ROW EXECUTE FUNCTION public.prevent_meeting_action_identity_change();

CREATE TRIGGER meeting_actions_set_updated_at
BEFORE UPDATE ON public.meeting_actions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.weekly_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_actions ENABLE ROW LEVEL SECURITY;

-- Students retain active-account access to their own history after leaving a
-- Lab. New writes still require active membership and a functional Lab mode.
CREATE POLICY "weekly_updates_select_student_or_supervisor"
ON public.weekly_updates FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (
    student_user_id = (SELECT auth.uid())
    OR app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
  )
);

CREATE POLICY "weekly_updates_insert_active_student"
ON public.weekly_updates FOR INSERT TO authenticated
WITH CHECK (
  student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = weekly_updates.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND app_private.is_active_lab_member(
    lab_id,
    ARRAY['student'::public.lab_role]
  )
  AND app_private.has_active_lab_subscription(lab_id)
);

CREATE POLICY "weekly_updates_update_active_student"
ON public.weekly_updates FOR UPDATE TO authenticated
USING (
  student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = weekly_updates.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND app_private.is_active_lab_member(
    lab_id,
    ARRAY['student'::public.lab_role]
  )
  AND app_private.has_active_lab_subscription(lab_id)
)
WITH CHECK (
  student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = weekly_updates.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND app_private.is_active_lab_member(
    lab_id,
    ARRAY['student'::public.lab_role]
  )
  AND app_private.has_active_lab_subscription(lab_id)
);

CREATE POLICY "meetings_select_student_or_supervisor"
ON public.meetings FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (
    student_user_id = (SELECT auth.uid())
    OR app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
  )
);

CREATE POLICY "meetings_insert_student"
ON public.meetings FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meetings.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND app_private.is_active_lab_member(
    lab_id,
    ARRAY['student'::public.lab_role]
  )
  AND app_private.has_active_lab_subscription(lab_id)
);

CREATE POLICY "meetings_insert_supervisor"
ON public.meetings FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meetings.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND (
    app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
  )
  AND app_private.has_active_lab_subscription(lab_id)
  AND EXISTS (
    SELECT 1
    FROM public.lab_memberships AS target_membership
    WHERE target_membership.lab_id = meetings.lab_id
      AND target_membership.user_id = meetings.student_user_id
      AND target_membership.role = 'student'::public.lab_role
      AND target_membership.status = 'active'::public.lab_membership_status
  )
);

CREATE POLICY "meetings_update_student"
ON public.meetings FOR UPDATE TO authenticated
USING (
  student_user_id = (SELECT auth.uid())
  AND created_by = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meetings.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND app_private.is_active_lab_member(
    lab_id,
    ARRAY['student'::public.lab_role]
  )
  AND app_private.has_active_lab_subscription(lab_id)
)
WITH CHECK (
  student_user_id = (SELECT auth.uid())
  AND created_by = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meetings.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND app_private.is_active_lab_member(
    lab_id,
    ARRAY['student'::public.lab_role]
  )
  AND app_private.has_active_lab_subscription(lab_id)
);

CREATE POLICY "meetings_update_supervisor"
ON public.meetings FOR UPDATE TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meetings.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND (
    app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
  )
  AND app_private.has_active_lab_subscription(lab_id)
)
WITH CHECK (
  app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meetings.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND (
    app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
  )
  AND app_private.has_active_lab_subscription(lab_id)
);

CREATE POLICY "meeting_actions_select_student_or_supervisor"
ON public.meeting_actions FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (
    student_user_id = (SELECT auth.uid())
    OR app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
  )
);

CREATE POLICY "meeting_actions_insert_student"
ON public.meeting_actions FOR INSERT TO authenticated
WITH CHECK (
  student_user_id = (SELECT auth.uid())
  AND owner_type = 'student'
  AND owner_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meeting_actions.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND app_private.is_active_lab_member(
    lab_id,
    ARRAY['student'::public.lab_role]
  )
  AND app_private.has_active_lab_subscription(lab_id)
);

CREATE POLICY "meeting_actions_insert_supervisor"
ON public.meeting_actions FOR INSERT TO authenticated
WITH CHECK (
  app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meeting_actions.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND (
    app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
  )
  AND app_private.has_active_lab_subscription(lab_id)
  AND EXISTS (
    SELECT 1
    FROM public.lab_memberships AS target_membership
    WHERE target_membership.lab_id = meeting_actions.lab_id
      AND target_membership.user_id = meeting_actions.student_user_id
      AND target_membership.role = 'student'::public.lab_role
      AND target_membership.status = 'active'::public.lab_membership_status
  )
  AND (
    (
      owner_type = 'student'
      AND owner_user_id = meeting_actions.student_user_id
    )
    OR (
      owner_type = 'supervisor'
      AND (
        owner_user_id = (SELECT l.owner_professor_id FROM public.labs AS l WHERE l.id = meeting_actions.lab_id)
        OR EXISTS (
          SELECT 1
          FROM public.lab_memberships AS owner_membership
          WHERE owner_membership.lab_id = meeting_actions.lab_id
            AND owner_membership.user_id = meeting_actions.owner_user_id
            AND owner_membership.role IN (
              'professor'::public.lab_role,
              'assistant'::public.lab_role
            )
            AND owner_membership.status = 'active'::public.lab_membership_status
        )
      )
    )
  )
);

CREATE POLICY "meeting_actions_update_student"
ON public.meeting_actions FOR UPDATE TO authenticated
USING (
  owner_type = 'student'
  AND owner_user_id = (SELECT auth.uid())
  AND student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meeting_actions.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND app_private.is_active_lab_member(
    lab_id,
    ARRAY['student'::public.lab_role]
  )
  AND app_private.has_active_lab_subscription(lab_id)
)
WITH CHECK (
  owner_type = 'student'
  AND owner_user_id = (SELECT auth.uid())
  AND student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meeting_actions.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND app_private.is_active_lab_member(
    lab_id,
    ARRAY['student'::public.lab_role]
  )
  AND app_private.has_active_lab_subscription(lab_id)
);

CREATE POLICY "meeting_actions_update_supervisor"
ON public.meeting_actions FOR UPDATE TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meeting_actions.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND (
    app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
  )
  AND app_private.has_active_lab_subscription(lab_id)
)
WITH CHECK (
  app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.labs AS target_lab
    WHERE target_lab.id = meeting_actions.lab_id
      AND target_lab.status = 'active'::public.lab_status
  )
  AND (
    app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
  )
  AND app_private.has_active_lab_subscription(lab_id)
);

GRANT SELECT, INSERT, UPDATE ON TABLE public.weekly_updates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.meeting_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.weekly_updates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meetings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meeting_actions TO service_role;
