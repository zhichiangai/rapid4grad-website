-- ============================================================
-- RAPID4GRAD Phase 2 — Platform Schema, Storage, and RLS
-- Migration: 002_phase2_platform_schema.sql
-- Scope: data layer only. Does not drop, rename, or replace Phase 1 tables.
-- ============================================================

-- ============================================================
-- 0. Private Storage buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'student-documents',
    'student-documents',
    FALSE,
    52428800,
    ARRAY[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'
    ]
  ),
  (
    'ai-audit-exports',
    'ai-audit-exports',
    FALSE,
    52428800,
    ARRAY[
      'application/pdf',
      'text/markdown',
      'text/plain'
    ]
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- 1. labs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.labs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_professor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  institution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_labs_updated_at
  BEFORE UPDATE ON public.labs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_labs_owner_professor_id
  ON public.labs(owner_professor_id);

-- ============================================================
-- 2. lab_invite_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lab_invite_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  code_hash TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_invite_codes_lab_id
  ON public.lab_invite_codes(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_invite_codes_code_hash
  ON public.lab_invite_codes(code_hash);

-- ============================================================
-- 3. lab_memberships
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lab_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('professor', 'student', 'assistant')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'removed', 'pending')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lab_id, user_id)
);

CREATE TRIGGER set_lab_memberships_updated_at
  BEFORE UPDATE ON public.lab_memberships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_lab_memberships_lab_id
  ON public.lab_memberships(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_memberships_user_id
  ON public.lab_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_memberships_role_status
  ON public.lab_memberships(role, status);

-- ============================================================
-- 4. student_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lab_id UUID REFERENCES public.labs(id) ON DELETE SET NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'student-documents',
  storage_path TEXT UNIQUE NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (
    mime_type IN (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'
    )
  ),
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  document_type TEXT NOT NULL CHECK (
    document_type IN ('thesis', 'slides', 'draft', 'paper')
  ),
  upload_status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (upload_status IN ('uploaded', 'processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_student_documents_updated_at
  BEFORE UPDATE ON public.student_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_student_documents_user_id
  ON public.student_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_lab_id
  ON public.student_documents(lab_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_created_at
  ON public.student_documents(created_at DESC);

-- ============================================================
-- 5. ai_audit_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_audit_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.student_documents(id) ON DELETE CASCADE,
  lab_id UUID REFERENCES public.labs(id) ON DELETE SET NULL,
  audit_type TEXT NOT NULL CHECK (
    audit_type IN (
      'advisor_questions',
      'logic_check',
      'presentation_review',
      'english_polish',
      'full_review'
    )
  ),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic')),
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'streaming', 'completed', 'failed', 'cancelled')),
  input_prompt TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TRIGGER set_ai_audit_jobs_updated_at
  BEFORE UPDATE ON public.ai_audit_jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_ai_audit_jobs_user_id
  ON public.ai_audit_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_jobs_document_id
  ON public.ai_audit_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_jobs_lab_id
  ON public.ai_audit_jobs(lab_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_jobs_status
  ON public.ai_audit_jobs(status);

-- ============================================================
-- 6. ai_audit_results
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_audit_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL UNIQUE REFERENCES public.ai_audit_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  result_markdown TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  issue_tags TEXT[] NOT NULL DEFAULT '{}',
  token_input INTEGER NOT NULL DEFAULT 0 CHECK (token_input >= 0),
  token_output INTEGER NOT NULL DEFAULT 0 CHECK (token_output >= 0),
  cost_estimate_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_estimate_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_results_user_id
  ON public.ai_audit_results(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_results_risk_level
  ON public.ai_audit_results(risk_level);
CREATE INDEX IF NOT EXISTS idx_ai_audit_results_created_at
  ON public.ai_audit_results(created_at DESC);

-- ============================================================
-- 7. ai_usage_credits
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  monthly_credit_limit INTEGER NOT NULL DEFAULT 0 CHECK (monthly_credit_limit >= 0),
  credits_used INTEGER NOT NULL DEFAULT 0 CHECK (credits_used >= 0),
  pdf_audit_limit INTEGER NOT NULL DEFAULT 0 CHECK (pdf_audit_limit >= 0),
  pdf_audit_used INTEGER NOT NULL DEFAULT 0 CHECK (pdf_audit_used >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_end > period_start),
  CHECK (credits_used <= monthly_credit_limit),
  CHECK (pdf_audit_used <= pdf_audit_limit)
);

CREATE TRIGGER set_ai_usage_credits_updated_at
  BEFORE UPDATE ON public.ai_usage_credits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_ai_usage_credits_user_id
  ON public.ai_usage_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_credits_period
  ON public.ai_usage_credits(period_start, period_end);

-- ============================================================
-- 8. subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid')
  ),
  price_id TEXT NOT NULL,
  plan_key TEXT NOT NULL CHECK (
    plan_key IN ('student_monthly', 'student_semester', 'professor_lab')
  ),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (current_period_end > current_period_start)
);

ALTER TABLE public.ai_usage_credits
  ADD CONSTRAINT ai_usage_credits_subscription_id_fkey
  FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id
  ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions(status);

-- ============================================================
-- 9. subscription_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  stripe_subscription_item_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  plan_feature_key TEXT NOT NULL CHECK (
    plan_feature_key IN ('ai_audit', 'lab_seat', 'course_access')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_subscription_items_updated_at
  BEFORE UPDATE ON public.subscription_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription_id
  ON public.subscription_items(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_items_plan_feature_key
  ON public.subscription_items(plan_feature_key);

-- ============================================================
-- 10. stripe_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type
  ON public.stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at
  ON public.stripe_events(processed_at DESC);

-- ============================================================
-- 11. Enable RLS
-- ============================================================
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. labs policies
-- ============================================================
CREATE POLICY "labs: owner professor can insert"
  ON public.labs FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_professor_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'professor'
    )
  );

CREATE POLICY "labs: owner professor can read"
  ON public.labs FOR SELECT
  TO authenticated
  USING (owner_professor_id = (SELECT auth.uid()));

CREATE POLICY "labs: active lab members can read"
  ON public.labs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lab_memberships lm
      WHERE lm.lab_id = labs.id
        AND lm.user_id = (SELECT auth.uid())
        AND lm.status = 'active'
    )
  );

CREATE POLICY "labs: owner professor can update"
  ON public.labs FOR UPDATE
  TO authenticated
  USING (owner_professor_id = (SELECT auth.uid()))
  WITH CHECK (owner_professor_id = (SELECT auth.uid()));

CREATE POLICY "labs: admin can manage all"
  ON public.labs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

-- ============================================================
-- 13. lab_invite_codes policies
-- ============================================================
CREATE POLICY "lab_invite_codes: lab professor can manage"
  ON public.lab_invite_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.labs l
      WHERE l.id = lab_invite_codes.lab_id
        AND l.owner_professor_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.labs l
      WHERE l.id = lab_invite_codes.lab_id
        AND l.owner_professor_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "lab_invite_codes: admin can manage all"
  ON public.lab_invite_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

-- ============================================================
-- 14. lab_memberships policies
-- ============================================================
CREATE POLICY "lab_memberships: user can read own"
  ON public.lab_memberships FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "lab_memberships: lab professor can read lab"
  ON public.lab_memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.labs l
      WHERE l.id = lab_memberships.lab_id
        AND l.owner_professor_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "lab_memberships: lab professor can insert lab"
  ON public.lab_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.labs l
      WHERE l.id = lab_memberships.lab_id
        AND l.owner_professor_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "lab_memberships: lab professor can update lab"
  ON public.lab_memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.labs l
      WHERE l.id = lab_memberships.lab_id
        AND l.owner_professor_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.labs l
      WHERE l.id = lab_memberships.lab_id
        AND l.owner_professor_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "lab_memberships: admin can manage all"
  ON public.lab_memberships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

-- ============================================================
-- 15. student_documents policies
-- ============================================================
CREATE POLICY "student_documents: owner can insert"
  ON public.student_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND storage_bucket = 'student-documents'
    AND (
      lab_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.lab_memberships lm
        WHERE lm.lab_id = student_documents.lab_id
          AND lm.user_id = (SELECT auth.uid())
          AND lm.role = 'student'
          AND lm.status = 'active'
      )
    )
  );

CREATE POLICY "student_documents: owner can read"
  ON public.student_documents FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "student_documents: owner can update"
  ON public.student_documents FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "student_documents: lab professor can read metadata"
  ON public.student_documents FOR SELECT
  TO authenticated
  USING (
    lab_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.lab_memberships lm
      WHERE lm.lab_id = student_documents.lab_id
        AND lm.user_id = (SELECT auth.uid())
        AND lm.role IN ('professor', 'assistant')
        AND lm.status = 'active'
    )
  );

CREATE POLICY "student_documents: admin can read all"
  ON public.student_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

-- ============================================================
-- 16. ai_audit_jobs policies
-- ============================================================
CREATE POLICY "ai_audit_jobs: owner can insert"
  ON public.ai_audit_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.student_documents sd
      WHERE sd.id = ai_audit_jobs.document_id
        AND sd.user_id = (SELECT auth.uid())
        AND (ai_audit_jobs.lab_id IS NULL OR ai_audit_jobs.lab_id = sd.lab_id)
    )
  );

CREATE POLICY "ai_audit_jobs: owner can read"
  ON public.ai_audit_jobs FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "ai_audit_jobs: owner can update"
  ON public.ai_audit_jobs FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "ai_audit_jobs: lab professor can read"
  ON public.ai_audit_jobs FOR SELECT
  TO authenticated
  USING (
    lab_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.lab_memberships lm
      WHERE lm.lab_id = ai_audit_jobs.lab_id
        AND lm.user_id = (SELECT auth.uid())
        AND lm.role IN ('professor', 'assistant')
        AND lm.status = 'active'
    )
  );

CREATE POLICY "ai_audit_jobs: admin can read all"
  ON public.ai_audit_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

-- ============================================================
-- 17. ai_audit_results policies
-- ============================================================
CREATE POLICY "ai_audit_results: owner can insert"
  ON public.ai_audit_results FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.ai_audit_jobs j
      WHERE j.id = ai_audit_results.job_id
        AND j.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "ai_audit_results: owner can read"
  ON public.ai_audit_results FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "ai_audit_results: lab professor can read"
  ON public.ai_audit_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ai_audit_jobs j
      JOIN public.lab_memberships lm ON lm.lab_id = j.lab_id
      WHERE j.id = ai_audit_results.job_id
        AND lm.user_id = (SELECT auth.uid())
        AND lm.role IN ('professor', 'assistant')
        AND lm.status = 'active'
    )
  );

CREATE POLICY "ai_audit_results: admin can read all"
  ON public.ai_audit_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

-- ============================================================
-- 18. ai_usage_credits policies
-- ============================================================
CREATE POLICY "ai_usage_credits: user can read own"
  ON public.ai_usage_credits FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "ai_usage_credits: admin can manage all"
  ON public.ai_usage_credits FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

-- ============================================================
-- 19. subscriptions policies
-- ============================================================
CREATE POLICY "subscriptions: user can read own"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "subscriptions: admin can manage all"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

CREATE POLICY "subscription_items: user can read own"
  ON public.subscription_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = subscription_items.subscription_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "subscription_items: admin can manage all"
  ON public.subscription_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

CREATE POLICY "stripe_events: admin can read all"
  ON public.stripe_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

-- ============================================================
-- 20. Storage object policies
-- ============================================================
CREATE POLICY "storage student-documents: owner can insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'student-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "storage student-documents: owner can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "storage student-documents: owner can update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'student-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "storage student-documents: owner can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "storage student-documents: lab professor can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND EXISTS (
      SELECT 1
      FROM public.student_documents sd
      JOIN public.lab_memberships lm ON lm.lab_id = sd.lab_id
      WHERE sd.storage_bucket = storage.objects.bucket_id
        AND sd.storage_path = storage.objects.name
        AND lm.user_id = (SELECT auth.uid())
        AND lm.role IN ('professor', 'assistant')
        AND lm.status = 'active'
    )
  );

CREATE POLICY "storage student-documents: admin can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

CREATE POLICY "storage ai-audit-exports: owner can manage"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'ai-audit-exports'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'ai-audit-exports'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "storage ai-audit-exports: admin can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ai-audit-exports'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
    )
  );

-- ============================================================
-- END OF MIGRATION 002 PHASE 2
-- ============================================================
