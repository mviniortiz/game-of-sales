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
      agent_suggestions: {
        Row: {
          agent_key: string
          applied_payload: Json | null
          company_id: string
          conversation_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          feedback: string | null
          id: string
          input_summary: Json
          kind: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          suggestion: Json
        }
        Insert: {
          agent_key?: string
          applied_payload?: Json | null
          company_id: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          feedback?: string | null
          id?: string
          input_summary?: Json
          kind?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          suggestion?: Json
        }
        Update: {
          agent_key?: string
          applied_payload?: Json | null
          company_id?: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          feedback?: string | null
          id?: string
          input_summary?: Json
          kind?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          suggestion?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_suggestions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_suggestions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
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
      channel_connections: {
        Row: {
          capabilities: Json
          channel_type: string
          company_id: string
          created_at: string
          created_by: string | null
          credentials_ref: string | null
          display_name: string | null
          external_id: string
          id: string
          last_seen_at: string | null
          metadata: Json
          provider: string
          send_failed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          channel_type: string
          company_id: string
          created_at?: string
          created_by?: string | null
          credentials_ref?: string | null
          display_name?: string | null
          external_id: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          provider: string
          send_failed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          channel_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          credentials_ref?: string | null
          display_name?: string | null
          external_id?: string
          id?: string
          last_seen_at?: string | null
          metadata?: Json
          provider?: string
          send_failed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_contacts: {
        Row: {
          company_id: string
          connection_id: string
          created_at: string
          external_contact_id: string
          id: string
          is_group: boolean
          metadata: Json
          name: string | null
          phone_e164: string | null
          phone_tail: string | null
          profile_pic_url: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          company_id: string
          connection_id: string
          created_at?: string
          external_contact_id: string
          id?: string
          is_group?: boolean
          metadata?: Json
          name?: string | null
          phone_e164?: string | null
          phone_tail?: string | null
          profile_pic_url?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          company_id?: string
          connection_id?: string
          created_at?: string
          external_contact_id?: string
          id?: string
          is_group?: boolean
          metadata?: Json
          name?: string | null
          phone_e164?: string | null
          phone_tail?: string | null
          profile_pic_url?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_contacts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_conversations: {
        Row: {
          assignee_id: string | null
          company_id: string
          connection_id: string
          contact_id: string
          created_at: string
          deal_id: string | null
          id: string
          last_inbound_at: string | null
          last_message_at: string | null
          last_outbound_at: string | null
          metadata: Json
          status: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          company_id: string
          connection_id: string
          contact_id: string
          created_at?: string
          deal_id?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_outbound_at?: string | null
          metadata?: Json
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          company_id?: string
          connection_id?: string
          contact_id?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_outbound_at?: string | null
          metadata?: Json
          status?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_conversations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "channel_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_conversations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_messages: {
        Row: {
          body: string | null
          company_id: string
          connection_id: string
          contact_id: string | null
          conversation_id: string
          created_at: string
          direction: string
          id: string
          media_ref: Json
          message_timestamp: string
          message_type: string
          metadata: Json
          provider_message_id: string
          raw_payload: Json | null
          raw_payload_expires_at: string | null
          raw_payload_redacted: boolean
          reply_to_message_id: string | null
          sent_by_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          company_id: string
          connection_id: string
          contact_id?: string | null
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          media_ref?: Json
          message_timestamp: string
          message_type: string
          metadata?: Json
          provider_message_id: string
          raw_payload?: Json | null
          raw_payload_expires_at?: string | null
          raw_payload_redacted?: boolean
          reply_to_message_id?: string | null
          sent_by_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          company_id?: string
          connection_id?: string
          contact_id?: string | null
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          media_ref?: Json
          message_timestamp?: string
          message_type?: string
          metadata?: Json
          provider_message_id?: string
          raw_payload?: Json | null
          raw_payload_expires_at?: string | null
          raw_payload_redacted?: boolean
          reply_to_message_id?: string | null
          sent_by_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "channel_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "channel_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
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
          qualification: Json
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
          qualification?: Json
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
          qualification?: Json
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
          account_industry: string | null
          account_name: string | null
          account_website: string | null
          additional_contacts: Json
          agent_suggestion_id: string | null
          closer_id: string | null
          company_id: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          expected_close_date: string | null
          handoff_at: string | null
          id: string
          is_active: boolean
          is_hot: boolean | null
          lead_source: string | null
          loss_reason: string | null
          notes: string | null
          pipeline_id: string | null
          position: number | null
          probability: number | null
          product_id: string | null
          sdr_id: string | null
          sla_breach_at: string | null
          sla_hours: number
          source_data: Json | null
          stage: string
          stage_id: string | null
          title: string
          updated_at: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          account_industry?: string | null
          account_name?: string | null
          account_website?: string | null
          additional_contacts?: Json
          agent_suggestion_id?: string | null
          closer_id?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          expected_close_date?: string | null
          handoff_at?: string | null
          id?: string
          is_active?: boolean
          is_hot?: boolean | null
          lead_source?: string | null
          loss_reason?: string | null
          notes?: string | null
          pipeline_id?: string | null
          position?: number | null
          probability?: number | null
          product_id?: string | null
          sdr_id?: string | null
          sla_breach_at?: string | null
          sla_hours?: number
          source_data?: Json | null
          stage?: string
          stage_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          account_industry?: string | null
          account_name?: string | null
          account_website?: string | null
          additional_contacts?: Json
          agent_suggestion_id?: string | null
          closer_id?: string | null
          company_id?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          expected_close_date?: string | null
          handoff_at?: string | null
          id?: string
          is_active?: boolean
          is_hot?: boolean | null
          lead_source?: string | null
          loss_reason?: string | null
          notes?: string | null
          pipeline_id?: string | null
          position?: number | null
          probability?: number | null
          product_id?: string | null
          sdr_id?: string | null
          sla_breach_at?: string | null
          sla_hours?: number
          source_data?: Json | null
          stage?: string
          stage_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_agent_suggestion_id_fkey"
            columns: ["agent_suggestion_id"]
            isOneToOne: false
            referencedRelation: "agent_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "contribuicao_vendedores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "contribuicao_vendedores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          ads_conversion_error: string | null
          ads_conversion_uploaded_at: string | null
          agent_blueprint: Json | null
          agent_used_context: boolean
          biggest_pain: string | null
          calendly_event_uri: string | null
          company: string | null
          company_context: string | null
          company_offer: string | null
          company_segment: string | null
          created_at: string | null
          demo_company_id: string | null
          demo_credentials_sent_at: string | null
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
          website: string | null
        }
        Insert: {
          ads_conversion_error?: string | null
          ads_conversion_uploaded_at?: string | null
          agent_blueprint?: Json | null
          agent_used_context?: boolean
          biggest_pain?: string | null
          calendly_event_uri?: string | null
          company?: string | null
          company_context?: string | null
          company_offer?: string | null
          company_segment?: string | null
          created_at?: string | null
          demo_company_id?: string | null
          demo_credentials_sent_at?: string | null
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
          website?: string | null
        }
        Update: {
          ads_conversion_error?: string | null
          ads_conversion_uploaded_at?: string | null
          agent_blueprint?: Json | null
          agent_used_context?: boolean
          biggest_pain?: string | null
          calendly_event_uri?: string | null
          company?: string | null
          company_context?: string | null
          company_offer?: string | null
          company_segment?: string | null
          created_at?: string | null
          demo_company_id?: string | null
          demo_credentials_sent_at?: string | null
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
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_requests_demo_company_id_fkey"
            columns: ["demo_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      eva_blueprints: {
        Row: {
          agent_key: string
          agent_name: string | null
          applied_at: string | null
          applied_by: string | null
          applied_sections: Json
          approved_at: string | null
          approved_by: string | null
          auto_create_opportunity: boolean
          company_id: string
          created_at: string
          created_by: string | null
          detected_fields: Json
          id: string
          knowledge_gaps: Json
          objective: string | null
          pipeline_stages: Json
          segment: string | null
          simulation_scenarios: Json
          status: string
          suggested_rules: Json
          suggested_tags: Json
          updated_at: string
        }
        Insert: {
          agent_key?: string
          agent_name?: string | null
          applied_at?: string | null
          applied_by?: string | null
          applied_sections?: Json
          approved_at?: string | null
          approved_by?: string | null
          auto_create_opportunity?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          detected_fields?: Json
          id?: string
          knowledge_gaps?: Json
          objective?: string | null
          pipeline_stages?: Json
          segment?: string | null
          simulation_scenarios?: Json
          status?: string
          suggested_rules?: Json
          suggested_tags?: Json
          updated_at?: string
        }
        Update: {
          agent_key?: string
          agent_name?: string | null
          applied_at?: string | null
          applied_by?: string | null
          applied_sections?: Json
          approved_at?: string | null
          approved_by?: string | null
          auto_create_opportunity?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          detected_fields?: Json
          id?: string
          knowledge_gaps?: Json
          objective?: string | null
          pipeline_stages?: Json
          segment?: string | null
          simulation_scenarios?: Json
          status?: string
          suggested_rules?: Json
          suggested_tags?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eva_blueprints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      eva_business_context: {
        Row: {
          agency: Json
          company_id: string
          created_at: string
          icp: Json
          id: string
          last_edited_by: string | null
          playbooks: Json
          services: Json
          updated_at: string
          version: number
        }
        Insert: {
          agency?: Json
          company_id: string
          created_at?: string
          icp?: Json
          id?: string
          last_edited_by?: string | null
          playbooks?: Json
          services?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          agency?: Json
          company_id?: string
          created_at?: string
          icp?: Json
          id?: string
          last_edited_by?: string | null
          playbooks?: Json
          services?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "eva_business_context_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eva_business_context_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "contribuicao_vendedores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "eva_business_context_last_edited_by_fkey"
            columns: ["last_edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eva_context_suggestions: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          company_id: string
          confidence: number | null
          content: Json
          created_at: string
          document_id: string | null
          id: string
          status: string
          suggestion_type: string
          title: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          company_id: string
          confidence?: number | null
          content: Json
          created_at?: string
          document_id?: string | null
          id?: string
          status?: string
          suggestion_type: string
          title: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          company_id?: string
          confidence?: number | null
          content?: Json
          created_at?: string
          document_id?: string | null
          id?: string
          status?: string
          suggestion_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "eva_context_suggestions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eva_context_suggestions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "eva_training_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      eva_deal_suggestions: {
        Row: {
          company_id: string
          created_at: string
          days_stale: number | null
          deal_id: string
          final_message: string | null
          generated_at: string
          id: string
          message_draft: string
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          sent_via: string | null
          sla_context: string | null
          status: string
          suggestion_text: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days_stale?: number | null
          deal_id: string
          final_message?: string | null
          generated_at?: string
          id?: string
          message_draft: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sent_via?: string | null
          sla_context?: string | null
          status?: string
          suggestion_text: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days_stale?: number | null
          deal_id?: string
          final_message?: string | null
          generated_at?: string
          id?: string
          message_draft?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sent_via?: string | null
          sla_context?: string | null
          status?: string
          suggestion_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "eva_deal_suggestions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eva_deal_suggestions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eva_deal_suggestions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "contribuicao_vendedores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "eva_deal_suggestions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      eva_help_logs: {
        Row: {
          answer: string | null
          company_id: string | null
          created_at: string
          id: string
          page: string | null
          question: string
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          page?: string | null
          question: string
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          page?: string | null
          question?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eva_help_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      eva_knowledge_gaps: {
        Row: {
          company_id: string
          created_at: string
          detected_at: string
          fix_target: string | null
          gap_description: string
          id: string
          occurrence_count: number
          resolved_at: string | null
          resolved_by: string | null
          source_chat_phone: string | null
          source_message: string | null
          source_type: string
          status: string
          suggested_fix: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          detected_at?: string
          fix_target?: string | null
          gap_description: string
          id?: string
          occurrence_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          source_chat_phone?: string | null
          source_message?: string | null
          source_type: string
          status?: string
          suggested_fix?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          detected_at?: string
          fix_target?: string | null
          gap_description?: string
          id?: string
          occurrence_count?: number
          resolved_at?: string | null
          resolved_by?: string | null
          source_chat_phone?: string | null
          source_message?: string | null
          source_type?: string
          status?: string
          suggested_fix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eva_knowledge_gaps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eva_knowledge_gaps_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "contribuicao_vendedores"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "eva_knowledge_gaps_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      eva_replay_moments: {
        Row: {
          company_id: string
          context: string
          conversation_id: string | null
          created_at: string
          critical: boolean
          deal_id: string | null
          eva_reply: string
          generated_at: string
          id: string
          lead_message: string
          lead_name: string
          model: string | null
          outcome: string
          outcome_detail: string
          seller_reply: string | null
          source_message_id: string | null
          tension: string
          updated_at: string
        }
        Insert: {
          company_id: string
          context: string
          conversation_id?: string | null
          created_at?: string
          critical?: boolean
          deal_id?: string | null
          eva_reply: string
          generated_at?: string
          id?: string
          lead_message: string
          lead_name: string
          model?: string | null
          outcome: string
          outcome_detail: string
          seller_reply?: string | null
          source_message_id?: string | null
          tension: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          context?: string
          conversation_id?: string | null
          created_at?: string
          critical?: boolean
          deal_id?: string | null
          eva_reply?: string
          generated_at?: string
          id?: string
          lead_message?: string
          lead_name?: string
          model?: string | null
          outcome?: string
          outcome_detail?: string
          seller_reply?: string | null
          source_message_id?: string | null
          tension?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eva_replay_moments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eva_replay_moments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "channel_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eva_replay_moments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eva_replay_moments_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      eva_simulation_results: {
        Row: {
          agent_key: string
          blueprint_id: string | null
          company_id: string
          created_at: string
          evaluated_at: string
          evaluated_by: string | null
          feedback: string | null
          id: string
          is_critical: boolean
          result: string
          scenario_id: string
          scenario_title: string
          updated_at: string
        }
        Insert: {
          agent_key?: string
          blueprint_id?: string | null
          company_id: string
          created_at?: string
          evaluated_at?: string
          evaluated_by?: string | null
          feedback?: string | null
          id?: string
          is_critical?: boolean
          result: string
          scenario_id: string
          scenario_title: string
          updated_at?: string
        }
        Update: {
          agent_key?: string
          blueprint_id?: string | null
          company_id?: string
          created_at?: string
          evaluated_at?: string
          evaluated_by?: string | null
          feedback?: string | null
          id?: string
          is_critical?: boolean
          result?: string
          scenario_id?: string
          scenario_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eva_simulation_results_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "eva_blueprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eva_simulation_results_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      eva_suggestion_feedback: {
        Row: {
          chat_phone: string | null
          company_id: string
          confidence: number | null
          conversation_id: string | null
          created_at: string
          id: string
          outcome: string
          sent_text: string
          similarity: number | null
          suggestion_text: string
          user_id: string
        }
        Insert: {
          chat_phone?: string | null
          company_id: string
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          outcome: string
          sent_text: string
          similarity?: number | null
          suggestion_text: string
          user_id?: string
        }
        Update: {
          chat_phone?: string | null
          company_id?: string
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          outcome?: string
          sent_text?: string
          similarity?: number | null
          suggestion_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eva_suggestion_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eva_suggestion_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "channel_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      eva_training_documents: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          metadata: Json
          processed_at: string | null
          raw_text: string | null
          status: string
          storage_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          id?: string
          metadata?: Json
          processed_at?: string | null
          raw_text?: string | null
          status?: string
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          metadata?: Json
          processed_at?: string | null
          raw_text?: string | null
          status?: string
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eva_training_documents_company_id_fkey"
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
      landing_chat_logs: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          ip: string
          question: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          ip: string
          question: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          ip?: string
          question?: string
        }
        Relationships: []
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
      message_status_events: {
        Row: {
          company_id: string
          connection_id: string
          created_at: string
          id: string
          message_id: string | null
          occurred_at: string
          provider_message_id: string | null
          raw_payload: Json | null
          status: string
        }
        Insert: {
          company_id: string
          connection_id: string
          created_at?: string
          id?: string
          message_id?: string | null
          occurred_at?: string
          provider_message_id?: string | null
          raw_payload?: Json | null
          status: string
        }
        Update: {
          company_id?: string
          connection_id?: string
          created_at?: string
          id?: string
          message_id?: string | null
          occurred_at?: string
          provider_message_id?: string | null
          raw_payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_status_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_status_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_status_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "channel_messages"
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
      pipeline_stages: {
        Row: {
          color_id: string
          company_id: string
          created_at: string
          default_probability: number | null
          icon_id: string
          id: string
          kind: string
          legacy_key: string | null
          pipeline_id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          color_id?: string
          company_id: string
          created_at?: string
          default_probability?: number | null
          icon_id?: string
          id?: string
          kind?: string
          legacy_key?: string | null
          pipeline_id: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          color_id?: string
          company_id?: string
          created_at?: string
          default_probability?: number | null
          icon_id?: string
          id?: string
          kind?: string
          legacy_key?: string | null
          pipeline_id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean
          is_default: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
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
          sales_role: string
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
          sales_role?: string
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
          sales_role?: string
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
      proposals: {
        Row: {
          about: string | null
          brand_color: string
          company_id: string
          conditions: string | null
          created_at: string
          created_by: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          deal_id: string | null
          discount_percent: number
          id: string
          intro: string | null
          items: Json
          sections: Json | null
          status: string
          title: string
          total: number
          updated_at: string
          validity_days: number
        }
        Insert: {
          about?: string | null
          brand_color?: string
          company_id: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deal_id?: string | null
          discount_percent?: number
          id?: string
          intro?: string | null
          items?: Json
          sections?: Json | null
          status?: string
          title: string
          total?: number
          updated_at?: string
          validity_days?: number
        }
        Update: {
          about?: string | null
          brand_color?: string
          company_id?: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deal_id?: string | null
          discount_percent?: number
          id?: string
          intro?: string | null
          items?: Json
          sections?: Json | null
          status?: string
          title?: string
          total?: number
          updated_at?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_allowlist: {
        Row: {
          agency_name: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          instagram: string | null
          is_active: boolean
          metadata: Json
          niche: string | null
          phone_e164: string | null
          phone_tail: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          agency_name?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          metadata?: Json
          niche?: string | null
          phone_e164?: string | null
          phone_tail: string
          source_url?: string | null
          user_id: string
        }
        Update: {
          agency_name?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          metadata?: Json
          niche?: string | null
          phone_e164?: string | null
          phone_tail?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_allowlist_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_instances: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospecting_instances_company_id_fkey"
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
      tag_assignments: {
        Row: {
          company_id: string
          confidence: number | null
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          source: string
          tag_id: string
        }
        Insert: {
          company_id: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          source?: string
          tag_id: string
        }
        Update: {
          company_id?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          source?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          category: string | null
          color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          connection_id: string | null
          conversation_id: string | null
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
          connection_id?: string | null
          conversation_id?: string | null
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
          connection_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          platform?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "channel_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "channel_conversations"
            referencedColumns: ["id"]
          },
        ]
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
      clone_demo_environment: {
        Args: {
          p_new_name: string
          p_segment?: string
          p_source_company: string
        }
        Returns: string
      }
      complete_demo_request: {
        Args: { p_id: string; payload: Json }
        Returns: string
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
      delete_demo_environment: {
        Args: { p_company: string }
        Returns: undefined
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
      ingest_channel_message: {
        Args: {
          p_channel_type: string
          p_company_id: string
          p_payload: Json
          p_provider: string
        }
        Returns: Json
      }
      ingest_lead_webhook: {
        Args: {
          p_lead_key?: string
          p_payload: Json
          p_secret: string
          p_slug: string
        }
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
      purge_old_whatsapp_messages: { Args: never; Returns: Json }
      recalculate_consolidated_meta: {
        Args: { p_month_start: string }
        Returns: undefined
      }
      submit_demo_intake: { Args: { payload: Json }; Returns: string }
      submit_demo_request: { Args: { payload: Json }; Returns: string }
      trigger_eva_stale_followup: { Args: never; Returns: number }
      trigger_evolution_keepwarm: { Args: never; Returns: number }
      trigger_whatsapp_session_heartbeat: { Args: never; Returns: number }
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
