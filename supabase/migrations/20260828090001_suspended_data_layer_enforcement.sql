-- RAPID4GRAD Permission Foundation V1.1
--
-- Suspended accounts may retain a valid JWT for public routes and the account
-- suspension page, but must not use that JWT to read or mutate private product
-- data through the Supabase Data API or private Storage policies.
--
-- This migration intentionally keeps profile self-read available so the
-- application can determine account_status. It does not change public catalog
-- access, public course previews, bucket visibility, or service_role access.

-- Profiles are a special authorization bootstrap resource. A suspended user
-- may read only their own profile, while cross-profile admin observation and
-- every self update require an active account.
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

CREATE POLICY "profiles_select_self_or_active_admin"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = (SELECT auth.uid())
  OR (
    app_private.is_active_user((SELECT auth.uid()))
    AND app_private.is_admin()
  )
);

CREATE POLICY "profiles_update_active_self"
ON public.profiles FOR UPDATE TO authenticated
USING (
  id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
)
WITH CHECK (
  id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
);

-- Phase 1 owner/admin history remains private and is unavailable to suspended
-- accounts, including suspended admins.
DROP POLICY IF EXISTS "leads_select_owner_or_admin" ON public.leads;
DROP POLICY IF EXISTS "quiz_answers_select_owner_or_admin" ON public.quiz_answers;
DROP POLICY IF EXISTS "ai_instruction_usages_select_owner_or_admin" ON public.ai_instruction_usages;

CREATE POLICY "leads_select_active_owner_or_admin"
ON public.leads FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (user_id = (SELECT auth.uid()) OR app_private.is_admin())
);

CREATE POLICY "quiz_answers_select_active_owner_or_admin"
ON public.quiz_answers FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (user_id = (SELECT auth.uid()) OR app_private.is_admin())
);

CREATE POLICY "ai_instruction_usages_select_active_owner_or_admin"
ON public.ai_instruction_usages FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (user_id = (SELECT auth.uid()) OR app_private.is_admin())
);

-- Paid course and commerce records are private authenticated product data.
DROP POLICY IF EXISTS "orders_select_owner_or_admin" ON public.orders;
DROP POLICY IF EXISTS "payments_select_owner_or_admin" ON public.payments;
DROP POLICY IF EXISTS "entitlements_select_owner_or_admin" ON public.entitlements;
DROP POLICY IF EXISTS "course_access_select_owner_or_admin" ON public.course_access;

CREATE POLICY "orders_select_active_owner_or_admin"
ON public.orders FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (user_id = (SELECT auth.uid()) OR app_private.is_admin())
);

CREATE POLICY "payments_select_active_owner_or_admin"
ON public.payments FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (user_id = (SELECT auth.uid()) OR app_private.is_admin())
);

CREATE POLICY "entitlements_select_active_owner_or_admin"
ON public.entitlements FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (user_id = (SELECT auth.uid()) OR app_private.is_admin())
);

CREATE POLICY "course_access_select_active_owner_or_admin"
ON public.course_access FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (user_id = (SELECT auth.uid()) OR app_private.is_admin())
);

-- Public preview remains public. Paid and Lab-scoped lessons require an active
-- account before private entitlement helpers are evaluated.
DROP POLICY IF EXISTS "course_lessons_select_authenticated_access" ON public.course_lessons;

CREATE POLICY "course_lessons_select_active_authenticated_access"
ON public.course_lessons FOR SELECT TO authenticated
USING (
  is_published
  AND app_private.is_active_user((SELECT auth.uid()))
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

DROP POLICY IF EXISTS "course_progress_select_owner" ON public.course_progress;
DROP POLICY IF EXISTS "course_progress_insert_owner" ON public.course_progress;
DROP POLICY IF EXISTS "course_progress_update_owner" ON public.course_progress;

CREATE POLICY "course_progress_select_active_owner"
ON public.course_progress FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
);

CREATE POLICY "course_progress_insert_active_owner"
ON public.course_progress FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1
    FROM public.course_lessons AS lesson
    WHERE lesson.id = course_progress.lesson_id
  )
);

CREATE POLICY "course_progress_update_active_owner"
ON public.course_progress FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
);

-- Lab scope predicates are preserved exactly; active account is an additional
-- gate and does not grant cross-Lab visibility.
DROP POLICY IF EXISTS "labs_select_member_owner_or_admin" ON public.labs;
DROP POLICY IF EXISTS "lab_memberships_select_scoped" ON public.lab_memberships;
DROP POLICY IF EXISTS "subscriptions_select_owner_or_admin" ON public.subscriptions;
DROP POLICY IF EXISTS "subscription_items_select_owner_or_admin" ON public.subscription_items;

CREATE POLICY "labs_select_active_member_owner_or_admin"
ON public.labs FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (
    owner_professor_id = (SELECT auth.uid())
    OR app_private.is_active_lab_member(id, NULL)
    OR app_private.is_admin()
  )
);

CREATE POLICY "lab_memberships_select_active_scoped"
ON public.lab_memberships FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (
    user_id = (SELECT auth.uid())
    OR app_private.owns_lab(lab_id)
    OR app_private.is_active_lab_member(
      lab_id,
      ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
    )
    OR app_private.is_admin()
  )
);

CREATE POLICY "subscriptions_select_active_owner_or_admin"
ON public.subscriptions FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND (
    payer_user_id = (SELECT auth.uid())
    OR app_private.owns_lab(lab_id)
    OR app_private.is_admin()
  )
);

CREATE POLICY "subscription_items_select_active_owner_or_admin"
ON public.subscription_items FOR SELECT TO authenticated
USING (
  app_private.is_active_user((SELECT auth.uid()))
  AND EXISTS (
    SELECT 1
    FROM public.subscriptions AS subscription
    WHERE subscription.id = subscription_items.subscription_id
      AND (
        subscription.payer_user_id = (SELECT auth.uid())
        OR app_private.owns_lab(subscription.lab_id)
        OR app_private.is_admin()
      )
  )
);

-- Private PDF metadata and raw audit rows remain owner-only. This migration
-- intentionally creates no admin, professor, or assistant bypass.
DROP POLICY IF EXISTS "student_documents_select_owner" ON public.student_documents;
DROP POLICY IF EXISTS "student_documents_delete_owner" ON public.student_documents;
DROP POLICY IF EXISTS "ai_audit_jobs_select_owner" ON public.ai_audit_jobs;
DROP POLICY IF EXISTS "ai_audit_results_select_owner" ON public.ai_audit_results;
DROP POLICY IF EXISTS "audit_summary_shares_select_owner" ON public.audit_summary_shares;

CREATE POLICY "student_documents_select_active_owner"
ON public.student_documents FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
);

CREATE POLICY "student_documents_delete_active_owner"
ON public.student_documents FOR DELETE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
);

CREATE POLICY "ai_audit_jobs_select_active_owner"
ON public.ai_audit_jobs FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
);

CREATE POLICY "ai_audit_results_select_active_owner"
ON public.ai_audit_results FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
);

CREATE POLICY "audit_summary_shares_select_active_owner"
ON public.audit_summary_shares FOR SELECT TO authenticated
USING (
  student_user_id = (SELECT auth.uid())
  AND app_private.is_active_user((SELECT auth.uid()))
);

-- Browser clients have no direct student-documents upload policy because the
-- server issues signed upload tokens only after its active-user check. Existing
-- private object reads and deletes require the account to remain active.
DROP POLICY IF EXISTS "student_documents_storage_select_owner" ON storage.objects;
DROP POLICY IF EXISTS "student_documents_storage_delete_owner" ON storage.objects;
DROP POLICY IF EXISTS "ai_audit_exports_storage_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "ai_audit_exports_storage_select_owner" ON storage.objects;
DROP POLICY IF EXISTS "ai_audit_exports_storage_delete_owner" ON storage.objects;

CREATE POLICY "student_documents_storage_select_active_owner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  AND app_private.is_active_user((SELECT auth.uid()))
);

CREATE POLICY "student_documents_storage_delete_active_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  AND app_private.is_active_user((SELECT auth.uid()))
);

CREATE POLICY "ai_audit_exports_storage_insert_active_owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ai-audit-exports'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  AND app_private.is_active_user((SELECT auth.uid()))
);

CREATE POLICY "ai_audit_exports_storage_select_active_owner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ai-audit-exports'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  AND app_private.is_active_user((SELECT auth.uid()))
);

CREATE POLICY "ai_audit_exports_storage_delete_active_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ai-audit-exports'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  AND app_private.is_active_user((SELECT auth.uid()))
);

-- Existing signed URLs can remain usable until their normal expiration. The
-- active-account checks prevent suspended users from obtaining new signed URLs
-- through the authenticated product APIs and direct Storage policies.

-- SECURITY DEFINER RPCs must enforce account status before they read any
-- private Lab, credit, document, or audit data. Table RLS cannot protect these
-- functions because SECURITY DEFINER executes with the function owner's rights.
CREATE OR REPLACE FUNCTION public.get_my_lab_pdf_credit_balance()
RETURNS TABLE (
  lab_id UUID,
  pdf_audit_limit INTEGER,
  pdf_audit_reserved INTEGER,
  pdf_audit_used INTEGER,
  pdf_audit_remaining INTEGER,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_user_id UUID := (SELECT auth.uid());
  selected_credit public.lab_usage_credits%ROWTYPE;
BEGIN
  IF selected_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF NOT app_private.is_active_user(selected_user_id) THEN
    RAISE EXCEPTION 'account_suspended';
  END IF;

  SELECT ensured_credit.*
  INTO selected_credit
  FROM app_private.ensure_lab_pdf_credit_period(selected_user_id) AS ensured_credit;

  RETURN QUERY
  SELECT
    selected_credit.lab_id,
    selected_credit.pdf_audit_limit,
    selected_credit.pdf_audit_reserved,
    selected_credit.pdf_audit_used,
    GREATEST(
      selected_credit.pdf_audit_limit
        - selected_credit.pdf_audit_reserved
        - selected_credit.pdf_audit_used,
      0
    ),
    selected_credit.period_start,
    selected_credit.period_end;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_shared_audit_summaries(
  target_lab_id UUID,
  target_student_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  student_user_id UUID,
  summary TEXT,
  risk_level public.risk_level,
  issue_tags TEXT[],
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_user_id UUID := (SELECT auth.uid());
BEGIN
  IF selected_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required';
  END IF;

  IF NOT app_private.is_active_user(selected_user_id) THEN
    RAISE EXCEPTION 'account_suspended';
  END IF;

  RETURN QUERY
  SELECT
    job.id AS job_id,
    job.user_id AS student_user_id,
    result.summary,
    result.risk_level,
    result.issue_tags,
    job.completed_at,
    result.created_at
  FROM public.audit_summary_shares AS share
  JOIN public.student_documents AS document
    ON document.id = share.document_id
   AND document.user_id = share.student_user_id
  JOIN public.ai_audit_jobs AS job
    ON job.document_id = document.id
   AND job.user_id = share.student_user_id
   AND job.lab_id = share.lab_id
   AND job.status = 'completed'::public.ai_audit_job_status
  JOIN public.ai_audit_results AS result
    ON result.job_id = job.id
   AND result.user_id = job.user_id
  JOIN public.lab_memberships AS student_membership
    ON student_membership.lab_id = share.lab_id
   AND student_membership.user_id = share.student_user_id
   AND student_membership.role = 'student'::public.lab_role
   AND student_membership.status = 'active'::public.lab_membership_status
  WHERE share.lab_id = target_lab_id
    AND share.revoked_at IS NULL
    AND (
      target_student_user_id IS NULL
      OR share.student_user_id = target_student_user_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.labs AS lab
        WHERE lab.id = target_lab_id
          AND lab.owner_professor_id = (SELECT auth.uid())
          AND lab.status = 'active'::public.lab_status
      )
      OR EXISTS (
        SELECT 1
        FROM public.lab_memberships AS viewer_membership
        WHERE viewer_membership.lab_id = target_lab_id
          AND viewer_membership.user_id = (SELECT auth.uid())
          AND viewer_membership.role IN (
            'professor'::public.lab_role,
            'assistant'::public.lab_role
          )
          AND viewer_membership.status = 'active'::public.lab_membership_status
      )
      OR app_private.is_admin()
    )
  ORDER BY result.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_lab_pdf_credit_balance() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_shared_audit_summaries(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_lab_pdf_credit_balance() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_shared_audit_summaries(UUID, UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_my_lab_pdf_credit_balance() IS
  'Active-account-only Lab PDF credit balance; suspended users receive account_suspended before private reads.';

COMMENT ON FUNCTION public.get_shared_audit_summaries(UUID, UUID) IS
  'Active-account-only fixed summary contract; consent, Lab membership, and revoke checks remain enforced in the query.';

-- Manual validation examples for a local authenticated test user:
-- 1. Set profiles.account_status to 'suspended' as service_role.
-- 2. SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '<user-id>';
-- 3. SELECT from each private table above and storage.objects. All must return
--    zero rows, while SELECT from profiles for the same user still returns one.
