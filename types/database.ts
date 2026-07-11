export type RiskLevel = "low" | "medium" | "high";

export type LeadStatus =
  | "new"
  | "contacted"
  | "consulted"
  | "purchased"
  | "not_fit";

export type ProfileRole = "student" | "professor" | "admin";

export type Degree =
  | "master_1"
  | "master_2"
  | "master_3_plus"
  | "phd_1_to_3"
  | "phd_4_plus"
  | "part_time";

export type CoursePlanType = "course_plus_6mo_tool" | "tool_renewal_6mo";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type CourseAccessGrantedBy = "stripe_webhook" | "admin_manual";

export type PaymentProviderName = "ecpay" | "newebpay" | "tappay" | "stripe";

export type OrderStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export type ProductType =
  | "course"
  | "ai_credits"
  | "subscription"
  | "consultation"
  | "bundle";

export type EntitlementType = "course_access" | "tool_access" | "membership";

export type EntitlementStatus = "active" | "expired" | "revoked";

export type AiModel = "chatgpt" | "claude" | "gemini" | "grok";

export type PromptTemplateTargetAi = AiModel | "all";

export type PromptTemplateType =
  | "advisor_questions"
  | "logic_check"
  | "presentation_revision"
  | "english_polish";

export type DocumentType = "thesis" | "slides" | "draft" | "paper";

export type DocumentUploadStatus =
  | "uploaded"
  | "processing"
  | "ready"
  | "failed";

export type AiAuditType =
  | "advisor_questions"
  | "logic_check"
  | "presentation_review"
  | "english_polish"
  | "full_review";

export type AiAuditProvider = "openai" | "anthropic";

export type AiAuditJobStatus =
  | "queued"
  | "streaming"
  | "completed"
  | "failed"
  | "cancelled";

export type LabRole = "professor" | "student" | "assistant";

export type LabMembershipStatus = "active" | "removed" | "pending";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid";

export type SubscriptionPlanKey =
  | "student_monthly"
  | "student_semester"
  | "professor_lab";

export type SubscriptionItemFeatureKey =
  | "ai_audit"
  | "lab_seat"
  | "course_access";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: ProfileRole;
          degree: Degree | null;
          department: string | null;
          research_area: string | null;
          advisor_name: string | null;
          advisor_style: string | null;
          is_paid: boolean;
          paid_at: string | null;
          course_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: ProfileRole;
          degree?: Degree | null;
          department?: string | null;
          research_area?: string | null;
          advisor_name?: string | null;
          advisor_style?: string | null;
          is_paid?: boolean;
          paid_at?: string | null;
          course_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      leads: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          email_verified: boolean;
          degree_type: string | null;
          current_year: string | null;
          quiz_result: RiskLevel | null;
          quiz_score: number | null;
          main_tags: string[] | null;
          lead_status: LeadStatus;
          is_registered: boolean;
          user_id: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string | null;
          email: string;
          email_verified?: boolean;
          degree_type?: string | null;
          current_year?: string | null;
          quiz_result?: RiskLevel | null;
          quiz_score?: number | null;
          main_tags?: string[] | null;
          lead_status?: LeadStatus;
          is_registered?: boolean;
          user_id?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
      };
      quiz_answers: {
        Row: {
          id: string;
          lead_id: string;
          user_id: string | null;
          q1: string | null;
          q2: string | null;
          q3: string | null;
          q4: string | null;
          q5: string | null;
          q6: string | null;
          q7: string | null;
          total_score: number | null;
          risk_level: RiskLevel | null;
          tags: string[] | null;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          user_id?: string | null;
          q1?: string | null;
          q2?: string | null;
          q3?: string | null;
          q4?: string | null;
          q5?: string | null;
          q6?: string | null;
          q7?: string | null;
          total_score?: number | null;
          risk_level?: RiskLevel | null;
          tags?: string[] | null;
          submitted_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["quiz_answers"]["Insert"]
        >;
      };
      free_usage_quotas: {
        Row: {
          id: string;
          email: string;
          daily_count: number;
          total_count: number;
          daily_limit: number;
          total_limit: number;
          unlocked_by_admin: boolean;
          admin_unlocked_total: number;
          admin_note: string | null;
          last_used_at: string | null;
          last_reset_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          daily_count?: number;
          total_count?: number;
          daily_limit?: number;
          total_limit?: number;
          unlocked_by_admin?: boolean;
          admin_unlocked_total?: number;
          admin_note?: string | null;
          last_used_at?: string | null;
          last_reset_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["free_usage_quotas"]["Insert"]
        >;
      };
      prompt_templates: {
        Row: {
          id: string;
          target_ai: PromptTemplateTargetAi;
          template_type: PromptTemplateType;
          system_role: string;
          context_template: string;
          task_template: string;
          output_template: string;
          official_doc_notes: string | null;
          is_active: boolean;
          version: number;
          updated_by: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_ai: PromptTemplateTargetAi;
          template_type: PromptTemplateType;
          system_role: string;
          context_template: string;
          task_template: string;
          output_template: string;
          official_doc_notes?: string | null;
          is_active?: boolean;
          version?: number;
          updated_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["prompt_templates"]["Insert"]
        >;
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          product_type: ProductType;
          amount: number;
          currency: string;
          duration_months: number | null;
          metadata: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          product_type?: ProductType;
          amount: number;
          currency?: string;
          duration_months?: number | null;
          metadata?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          amount: number;
          currency: string;
          status: OrderStatus;
          provider: PaymentProviderName;
          provider_order_id: string | null;
          checkout_url: string | null;
          raw_checkout_payload: Json | null;
          confirmation_email_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          amount: number;
          currency?: string;
          status?: OrderStatus;
          provider: PaymentProviderName;
          provider_order_id?: string | null;
          checkout_url?: string | null;
          raw_checkout_payload?: Json | null;
          confirmation_email_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      course_access: {
        Row: {
          id: string;
          user_id: string;
          payment_id: string | null;
          plan_type: CoursePlanType;
          starts_at: string;
          expires_at: string;
          is_active: boolean;
          granted_by: CourseAccessGrantedBy | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          payment_id?: string | null;
          plan_type?: CoursePlanType;
          starts_at?: string;
          expires_at: string;
          is_active?: boolean;
          granted_by?: CourseAccessGrantedBy | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["course_access"]["Insert"]
        >;
      };
      payments: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          order_id: string | null;
          provider: PaymentProviderName | null;
          provider_payment_id: string | null;
          stripe_session_id: string | null;
          stripe_payment_intent: string | null;
          stripe_customer_id: string | null;
          amount: number;
          currency: string;
          plan_type: CoursePlanType;
          status: PaymentStatus;
          paid_at: string | null;
          raw_payload: Json | null;
          raw_webhook_payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          order_id?: string | null;
          provider?: PaymentProviderName | null;
          provider_payment_id?: string | null;
          stripe_session_id?: string | null;
          stripe_payment_intent?: string | null;
          stripe_customer_id?: string | null;
          amount: number;
          currency?: string;
          plan_type: CoursePlanType;
          status?: PaymentStatus;
          paid_at?: string | null;
          raw_payload?: Json | null;
          raw_webhook_payload?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      entitlements: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          type: EntitlementType;
          status: EntitlementStatus;
          starts_at: string;
          ends_at: string | null;
          source_order_id: string | null;
          source_payment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          type: EntitlementType;
          status?: EntitlementStatus;
          starts_at?: string;
          ends_at?: string | null;
          source_order_id?: string | null;
          source_payment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["entitlements"]["Insert"]
        >;
      };
      labs: {
        Row: {
          id: string;
          owner_professor_id: string;
          name: string;
          institution: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_professor_id: string;
          name: string;
          institution?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["labs"]["Insert"]>;
      };
      lab_invite_codes: {
        Row: {
          id: string;
          lab_id: string;
          code_hash: string;
          created_by: string;
          expires_at: string;
          max_uses: number | null;
          used_count: number;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lab_id: string;
          code_hash: string;
          created_by: string;
          expires_at: string;
          max_uses?: number | null;
          used_count?: number;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["lab_invite_codes"]["Insert"]
        >;
      };
      lab_memberships: {
        Row: {
          id: string;
          lab_id: string;
          user_id: string;
          role: LabRole;
          status: LabMembershipStatus;
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lab_id: string;
          user_id: string;
          role: LabRole;
          status?: LabMembershipStatus;
          joined_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["lab_memberships"]["Insert"]
        >;
      };
      student_documents: {
        Row: {
          id: string;
          user_id: string;
          lab_id: string | null;
          storage_bucket: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          file_size_bytes: number;
          document_type: DocumentType;
          upload_status: DocumentUploadStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lab_id?: string | null;
          storage_bucket?: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          file_size_bytes: number;
          document_type: DocumentType;
          upload_status?: DocumentUploadStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["student_documents"]["Insert"]
        >;
      };
      ai_audit_jobs: {
        Row: {
          id: string;
          user_id: string;
          document_id: string;
          lab_id: string | null;
          audit_type: AiAuditType;
          provider: AiAuditProvider;
          model: string;
          status: AiAuditJobStatus;
          input_prompt: string;
          error_message: string | null;
          credit_id: string | null;
          quota_reserved_at: string | null;
          quota_settled_at: string | null;
          quota_refunded_at: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          document_id: string;
          lab_id?: string | null;
          audit_type: AiAuditType;
          provider: AiAuditProvider;
          model: string;
          status?: AiAuditJobStatus;
          input_prompt: string;
          error_message?: string | null;
          credit_id?: string | null;
          quota_reserved_at?: string | null;
          quota_settled_at?: string | null;
          quota_refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["ai_audit_jobs"]["Insert"]
        >;
      };
      ai_audit_results: {
        Row: {
          id: string;
          job_id: string;
          user_id: string;
          summary: string;
          result_markdown: string;
          risk_level: RiskLevel | null;
          issue_tags: string[];
          token_input: number;
          token_output: number;
          cost_estimate_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          user_id: string;
          summary: string;
          result_markdown: string;
          risk_level?: RiskLevel | null;
          issue_tags?: string[];
          token_input?: number;
          token_output?: number;
          cost_estimate_cents?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ai_audit_results"]["Insert"]
        >;
      };
      audit_summary_shares: {
        Row: {
          id: string;
          document_id: string;
          student_user_id: string;
          lab_id: string;
          consented_at: string;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          student_user_id: string;
          lab_id: string;
          consented_at?: string;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["audit_summary_shares"]["Insert"]
        >;
        Relationships: [];
      };
      ai_usage_credits: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string | null;
          period_start: string;
          period_end: string;
          monthly_credit_limit: number;
          credits_used: number;
          pdf_audit_limit: number;
          pdf_audit_used: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id?: string | null;
          period_start: string;
          period_end: string;
          monthly_credit_limit?: number;
          credits_used?: number;
          pdf_audit_limit?: number;
          pdf_audit_used?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ai_usage_credits"]["Insert"]
        >;
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: SubscriptionStatus;
          price_id: string;
          plan_key: SubscriptionPlanKey;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          last_stripe_event_created_at: string | null;
          last_stripe_event_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: SubscriptionStatus;
          price_id: string;
          plan_key: SubscriptionPlanKey;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end?: boolean;
          last_stripe_event_created_at?: string | null;
          last_stripe_event_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["subscriptions"]["Insert"]
        >;
      };
      subscription_items: {
        Row: {
          id: string;
          subscription_id: string;
          stripe_subscription_item_id: string;
          stripe_price_id: string;
          quantity: number;
          plan_feature_key: SubscriptionItemFeatureKey;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          stripe_subscription_item_id: string;
          stripe_price_id: string;
          quantity?: number;
          plan_feature_key: SubscriptionItemFeatureKey;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["subscription_items"]["Insert"]
        >;
      };
      stripe_events: {
        Row: {
          id: string;
          stripe_event_id: string;
          event_type: string;
          processed_at: string | null;
          payload: Json;
          status: "processing" | "processed" | "failed";
          processing_started_at: string | null;
          error_message: string | null;
          event_created_at: string | null;
          attempts: number;
        };
        Insert: {
          id?: string;
          stripe_event_id: string;
          event_type: string;
          processed_at?: string | null;
          payload: Json;
          status?: "processing" | "processed" | "failed";
          processing_started_at?: string | null;
          error_message?: string | null;
          event_created_at?: string | null;
          attempts?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["stripe_events"]["Insert"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_invite_code_usage: {
        Args: {
          target_hash: string;
        };
        Returns: Database["public"]["Tables"]["lab_invite_codes"]["Row"];
      };
      increment_pdf_audit_usage: {
        Args: {
          target_credit_id: string;
        };
        Returns: Database["public"]["Tables"]["ai_usage_credits"]["Row"];
      };
      reserve_pdf_audit_credit: {
        Args: { target_credit_id: string; target_job_id: string };
        Returns: boolean;
      };
      complete_ai_audit_job: {
        Args: {
          target_job_id: string;
          result_summary: string;
          result_markdown: string;
          result_risk_level: string;
          result_issue_tags: string[];
          result_token_input: number;
          result_token_output: number;
          result_cost_estimate_cents: number;
        };
        Returns: boolean;
      };
      fail_ai_audit_job: {
        Args: { target_job_id: string; failure_message: string };
        Returns: boolean;
      };
      claim_stripe_event: {
        Args: {
          target_event_id: string;
          target_event_type: string;
          target_event_created_at: string;
          target_payload: Json;
        };
        Returns: boolean;
      };
      finish_stripe_event: {
        Args: {
          target_event_id: string;
          succeeded: boolean;
          failure_message?: string | null;
        };
        Returns: boolean;
      };
      create_email_verification_challenge: {
        Args: {
          target_id: string;
          target_email_hash: string;
          target_pin_hash: string;
          target_ip_hash: string;
          target_expires_at: string;
          target_cooldown_seconds?: number;
          target_window_seconds?: number;
          target_max_email_sends?: number;
          target_max_ip_sends?: number;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
