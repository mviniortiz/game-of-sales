Initialising login role...
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
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
      agendamentos: {
        Row: {
          cliente_nome: string
          company_id: string | null
          created_at: string
          data_agendamento: string
          google_event_id: string | null
          id: string
          last_synced_at: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          synced_with_google: boolean | null
          user_id: string
        }
        Insert: {
          cliente_nome: string
          company_id?: string | null
          created_at?: string
          data_agendamento: string
          google_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          synced_with_google?: boolean | null
          user_id: string
        }
        Update: {
          cliente_nome?: string
          company_id?: string | null
          created_at?: string
          data_agendamento?: string
          google_event_id?: string | null
          id?: string
          last_synced_at?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          synced_with_google?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "contribuicao_vendedores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agendamentos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limit_counters: {
        Row: {
          bucket: string
          count: number
          created_at: string
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          created_at?: string
          updated_at?: string
          window_start: string
        }
        Update: {
          bucket?: string
          count?: number
          created_at?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          agendamento_id: string | null
          attendance_status:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          company_id: string | null
          created_at: string
          data_call: string
          duracao_minutos: number | null
          id: string
          observacoes: string | null
          resultado: Database["public"]["Enums"]["call_result"] | null
          user_id: string
        }
        Insert: {
          agendamento_id?: string | null
          attendance_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          company_id?: string | null
          created_at?: string
          data_call?: string
          duracao_minutos?: number | null
          id?: string
          observacoes?: string | null
          resultado?: Database["public"]["Enums"]["call_result"] | null
          user_id: string
        }
        Update: {
          agendamento_id?: string | null
          attendance_status?:
            | Database["public"]["Enums"]["attendance_status"]
            | null
          company_id?: string | null
          created_at?: string
          data_call?: string
          duracao_minutos?: number | null
          id?: string
          observacoes?: string | null
          resultado?: Database["public"]["Enums"]["call_result"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "contribuicao_vendedores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cancellation_reason: string | null
          cnpj: string | null
          created_at: string | null
          fbclid: string | null
          gclid: string | null
          id: string
          landing_page: string | null
          logo_url: string | null
          main_challenge: string | null
          mp_customer_id: string | null
          mp_plan_id: string | null
          mp_subscription_id: string | null
          name: string
          phone: string | null
          plan: string | null
          referral_source: string | null
          referrer: string | null
          segment: string | null
          subscription_cancelled_at: string | null
          subscription_ends_at: string | null
          subscription_status: string | null
          team_size: string | null
          trial_ends_at: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          website: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cnpj?: string | null
          created_at?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          landing_page?: string | null
          logo_url?: string | null
          main_challenge?: string | null
          mp_customer_id?: string | null
          mp_plan_id?: string | null
          mp_subscription_id?: string | null
          name: string
          phone?: string | null
          plan?: string | null
          referral_source?: string | null
          referrer?: string | null
          segment?: string | null
          subscription_cancelled_at?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          team_size?: string | null
          trial_ends_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          website?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cnpj?: string | null
          created_at?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          landing_page?: string | null
          logo_url?: string | null
          main_challenge?: string | null
          mp_customer_id?: string | null
          mp_plan_id?: string | null
          mp_subscription_id?: string | null
          name?: string
          phone?: string | null
          plan?: string | null
          referral_source?: string | null
          referrer?: string | null
          segment?: string | null
          subscription_cancelled_at?: string | null
          subscription_ends_at?: string | null
          subscription_status?: string | null
          team_size?: string | null
          trial_ends_at?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_addons: {
        Row: {
          calls_enabled: boolean
          calls_transcription_enabled: boolean
          company_id: string
          created_at: string
          metadata: Json
          updated_at: string
        }
        Insert: {
          calls_enabled?: boolean
          calls_transcription_enabled?: boolean
          company_id: string
          created_at?: string
          metadata?: Json
          updated_at?: string
        }
        Update: {
          calls_enabled?: boolean
          calls_transcription_enabled?: boolean
          company_id?: string
          created_at?: string
          metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_addons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      conquistas: {
        Row: {
          created_at: string
          criterio: Json
          descricao: string
          icone: string
          id: string
          nome: string
          pontos_bonus: number
        }
        Insert: {
          created_at?: string
          criterio: Json
          descricao: string
          icone: string
          id?: string
          nome: string
          pontos_bonus?: number
        }
        Update: {
          created_at?: string
          criterio?: Json
          descricao?: string
          icone?: string
          id?: string
          nome?: string
          pontos_bonus?: number
        }
        Relationships: []
      }
      contracts: {
        Row: {
          auto_renew: boolean
          billing_cycle: string
          client_name: string
          company_id: string
          contact_email: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          end_date: string | null
          id: string
          notes: string | null
          notify_days_before: number
          start_date: string
          status: string
          updated_at: string
          value: number
        }
        Insert: {
          auto_renew?: boolean
          billing_cycle?: string
          client_name: string
          company_id: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          notify_days_before?: number
          start_date?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Update: {
          auto_renew?: boolean
          billing_cycle?: string
          client_name?: string
          company_id?: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          notify_days_before?: number
          start_date?: string
          status?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_summaries: {
        Row: {
          analyzed_at: string
          cached_analysis: Json | null
          chat_name: string | null
          chat_phone: string
          company_id: string
          created_at: string
          deal_id: string | null
          id: string
          last_draft: string | null
          last_message_at: string | null
          message_count: number
          messages_hash: string | null
          next_action: string | null
          objections: string[] | null
          sentiment: string | null
          stage_suggestion: string | null
          strategy: string[] | null
          summary: string
          temperature: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analyzed_at?: string
          cached_analysis?: Json | null
          chat_name?: string | null
          chat_phone: string
          company_id: string
          created_at?: string
          deal_id?: string | null
          id?: string
          last_draft?: string | null
          last_message_at?: string | null
          message_count?: number
          messages_hash?: string | null
          next_action?: string | null
          objections?: string[] | null
          sentiment?: string | null
          stage_suggestion?: string | null
          strategy?: string[] | null
          summary: string
          temperature?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analyzed_at?: string
          cached_analysis?: Json | null
          chat_name?: string | null
          chat_phone?: string
          company_id?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          last_draft?: string | null
          last_message_at?: string | null
          message_count?: number
          messages_hash?: string | null
          next_action?: string | null
          objections?: string[] | null
          sentiment?: string | null
          stage_suggestion?: string | null
          strategy?: string[] | null
          summary?: string
          temperature?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_summaries_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          activity_type: string
          company_id: string | null
          created_at: string | null
          deal_id: string
          description: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          company_id?: string | null
          created_at?: string | null
          deal_id: string
          description?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          company_id?: string | null
          created_at?: string | null
          deal_id?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_call_insights: {
        Row: {
          action_items: Json
          call_id: string
          company_id: string
          created_at: string
          deal_id: string
          id: string
          model: string | null
          next_steps: Json
          objections: Json
          raw_output: Json
          status: string
          suggested_message: string | null
          suggested_stage: string | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: Json
          call_id: string
          company_id: string
          created_at?: string
          deal_id: string
          id?: string
          model?: string | null
          next_steps?: Json
          objections?: Json
          raw_output?: Json
          status?: string
          suggested_message?: string | null
          suggested_stage?: string | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: Json
          call_id?: string
          company_id?: string
          created_at?: string
          deal_id?: string
          id?: string
          model?: string | null
          next_steps?: Json
          objections?: Json
          raw_output?: Json
          status?: string
          suggested_message?: string | null
          suggested_stage?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_call_insights_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: true
            referencedRelation: "deal_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_call_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_calls: {
        Row: {
          company_id: string
          created_at: string
          customer_phone: string | null
          deal_id: string
          direction: string
          duration_seconds: number | null
          ended_at: string | null
          from_number: string | null
          id: string
          last_error: string | null
          metadata: Json
          provider: string
          provider_call_id: string | null
          recording_url: string | null
          seller_phone: string | null
          started_at: string | null
          status: string
          to_number: string | null
          transcript_language: string | null
          transcript_preview: string | null
          transcript_segments: Json
          transcript_status: string
          transcript_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_phone?: string | null
          deal_id: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          from_number?: string | null
          id?: string
          last_error?: string | null
          metadata?: Json
          provider?: string
          provider_call_id?: string | null
          recording_url?: string | null
          seller_phone?: string | null
          started_at?: string | null
          status?: string
          to_number?: string | null
          transcript_language?: string | null
          transcript_preview?: string | null
          transcript_segments?: Json
          transcript_status?: string
          transcript_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_phone?: string | null
          deal_id?: string
          direction?: string
          duration_seconds?: number | null
          ended_at?: string | null
          from_number?: string | null
          id?: string
          last_error?: string | null
          metadata?: Json
          provider?: string
          provider_call_id?: string | null
          recording_url?: string | null
          seller_phone?: string | null
          started_at?: string | null
          status?: string
          to_number?: string | null
          transcript_language?: string | null
          transcript_preview?: string | null
          transcript_segments?: Json
          transcript_status?: string
          transcript_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_custom_field_definitions: {
        Row: {
          company_id: string
          created_at: string | null
          field_name: string
          field_type: string
          id: string
          is_required: boolean
          options: Json | null
          position: number
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          field_name: string
          field_type: string
          id?: string
          is_required?: boolean
          options?: Json | null
          position?: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          position?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_custom_field_definitions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_custom_field_values: {
        Row: {
          created_at: string | null
          deal_id: string
          field_definition_id: string
          id: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          field_definition_id: string
          id?: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          field_definition_id?: string
          id?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_custom_field_values_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_custom_field_values_field_definition_id_fkey"
            columns: ["field_definition_id"]
            isOneToOne: false
            referencedRelation: "deal_custom_field_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_notes: {
        Row: {
          company_id: string | null
          content: string
          created_at: string | null
          deal_id: string
          id: string
          is_pinned: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string | null
          deal_id: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string | null
          deal_id?: string
          id?: string
          is_pinned?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_products: {
        Row: {
          company_id: string | null
          created_at: string | null
          deal_id: string
          desconto_percentual: number | null
          id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          deal_id: string
          desconto_percentual?: number | null
          id?: string
          preco_unitario: number
          produto_id: string
          quantidade?: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          deal_id?: string
          desconto_percentual?: number | null
          id?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_products_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tag_assignments: {
        Row: {
          created_at: string
          deal_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          deal_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          deal_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tag_assignments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "deal_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tags: {
        Row: {
          color: string
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          company_id: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          expected_close_date: string | null
          id: string
          is_hot: boolean | null
          lead_source: string | null
          loss_reason: string | null
          notes: string | null
          position: number | null
          probability: number | null
          product_id: string | null
          source_data: Json | null
          stage: string
          title: string
          updated_at: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          expected_close_date?: string | null
          id?: string
          is_hot?: boolean | null
          lead_source?: string | null
          loss_reason?: string | null
          notes?: string | null
          position?: number | null
          probability?: number | null
          product_id?: string | null
          source_data?: Json | null
          stage?: string
          title: string
          updated_at?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          expected_close_date?: string | null
          id?: string
          is_hot?: boolean | null
          lead_source?: string | null
          loss_reason?: string | null
          notes?: string | null
          position?: number | null
          probability?: number | null
          product_id?: string | null
          source_data?: Json | null
          stage?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      demo_requests: {
        Row: {
          ads_conversion_error: string | null
          ads_conversion_uploaded_at: string | null
          biggest_pain: string | null
          calendly_event_uri: string | null
          company: string | null
          created_at: string | null
          email: string
          fbclid: string | null
          gclid: string | null
          google_event_id: string | null
          google_meet_link: string | null
          id: string
          improvement_goal: string | null
          landing_page: string | null
          name: string
          notes: string | null
          phone: string | null
          referrer: string | null
          scheduled_at: string | null
          source: string | null
          status: string | null
          team_size: string | null
          updated_at: string | null
          uses_spreadsheets: boolean | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ads_conversion_error?: string | null
          ads_conversion_uploaded_at?: string | null
          biggest_pain?: string | null
          calendly_event_uri?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          fbclid?: string | null
          gclid?: string | null
          google_event_id?: string | null
          google_meet_link?: string | null
          id?: string
          improvement_goal?: string | null
          landing_page?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          referrer?: string | null
          scheduled_at?: string | null
          source?: string | null
          status?: string | null
          team_size?: string | null
          updated_at?: string | null
          uses_spreadsheets?: boolean | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ads_conversion_error?: string | null
          ads_conversion_uploaded_at?: string | null
          biggest_pain?: string | null
          calendly_event_uri?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          fbclid?: string | null
          gclid?: string | null
          google_event_id?: string | null
          google_meet_link?: string | null
          id?: string
          improvement_goal?: string | null
          landing_page?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          referrer?: string | null
          scheduled_at?: string | null
          source?: string | null
          status?: string | null
          team_size?: string | null
          updated_at?: string | null
          uses_spreadsheets?: boolean | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      eva_memory: {
        Row: {
          company_id: string
          confidence: number
          content: string
          created_at: string
          id: string
          last_used_at: string | null
          metadata: Json
          source: string
          type: string
          updated_at: string
          usage_count: number
          user_id: string | null
        }
        Insert: {
          company_id: string
          confidence?: number
          content: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          metadata?: Json
          source?: string
          type: string
          updated_at?: string
          usage_count?: number
          user_id?: string | null
        }
        Update: {
          company_id?: string
          confidence?: number
          content?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          metadata?: Json
          source?: string
          type?: string
          updated_at?: string
          usage_count?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eva_memory_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_reminders: {
        Row: {
          company_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          deal_id: string
          description: string | null
          id: string
          remind_at: string
          title: string
          user_id: string
        }
        Insert: {
          company_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deal_id: string
          description?: string | null
          id?: string
          remind_at: string
          title: string
          user_id: string
        }
        Update: {
          company_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          deal_id?: string
          description?: string | null
          id?: string
          remind_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_reminders_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          ativo: boolean | null
          company_id: string
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          company_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          company_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formas_pagamento_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          company_id: string | null
          created_at: string | null
          hottok: string | null
          id: string
          is_active: boolean | null
          platform: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          hottok?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          hottok?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_webhooks: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          default_owner_id: string | null
          default_product_id: string | null
          enabled: boolean
          field_mapping: Json
          id: string
          label: string
          last_error: string | null
          last_seen_at: string | null
          secret: string
          slug: string
          source_kind: string
          total_received: number
          total_rejected: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          default_owner_id?: string | null
          default_product_id?: string | null
          enabled?: boolean
          field_mapping?: Json
          id?: string
          label?: string
          last_error?: string | null
          last_seen_at?: string | null
          secret: string
          slug: string
          source_kind?: string
          total_received?: number
          total_rejected?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          default_owner_id?: string | null
          default_product_id?: string | null
          enabled?: boolean
          field_mapping?: Json
          id?: string
          label?: string
          last_error?: string | null
          last_seen_at?: string | null
          secret?: string
          slug?: string
          source_kind?: string
          total_received?: number
          total_rejected?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_webhooks_default_product_id_fkey"
            columns: ["default_product_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          company_id: string | null
          created_at: string
          current_value: number | null
          id: string
          mes_referencia: string
          updated_at: string | null
          user_id: string
          valor_meta: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          mes_referencia: string
          updated_at?: string | null
          user_id: string
          valor_meta: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          mes_referencia?: string
          updated_at?: string | null
          user_id?: string
          valor_meta?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "contribuicao_vendedores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "metas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_consolidadas: {
        Row: {
          company_id: string | null
          created_at: string | null
          current_value: number | null
          descricao: string | null
          id: string
          mes_referencia: string
          produto_alvo: string | null
          updated_at: string | null
          valor_meta: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          current_value?: number | null
          descricao?: string | null
          id?: string
          mes_referencia: string
          produto_alvo?: string | null
          updated_at?: string | null
          valor_meta: number
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          current_value?: number | null
          descricao?: string | null
          id?: string
          mes_referencia?: string
          produto_alvo?: string | null
          updated_at?: string | null
          valor_meta?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_consolidadas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          company_id: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          preco_base: number | null
          valor: number | null
        }
        Insert: {
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          preco_base?: number | null
          valor?: number | null
        }
        Update: {
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco_base?: number | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          company_id: string | null
          created_at: string
          email: string
          google_access_token: string | null
          google_calendar_id: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          is_super_admin: boolean | null
          last_sign_in_at: string | null
          nivel: Database["public"]["Enums"]["user_level"]
          nome: string
          onboarding_completed: boolean | null
          phone: string | null
          pontos: number
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id: string
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          nivel?: Database["public"]["Enums"]["user_level"]
          nome: string
          onboarding_completed?: boolean | null
          phone?: string | null
          pontos?: number
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          is_super_admin?: boolean | null
          last_sign_in_at?: string | null
          nivel?: Database["public"]["Enums"]["user_level"]
          nome?: string
          onboarding_completed?: boolean | null
          phone?: string | null
          pontos?: number
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      public_reports: {
        Row: {
          client_name: string | null
          company_id: string
          created_at: string
          created_by: string | null
          enabled_metrics: Json
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          logo_url: string | null
          period_days: number
          revoked_at: string | null
          share_token: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          client_name?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          enabled_metrics?: Json
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          logo_url?: string | null
          period_days?: number
          revoked_at?: string | null
          share_token: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          client_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          enabled_metrics?: Json
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          logo_url?: string | null
          period_days?: number
          revoked_at?: string | null
          share_token?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "public_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          action: string
          error_message: string | null
          google_event_id: string | null
          id: string
          resource_id: string | null
          resource_type: string
          success: boolean
          synced_at: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          resource_id?: string | null
          resource_type: string
          success: boolean
          synced_at?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          resource_id?: string | null
          resource_type?: string
          success?: boolean
          synced_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "contribuicao_vendedores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sync_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_conquistas: {
        Row: {
          conquista_id: string
          desbloqueada_em: string
          id: string
          user_id: string
        }
        Insert: {
          conquista_id: string
          desbloqueada_em?: string
          id?: string
          user_id: string
        }
        Update: {
          conquista_id?: string
          desbloqueada_em?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_conquistas_conquista_id_fkey"
            columns: ["conquista_id"]
            isOneToOne: false
            referencedRelation: "conquistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conquistas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "contribuicao_vendedores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_conquistas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_nome: string
          company_id: string | null
          created_at: string
          data_venda: string
          forma_pagamento: string
          id: string
          observacoes: string | null
          plataforma: string | null
          produto_id: string | null
          produto_nome: string
          status: Database["public"]["Enums"]["venda_status"] | null
          user_id: string
          valor: number
        }
        Insert: {
          cliente_nome: string
          company_id?: string | null
          created_at?: string
          data_venda?: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          plataforma?: string | null
          produto_id?: string | null
          produto_nome: string
          status?: Database["public"]["Enums"]["venda_status"] | null
          user_id: string
          valor: number
        }
        Update: {
          cliente_nome?: string
          company_id?: string | null
          created_at?: string
          data_venda?: string
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          plataforma?: string | null
          produto_id?: string | null
          produto_nome?: string
          status?: Database["public"]["Enums"]["venda_status"] | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "contribuicao_vendedores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "vendas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_event_receipts: {
        Row: {
          event_key: string
          metadata: Json
          processed_at: string | null
          provider: string
          received_at: string
          status: string
          updated_at: string
        }
        Insert: {
          event_key: string
          metadata?: Json
          processed_at?: string | null
          provider: string
          received_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          event_key?: string
          metadata?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          company_id: string | null
          created_at: string | null
          error_message: string | null
          event_type: string | null
          id: string
          payload: Json | null
          platform: string | null
          status: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          platform?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          platform?: string | null
          status?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          audio_duration: number | null
          body: string | null
          chat_jid: string
          chat_phone: string
          company_id: string | null
          contact_name: string | null
          deal_id: string | null
          direction: string
          external_id: string
          id: string
          instance_name: string
          is_group: boolean
          media_caption: string | null
          media_mimetype: string | null
          media_url: string | null
          message_timestamp: string
          message_type: string
          phone_e164_tail: string
          raw_payload: Json | null
          received_at: string
          user_id: string | null
        }
        Insert: {
          audio_duration?: number | null
          body?: string | null
          chat_jid: string
          chat_phone: string
          company_id?: string | null
          contact_name?: string | null
          deal_id?: string | null
          direction: string
          external_id: string
          id?: string
          instance_name: string
          is_group?: boolean
          media_caption?: string | null
          media_mimetype?: string | null
          media_url?: string | null
          message_timestamp: string
          message_type?: string
          phone_e164_tail: string
          raw_payload?: Json | null
          received_at?: string
          user_id?: string | null
        }
        Update: {
          audio_duration?: number | null
          body?: string | null
          chat_jid?: string
          chat_phone?: string
          company_id?: string | null
          contact_name?: string | null
          deal_id?: string | null
          direction?: string
          external_id?: string
          id?: string
          instance_name?: string
          is_group?: boolean
          media_caption?: string | null
          media_mimetype?: string | null
          media_url?: string | null
          message_timestamp?: string
          message_type?: string
          phone_e164_tail?: string
          raw_payload?: Json | null
          received_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          category: string
          company_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          company_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contribuicao_vendedores: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          contribuicao: number | null
          mes_referencia: string | null
          meta_total: number | null
          nivel: Database["public"]["Enums"]["user_level"] | null
          nome: string | null
          percentual_contribuicao: number | null
          pontos: number | null
          posicao_ranking: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_webhook_event: {
        Args: { p_event_key: string; p_metadata?: Json; p_provider: string }
        Returns: boolean
      }
      cleanup_security_counters: {
        Args: {
          p_rate_limit_older_than?: string
          p_webhook_receipts_older_than?: string
        }
        Returns: Json
      }
      consume_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number }
        Returns: {
          allowed: boolean
          current_count: number
          remaining: number
          reset_at: string
        }[]
      }
      contract_mrr_value: {
        Args: { p_cycle: string; p_value: number }
        Returns: number
      }
      contracts_due_for_renewal: {
        Args: { p_company_id: string; p_days_ahead?: number }
        Returns: {
          auto_renew: boolean
          billing_cycle: string
          client_name: string
          contact_email: string
          days_remaining: number
          end_date: string
          id: string
          notify_days_before: number
          start_date: string
          value: number
        }[]
      }
      contracts_summary: { Args: { p_company_id: string }; Returns: Json }
      current_company_id: { Args: never; Returns: string }
      delete_company_cascade: {
        Args: { target_company_id: string }
        Returns: Json
      }
      eva_daily_cleanup: { Args: never; Returns: Json }
      eva_smart_insert_memory: {
        Args: {
          p_company_id: string
          p_confidence?: number
          p_content: string
          p_metadata?: Json
          p_source?: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      eva_touch_memories: { Args: { p_ids: string[] }; Returns: undefined }
      forecast_by_month: {
        Args: { p_company_id: string; p_months_ahead?: number }
        Returns: {
          deal_count: number
          month_start: string
          pipeline_value: number
          weighted_value: number
          won_value: number
        }[]
      }
      get_my_company_id: { Args: never; Returns: string }
      get_public_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          id: string
          nivel: Database["public"]["Enums"]["user_level"]
          nome: string
          pontos: number
          updated_at: string
        }[]
      }
      get_public_report: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ingest_lead_webhook: {
        Args: { p_payload: Json; p_secret: string; p_slug: string }
        Returns: Json
      }
      initialize_all_metas_current_value: { Args: never; Returns: undefined }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_google_token_expired: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      mark_webhook_event_status: {
        Args: {
          p_event_key: string
          p_metadata_patch?: Json
          p_provider: string
          p_status: string
        }
        Returns: undefined
      }
      onboarding_assign_company: {
        Args: { target_company_id: string }
        Returns: undefined
      }
      pick_field: {
        Args: { p_aliases: Json; p_payload: Json }
        Returns: string
      }
      recalculate_consolidated_meta: {
        Args: { p_month_start: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "vendedor" | "admin"
      appointment_status: "agendado" | "realizado" | "cancelado"
      attendance_status: "pending" | "show" | "no_show"
      call_result: "venda" | "sem_interesse" | "reagendar"
      user_level: "Bronze" | "Prata" | "Ouro" | "Platina" | "Diamante"
      venda_status: "Aprovado" | "Pendente" | "Reembolsado"
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
      app_role: ["vendedor", "admin"],
      appointment_status: ["agendado", "realizado", "cancelado"],
      attendance_status: ["pending", "show", "no_show"],
      call_result: ["venda", "sem_interesse", "reagendar"],
      user_level: ["Bronze", "Prata", "Ouro", "Platina", "Diamante"],
      venda_status: ["Aprovado", "Pendente", "Reembolsado"],
    },
  },
} as const
