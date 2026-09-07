-- Student Personal Navigation V1
-- NULL lab_id is the Personal scope. Existing non-NULL rows remain Lab-scoped.
-- This migration only relaxes scope columns and narrows/replaces RLS policies;
-- it does not rewrite or delete existing rows.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.weekly_updates
    GROUP BY student_user_id, week_start
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'weekly_updates_duplicate_student_week_requires_manual_review';
  END IF;
END
$$;

ALTER TABLE public.weekly_updates
  ALTER COLUMN lab_id DROP NOT NULL;
ALTER TABLE public.meetings
  ALTER COLUMN lab_id DROP NOT NULL;
ALTER TABLE public.meeting_actions
  ALTER COLUMN lab_id DROP NOT NULL;

ALTER TABLE public.weekly_updates
  DROP CONSTRAINT IF EXISTS weekly_updates_lab_student_week_key;

CREATE UNIQUE INDEX IF NOT EXISTS weekly_updates_student_week_key
  ON public.weekly_updates(student_user_id, week_start);

COMMENT ON COLUMN public.weekly_updates.lab_id IS
  'NULL means Personal scope; non-NULL preserves Lab-scoped history.';
COMMENT ON COLUMN public.meetings.lab_id IS
  'NULL means a Student Personal Meeting; non-NULL is a Lab Meeting.';
COMMENT ON COLUMN public.meeting_actions.lab_id IS
  'Inherited from the source Meeting; NULL means a Personal Action.';

-- Keep the nullable Personal scope safe: the legacy composite FK does not
-- validate rows when lab_id is NULL, so every Action must also match its
-- source Meeting by student and Personal/Lab scope.
ALTER TABLE public.meeting_actions
  ADD CONSTRAINT meeting_actions_meeting_fk
  FOREIGN KEY (meeting_id)
  REFERENCES public.meetings(id)
  ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.enforce_meeting_action_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  source_student UUID;
  source_lab UUID;
BEGIN
  SELECT meeting.student_user_id, meeting.lab_id
  INTO source_student, source_lab
  FROM public.meetings AS meeting
  WHERE meeting.id = NEW.meeting_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'meeting_action_meeting_not_found';
  END IF;

  IF source_student IS DISTINCT FROM NEW.student_user_id
     OR source_lab IS DISTINCT FROM NEW.lab_id THEN
    RAISE EXCEPTION 'meeting_action_scope_mismatch';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_meeting_action_scope ON public.meeting_actions;
CREATE TRIGGER enforce_meeting_action_scope
BEFORE INSERT OR UPDATE OF meeting_id, lab_id, student_user_id
ON public.meeting_actions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_meeting_action_scope();

CREATE OR REPLACE FUNCTION public.prevent_weekly_update_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.student_user_id IS DISTINCT FROM NEW.student_user_id
     OR OLD.week_start IS DISTINCT FROM NEW.week_start THEN
    RAISE EXCEPTION 'weekly_update_identity_immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "weekly_updates_select_student_or_supervisor" ON public.weekly_updates;
DROP POLICY IF EXISTS "weekly_updates_insert_active_student" ON public.weekly_updates;
DROP POLICY IF EXISTS "weekly_updates_update_active_student" ON public.weekly_updates;

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

CREATE POLICY "weekly_updates_insert_personal_or_lab_student"
ON public.weekly_updates FOR INSERT TO authenticated
WITH CHECK (
  student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND (
    lab_id IS NULL
    OR (
      EXISTS (
        SELECT 1 FROM public.labs AS target_lab
        WHERE target_lab.id = weekly_updates.lab_id
          AND target_lab.status = 'active'::public.lab_status
      )
      AND app_private.is_active_lab_member(lab_id, ARRAY['student'::public.lab_role])
      AND app_private.has_active_lab_subscription(lab_id)
    )
  )
);

CREATE POLICY "weekly_updates_update_personal_or_lab_student"
ON public.weekly_updates FOR UPDATE TO authenticated
USING (
  student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
)
WITH CHECK (
  student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND (
    lab_id IS NULL
    OR (
      EXISTS (
        SELECT 1 FROM public.labs AS target_lab
        WHERE target_lab.id = weekly_updates.lab_id
          AND target_lab.status = 'active'::public.lab_status
      )
      AND app_private.is_active_lab_member(lab_id, ARRAY['student'::public.lab_role])
      AND app_private.has_active_lab_subscription(lab_id)
    )
  )
);

DROP POLICY IF EXISTS "meetings_insert_student" ON public.meetings;
DROP POLICY IF EXISTS "meetings_update_student" ON public.meetings;

CREATE POLICY "meetings_insert_personal_or_lab_student"
ON public.meetings FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND (
    lab_id IS NULL
    OR (
      EXISTS (
        SELECT 1 FROM public.labs AS target_lab
        WHERE target_lab.id = meetings.lab_id
          AND target_lab.status = 'active'::public.lab_status
      )
      AND app_private.is_active_lab_member(lab_id, ARRAY['student'::public.lab_role])
      AND app_private.has_active_lab_subscription(lab_id)
    )
  )
);

CREATE POLICY "meetings_update_personal_or_lab_student"
ON public.meetings FOR UPDATE TO authenticated
USING (
  student_user_id = (SELECT auth.uid())
  AND created_by = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND (
    lab_id IS NULL
    OR app_private.has_active_lab_subscription(lab_id)
  )
)
WITH CHECK (
  student_user_id = (SELECT auth.uid())
  AND created_by = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND (
    lab_id IS NULL
    OR (
      app_private.is_active_lab_member(lab_id, ARRAY['student'::public.lab_role])
      AND app_private.has_active_lab_subscription(lab_id)
    )
  )
);

DROP POLICY IF EXISTS "meeting_actions_insert_student" ON public.meeting_actions;
DROP POLICY IF EXISTS "meeting_actions_update_student" ON public.meeting_actions;

CREATE POLICY "meeting_actions_insert_personal_or_lab_student"
ON public.meeting_actions FOR INSERT TO authenticated
WITH CHECK (
  student_user_id = (SELECT auth.uid())
  AND owner_type = 'student'
  AND owner_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND (
    lab_id IS NULL
    OR (
      app_private.is_active_lab_member(lab_id, ARRAY['student'::public.lab_role])
      AND app_private.has_active_lab_subscription(lab_id)
    )
  )
);

CREATE POLICY "meeting_actions_update_personal_or_lab_student"
ON public.meeting_actions FOR UPDATE TO authenticated
USING (
  owner_type = 'student'
  AND owner_user_id = (SELECT auth.uid())
  AND student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND (
    lab_id IS NULL
    OR app_private.has_active_lab_subscription(lab_id)
  )
)
WITH CHECK (
  owner_type = 'student'
  AND owner_user_id = (SELECT auth.uid())
  AND student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND (
    lab_id IS NULL
    OR (
      app_private.is_active_lab_member(lab_id, ARRAY['student'::public.lab_role])
      AND app_private.has_active_lab_subscription(lab_id)
    )
  )
);
