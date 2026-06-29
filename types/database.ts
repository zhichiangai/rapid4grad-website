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
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "refunded";

export type EntitlementType = "course_access" | "tool_access" | "membership";

export type EntitlementStatus = "active" | "expired" | "revoked";

export type AiModel = "chatgpt" | "claude" | "gemini" | "grok";

export type PromptTemplateTargetAi = AiModel | "all";

export type PromptTemplateType =
  | "advisor_questions"
  | "logic_check"
  | "presentation_revision"
  | "english_polish";

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
          amount: number;
          currency: string;
          duration_months: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          amount: number;
          currency?: string;
          duration_months?: number | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
