-- RAPID4GRAD V2 baseline 007
-- Grants, RLS policies, private Storage policies, and minimal inactive seed data.

CREATE OR REPLACE FUNCTION app_private.has_active_course_full(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entitlements AS entitlement
    WHERE entitlement.user_id = target_user_id
      AND entitlement.entitlement_type = 'course_full'::public.entitlement_type
      AND entitlement.status = 'active'::public.entitlement_status
      AND entitlement.ends_at IS NULL
      AND entitlement.starts_at <= timezone('utc', now())
  );
$$;

REVOKE ALL ON FUNCTION app_private.has_active_course_full(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_active_course_full(UUID)
  TO authenticated, service_role;

-- Start from explicit table grants. RLS is not a substitute for table privileges.
REVOKE ALL ON TABLE
  public.profiles,
  public.leads,
  public.quiz_answers,
  public.ai_instruction_usages,
  public.free_usage_quotas,
  public.prompt_templates,
  public.advisor_memories,
  public.email_verification_challenges,
  public.visitor_logs,
  public.products,
  public.product_prices,
  public.orders,
  public.payments,
  public.payment_events,
  public.entitlements,
  public.course_access,
  public.courses,
  public.course_lessons,
  public.course_progress,
  public.labs,
  public.lab_memberships,
  public.lab_invite_codes,
  public.subscriptions,
  public.subscription_items,
  public.student_documents,
  public.lab_usage_credits,
  public.ai_audit_jobs,
  public.ai_audit_results,
  public.audit_summary_shares,
  public.admin_action_logs
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE
  public.profiles,
  public.leads,
  public.quiz_answers,
  public.ai_instruction_usages,
  public.free_usage_quotas,
  public.prompt_templates,
  public.advisor_memories,
  public.email_verification_challenges,
  public.visitor_logs,
  public.products,
  public.product_prices,
  public.orders,
  public.payments,
  public.payment_events,
  public.entitlements,
  public.course_access,
  public.courses,
  public.course_lessons,
  public.course_progress,
  public.labs,
  public.lab_memberships,
  public.lab_invite_codes,
  public.subscriptions,
  public.subscription_items,
  public.student_documents,
  public.lab_usage_credits,
  public.ai_audit_jobs,
  public.ai_audit_results,
  public.audit_summary_shares,
  public.admin_action_logs
TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Anonymous catalog access is intentionally limited to active/published rows by RLS.
GRANT SELECT ON TABLE public.products, public.product_prices TO anon, authenticated;
GRANT SELECT ON TABLE public.prompt_templates TO anon, authenticated;
GRANT SELECT ON TABLE public.courses, public.course_lessons TO anon, authenticated;

-- Authenticated read access remains row-scoped by RLS.
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, degree, department, research_area, advisor_name, advisor_style)
  ON public.profiles TO authenticated;
GRANT SELECT ON TABLE public.leads, public.quiz_answers, public.ai_instruction_usages
  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.advisor_memories TO authenticated;
GRANT SELECT ON TABLE public.orders, public.payments, public.entitlements, public.course_access
  TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.course_progress TO authenticated;
GRANT SELECT ON TABLE public.labs, public.lab_memberships, public.subscriptions, public.subscription_items
  TO authenticated;
GRANT SELECT, DELETE ON TABLE public.student_documents TO authenticated;
GRANT SELECT ON TABLE public.ai_audit_jobs, public.ai_audit_results, public.audit_summary_shares
  TO authenticated;

-- Profiles: users own their row; Admin observation is read-only through the authenticated role.
CREATE POLICY "profiles_select_self_or_admin"
ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR app_private.is_admin());

CREATE POLICY "profiles_update_self"
ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Phase 1 funnel rows are private after a user account is associated.
CREATE POLICY "leads_select_owner_or_admin"
ON public.leads FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR app_private.is_admin());

CREATE POLICY "quiz_answers_select_owner_or_admin"
ON public.quiz_answers FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR app_private.is_admin());

CREATE POLICY "ai_instruction_usages_select_owner_or_admin"
ON public.ai_instruction_usages FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR app_private.is_admin());

CREATE POLICY "prompt_templates_select_active"
ON public.prompt_templates FOR SELECT TO anon, authenticated
USING (is_active);

CREATE POLICY "advisor_memories_select_owner"
ON public.advisor_memories FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "advisor_memories_insert_owner"
ON public.advisor_memories FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "advisor_memories_update_owner"
ON public.advisor_memories FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "advisor_memories_delete_owner"
ON public.advisor_memories FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Products and prices are visible only when both the product and price are active.
CREATE POLICY "products_select_active"
ON public.products FOR SELECT TO anon, authenticated
USING (is_active);

CREATE POLICY "product_prices_select_active"
ON public.product_prices FOR SELECT TO anon, authenticated
USING (
  is_active
  AND EXISTS (
    SELECT 1
    FROM public.products AS product
    WHERE product.id = product_prices.product_id
      AND product.is_active
  )
);

CREATE POLICY "orders_select_owner_or_admin"
ON public.orders FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR app_private.is_admin());

CREATE POLICY "payments_select_owner_or_admin"
ON public.payments FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR app_private.is_admin());

CREATE POLICY "entitlements_select_owner_or_admin"
ON public.entitlements FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR app_private.is_admin());

CREATE POLICY "course_access_select_owner_or_admin"
ON public.course_access FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR app_private.is_admin());

CREATE POLICY "courses_select_published"
ON public.courses FOR SELECT TO anon, authenticated
USING (is_published);

CREATE POLICY "course_lessons_select_by_access"
ON public.course_lessons FOR SELECT TO anon, authenticated
USING (
  is_published
  AND EXISTS (
    SELECT 1
    FROM public.courses AS course
    WHERE course.id = course_lessons.course_id
      AND course.is_published
  )
  AND (
    access_level = 'public_preview'::public.lesson_access_level
    OR (
      (SELECT auth.uid()) IS NOT NULL
      AND (
        app_private.has_active_course_full((SELECT auth.uid()))
        OR (
          access_level = 'lab_basic'::public.lesson_access_level
          AND app_private.has_lab_basic_access((SELECT auth.uid()))
        )
      )
    )
  )
);

CREATE POLICY "course_progress_select_owner"
ON public.course_progress FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "course_progress_insert_owner"
ON public.course_progress FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.course_lessons AS lesson WHERE lesson.id = course_progress.lesson_id
  )
);

CREATE POLICY "course_progress_update_owner"
ON public.course_progress FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Lab reads use SECURITY DEFINER boolean helpers to avoid recursive policies.
CREATE POLICY "labs_select_member_owner_or_admin"
ON public.labs FOR SELECT TO authenticated
USING (
  owner_professor_id = (SELECT auth.uid())
  OR app_private.is_active_lab_member(id, NULL)
  OR app_private.is_admin()
);

CREATE POLICY "lab_memberships_select_scoped"
ON public.lab_memberships FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR app_private.owns_lab(lab_id)
  OR app_private.is_active_lab_member(
    lab_id,
    ARRAY['professor'::public.lab_role, 'assistant'::public.lab_role]
  )
  OR app_private.is_admin()
);

CREATE POLICY "subscriptions_select_owner_or_admin"
ON public.subscriptions FOR SELECT TO authenticated
USING (
  payer_user_id = (SELECT auth.uid())
  OR app_private.owns_lab(lab_id)
  OR app_private.is_admin()
);

CREATE POLICY "subscription_items_select_owner_or_admin"
ON public.subscription_items FOR SELECT TO authenticated
USING (
  EXISTS (
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

-- Private PDF and raw audit rows are owner-only. Admin, professor and assistant receive no bypass.
CREATE POLICY "student_documents_select_owner"
ON public.student_documents FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "student_documents_delete_owner"
ON public.student_documents FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "ai_audit_jobs_select_owner"
ON public.ai_audit_jobs FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "ai_audit_results_select_owner"
ON public.ai_audit_results FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "audit_summary_shares_select_owner"
ON public.audit_summary_shares FOR SELECT TO authenticated
USING (student_user_id = (SELECT auth.uid()));

-- Private Storage buckets. Object keys always begin with the owning user UUID.
INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('student-documents', 'student-documents', FALSE, 10485760, ARRAY['application/pdf']),
  ('ai-audit-exports', 'ai-audit-exports', FALSE, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "student_documents_storage_insert_owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
);

CREATE POLICY "student_documents_storage_select_owner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
);

CREATE POLICY "student_documents_storage_update_owner"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
)
WITH CHECK (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
);

CREATE POLICY "student_documents_storage_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
);

CREATE POLICY "ai_audit_exports_storage_insert_owner"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ai-audit-exports'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
);

CREATE POLICY "ai_audit_exports_storage_select_owner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ai-audit-exports'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
);

CREATE POLICY "ai_audit_exports_storage_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ai-audit-exports'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
);

-- Inactive seed rows define stable product keys without publishing prices or purchase links.
INSERT INTO public.products(slug, name, description, product_type, billing_model, is_active, metadata)
VALUES
  (
    'student-course-full',
    '研究生完整課程買斷',
    '永久 course_full entitlement；無到期日。',
    'course',
    'one_time',
    FALSE,
    '{"entitlement_type":"course_full","audience":"student"}'::JSONB
  ),
  (
    'student-lab-course-upgrade',
    'Lab 學生完整課程升級',
    'Lab 成員加購永久完整課程。',
    'course',
    'one_time',
    FALSE,
    '{"entitlement_type":"course_full","audience":"active_lab_student"}'::JSONB
  ),
  (
    'professor-lab-standard',
    'Professor Lab Standard',
    '最多 15 位 active students。',
    'professor_subscription',
    'recurring',
    FALSE,
    '{"plan_key":"professor_lab_standard","student_seat_limit":15,"assistant_limit":3}'::JSONB
  ),
  (
    'professor-lab-plus',
    'Professor Lab Plus',
    '最多 30 位 active students。',
    'professor_subscription',
    'recurring',
    FALSE,
    '{"plan_key":"professor_lab_plus","student_seat_limit":30,"assistant_limit":3}'::JSONB
  ),
  (
    'professor-lab-enterprise',
    'Professor Lab Enterprise',
    '31 位以上人工洽談。',
    'professor_subscription',
    'manual',
    FALSE,
    '{"plan_key":"professor_lab_enterprise","student_seat_limit":null,"assistant_limit":3,"contact_required":true}'::JSONB
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.courses(slug, title, description, is_published)
VALUES (
  'rapid4grad-core',
  'RAPID4GRAD 研究生畢業加速課程',
  'V2 三層內容權限課程容器。',
  FALSE
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.prompt_templates(
  target_ai,
  template_type,
  system_role,
  context_template,
  task_template,
  output_template,
  official_doc_notes,
  is_active,
  version
)
VALUES
  ('all', 'advisor_questions', '你是嚴謹的學術指導教授。', '{{context}}', '{{task}}', '{{output}}', 'V2 baseline seed', TRUE, 1),
  ('all', 'logic_check', '你是研究方法與論證邏輯審查者。', '{{context}}', '{{task}}', '{{output}}', 'V2 baseline seed', TRUE, 1),
  ('all', 'presentation_revision', '你是學術簡報與口試溝通顧問。', '{{context}}', '{{task}}', '{{output}}', 'V2 baseline seed', TRUE, 1),
  ('all', 'english_polish', '你是保留原意的學術英文編修者。', '{{context}}', '{{task}}', '{{output}}', 'V2 baseline seed', TRUE, 1)
ON CONFLICT (target_ai, template_type, version) DO NOTHING;

COMMENT ON POLICY "student_documents_select_owner" ON public.student_documents IS
  'Private PDF metadata is owner-only. Lab staff and Admin do not receive raw document access.';
COMMENT ON POLICY "ai_audit_results_select_owner" ON public.ai_audit_results IS
  'Raw audit content is owner-only. Shared Lab access must use get_shared_audit_summaries.';
