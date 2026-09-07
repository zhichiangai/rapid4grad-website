-- RAPID4GRAD Course Intelligence V3
-- Additive learning operations foundation. No existing learner data is deleted.

ALTER TABLE public.course_lessons
  ADD COLUMN publication_state TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN paused_at TIMESTAMPTZ,
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN pause_reason TEXT;

UPDATE public.course_lessons
SET publication_state = CASE WHEN is_published THEN 'live' ELSE 'draft' END;

ALTER TABLE public.course_lessons
  ADD CONSTRAINT course_lessons_publication_state_check
  CHECK (publication_state IN ('draft', 'live', 'paused', 'archived'));

CREATE OR REPLACE FUNCTION public.sync_course_lesson_publication_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_published THEN
      NEW.publication_state := 'live';
    ELSE
      NEW.publication_state := COALESCE(NULLIF(NEW.publication_state, ''), 'draft');
    END IF;
  ELSIF NEW.publication_state IS DISTINCT FROM OLD.publication_state THEN
    NEW.is_published := NEW.publication_state = 'live';
  ELSIF NEW.is_published IS DISTINCT FROM OLD.is_published THEN
    NEW.publication_state := CASE WHEN NEW.is_published THEN 'live' ELSE 'draft' END;
  END IF;

  IF NEW.publication_state = 'live' THEN
    NEW.is_published := TRUE;
    NEW.paused_at := NULL;
    NEW.archived_at := NULL;
  ELSE
    NEW.is_published := FALSE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_lessons_sync_publication_state ON public.course_lessons;
CREATE TRIGGER course_lessons_sync_publication_state
BEFORE INSERT OR UPDATE OF publication_state, is_published ON public.course_lessons
FOR EACH ROW EXECUTE FUNCTION public.sync_course_lesson_publication_state();

CREATE INDEX course_lessons_publication_state_idx
  ON public.course_lessons(publication_state, sort_order);

CREATE TABLE public.course_video_versions (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  video_provider TEXT NOT NULL,
  mux_asset_id TEXT,
  playback_id TEXT,
  mux_upload_id TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'retired', 'errored')),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  activated_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (lesson_id, version_number)
);

CREATE INDEX course_video_versions_lesson_idx
  ON public.course_video_versions(lesson_id, version_number DESC);

INSERT INTO public.course_video_versions
  (lesson_id, version_number, video_provider, mux_asset_id, playback_id, status, activated_at)
SELECT id, 1, video_provider, video_asset_id, video_external_id, 'ready', created_at
FROM public.course_lessons
WHERE video_external_id IS NOT NULL
ON CONFLICT (lesson_id, version_number) DO NOTHING;

CREATE TABLE public.course_view_sessions (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  video_version_id UUID REFERENCES public.course_video_versions(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  last_position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
  max_position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (max_position_seconds >= 0),
  watch_time_seconds INTEGER NOT NULL DEFAULT 0 CHECK (watch_time_seconds >= 0),
  completed_at TIMESTAMPTZ,
  error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX course_view_sessions_lesson_idx
  ON public.course_view_sessions(lesson_id, created_at DESC);
CREATE INDEX course_view_sessions_user_idx
  ON public.course_view_sessions(user_id, created_at DESC);
CREATE INDEX course_view_sessions_version_idx
  ON public.course_view_sessions(video_version_id, created_at DESC);

CREATE TABLE public.course_watch_segments (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.course_view_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  video_version_id UUID REFERENCES public.course_video_versions(id) ON DELETE SET NULL,
  sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
  start_seconds INTEGER NOT NULL CHECK (start_seconds >= 0),
  end_seconds INTEGER NOT NULL CHECK (end_seconds >= start_seconds),
  transition_kind TEXT NOT NULL DEFAULT 'continuous' CHECK (transition_kind IN ('continuous', 'forward_skip', 'backward_replay')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (session_id, sequence_number)
);

CREATE INDEX course_watch_segments_lesson_idx
  ON public.course_watch_segments(lesson_id, start_seconds, end_seconds);
CREATE INDEX course_watch_segments_session_idx
  ON public.course_watch_segments(session_id, sequence_number);

CREATE TABLE public.course_questions (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  video_version_id UUID REFERENCES public.course_video_versions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp_seconds INTEGER NOT NULL CHECK (timestamp_seconds >= 0),
  kind TEXT NOT NULL DEFAULT 'question' CHECK (kind IN ('question', 'unclear')),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 4000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'resolved')),
  admin_answer TEXT CHECK (admin_answer IS NULL OR char_length(admin_answer) <= 4000),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT course_questions_body_required CHECK (kind = 'unclear' OR NULLIF(btrim(body), '') IS NOT NULL)
);

CREATE INDEX course_questions_lesson_time_idx
  ON public.course_questions(lesson_id, timestamp_seconds, created_at DESC);
CREATE INDEX course_questions_status_idx
  ON public.course_questions(status, created_at DESC);
CREATE INDEX course_questions_user_idx
  ON public.course_questions(user_id, created_at DESC);

ALTER TABLE public.course_video_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_view_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_watch_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_questions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.course_view_sessions TO authenticated;
GRANT SELECT, INSERT ON public.course_watch_segments TO authenticated;
GRANT SELECT, INSERT ON public.course_questions TO authenticated;

CREATE POLICY "course_view_sessions_owner_select"
ON public.course_view_sessions FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "course_view_sessions_owner_insert"
ON public.course_view_sessions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "course_view_sessions_owner_update"
ON public.course_view_sessions FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "course_watch_segments_owner_select"
ON public.course_watch_segments FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "course_watch_segments_owner_insert"
ON public.course_watch_segments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "course_questions_owner_select"
ON public.course_questions FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "course_questions_owner_insert"
ON public.course_questions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
COMMENT ON TABLE public.course_view_sessions IS
  'Identified learner viewing sessions; Admin Preview never writes here.';
COMMENT ON TABLE public.course_watch_segments IS
  'Contiguous learner watch segments used to derive skips and replays.';
COMMENT ON TABLE public.course_questions IS
  'Timestamped learner questions and unclear signals; Admin reads through trusted server access.';
