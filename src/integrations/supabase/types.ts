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
      demo_requests: {
        Row: {
          id: string
          name: string
          email: string
          company: string | null
          phone: string | null
          source: string | null
          status: string | null
          calendly_event_uri: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          company?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          calendly_event_uri?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          company?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          calendly_event_uri?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          cnpj: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          main_challenge: string | null
          mp_customer_id: string | null
          mp_plan_id: string | null
          mp_subscription_id: string | null
          name: string
          plan: string | null
          referral_source: string | null
          subscription_status: string | null
          team_size: string | null
          trial_ends_at: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          main_challenge?: string | null
          mp_customer_id?: string | null
          mp_plan_id?: string | null
          mp_subscription_id?: string | null
          name: string
          plan?: string | null
          referral_source?: string | null
          subscription_status?: string | null
          team_size?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          main_challenge?: string | null
          mp_customer_id?: string | null
          mp_plan_id?: string | null
          mp_subscription_id?: string | null
          name?: string
          plan?: string | null
          referral_source?: string | null
          subscription_status?: string | null
          team_size?: string | null
          trial_ends_at?: string | null
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
          loss_reason: string | null
          notes: string | null
          position: number | null
          probability: number | null
          product_id: string | null
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
          loss_reason?: string | null
          notes?: string | null
          position?: number | null
          probability?: number | null
          product_id?: string | null
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
          loss_reason?: string | null
          notes?: string | null
          position?: number | null
          probability?: number | null
          product_id?: string | null
          stage?: string
          title?: string
          updated_at?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: []
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
          webhook_url: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          hottok?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          webhook_url?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          hottok?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
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
          company_id: string | null
          created_at: string
          email: string
          google_access_token: string | null
          google_calendar_id: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          is_super_admin: boolean | null
          nivel: Database["public"]["Enums"]["user_level"]
          nome: string
          pontos: number
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id: string
          is_super_admin?: boolean | null
          nivel?: Database["public"]["Enums"]["user_level"]
          nome: string
          pontos?: number
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          is_super_admin?: boolean | null
          nivel?: Database["public"]["Enums"]["user_level"]
          nome?: string
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
      current_company_id: { Args: never; Returns: string }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
