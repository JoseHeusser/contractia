export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          contract_id: string
          created_at: string
          due_date: string | null
          evidence_snippet_id: string | null
          id: string
          message: string
          severity: string
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          due_date?: string | null
          evidence_snippet_id?: string | null
          id?: string
          message: string
          severity: string
          status?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          due_date?: string | null
          evidence_snippet_id?: string | null
          id?: string
          message?: string
          severity?: string
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      benefits: {
        Row: {
          category: string | null
          contract_id: string
          copay: Json | null
          created_at: string
          deductible: Json | null
          evidence_snippet_ids: string[] | null
          id: string
          includes_simple: string | null
          limits: Json | null
          name: string
          network_rules: Json | null
          requirements: string | null
          restrictions: string | null
          sort_order: number
          user_id: string
          waiting_period: Json | null
        }
        Insert: {
          category?: string | null
          contract_id: string
          copay?: Json | null
          created_at?: string
          deductible?: Json | null
          evidence_snippet_ids?: string[] | null
          id?: string
          includes_simple?: string | null
          limits?: Json | null
          name: string
          network_rules?: Json | null
          requirements?: string | null
          restrictions?: string | null
          sort_order?: number
          user_id: string
          waiting_period?: Json | null
        }
        Update: {
          category?: string | null
          contract_id?: string
          copay?: Json | null
          created_at?: string
          deductible?: Json | null
          evidence_snippet_ids?: string[] | null
          id?: string
          includes_simple?: string | null
          limits?: Json | null
          name?: string
          network_rules?: Json | null
          requirements?: string | null
          restrictions?: string | null
          sort_order?: number
          user_id?: string
          waiting_period?: Json | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          context_snapshot: Json | null
          created_at: string
          evidence_snippet_ids: string[] | null
          id: string
          input_tokens: number | null
          output_tokens: number | null
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          context_snapshot?: Json | null
          created_at?: string
          evidence_snippet_ids?: string[] | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          context_snapshot?: Json | null
          created_at?: string
          evidence_snippet_ids?: string[] | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_threads: {
        Row: {
          contract_ids: string[] | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_ids?: string[] | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_ids?: string[] | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contract_documents: {
        Row: {
          contract_id: string
          created_at: string
          file_mime: string
          file_size_bytes: number | null
          id: string
          metadata: Json | null
          ocr_confidence: number | null
          ocr_storage_path: string | null
          pages: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          file_mime: string
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          ocr_confidence?: number | null
          ocr_storage_path?: string | null
          pages?: number | null
          storage_path: string
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          file_mime?: string
          file_size_bytes?: number | null
          id?: string
          metadata?: Json | null
          ocr_confidence?: number | null
          ocr_storage_path?: string | null
          pages?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          chunk_index: number | null
          content: string
          contract_id: string
          created_at: string
          document_id: string | null
          embedding: string | null
          id: string
          page_end: number | null
          page_start: number | null
          token_count: number | null
          user_id: string
        }
        Insert: {
          chunk_index?: number | null
          content: string
          contract_id: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          id?: string
          page_end?: number | null
          page_start?: number | null
          token_count?: number | null
          user_id: string
        }
        Update: {
          chunk_index?: number | null
          content?: string
          contract_id?: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          id?: string
          page_end?: number | null
          page_start?: number | null
          token_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          ai_summary_simple: string | null
          auto_renew: boolean | null
          cancellation_notice_days: number | null
          cancellation_summary: string | null
          category: string
          claims_email: string | null
          claims_phone: string | null
          claims_url: string | null
          contract_display_name: string
          copay_amount: number | null
          copay_currency: string | null
          copay_percentage: number | null
          copay_summary: string | null
          copay_type: string | null
          created_at: string
          deductible_amount: number | null
          deductible_currency: string | null
          deductible_summary: string | null
          deductible_type: string | null
          effective_date: string | null
          end_date: string | null
          error_code: string | null
          error_message: string | null
          exclusions: Json | null
          explicit_increase: boolean | null
          explicit_increase_date: string | null
          explicit_increase_evidence: string | null
          explicit_increase_rate: number | null
          id: string
          key_points: Json | null
          late_payment_terms: string | null
          missing_fields: Json | null
          missing_references: Json | null
          monthly_cost: number | null
          monthly_cost_currency: string | null
          needs_review_reasons: Json | null
          payment_method: string | null
          policyholder_name: string | null
          price_adjustment_clause: boolean | null
          privacy_summary: string | null
          provider_name: string | null
          reimbursement_summary: string | null
          renewal_date: string | null
          retry_count: number
          status: string
          updated_at: string
          user_id: string
          waiting_periods: Json | null
        }
        Insert: {
          ai_summary_simple?: string | null
          auto_renew?: boolean | null
          cancellation_notice_days?: number | null
          cancellation_summary?: string | null
          category?: string
          claims_email?: string | null
          claims_phone?: string | null
          claims_url?: string | null
          contract_display_name: string
          copay_amount?: number | null
          copay_currency?: string | null
          copay_percentage?: number | null
          copay_summary?: string | null
          copay_type?: string | null
          created_at?: string
          deductible_amount?: number | null
          deductible_currency?: string | null
          deductible_summary?: string | null
          deductible_type?: string | null
          effective_date?: string | null
          end_date?: string | null
          error_code?: string | null
          error_message?: string | null
          exclusions?: Json | null
          explicit_increase?: boolean | null
          explicit_increase_date?: string | null
          explicit_increase_evidence?: string | null
          explicit_increase_rate?: number | null
          id?: string
          key_points?: Json | null
          late_payment_terms?: string | null
          missing_fields?: Json | null
          missing_references?: Json | null
          monthly_cost?: number | null
          monthly_cost_currency?: string | null
          needs_review_reasons?: Json | null
          payment_method?: string | null
          policyholder_name?: string | null
          price_adjustment_clause?: boolean | null
          privacy_summary?: string | null
          provider_name?: string | null
          reimbursement_summary?: string | null
          renewal_date?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
          user_id: string
          waiting_periods?: Json | null
        }
        Update: {
          ai_summary_simple?: string | null
          auto_renew?: boolean | null
          cancellation_notice_days?: number | null
          cancellation_summary?: string | null
          category?: string
          claims_email?: string | null
          claims_phone?: string | null
          claims_url?: string | null
          contract_display_name?: string
          copay_amount?: number | null
          copay_currency?: string | null
          copay_percentage?: number | null
          copay_summary?: string | null
          copay_type?: string | null
          created_at?: string
          deductible_amount?: number | null
          deductible_currency?: string | null
          deductible_summary?: string | null
          deductible_type?: string | null
          effective_date?: string | null
          end_date?: string | null
          error_code?: string | null
          error_message?: string | null
          exclusions?: Json | null
          explicit_increase?: boolean | null
          explicit_increase_date?: string | null
          explicit_increase_evidence?: string | null
          explicit_increase_rate?: number | null
          id?: string
          key_points?: Json | null
          late_payment_terms?: string | null
          missing_fields?: Json | null
          missing_references?: Json | null
          monthly_cost?: number | null
          monthly_cost_currency?: string | null
          needs_review_reasons?: Json | null
          payment_method?: string | null
          policyholder_name?: string | null
          price_adjustment_clause?: boolean | null
          privacy_summary?: string | null
          provider_name?: string | null
          reimbursement_summary?: string | null
          renewal_date?: string | null
          retry_count?: number
          status?: string
          updated_at?: string
          user_id?: string
          waiting_periods?: Json | null
        }
        Relationships: []
      }
      events: {
        Row: {
          contract_id: string | null
          created_at: string
          duration_ms: number | null
          event_type: string
          id: string
          payload: Json | null
          user_id: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          duration_ms?: number | null
          event_type: string
          id?: string
          payload?: Json | null
          user_id: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          duration_ms?: number | null
          event_type?: string
          id?: string
          payload?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      evidence_snippets: {
        Row: {
          char_end: number | null
          char_start: number | null
          contract_id: string
          created_at: string
          document_id: string
          field_key: string
          id: string
          page: number | null
          section: string | null
          snippet: string
          user_id: string
        }
        Insert: {
          char_end?: number | null
          char_start?: number | null
          contract_id: string
          created_at?: string
          document_id: string
          field_key: string
          id?: string
          page?: number | null
          section?: string | null
          snippet: string
          user_id: string
        }
        Update: {
          char_end?: number | null
          char_start?: number | null
          contract_id?: string
          created_at?: string
          document_id?: string
          field_key?: string
          id?: string
          page?: number | null
          section?: string | null
          snippet?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          contracts_limit: number
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          plan: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          contracts_limit?: number
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          plan?: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          contracts_limit?: number
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          plan?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
