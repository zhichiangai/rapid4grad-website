-- RAPID4GRAD V2 Task 4
-- Keep anonymous preview reads independent from authenticated-only entitlement helpers.

DROP POLICY IF EXISTS "course_lessons_select_by_access"
ON public.course_lessons;

CREATE POLICY "course_lessons_select_public_preview"
ON public.course_lessons
FOR SELECT
TO anon, authenticated
USING (
  is_published
  AND access_level = 'public_preview'::public.lesson_access_level
  AND EXISTS (
    SELECT 1
    FROM public.courses AS course
    WHERE course.id = course_lessons.course_id
      AND course.is_published
  )
);

CREATE POLICY "course_lessons_select_authenticated_access"
ON public.course_lessons
FOR SELECT
TO authenticated
USING (
  is_published
  AND EXISTS (
    SELECT 1
    FROM public.courses AS course
    WHERE course.id = course_lessons.course_id
      AND course.is_published
  )
  AND (
    app_private.has_active_course_full((SELECT auth.uid()))
    OR (
      access_level = 'lab_basic'::public.lesson_access_level
      AND app_private.has_lab_basic_access((SELECT auth.uid()))
    )
  )
);

COMMENT ON POLICY "course_lessons_select_public_preview"
ON public.course_lessons IS
  'Anonymous and authenticated users may read only published public previews without invoking private entitlement helpers.';

COMMENT ON POLICY "course_lessons_select_authenticated_access"
ON public.course_lessons IS
  'Authenticated users receive Lab lessons dynamically or all course tiers through a permanent course_full entitlement.';
