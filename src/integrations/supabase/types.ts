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
  public: {
    Tables: {
      agendamentos: {
        Row: {
          cliente_nome: string
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
            foreignKeyName: "agendamentos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agendamento_id: string | null
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
            foreignKeyName: "calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      metas: {
        Row: {
          created_at: string
          id: string
          mes_referencia: string
          user_id: string
          valor_meta: number
        }
        Insert: {
          created_at?: string
          id?: string
          mes_referencia: string
          user_id: string
          valor_meta: number
        }
        Update: {
          created_at?: string
          id?: string
          mes_referencia?: string
          user_id?: string
          valor_meta?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          preco_base: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          preco_base?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          preco_base?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          google_access_token: string | null
          google_calendar_id: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          nivel: Database["public"]["Enums"]["user_level"]
          nome: string
          pontos: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id: string
          nivel?: Database["public"]["Enums"]["user_level"]
          nome: string
          pontos?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          google_access_token?: string | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          nivel?: Database["public"]["Enums"]["user_level"]
          nome?: string
          pontos?: number
          updated_at?: string
        }
        Relationships: []
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
          created_at: string
          data_venda: string
          forma_pagamento: Database["public"]["Enums"]["payment_method"]
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
          created_at?: string
          data_venda?: string
          forma_pagamento: Database["public"]["Enums"]["payment_method"]
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
          created_at?: string
          data_venda?: string
          forma_pagamento?: Database["public"]["Enums"]["payment_method"]
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
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_google_token_expired: {
        Args: { check_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "vendedor" | "admin"
      appointment_status: "agendado" | "realizado" | "cancelado"
      call_result: "venda" | "sem_interesse" | "reagendar"
      payment_method:
        | "Cartão de Crédito"
        | "PIX"
        | "Recorrência"
        | "Boleto"
        | "Parte PIX Parte Cartão"
        | "Múltiplos Cartões"
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
  public: {
    Enums: {
      app_role: ["vendedor", "admin"],
      appointment_status: ["agendado", "realizado", "cancelado"],
      call_result: ["venda", "sem_interesse", "reagendar"],
      payment_method: [
        "Cartão de Crédito",
        "PIX",
        "Recorrência",
        "Boleto",
        "Parte PIX Parte Cartão",
        "Múltiplos Cartões",
      ],
      user_level: ["Bronze", "Prata", "Ouro", "Platina", "Diamante"],
      venda_status: ["Aprovado", "Pendente", "Reembolsado"],
    },
  },
} as const
