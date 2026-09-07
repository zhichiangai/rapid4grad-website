-- RAPID4GRAD Course Learning Center V1
-- Narrow Mux Direct Upload lifecycle metadata. Existing access/RLS semantics stay unchanged.

ALTER TABLE public.course_lessons
  ADD COLUMN video_upload_id TEXT,
  ADD COLUMN video_asset_id TEXT,
  ADD COLUMN video_status TEXT NOT NULL DEFAULT 'empty';

UPDATE public.course_lessons
SET video_status = CASE
  WHEN video_external_id IS NULL OR btrim(video_external_id) = '' THEN 'empty'
  ELSE 'ready'
END;

ALTER TABLE public.course_lessons
  ADD CONSTRAINT course_lessons_video_status_check
  CHECK (video_status IN ('empty', 'uploading', 'processing', 'ready', 'errored'));

COMMENT ON COLUMN public.course_lessons.video_upload_id IS
  'Mux Direct Upload ID for the currently expected upload.';
COMMENT ON COLUMN public.course_lessons.video_asset_id IS
  'Mux Asset ID for the current video lifecycle.';
COMMENT ON COLUMN public.course_lessons.video_status IS
  'Mux lifecycle state: empty, uploading, processing, ready, or errored.';
