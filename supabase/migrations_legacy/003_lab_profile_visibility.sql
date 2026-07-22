-- ============================================================
-- RAPID4GRAD Phase 2 — Lab profile visibility RLS
-- Migration: 003_lab_profile_visibility.sql
-- Scope: allow real professor dashboard to read active lab student profiles
-- without granting cross-lab profile access.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles: lab professor can view active lab students'
  ) THEN
    CREATE POLICY "profiles: lab professor can view active lab students"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.lab_memberships student_membership
          JOIN public.labs lab
            ON lab.id = student_membership.lab_id
          WHERE student_membership.user_id = profiles.id
            AND student_membership.role = 'student'
            AND student_membership.status = 'active'
            AND lab.owner_professor_id = (SELECT auth.uid())
        )
      );
  END IF;
END
$$;

-- ============================================================
-- END OF MIGRATION 003 LAB PROFILE VISIBILITY
-- ============================================================
