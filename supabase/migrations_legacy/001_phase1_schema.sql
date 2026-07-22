-- ============================================================
-- RAPID4GRAD Phase 1 — Supabase PostgreSQL DDL
-- Migration: 001_phase1_schema.sql
-- 執行順序：直接貼到 Supabase SQL Editor 或用 supabase db push
-- ============================================================

-- ============================================================
-- 0. 擴充套件
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. profiles
-- 核心使用者個人檔案（對應 Supabase Auth 的 auth.users）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT UNIQUE NOT NULL,
  full_name      TEXT,
  avatar_url     TEXT,
  role           TEXT NOT NULL DEFAULT 'student'
                 CHECK (role IN ('student', 'professor', 'admin')),

  -- 學生專用欄位
  degree         TEXT CHECK (degree IN (
                   'master_1', 'master_2', 'master_3_plus',
                   'phd_1_to_3', 'phd_4_plus', 'part_time'
                 )),
  department     TEXT,                       -- 科系，例如「資訊工程系」
  research_area  TEXT,                       -- 研究領域關鍵字

  -- 指導教授基本資訊（手動填寫，Phase 1）
  advisor_name   TEXT,
  advisor_style  TEXT,                       -- 學生對教授風格的描述

  -- 付費狀態
  is_paid        BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at        TIMESTAMPTZ,
  course_expires_at TIMESTAMPTZ,            -- 課程到期時間（6 個月方案）

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 更新 updated_at 觸發器
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 新使用者 Auth 後自動建立 profile（觸發器）
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. leads
-- 訪客 Email 名單（問卷前先寫入，不需登入）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT,
  email          TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,

  -- 問卷基本分流欄位（從 Q1 拿到）
  degree_type    TEXT,                       -- 'master' | 'phd' | 'part_time'
  current_year   TEXT,                       -- 年級描述

  -- 問卷結果
  quiz_result    TEXT CHECK (quiz_result IN ('low', 'medium', 'high')),
  quiz_score     SMALLINT,

  -- 後台分眾標籤（Q3-Q7 產生）
  main_tags      TEXT[] DEFAULT '{}',
  -- 範例：['tag_literature_blocked', 'tag_advisor_meeting_blocked']

  -- 管理者狀態標記
  lead_status    TEXT NOT NULL DEFAULT 'new'
                 CHECK (lead_status IN (
                   'new', 'contacted', 'consulted', 'purchased', 'not_fit'
                 )),

  -- 是否已轉換成正式帳號
  is_registered  BOOLEAN NOT NULL DEFAULT FALSE,
  user_id        UUID REFERENCES public.profiles(id),

  -- UTM 來源追蹤
  utm_source     TEXT,                       -- 'dcard' | 'ptt' | 'facebook' | 'direct'
  utm_medium     TEXT,
  utm_campaign   TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_lead_status ON public.leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_quiz_result ON public.leads(quiz_result);

-- ============================================================
-- 3. quiz_answers
-- 7 題問卷的詳細作答紀錄
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id    UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES public.profiles(id),

  -- 7 題答案（A/B/C/D）
  q1         TEXT,   -- 學位與年級
  q2         TEXT,   -- 論文進度
  q3         TEXT,   -- 文獻閱讀狀態
  q4         TEXT,   -- 與教授 Meeting 狀態
  q5         TEXT,   -- 組會/研討會簡報狀態
  q6         TEXT,   -- 文獻管理與 AI 工具熟悉度
  q7         TEXT,   -- 專注時間與焦慮狀態

  -- 計算結果
  total_score SMALLINT,
  risk_level  TEXT CHECK (risk_level IN ('low', 'medium', 'high')),

  -- 結果標籤（對應後台分眾）
  tags       TEXT[] DEFAULT '{}',

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_lead_id ON public.quiz_answers(lead_id);

-- ============================================================
-- 4. ai_instruction_usages
-- 研究報告 AI 指令產生器使用紀錄（免費版 + 付費版）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_instruction_usages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 使用者識別（三種狀態：匿名/Email驗證/登入）
  user_id           UUID REFERENCES public.profiles(id),
  email             TEXT,
  email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  is_anonymous_trial BOOLEAN NOT NULL DEFAULT FALSE,   -- 第一次免驗證試用
  is_free_user      BOOLEAN NOT NULL DEFAULT TRUE,

  -- 使用者在表單填寫的參數
  student_stage     TEXT NOT NULL,     -- 'master_1' | 'master_2' | 'master_3_plus' | 'phd' | 'part_time'
  meeting_context   TEXT NOT NULL,     -- 'one_on_one' | 'group_meeting' | 'defense_rehearsal' | 'submission_check' | 'draft_revision' | 'other'
  pain_points       TEXT[] NOT NULL DEFAULT '{}',
  selected_ai       TEXT NOT NULL
                    CHECK (selected_ai IN ('chatgpt', 'claude', 'gemini', 'grok')),
  instruction_types TEXT[] NOT NULL DEFAULT '{}',
  -- 可選值：'advisor_questions' | 'logic_check' | 'presentation_revision' | 'english_polish'

  -- 指導教授偏好（選填，JSON）
  advisor_prefs     JSONB DEFAULT '{}',
  -- 結構範例：{ "frequent_questions": ["...", "..."], "preferred_style": "...", "custom_note": "..." }

  -- 生成結果（管理者可查看，用於優化模板）
  generated_prompt  TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usages_email ON public.ai_instruction_usages(email);
CREATE INDEX IF NOT EXISTS idx_ai_usages_user_id ON public.ai_instruction_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usages_selected_ai ON public.ai_instruction_usages(selected_ai);
CREATE INDEX IF NOT EXISTS idx_ai_usages_created_at ON public.ai_instruction_usages(created_at DESC);

-- ============================================================
-- 5. free_usage_quotas
-- 免費版使用額度管控（以 Email 為 key）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.free_usage_quotas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email            TEXT UNIQUE NOT NULL,
  daily_count      SMALLINT NOT NULL DEFAULT 0,
  total_count      SMALLINT NOT NULL DEFAULT 0,

  -- 限額設定
  daily_limit      SMALLINT NOT NULL DEFAULT 2,   -- 每日最多 2 次
  total_limit      SMALLINT NOT NULL DEFAULT 3,   -- 同一 Email 總共 3 次免費

  -- 管理者手動解鎖
  unlocked_by_admin     BOOLEAN NOT NULL DEFAULT FALSE,
  admin_unlocked_total  SMALLINT NOT NULL DEFAULT 0,  -- 管理者額外贈送的次數
  admin_note            TEXT,

  last_used_at     TIMESTAMPTZ,
  last_reset_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- daily_count 上次重置時間
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_free_usage_quotas_updated_at
  BEFORE UPDATE ON public.free_usage_quotas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 6. prompt_templates
-- AI 指令模板 CMS（管理者可在後台修改）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_ai        TEXT NOT NULL
                   CHECK (target_ai IN ('chatgpt', 'claude', 'gemini', 'grok', 'all')),
  template_type    TEXT NOT NULL
                   CHECK (template_type IN (
                     'advisor_questions',
                     'logic_check',
                     'presentation_revision',
                     'english_polish'
                   )),

  -- 模板內容（含佔位符號 {student_stage}, {meeting_context}, {pain_points} 等）
  system_role      TEXT NOT NULL,    -- Role 段落
  context_template TEXT NOT NULL,    -- Context 段落（含變數）
  task_template    TEXT NOT NULL,    -- Task 段落（含變數）
  output_template  TEXT NOT NULL,    -- Output 段落（含變數）

  -- 依官方文件整理的模型使用注意事項
  official_doc_notes TEXT,

  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  version          SMALLINT NOT NULL DEFAULT 1,
  updated_by       UUID REFERENCES public.profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_prompt_templates_updated_at
  BEFORE UPDATE ON public.prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_templates_ai_type
  ON public.prompt_templates(target_ai, template_type)
  WHERE is_active = TRUE;

-- ============================================================
-- 7. course_access
-- 課程權限（Stripe 付款成功後 Webhook 自動寫入）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_access (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_id     UUID,                      -- 關聯 payments 表

  -- 課程方案
  plan_type      TEXT NOT NULL DEFAULT 'course_plus_6mo_tool'
                 CHECK (plan_type IN (
                   'course_plus_6mo_tool',   -- NT$ 2,400 課程 + 6 個月工具
                   'tool_renewal_6mo'         -- NT$ 890 / 6 個月工具續約
                 )),

  -- 有效期
  starts_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,

  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by     TEXT DEFAULT 'stripe_webhook'
                 CHECK (granted_by IN ('stripe_webhook', 'admin_manual')),

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_access_user_id ON public.course_access(user_id);
CREATE INDEX IF NOT EXISTS idx_course_access_expires_at ON public.course_access(expires_at);

-- ============================================================
-- 8. payments
-- Stripe 付款紀錄（Webhook 寫入）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID REFERENCES public.profiles(id),
  email                 TEXT NOT NULL,

  -- Stripe 資訊
  stripe_session_id     TEXT UNIQUE,        -- Stripe Checkout Session ID
  stripe_payment_intent TEXT,
  stripe_customer_id    TEXT,

  -- 金額
  amount                INTEGER NOT NULL,   -- 新台幣（分 × 100，例如 240000 = NT$2,400）
  currency              TEXT NOT NULL DEFAULT 'twd',
  plan_type             TEXT NOT NULL,

  -- 付款狀態
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  paid_at               TIMESTAMPTZ,
  raw_webhook_payload   JSONB,              -- 完整 Stripe Webhook payload 備份

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON public.payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- ============================================================
-- 9. advisor_memories
-- 指導教授長期記憶庫（Phase 1 手動筆記輸入）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.advisor_memories (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  source_type          TEXT NOT NULL DEFAULT 'note'
                       CHECK (source_type IN ('note', 'audio')),  -- Phase 1 只有 note
  raw_content          TEXT NOT NULL,          -- 原始筆記內容

  -- AI 提取的結構化資訊（Phase 1 可手動填寫，Phase 2 自動提取）
  thinking_style       TEXT,                   -- 教授核心思維方向
  frequent_questions   TEXT[] DEFAULT '{}',    -- 教授常問問題
  general_preferences  TEXT[] DEFAULT '{}',    -- 教授高階報告偏好

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisor_memories_user_id ON public.advisor_memories(user_id);

-- ============================================================
-- 10. visitor_logs
-- 網站訪問與漏斗事件追蹤（匿名可記錄）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visitor_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   TEXT,                          -- 瀏覽器端 anonymous session ID
  user_id      UUID REFERENCES public.profiles(id),
  email        TEXT,

  action       TEXT NOT NULL,
  -- 可用值：
  -- 'landing_page_view', 'start_quiz', 'submit_lead',
  -- 'complete_quiz', 'view_result', 'view_guide',
  -- 'view_course', 'click_stripe', 'generate_ai_command',
  -- 'copy_ai_command', 'login', 'register'

  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  referrer     TEXT,
  metadata     JSONB DEFAULT '{}',            -- 額外資訊（如選擇的 AI 模型）

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_action ON public.visitor_logs(action);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON public.visitor_logs(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) 設定
-- ============================================================

-- ---- profiles ----
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 使用者只能讀寫自己的 profile
CREATE POLICY "profiles: user can view own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: user can update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin 可讀全部 profiles
CREATE POLICY "profiles: admin can view all"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---- leads ----
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 公開 INSERT（訪客填表單時不需登入）
CREATE POLICY "leads: public can insert"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- 使用者可讀自己（email 對應或 user_id 對應）
CREATE POLICY "leads: user can view own by email"
  ON public.leads FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Admin 可讀全部、更新全部
CREATE POLICY "leads: admin can view all"
  ON public.leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "leads: admin can update all"
  ON public.leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---- quiz_answers ----
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_answers: public can insert"
  ON public.quiz_answers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "quiz_answers: user can view own"
  ON public.quiz_answers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "quiz_answers: admin can view all"
  ON public.quiz_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---- ai_instruction_usages ----
ALTER TABLE public.ai_instruction_usages ENABLE ROW LEVEL SECURITY;

-- 公開 INSERT（匿名試用）
CREATE POLICY "ai_usages: public can insert"
  ON public.ai_instruction_usages FOR INSERT
  WITH CHECK (true);

-- 使用者可讀自己
CREATE POLICY "ai_usages: user can view own"
  ON public.ai_instruction_usages FOR SELECT
  USING (user_id = auth.uid());

-- Admin 可讀全部
CREATE POLICY "ai_usages: admin can view all"
  ON public.ai_instruction_usages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---- free_usage_quotas ----
ALTER TABLE public.free_usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "free_quotas: public can insert and update"
  ON public.free_usage_quotas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "free_quotas: user can view own by email"
  ON public.free_usage_quotas FOR SELECT
  USING (true);  -- 讀取由 API Route 控制，RLS 開放

CREATE POLICY "free_quotas: admin can update all"
  ON public.free_usage_quotas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---- prompt_templates ----
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

-- 所有人可讀取 active 模板（前端拼接需要）
CREATE POLICY "prompt_templates: public can read active"
  ON public.prompt_templates FOR SELECT
  USING (is_active = TRUE);

-- 只有 Admin 可 INSERT / UPDATE
CREATE POLICY "prompt_templates: admin can write"
  ON public.prompt_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---- course_access ----
ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_access: user can view own"
  ON public.course_access FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "course_access: admin can view all"
  ON public.course_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---- payments ----
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: user can view own"
  ON public.payments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "payments: admin can view all"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ---- advisor_memories ----
ALTER TABLE public.advisor_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advisor_memories: user can manage own"
  ON public.advisor_memories FOR ALL
  USING (user_id = auth.uid());

-- ---- visitor_logs ----
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitor_logs: public can insert"
  ON public.visitor_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "visitor_logs: admin can view all"
  ON public.visitor_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ============================================================
-- SEED DATA：初始 prompt_templates（Phase 1 四種指令方向 × 四種 AI）
-- ============================================================

-- ChatGPT × 教授追問版
INSERT INTO public.prompt_templates
  (target_ai, template_type, system_role, context_template, task_template, output_template, official_doc_notes)
VALUES
(
  'chatgpt',
  'advisor_questions',
  'You are a rigorous academic advisor and thesis committee member with expertise in {student_stage} research supervision. You are known for asking precise, challenging questions that expose logical gaps.',
  'The student is a {student_stage} graduate student preparing for a {meeting_context}. Their primary research challenges include: {pain_points}. {advisor_prefs_section}',
  'Based on the student''s thesis/presentation provided, simulate the 10 most likely questions a critical advisor or committee member would ask during this {meeting_context}. Focus on: research motivation clarity, methodology rigor, data interpretation validity, and contribution originality. After each question, briefly explain WHY an advisor would ask it.',
  'Output format:\n1. [Question Category] Question text\n   → Why advisors ask this: brief explanation\n\nEnd with a "Top 3 Areas to Strengthen" summary.',
  'Per OpenAI prompt engineering guide: use structured role + explicit output format. ChatGPT excels at structured enumeration and role simulation.'
),
(
  'claude',
  'advisor_questions',
  'You are a meticulous academic thesis advisor with deep expertise in graduate research methodology. Your role is to conduct a thorough, Socratic examination of the student''s work.',
  'Context: A {student_stage} graduate student is preparing for {meeting_context}. Key challenges: {pain_points}. {advisor_prefs_section}\n\nPlease read the attached document carefully before responding.',
  'Conduct a comprehensive Socratic questioning session simulating what a rigorous advisor would ask. For each question: (1) state the underlying concern, (2) ask the specific question, (3) identify what a strong answer would include. Cover: conceptual framework, methodology, results interpretation, limitations acknowledgment, and practical implications.',
  'Structure your response as:\n## Critical Questions by Category\n### [Category Name]\n**Underlying concern:** ...\n**Question:** ...\n**Strong answer would include:** ...\n\n## Priority Areas (ranked by urgency)',
  'Per Anthropic Claude guide: Claude excels at long-context analysis and step-by-step reasoning. Use clear section headers and numbered reasoning chains.'
),
(
  'gemini',
  'advisor_questions',
  'Act as an experienced academic committee member reviewing a {student_stage} graduate student''s research work.',
  'The student is preparing for {meeting_context}. Research challenges: {pain_points}. {advisor_prefs_section}\n\nReview the uploaded document (PDF/slides) and identify potential weak points.',
  'Generate a comprehensive list of questions that committee members are likely to ask, organized by document section. Pay special attention to: figure/table captions adequacy, statistical analysis validity, and the alignment between research questions and conclusions.',
  'Format:\n📌 Section-by-Section Questions\n[For each major section of the document]\n- Question 1\n- Question 2\n\n📊 Visual Elements Review\n[Questions about figures, charts, data]\n\n⚠️ High-Priority Concerns\n[Top 3 issues requiring immediate attention]',
  'Per Google Gemini prompting guide: Gemini handles multi-modal inputs well. Structure prompts to reference uploaded content explicitly.'
),
(
  'grok',
  'advisor_questions',
  'You are a sharp, no-nonsense thesis advisor known for asking the questions other professors are too polite to ask. Your goal is to identify every logical flaw before the student faces a real committee.',
  'Student: {student_stage} | Situation: {meeting_context} | Pain points: {pain_points}. {advisor_prefs_section}',
  'Cut through the academic fluff. List the 10 hardest questions this student will face — the ones that keep graduate students awake at night. For each question, explain the exact logical or methodological flaw it exposes. Be direct and specific. No general advice — point to exact weaknesses.',
  'Format:\n🔥 Hard Questions (No Filter)\n1. [Question] — Flaw exposed: [specific issue]\n2. ...\n\n💀 The Question That Could Fail Your Defense:\n[The single most dangerous unaddressed issue]',
  'Per xAI Grok docs: Grok responds well to direct, challenging prompts. Control tone to avoid being disrespectful — frame as "preparing the student," not attacking.'
);

-- ChatGPT × 邏輯漏洞檢查版
INSERT INTO public.prompt_templates
  (target_ai, template_type, system_role, context_template, task_template, output_template, official_doc_notes)
VALUES
(
  'chatgpt',
  'logic_check',
  'You are an expert academic editor specializing in research methodology and logical consistency analysis for {student_stage} graduate theses.',
  'A {student_stage} student needs a logic audit before their {meeting_context}. Concerns: {pain_points}. {advisor_prefs_section}',
  'Perform a systematic logic audit of the attached thesis/presentation. Check: (1) Does the research question align with the literature gap? (2) Does the methodology directly address the research question? (3) Do the results support the stated conclusions? (4) Are limitations honestly acknowledged? (5) Is the contribution claim proportional to the evidence?',
  'Logic Audit Report:\n✅ Strengths Found\n❌ Logic Gaps Identified (with location reference)\n⚠️ Weak Arguments That Need Strengthening\n📋 Recommended Revisions (prioritized list)',
  'ChatGPT structured output format works best for audit-style analysis.'
);

-- Claude × 邏輯漏洞檢查版
INSERT INTO public.prompt_templates
  (target_ai, template_type, system_role, context_template, task_template, output_template, official_doc_notes)
VALUES
(
  'claude',
  'logic_check',
  'You are a meticulous research methodology expert conducting a pre-submission logic review for a graduate student.',
  'Student stage: {student_stage} | Preparing for: {meeting_context} | Focus areas: {pain_points}. {advisor_prefs_section}\n\nPlease read the entire document before beginning your analysis.',
  'Conduct a thorough logical consistency analysis. Trace the argument chain from: (1) Introduction → Research Gap → Research Questions, (2) Research Questions → Methodology Choice, (3) Methodology → Data Collection → Analysis, (4) Analysis → Results → Conclusions → Contribution Claims. Identify any breaks in this chain.',
  '## Logic Flow Analysis\n### Chain 1: Introduction to Research Questions\n**Assessment:** [Strong/Weak/Broken]\n**Evidence:** ...\n**Recommendation:** ...\n\n[Repeat for each chain]\n\n## Priority Fix List\n1. [Most critical issue]\n2. ...',
  'Claude performs best with explicit reasoning chain instructions and detailed document analysis tasks.'
);

-- ChatGPT × 簡報修改版
INSERT INTO public.prompt_templates
  (target_ai, template_type, system_role, context_template, task_template, output_template, official_doc_notes)
VALUES
(
  'chatgpt',
  'presentation_revision',
  'You are an expert academic presentation coach specializing in research presentations for {meeting_context} scenarios at the graduate level.',
  'A {student_stage} student needs presentation feedback before {meeting_context}. Issues: {pain_points}. {advisor_prefs_section}',
  'Review the attached presentation slides and provide specific improvement recommendations for: (1) Slide structure and logical flow, (2) Visual clarity of figures and tables, (3) Text density reduction, (4) Opening hook effectiveness, (5) Conclusion and contribution clarity, (6) Oral delivery cues (where relevant).',
  'Presentation Review:\n📊 Slide-by-Slide Quick Assessment\n🔧 Specific Revision Suggestions (slide number + change)\n✨ High-Impact Quick Wins (changes that take <30 min)\n🎯 Critical Fixes Before Presentation',
  'ChatGPT structured output excels at slide-by-slide feedback format.'
),
(
  'chatgpt',
  'english_polish',
  'You are an expert academic English editor specializing in polishing graduate-level research writing to publication quality.',
  'A {student_stage} student needs academic English editing for their {meeting_context} materials. Focus: {pain_points}. {advisor_prefs_section}',
  'Polish the attached text for academic English quality. Focus on: (1) Sentence structure clarity, (2) Academic vocabulary precision, (3) Passive/active voice appropriateness, (4) Transition phrases between ideas, (5) Abstract/summary effectiveness. Provide both the corrected version and explanations for major changes.',
  'Original → Revised comparison format:\n**Original:** [text]\n**Revised:** [text]\n**Reason:** [brief explanation]\n\nAt the end: Summary of main writing patterns to improve.',
  'Use ChatGPT comparison format for clear before/after editing visibility.'
);

-- ============================================================
-- END OF MIGRATION 001
-- ============================================================
