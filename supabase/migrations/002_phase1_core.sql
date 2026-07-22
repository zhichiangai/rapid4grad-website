-- RAPID4GRAD V2 baseline 002
-- Phase 1 lead funnel, prompt-builder fallback, profiles, and email verification.

CREATE TYPE public.profile_role AS ENUM ('student', 'professor', 'admin');
CREATE TYPE public.account_status AS ENUM ('active', 'suspended');
CREATE TYPE public.lead_status AS ENUM (
  'new',
  'contacted',
  'consulted',
  'purchased',
  'not_fit'
);
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role public.profile_role NOT NULL DEFAULT 'student',
  account_status public.account_status NOT NULL DEFAULT 'active',
  degree TEXT,
  department TEXT,
  research_area TEXT,
  advisor_name TEXT,
  advisor_style TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  course_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX profiles_email_lower_unique
  ON public.profiles (lower(email));
CREATE INDEX profiles_role_idx ON public.profiles(role);
CREATE INDEX profiles_account_status_idx ON public.profiles(account_status);

CREATE OR REPLACE FUNCTION app_private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role = 'admin'::public.profile_role
      AND profile.account_status = 'active'::public.account_status
  );
$$;

REVOKE ALL ON FUNCTION app_private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.is_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION app_private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::TEXT || '@no-email.local'),
    NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', ''),
    'student'::public.profile_role
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = timezone('utc', now());

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION app_private.handle_new_user();

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  degree_type TEXT,
  current_year TEXT,
  quiz_result public.risk_level,
  quiz_score INTEGER,
  main_tags TEXT[] NOT NULL DEFAULT '{}',
  lead_status public.lead_status NOT NULL DEFAULT 'new',
  is_registered BOOLEAN NOT NULL DEFAULT FALSE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX leads_email_lower_unique ON public.leads(lower(email));
CREATE INDEX leads_user_id_idx ON public.leads(user_id);
CREATE INDEX leads_status_idx ON public.leads(lead_status);
CREATE INDEX leads_quiz_result_idx ON public.leads(quiz_result);

CREATE TRIGGER leads_set_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  q1 TEXT,
  q2 TEXT,
  q3 TEXT,
  q4 TEXT,
  q5 TEXT,
  q6 TEXT,
  q7 TEXT,
  total_score INTEGER CHECK (total_score IS NULL OR total_score >= 0),
  risk_level public.risk_level,
  tags TEXT[] NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX quiz_answers_lead_id_idx ON public.quiz_answers(lead_id);
CREATE INDEX quiz_answers_user_id_idx ON public.quiz_answers(user_id);

CREATE TABLE public.ai_instruction_usages (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  is_anonymous_trial BOOLEAN NOT NULL DEFAULT FALSE,
  student_stage TEXT NOT NULL,
  meeting_context TEXT NOT NULL,
  pain_points TEXT[] NOT NULL DEFAULT '{}',
  selected_ai TEXT NOT NULL,
  instruction_types TEXT[] NOT NULL DEFAULT '{}',
  advisor_prefs JSONB NOT NULL DEFAULT '{}'::JSONB,
  generated_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX ai_instruction_usages_user_id_idx
  ON public.ai_instruction_usages(user_id);
CREATE INDEX ai_instruction_usages_email_idx
  ON public.ai_instruction_usages(lower(email));
CREATE INDEX ai_instruction_usages_created_at_idx
  ON public.ai_instruction_usages(created_at DESC);

CREATE TABLE public.free_usage_quotas (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  email TEXT NOT NULL,
  daily_count INTEGER NOT NULL DEFAULT 0 CHECK (daily_count >= 0),
  total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0),
  daily_limit INTEGER NOT NULL DEFAULT 2 CHECK (daily_limit >= 0),
  total_limit INTEGER NOT NULL DEFAULT 3 CHECK (total_limit >= 0),
  unlocked_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
  admin_unlocked_total INTEGER NOT NULL DEFAULT 0 CHECK (admin_unlocked_total >= 0),
  admin_note TEXT,
  last_used_at TIMESTAMPTZ,
  last_reset_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX free_usage_quotas_email_lower_unique
  ON public.free_usage_quotas(lower(email));

CREATE TRIGGER free_usage_quotas_set_updated_at
BEFORE UPDATE ON public.free_usage_quotas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  target_ai TEXT NOT NULL CHECK (target_ai IN ('chatgpt', 'claude', 'gemini', 'grok', 'all')),
  template_type TEXT NOT NULL CHECK (
    template_type IN (
      'advisor_questions',
      'logic_check',
      'presentation_revision',
      'english_polish'
    )
  ),
  system_role TEXT NOT NULL,
  context_template TEXT NOT NULL,
  task_template TEXT NOT NULL,
  output_template TEXT NOT NULL,
  official_doc_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX prompt_templates_active_version_unique
  ON public.prompt_templates(target_ai, template_type, version);
CREATE INDEX prompt_templates_active_idx
  ON public.prompt_templates(is_active, target_ai, template_type);

CREATE TRIGGER prompt_templates_set_updated_at
BEFORE UPDATE ON public.prompt_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.advisor_memories (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_style TEXT,
  common_questions TEXT[] NOT NULL DEFAULT '{}',
  custom_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id)
);

CREATE TRIGGER advisor_memories_set_updated_at
BEFORE UPDATE ON public.advisor_memories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.email_verification_challenges (
  id UUID PRIMARY KEY,
  email_hash TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX email_verification_challenges_email_created_idx
  ON public.email_verification_challenges(email_hash, created_at DESC);
CREATE INDEX email_verification_challenges_ip_created_idx
  ON public.email_verification_challenges(ip_hash, created_at DESC);
CREATE INDEX email_verification_challenges_expires_idx
  ON public.email_verification_challenges(expires_at);

CREATE TABLE public.visitor_logs (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX visitor_logs_action_created_idx
  ON public.visitor_logs(action, created_at DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_instruction_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.profiles.is_paid IS
  'Deprecated Phase 1 compatibility field. Never use as the V2 entitlement source of truth.';
COMMENT ON COLUMN public.profiles.course_expires_at IS
  'Deprecated Phase 1 compatibility field. V2 course_full entitlements do not expire.';
