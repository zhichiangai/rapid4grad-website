-- Meeting Intelligence V1: private student recordings and reviewable AI drafts.
-- No professor policy is granted on either table or the storage bucket.

CREATE TABLE IF NOT EXISTS public.meeting_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('recording', 'upload', 'transcript')),
  storage_path TEXT,
  original_filename TEXT,
  mime_type TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes > 0),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('uploading', 'queued', 'transcribing', 'analyzing', 'ready', 'failed')),
  provider TEXT,
  provider_model TEXT,
  error_code TEXT,
  raw_audio_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meeting_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL UNIQUE REFERENCES public.meeting_recordings(id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transcript_text TEXT NOT NULL CHECK (btrim(transcript_text) <> ''),
  transcript_segments JSONB,
  analysis JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'discarded')),
  user_edited BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meeting_recordings_student_meeting_idx
  ON public.meeting_recordings(student_user_id, meeting_id, created_at DESC);
CREATE INDEX IF NOT EXISTS meeting_intelligence_student_meeting_idx
  ON public.meeting_intelligence(student_user_id, meeting_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_meeting_intelligence_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = NEW.meeting_id
      AND m.student_user_id = NEW.student_user_id
      AND m.created_by = NEW.student_user_id
  ) THEN
    RAISE EXCEPTION 'meeting_intelligence_scope_invalid';
  END IF;
  IF TG_TABLE_NAME = 'meeting_intelligence' AND NOT EXISTS (
    SELECT 1 FROM public.meeting_recordings r
    WHERE r.id = NEW.recording_id
      AND r.meeting_id = NEW.meeting_id
      AND r.student_user_id = NEW.student_user_id
  ) THEN
    RAISE EXCEPTION 'meeting_intelligence_recording_scope_invalid';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_meeting_recording_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.meeting_id IS DISTINCT FROM NEW.meeting_id
     OR OLD.student_user_id IS DISTINCT FROM NEW.student_user_id
     OR OLD.source_type IS DISTINCT FROM NEW.source_type THEN
    RAISE EXCEPTION 'meeting_recording_identity_immutable';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_meeting_intelligence_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.meeting_id IS DISTINCT FROM NEW.meeting_id
     OR OLD.recording_id IS DISTINCT FROM NEW.recording_id
     OR OLD.student_user_id IS DISTINCT FROM NEW.student_user_id THEN
    RAISE EXCEPTION 'meeting_intelligence_identity_immutable';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_meeting_intelligence_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_meeting_recording_identity_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_meeting_intelligence_identity_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_meeting_intelligence_scope() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_meeting_recording_identity_change() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_meeting_intelligence_identity_change() TO service_role;

DROP TRIGGER IF EXISTS meeting_recordings_scope ON public.meeting_recordings;
CREATE TRIGGER meeting_recordings_scope
BEFORE INSERT OR UPDATE ON public.meeting_recordings
FOR EACH ROW EXECUTE FUNCTION public.enforce_meeting_intelligence_scope();

DROP TRIGGER IF EXISTS meeting_intelligence_scope ON public.meeting_intelligence;
CREATE TRIGGER meeting_intelligence_scope
BEFORE INSERT OR UPDATE ON public.meeting_intelligence
FOR EACH ROW EXECUTE FUNCTION public.enforce_meeting_intelligence_scope();

DROP TRIGGER IF EXISTS meeting_recordings_identity_immutable ON public.meeting_recordings;
CREATE TRIGGER meeting_recordings_identity_immutable
BEFORE UPDATE ON public.meeting_recordings
FOR EACH ROW EXECUTE FUNCTION public.prevent_meeting_recording_identity_change();

DROP TRIGGER IF EXISTS meeting_intelligence_identity_immutable ON public.meeting_intelligence;
CREATE TRIGGER meeting_intelligence_identity_immutable
BEFORE UPDATE ON public.meeting_intelligence
FOR EACH ROW EXECUTE FUNCTION public.prevent_meeting_intelligence_identity_change();

ALTER TABLE public.meeting_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_intelligence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_recordings_student_owner" ON public.meeting_recordings;
CREATE POLICY "meeting_recordings_student_owner"
ON public.meeting_recordings FOR ALL TO authenticated
USING (
  student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'student'
  )
)
WITH CHECK (
  student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'student'
  )
);

DROP POLICY IF EXISTS "meeting_intelligence_student_owner" ON public.meeting_intelligence;
CREATE POLICY "meeting_intelligence_student_owner"
ON public.meeting_intelligence FOR ALL TO authenticated
USING (
  student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'student'
  )
)
WITH CHECK (
  student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.role = 'student'
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meeting_recordings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meeting_intelligence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meeting_recordings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.meeting_intelligence TO service_role;

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meeting-audio',
  'meeting-audio',
  FALSE,
  104857600,
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE
SET public = FALSE, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "meeting_audio_student_owner_insert" ON storage.objects;
CREATE POLICY "meeting_audio_student_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'meeting-audio'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'student')
);

DROP POLICY IF EXISTS "meeting_audio_student_owner_select" ON storage.objects;
CREATE POLICY "meeting_audio_student_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'meeting-audio'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'student')
);

DROP POLICY IF EXISTS "meeting_audio_student_owner_update" ON storage.objects;
CREATE POLICY "meeting_audio_student_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'meeting-audio'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'student')
)
WITH CHECK (
  bucket_id = 'meeting-audio'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'student')
);

DROP POLICY IF EXISTS "meeting_audio_student_owner_delete" ON storage.objects;
CREATE POLICY "meeting_audio_student_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'meeting-audio'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'student')
);
