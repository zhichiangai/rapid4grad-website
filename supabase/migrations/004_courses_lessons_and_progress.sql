-- RAPID4GRAD V2 baseline 004
-- Course catalog, lesson access tiers, and student-private progress.

CREATE TYPE public.lesson_access_level AS ENUM (
  'public_preview',
  'lab_basic',
  'full_course'
);
CREATE TYPE public.lesson_progress_status AS ENUM (
  'not_started',
  'in_progress',
  'completed'
);

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER courses_set_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.course_lessons (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  module_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  access_level public.lesson_access_level NOT NULL,
  video_provider TEXT NOT NULL DEFAULT 'youtube',
  video_external_id TEXT,
  material_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (course_id, slug),
  UNIQUE (course_id, sort_order)
);

CREATE INDEX course_lessons_access_published_idx
  ON public.course_lessons(course_id, access_level, is_published, sort_order);

CREATE TRIGGER course_lessons_set_updated_at
BEFORE UPDATE ON public.course_lessons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.course_progress (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  status public.lesson_progress_status NOT NULL DEFAULT 'not_started',
  progress_seconds INTEGER NOT NULL DEFAULT 0 CHECK (progress_seconds >= 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, lesson_id),
  CONSTRAINT course_progress_completion_consistent CHECK (
    (status = 'completed' AND completed_at IS NOT NULL)
    OR (status <> 'completed' AND completed_at IS NULL)
  )
);

CREATE INDEX course_progress_user_updated_idx
  ON public.course_progress(user_id, updated_at DESC);

CREATE TRIGGER course_progress_set_updated_at
BEFORE UPDATE ON public.course_progress
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.course_progress IS
  'Student-private viewing progress. Professor and assistant roles receive no SELECT policy.';
