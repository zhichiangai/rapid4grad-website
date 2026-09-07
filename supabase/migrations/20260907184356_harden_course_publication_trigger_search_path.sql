-- Keep the V3 publication trigger isolated from caller-controlled search_path resolution.
ALTER FUNCTION public.sync_course_lesson_publication_state()
  SET search_path = '';
