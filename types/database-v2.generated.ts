export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_action_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          reason: string
          request_id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action_type: string
          admin_user_id: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          reason: string
          request_id: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          reason?: string
          request_id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      advisor_memories: {
        Row: {
          common_questions: string[]
          created_at: string
          custom_notes: string | null
          id: string
          preference_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          common_questions?: string[]
          created_at?: string
          custom_notes?: string | null
          id?: string
          preference_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          common_questions?: string[]
          created_at?: string
          custom_notes?: string | null
          id?: string
          preference_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_audit_jobs: {
        Row: {
          audit_type: Database["public"]["Enums"]["ai_audit_type"]
          completed_at: string | null
          created_at: string
          credit_id: string
          credit_state: Database["public"]["Enums"]["audit_credit_state"]
          document_id: string
          error_code: string | null
          error_message: string | null
          id: string
          input_prompt: string
          lab_id: string
          model: string
          provider: Database["public"]["Enums"]["ai_audit_provider"]
          quota_refunded_at: string | null
          quota_reserved_at: string
          quota_settled_at: string | null
          status: Database["public"]["Enums"]["ai_audit_job_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          audit_type: Database["public"]["Enums"]["ai_audit_type"]
          completed_at?: string | null
          created_at?: string
          credit_id: string
          credit_state?: Database["public"]["Enums"]["audit_credit_state"]
          document_id: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          input_prompt: string
          lab_id: string
          model: string
          provider: Database["public"]["Enums"]["ai_audit_provider"]
          quota_refunded_at?: string | null
          quota_reserved_at?: string
          quota_settled_at?: string | null
          status?: Database["public"]["Enums"]["ai_audit_job_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          audit_type?: Database["public"]["Enums"]["ai_audit_type"]
          completed_at?: string | null
          created_at?: string
          credit_id?: string
          credit_state?: Database["public"]["Enums"]["audit_credit_state"]
          document_id?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          input_prompt?: string
          lab_id?: string
          model?: string
          provider?: Database["public"]["Enums"]["ai_audit_provider"]
          quota_refunded_at?: string | null
          quota_reserved_at?: string
          quota_settled_at?: string | null
          status?: Database["public"]["Enums"]["ai_audit_job_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_jobs_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "lab_usage_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "student_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_jobs_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_audit_results: {
        Row: {
          cost_estimate_cents: number
          created_at: string
          id: string
          issue_tags: string[]
          job_id: string
          result_markdown: string
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          summary: string
          token_input: number
          token_output: number
          user_id: string
        }
        Insert: {
          cost_estimate_cents?: number
          created_at?: string
          id?: string
          issue_tags?: string[]
          job_id: string
          result_markdown: string
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          summary: string
          token_input?: number
          token_output?: number
          user_id: string
        }
        Update: {
          cost_estimate_cents?: number
          created_at?: string
          id?: string
          issue_tags?: string[]
          job_id?: string
          result_markdown?: string
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          summary?: string
          token_input?: number
          token_output?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "ai_audit_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_instruction_usages: {
        Row: {
          advisor_prefs: Json
          created_at: string
          email: string | null
          generated_prompt: string
          id: string
          instruction_types: string[]
          is_anonymous_trial: boolean
          meeting_context: string
          pain_points: string[]
          selected_ai: string
          student_stage: string
          user_id: string | null
        }
        Insert: {
          advisor_prefs?: Json
          created_at?: string
          email?: string | null
          generated_prompt: string
          id?: string
          instruction_types?: string[]
          is_anonymous_trial?: boolean
          meeting_context: string
          pain_points?: string[]
          selected_ai: string
          student_stage: string
          user_id?: string | null
        }
        Update: {
          advisor_prefs?: Json
          created_at?: string
          email?: string | null
          generated_prompt?: string
          id?: string
          instruction_types?: string[]
          is_anonymous_trial?: boolean
          meeting_context?: string
          pain_points?: string[]
          selected_ai?: string
          student_stage?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_summary_shares: {
        Row: {
          consented_at: string
          created_at: string
          document_id: string
          id: string
          lab_id: string
          revoked_at: string | null
          student_user_id: string
          updated_at: string
        }
        Insert: {
          consented_at?: string
          created_at?: string
          document_id: string
          id?: string
          lab_id: string
          revoked_at?: string | null
          student_user_id: string
          updated_at?: string
        }
        Update: {
          consented_at?: string
          created_at?: string
          document_id?: string
          id?: string
          lab_id?: string
          revoked_at?: string | null
          student_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_summary_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "student_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_summary_shares_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      course_access: {
        Row: {
          created_at: string
          expires_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          payment_id: string | null
          plan_type: string
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          payment_id?: string | null
          plan_type?: string
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          payment_id?: string | null
          plan_type?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_access_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          access_level: Database["public"]["Enums"]["lesson_access_level"]
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          material_url: string | null
          module_key: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
          video_external_id: string | null
          video_provider: string
        }
        Insert: {
          access_level: Database["public"]["Enums"]["lesson_access_level"]
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          material_url?: string | null
          module_key: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          video_external_id?: string | null
          video_provider?: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["lesson_access_level"]
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          material_url?: string | null
          module_key?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          video_external_id?: string | null
          video_provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          progress_seconds: number
          status: Database["public"]["Enums"]["lesson_progress_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          progress_seconds?: number
          status?: Database["public"]["Enums"]["lesson_progress_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          progress_seconds?: number
          status?: Database["public"]["Enums"]["lesson_progress_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_verification_challenges: {
        Row: {
          created_at: string
          email_hash: string
          expires_at: string
          failed_attempts: number
          id: string
          ip_hash: string
          pin_hash: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          email_hash: string
          expires_at: string
          failed_attempts?: number
          id: string
          ip_hash: string
          pin_hash: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          email_hash?: string
          expires_at?: string
          failed_attempts?: number
          id?: string
          ip_hash?: string
          pin_hash?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          created_at: string
          ends_at: string | null
          entitlement_type: Database["public"]["Enums"]["entitlement_type"]
          id: string
          product_id: string
          revoked_at: string | null
          revoked_reason: string | null
          source_order_id: string | null
          source_payment_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["entitlement_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          entitlement_type: Database["public"]["Enums"]["entitlement_type"]
          id?: string
          product_id: string
          revoked_at?: string | null
          revoked_reason?: string | null
          source_order_id?: string | null
          source_payment_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["entitlement_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          entitlement_type?: Database["public"]["Enums"]["entitlement_type"]
          id?: string
          product_id?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          source_order_id?: string | null
          source_payment_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["entitlement_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      free_usage_quotas: {
        Row: {
          admin_note: string | null
          admin_unlocked_total: number
          daily_count: number
          daily_limit: number
          email: string
          id: string
          last_reset_at: string
          last_used_at: string | null
          total_count: number
          total_limit: number
          unlocked_by_admin: boolean
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          admin_unlocked_total?: number
          daily_count?: number
          daily_limit?: number
          email: string
          id?: string
          last_reset_at?: string
          last_used_at?: string | null
          total_count?: number
          total_limit?: number
          unlocked_by_admin?: boolean
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          admin_unlocked_total?: number
          daily_count?: number
          daily_limit?: number
          email?: string
          id?: string
          last_reset_at?: string
          last_used_at?: string | null
          total_count?: number
          total_limit?: number
          unlocked_by_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      lab_invite_codes: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          intended_role: Database["public"]["Enums"]["lab_role"]
          lab_id: string
          max_uses: number | null
          revoked_at: string | null
          used_count: number
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          intended_role?: Database["public"]["Enums"]["lab_role"]
          lab_id: string
          max_uses?: number | null
          revoked_at?: string | null
          used_count?: number
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          intended_role?: Database["public"]["Enums"]["lab_role"]
          lab_id?: string
          max_uses?: number | null
          revoked_at?: string | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_invite_codes_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_memberships: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          lab_id: string
          removal_reason: string | null
          removed_at: string | null
          removed_by: string | null
          role: Database["public"]["Enums"]["lab_role"]
          status: Database["public"]["Enums"]["lab_membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          lab_id: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role: Database["public"]["Enums"]["lab_role"]
          status?: Database["public"]["Enums"]["lab_membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          lab_id?: string
          removal_reason?: string | null
          removed_at?: string | null
          removed_by?: string | null
          role?: Database["public"]["Enums"]["lab_role"]
          status?: Database["public"]["Enums"]["lab_membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_memberships_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_usage_credits: {
        Row: {
          created_at: string
          id: string
          lab_id: string
          pdf_audit_limit: number
          pdf_audit_reserved: number
          pdf_audit_used: number
          period_end: string
          period_start: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lab_id: string
          pdf_audit_limit: number
          pdf_audit_reserved?: number
          pdf_audit_used?: number
          period_end: string
          period_start: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lab_id?: string
          pdf_audit_limit?: number
          pdf_audit_reserved?: number
          pdf_audit_used?: number
          period_end?: string
          period_start?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_usage_credits_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_usage_credits_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          institution: string | null
          name: string
          owner_professor_id: string
          status: Database["public"]["Enums"]["lab_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          name: string
          owner_professor_id: string
          status?: Database["public"]["Enums"]["lab_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          institution?: string | null
          name?: string
          owner_professor_id?: string
          status?: Database["public"]["Enums"]["lab_status"]
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          current_year: string | null
          degree_type: string | null
          email: string
          email_verified: boolean
          id: string
          is_registered: boolean
          lead_status: Database["public"]["Enums"]["lead_status"]
          main_tags: string[]
          name: string | null
          quiz_result: Database["public"]["Enums"]["risk_level"] | null
          quiz_score: number | null
          updated_at: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          current_year?: string | null
          degree_type?: string | null
          email: string
          email_verified?: boolean
          id?: string
          is_registered?: boolean
          lead_status?: Database["public"]["Enums"]["lead_status"]
          main_tags?: string[]
          name?: string | null
          quiz_result?: Database["public"]["Enums"]["risk_level"] | null
          quiz_score?: number | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          current_year?: string | null
          degree_type?: string | null
          email?: string
          email_verified?: boolean
          id?: string
          is_registered?: boolean
          lead_status?: Database["public"]["Enums"]["lead_status"]
          main_tags?: string[]
          name?: string | null
          quiz_result?: Database["public"]["Enums"]["risk_level"] | null
          quiz_score?: number | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          checkout_url: string | null
          confirmation_email_sent_at: string | null
          created_at: string
          currency: string
          id: string
          idempotency_key: string
          lab_id: string | null
          paid_at: string | null
          product_id: string
          product_price_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_order_id: string | null
          raw_checkout_payload: Json | null
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          checkout_url?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key: string
          lab_id?: string | null
          paid_at?: string | null
          product_id: string
          product_price_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_order_id?: string | null
          raw_checkout_payload?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string
          lab_id?: string | null
          paid_at?: string | null
          product_id?: string
          product_price_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_order_id?: string | null
          raw_checkout_payload?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_price_id_fkey"
            columns: ["product_price_id"]
            isOneToOne: false
            referencedRelation: "product_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          attempts: number
          created_at: string
          error_code: string | null
          event_created_at: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_started_at: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_event_id: string
          status: Database["public"]["Enums"]["payment_event_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_code?: string | null
          event_created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          processing_started_at?: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_event_id: string
          status?: Database["public"]["Enums"]["payment_event_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_code?: string | null
          event_created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_started_at?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_event_id?: string
          status?: Database["public"]["Enums"]["payment_event_status"]
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          email: string
          id: string
          order_id: string
          paid_at: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id: string | null
          raw_payload: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          email: string
          id?: string
          order_id: string
          paid_at?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          email?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_payment_id?: string | null
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          id: string
          interval: Database["public"]["Enums"]["price_interval"]
          is_active: boolean
          metadata: Json
          product_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_price_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          interval: Database["public"]["Enums"]["price_interval"]
          is_active?: boolean
          metadata?: Json
          product_id: string
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_price_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          interval?: Database["public"]["Enums"]["price_interval"]
          is_active?: boolean
          metadata?: Json
          product_id?: string
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_price_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          billing_model: Database["public"]["Enums"]["billing_model"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          slug: string
          updated_at: string
        }
        Insert: {
          billing_model: Database["public"]["Enums"]["billing_model"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          slug: string
          updated_at?: string
        }
        Update: {
          billing_model?: Database["public"]["Enums"]["billing_model"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      professor_subscription_trials: {
        Row: {
          claimed_at: string
          created_at: string
          id: string
          lab_id: string
          payer_user_id: string
          subscription_id: string
        }
        Insert: {
          claimed_at?: string
          created_at?: string
          id?: string
          lab_id: string
          payer_user_id: string
          subscription_id: string
        }
        Update: {
          claimed_at?: string
          created_at?: string
          id?: string
          lab_id?: string
          payer_user_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professor_subscription_trials_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: true
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professor_subscription_trials_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: true
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          advisor_name: string | null
          advisor_style: string | null
          avatar_url: string | null
          course_expires_at: string | null
          created_at: string
          degree: string | null
          department: string | null
          email: string
          full_name: string | null
          id: string
          is_paid: boolean
          paid_at: string | null
          research_area: string | null
          role: Database["public"]["Enums"]["profile_role"]
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          advisor_name?: string | null
          advisor_style?: string | null
          avatar_url?: string | null
          course_expires_at?: string | null
          created_at?: string
          degree?: string | null
          department?: string | null
          email: string
          full_name?: string | null
          id: string
          is_paid?: boolean
          paid_at?: string | null
          research_area?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          advisor_name?: string | null
          advisor_style?: string | null
          avatar_url?: string | null
          course_expires_at?: string | null
          created_at?: string
          degree?: string | null
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_paid?: boolean
          paid_at?: string | null
          research_area?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          context_template: string
          created_at: string
          id: string
          is_active: boolean
          official_doc_notes: string | null
          output_template: string
          system_role: string
          target_ai: string
          task_template: string
          template_type: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          context_template: string
          created_at?: string
          id?: string
          is_active?: boolean
          official_doc_notes?: string | null
          output_template: string
          system_role: string
          target_ai: string
          task_template: string
          template_type: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          context_template?: string
          created_at?: string
          id?: string
          is_active?: boolean
          official_doc_notes?: string | null
          output_template?: string
          system_role?: string
          target_ai?: string
          task_template?: string
          template_type?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          id: string
          lead_id: string
          q1: string | null
          q2: string | null
          q3: string | null
          q4: string | null
          q5: string | null
          q6: string | null
          q7: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          submitted_at: string
          tags: string[]
          total_score: number | null
          user_id: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          q1?: string | null
          q2?: string | null
          q3?: string | null
          q4?: string | null
          q5?: string | null
          q6?: string | null
          q7?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          submitted_at?: string
          tags?: string[]
          total_score?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          q1?: string | null
          q2?: string | null
          q3?: string | null
          q4?: string | null
          q5?: string | null
          q6?: string | null
          q7?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          submitted_at?: string
          tags?: string[]
          total_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_size_bytes: number
          id: string
          mime_type: string
          original_filename: string
          sha256_hex: string | null
          storage_bucket: string
          storage_path: string
          updated_at: string
          upload_status: Database["public"]["Enums"]["document_upload_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_size_bytes: number
          id?: string
          mime_type: string
          original_filename: string
          sha256_hex?: string | null
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          upload_status?: Database["public"]["Enums"]["document_upload_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_size_bytes?: number
          id?: string
          mime_type?: string
          original_filename?: string
          sha256_hex?: string | null
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          upload_status?: Database["public"]["Enums"]["document_upload_status"]
          user_id?: string
        }
        Relationships: []
      }
      subscription_items: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          metadata: Json
          provider_item_id: string | null
          quantity: number
          subscription_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          metadata?: Json
          provider_item_id?: string | null
          quantity?: number
          subscription_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          metadata?: Json
          provider_item_id?: string | null
          quantity?: number
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_items_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_interval: Database["public"]["Enums"]["subscription_interval"]
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          grace_ends_at: string | null
          id: string
          lab_id: string
          last_provider_event_created_at: string | null
          last_provider_event_id: string | null
          metadata: Json
          payer_user_id: string
          plan_key: Database["public"]["Enums"]["professor_plan_key"]
          product_id: string
          product_price_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          billing_interval: Database["public"]["Enums"]["subscription_interval"]
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          grace_ends_at?: string | null
          id?: string
          lab_id: string
          last_provider_event_created_at?: string | null
          last_provider_event_id?: string | null
          metadata?: Json
          payer_user_id: string
          plan_key: Database["public"]["Enums"]["professor_plan_key"]
          product_id: string
          product_price_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: Database["public"]["Enums"]["subscription_interval"]
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          grace_ends_at?: string | null
          id?: string
          lab_id?: string
          last_provider_event_created_at?: string | null
          last_provider_event_id?: string | null
          metadata?: Json
          payer_user_id?: string
          plan_key?: Database["public"]["Enums"]["professor_plan_key"]
          product_id?: string
          product_price_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_price_id_fkey"
            columns: ["product_price_id"]
            isOneToOne: false
            referencedRelation: "product_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      change_lab_member_role: {
        Args: {
          target_actor_id: string
          target_lab_id: string
          target_member_user_id: string
          target_role: Database["public"]["Enums"]["lab_role"]
        }
        Returns: boolean
      }
      complete_lab_pdf_audit_job: {
        Args: {
          result_cost_estimate_cents: number
          result_issue_tags: string[]
          result_markdown: string
          result_risk_level: Database["public"]["Enums"]["risk_level"]
          result_summary: string
          result_token_input: number
          result_token_output: number
          target_job_id: string
        }
        Returns: boolean
      }
      create_lab_invite: {
        Args: {
          target_actor_id: string
          target_expires_at: string
          target_hash: string
          target_lab_id: string
          target_max_uses?: number
          target_role: Database["public"]["Enums"]["lab_role"]
        }
        Returns: string
      }
      create_professor_lab: {
        Args: {
          target_institution?: string
          target_name: string
          target_professor_id: string
        }
        Returns: string
      }
      create_professor_subscription_checkout_order: {
        Args: {
          target_billing_interval: Database["public"]["Enums"]["subscription_interval"]
          target_idempotency_key: string
          target_lab_id: string
          target_payer_user_id: string
          target_plan_key: Database["public"]["Enums"]["professor_plan_key"]
        }
        Returns: Json
      }
      create_student_course_checkout_order: {
        Args: {
          target_idempotency_key: string
          target_provider: Database["public"]["Enums"]["payment_provider"]
          target_user_id: string
        }
        Returns: {
          amount: number
          checkout_url: string
          currency: string
          is_lab_discount: boolean
          order_id: string
          order_status: Database["public"]["Enums"]["order_status"]
          product_id: string
          product_metadata: Json
          product_name: string
          product_price_id: string
          product_slug: string
          product_type: Database["public"]["Enums"]["product_type"]
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_order_id: string
          user_id: string
        }[]
      }
      fail_lab_pdf_audit_job: {
        Args: {
          failure_code: string
          failure_message: string
          target_job_id: string
        }
        Returns: boolean
      }
      get_my_lab_pdf_credit_balance: {
        Args: never
        Returns: {
          lab_id: string
          pdf_audit_limit: number
          pdf_audit_remaining: number
          pdf_audit_reserved: number
          pdf_audit_used: number
          period_end: string
          period_start: string
        }[]
      }
      get_shared_audit_summaries: {
        Args: { target_lab_id: string; target_student_user_id?: string }
        Returns: {
          completed_at: string
          created_at: string
          issue_tags: string[]
          job_id: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          student_user_id: string
          summary: string
        }[]
      }
      grant_audit_summary_consent: {
        Args: {
          target_document_id: string
          target_lab_id: string
          target_student_id: string
        }
        Returns: string
      }
      grant_course_entitlement_for_order: {
        Args: { target_order_id: string; target_payment_id?: string }
        Returns: string
      }
      mark_professor_subscription_cancel_at_period_end: {
        Args: { target_payer_user_id: string; target_subscription_id: string }
        Returns: Json
      }
      prepare_professor_subscription_upgrade: {
        Args: {
          target_order_id: string
          target_payer_user_id: string
          target_previous_provider_subscription_id: string
          target_subscription_id: string
        }
        Returns: Json
      }
      process_one_time_payment_event: {
        Args: {
          target_amount: number
          target_currency: string
          target_event_id: string
          target_event_type: string
          target_outcome: string
          target_paid_at: string
          target_payload: Json
          target_provider: Database["public"]["Enums"]["payment_provider"]
          target_provider_order_id: string
          target_provider_payment_id: string
        }
        Returns: Json
      }
      process_professor_subscription_event: {
        Args: {
          target_amount: number
          target_currency: string
          target_error_code?: string
          target_event_created_at: string
          target_outcome: string
          target_payload: Json
          target_period_end: string
          target_provider_event_id: string
          target_provider_order_id: string
          target_provider_payment_id: string
        }
        Returns: Json
      }
      record_admin_action: {
        Args: {
          target_action_type: string
          target_admin_user_id: string
          target_after_state: Json
          target_before_state: Json
          target_id: string
          target_reason: string
          target_request_id: string
          target_type: string
        }
        Returns: string
      }
      redeem_lab_invite: {
        Args: { target_hash: string; target_user_id: string }
        Returns: Json
      }
      remove_lab_member: {
        Args: {
          target_actor_id: string
          target_lab_id: string
          target_member_user_id: string
          target_reason: string
        }
        Returns: boolean
      }
      reserve_lab_pdf_audit_credit: {
        Args: {
          target_audit_type: Database["public"]["Enums"]["ai_audit_type"]
          target_document_id: string
          target_input_prompt: string
          target_model: string
          target_provider: Database["public"]["Enums"]["ai_audit_provider"]
          target_user_id: string
        }
        Returns: string
      }
      revoke_audit_summary_consent: {
        Args: {
          target_document_id: string
          target_lab_id: string
          target_student_id: string
        }
        Returns: boolean
      }
      revoke_lab_invite: {
        Args: { target_actor_id: string; target_invite_id: string }
        Returns: boolean
      }
      start_professor_subscription_trial: {
        Args: {
          target_billing_interval: Database["public"]["Enums"]["subscription_interval"]
          target_lab_id: string
          target_payer_user_id: string
          target_plan_key: Database["public"]["Enums"]["professor_plan_key"]
        }
        Returns: Json
      }
    }
    Enums: {
      account_status: "active" | "suspended"
      ai_audit_job_status:
        | "queued"
        | "streaming"
        | "completed"
        | "failed"
        | "cancelled"
      ai_audit_provider: "openai" | "anthropic"
      ai_audit_type:
        | "advisor_questions"
        | "logic_check"
        | "presentation_review"
        | "english_polish"
        | "full_review"
      audit_credit_state: "reserved" | "settled" | "refunded"
      billing_model: "one_time" | "recurring" | "manual"
      document_type: "thesis" | "slides" | "draft" | "paper"
      document_upload_status: "uploaded" | "processing" | "ready" | "failed"
      entitlement_status: "active" | "revoked"
      entitlement_type: "course_full" | "legacy_tool_access"
      lab_membership_status: "active" | "pending" | "removed"
      lab_role: "professor" | "assistant" | "student"
      lab_status: "active" | "archived"
      lead_status: "new" | "contacted" | "consulted" | "purchased" | "not_fit"
      lesson_access_level: "public_preview" | "lab_basic" | "full_course"
      lesson_progress_status: "not_started" | "in_progress" | "completed"
      order_status:
        | "pending"
        | "processing"
        | "paid"
        | "failed"
        | "cancelled"
        | "expired"
        | "refunded"
      payment_event_status: "processing" | "processed" | "failed"
      payment_provider: "ecpay" | "newebpay" | "tappay" | "stripe" | "manual"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
      price_interval: "one_time" | "month" | "year" | "manual"
      product_type:
        | "course"
        | "professor_subscription"
        | "consultation"
        | "bundle"
        | "ai_credits"
      professor_plan_key:
        | "professor_lab_standard"
        | "professor_lab_plus"
        | "professor_lab_enterprise"
      profile_role: "student" | "professor" | "admin"
      risk_level: "low" | "medium" | "high"
      subscription_interval: "month" | "year" | "manual"
      subscription_status:
        | "incomplete"
        | "trialing"
        | "active"
        | "past_due"
        | "unpaid"
        | "canceled"
        | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "suspended"],
      ai_audit_job_status: [
        "queued",
        "streaming",
        "completed",
        "failed",
        "cancelled",
      ],
      ai_audit_provider: ["openai", "anthropic"],
      ai_audit_type: [
        "advisor_questions",
        "logic_check",
        "presentation_review",
        "english_polish",
        "full_review",
      ],
      audit_credit_state: ["reserved", "settled", "refunded"],
      billing_model: ["one_time", "recurring", "manual"],
      document_type: ["thesis", "slides", "draft", "paper"],
      document_upload_status: ["uploaded", "processing", "ready", "failed"],
      entitlement_status: ["active", "revoked"],
      entitlement_type: ["course_full", "legacy_tool_access"],
      lab_membership_status: ["active", "pending", "removed"],
      lab_role: ["professor", "assistant", "student"],
      lab_status: ["active", "archived"],
      lead_status: ["new", "contacted", "consulted", "purchased", "not_fit"],
      lesson_access_level: ["public_preview", "lab_basic", "full_course"],
      lesson_progress_status: ["not_started", "in_progress", "completed"],
      order_status: [
        "pending",
        "processing",
        "paid",
        "failed",
        "cancelled",
        "expired",
        "refunded",
      ],
      payment_event_status: ["processing", "processed", "failed"],
      payment_provider: ["ecpay", "newebpay", "tappay", "stripe", "manual"],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
      ],
      price_interval: ["one_time", "month", "year", "manual"],
      product_type: [
        "course",
        "professor_subscription",
        "consultation",
        "bundle",
        "ai_credits",
      ],
      professor_plan_key: [
        "professor_lab_standard",
        "professor_lab_plus",
        "professor_lab_enterprise",
      ],
      profile_role: ["student", "professor", "admin"],
      risk_level: ["low", "medium", "high"],
      subscription_interval: ["month", "year", "manual"],
      subscription_status: [
        "incomplete",
        "trialing",
        "active",
        "past_due",
        "unpaid",
        "canceled",
        "expired",
      ],
    },
  },
} as const

