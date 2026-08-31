-- RAPID4GRAD Thesis Progress Tracker V1
-- Student-private milestone navigation. No Professor, Assistant, or Admin read access.

CREATE TABLE public.thesis_milestones (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  milestone_key TEXT NOT NULL CHECK (milestone_key IN (
    'research_direction', 'literature_review', 'methodology', 'proposal',
    'research_execution', 'analysis_results', 'writing_revision', 'defense_graduation'
  )),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    status IN ('not_started', 'in_progress', 'blocked', 'completed')
  ),
  target_date DATE,
  note TEXT CHECK (note IS NULL OR char_length(note) <= 1000),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT thesis_milestones_student_key UNIQUE (student_user_id, milestone_key),
  CONSTRAINT thesis_milestones_completion_consistency CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  )
);

CREATE INDEX thesis_milestones_student_order_idx
  ON public.thesis_milestones(student_user_id, milestone_key);

CREATE OR REPLACE FUNCTION public.sync_thesis_milestone_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    NEW.completed_at := CASE
      WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.completed_at, timezone('utc', now()))
      ELSE timezone('utc', now())
    END;
  ELSE
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER thesis_milestones_sync_completed_at
BEFORE INSERT OR UPDATE ON public.thesis_milestones
FOR EACH ROW EXECUTE FUNCTION public.sync_thesis_milestone_completed_at();

CREATE TRIGGER thesis_milestones_set_updated_at
BEFORE UPDATE ON public.thesis_milestones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.thesis_milestones ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public.thesis_milestones TO authenticated;
REVOKE UPDATE, DELETE ON TABLE public.thesis_milestones FROM authenticated;
GRANT UPDATE (status, target_date, note) ON TABLE public.thesis_milestones TO authenticated;

CREATE POLICY "thesis_milestones_select_own_active_student"
ON public.thesis_milestones FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND student_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'student'
  )
);

CREATE POLICY "thesis_milestones_insert_own_active_student"
ON public.thesis_milestones FOR INSERT TO authenticated
WITH CHECK (
  app_private.is_active_user((SELECT auth.uid()))
  AND student_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'student'
  )
);

CREATE POLICY "thesis_milestones_update_own_active_student"
ON public.thesis_milestones FOR UPDATE TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND student_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'student'
  )
)
WITH CHECK (
  app_private.is_active_user((SELECT auth.uid()))
  AND student_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'student'
  )
);

REVOKE ALL ON FUNCTION public.sync_thesis_milestone_completed_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_thesis_milestone_completed_at() TO service_role;
