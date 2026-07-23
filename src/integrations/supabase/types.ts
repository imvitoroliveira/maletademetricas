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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_accounts: {
        Row: {
          access_token_encrypted: string | null
          account_id: string
          app_secret_encrypted: string | null
          birth_date: string | null
          created_at: string
          has_credentials: boolean | null
          id: string
          name: string
          platform: string | null
          software: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          account_id: string
          app_secret_encrypted?: string | null
          birth_date?: string | null
          created_at?: string
          has_credentials?: boolean | null
          id?: string
          name: string
          platform?: string | null
          software?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          account_id?: string
          app_secret_encrypted?: string | null
          birth_date?: string | null
          created_at?: string
          has_credentials?: boolean | null
          id?: string
          name?: string
          platform?: string | null
          software?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          ad_account_id: string
          budget: number | null
          clicks: number | null
          created_at: string
          ctr: number | null
          id: string
          impressions: number | null
          name: string
          objective: string | null
          reach: number | null
          remote_campaign_id: string
          spent: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          ad_account_id: string
          budget?: number | null
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          name: string
          objective?: string | null
          reach?: number | null
          remote_campaign_id: string
          spent?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          ad_account_id?: string
          budget?: number | null
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          name?: string
          objective?: string | null
          reach?: number | null
          remote_campaign_id?: string
          spent?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_permissions: {
        Row: {
          allowed_modules: string[] | null
          can_view_charts: boolean | null
          can_view_insights: boolean | null
          can_view_metrics: boolean | null
          client_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          allowed_modules?: string[] | null
          can_view_charts?: boolean | null
          can_view_insights?: boolean | null
          can_view_metrics?: boolean | null
          client_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          allowed_modules?: string[] | null
          can_view_charts?: boolean | null
          can_view_insights?: boolean | null
          can_view_metrics?: boolean | null
          client_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_permissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contingency_vault: {
        Row: {
          access_url: string | null
          birth_date: string | null
          created_at: string
          credentials: Json | null
          id: string
          name: string
          notes: string | null
          profile_created_date: string | null
          software: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          access_url?: string | null
          birth_date?: string | null
          created_at?: string
          credentials?: Json | null
          id?: string
          name: string
          notes?: string | null
          profile_created_date?: string | null
          software?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          access_url?: string | null
          birth_date?: string | null
          created_at?: string
          credentials?: Json | null
          id?: string
          name?: string
          notes?: string | null
          profile_created_date?: string | null
          software?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_metrics: {
        Row: {
          ad_account_id: string | null
          category: string | null
          created_at: string
          id: string
          metric_date: string | null
          name: string
          period_label: string | null
          status: string | null
          updated_at: string
          user_id: string | null
          value: string
        }
        Insert: {
          ad_account_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          metric_date?: string | null
          name: string
          period_label?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          value: string
        }
        Update: {
          ad_account_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          metric_date?: string | null
          name?: string
          period_label?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_metrics_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_api_logs: {
        Row: {
          ad_account_id: string | null
          created_at: string
          id: string
          metric_date: string
          metric_name: string
          raw_response: Json
          raw_value: number
        }
        Insert: {
          ad_account_id?: string | null
          created_at?: string
          id?: string
          metric_date: string
          metric_name: string
          raw_response: Json
          raw_value: number
        }
        Update: {
          ad_account_id?: string | null
          created_at?: string
          id?: string
          metric_date?: string
          metric_name?: string
          raw_response?: Json
          raw_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "meta_api_logs_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_ad_accounts: {
        Row: {
          ad_account_id: string
          profile_id: string
        }
        Insert: {
          ad_account_id: string
          profile_id: string
        }
        Update: {
          ad_account_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_ad_accounts_ad_account_id_fkey"
            columns: ["ad_account_id"]
            isOneToOne: false
            referencedRelation: "ad_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_ad_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean | null
          is_admin: boolean | null
          reels_generation_enabled: boolean
          reels_max_channels: number
          reels_max_runs_per_day: number
          updated_at: string
          vault_password: string | null
          vault_recovery_expires: string | null
          vault_recovery_token: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean | null
          is_admin?: boolean | null
          reels_generation_enabled?: boolean
          reels_max_channels?: number
          reels_max_runs_per_day?: number
          updated_at?: string
          vault_password?: string | null
          vault_recovery_expires?: string | null
          vault_recovery_token?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          reels_generation_enabled?: boolean
          reels_max_channels?: number
          reels_max_runs_per_day?: number
          updated_at?: string
          vault_password?: string | null
          vault_recovery_expires?: string | null
          vault_recovery_token?: string | null
        }
        Relationships: []
      }
      reels_daily_usage: {
        Row: {
          run_date: string
          runs: number
          scripts_created: number
          updated_at: string
          user_id: string
        }
        Insert: {
          run_date?: string
          runs?: number
          scripts_created?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          run_date?: string
          runs?: number
          scripts_created?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reels_reference_channels: {
        Row: {
          channel_id: string | null
          channel_input: string
          channel_name: string | null
          channel_url: string | null
          created_at: string
          id: string
          is_active: boolean
          last_checked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          channel_input: string
          channel_name?: string | null
          channel_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string | null
          channel_input?: string
          channel_name?: string | null
          channel_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reels_scripts: {
        Row: {
          caption: string | null
          channel_id: string | null
          created_at: string
          cta: string | null
          hashtags: string[]
          hook: string | null
          id: string
          scenes: Json
          source_channel_name: string | null
          source_video_id: string | null
          source_video_title: string | null
          source_video_url: string | null
          source_views: number | null
          status: string
          theme: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          channel_id?: string | null
          created_at?: string
          cta?: string | null
          hashtags?: string[]
          hook?: string | null
          id?: string
          scenes?: Json
          source_channel_name?: string | null
          source_video_id?: string | null
          source_video_title?: string | null
          source_video_url?: string | null
          source_views?: number | null
          status?: string
          theme?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          channel_id?: string | null
          created_at?: string
          cta?: string | null
          hashtags?: string[]
          hook?: string | null
          id?: string
          scenes?: Json
          source_channel_name?: string | null
          source_video_id?: string | null
          source_video_title?: string | null
          source_video_url?: string | null
          source_views?: number | null
          status?: string
          theme?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reels_scripts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "reels_reference_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_ad_account: {
        Args: {
          p_access_token: string
          p_account_id: string
          p_app_secret?: string
          p_birth_date?: string
          p_name: string
          p_platform?: string
          p_software?: string
          p_status?: string
        }
        Returns: string
      }
      get_ad_account_secret: {
        Args: { p_id: string }
        Returns: {
          access_token: string
          app_secret: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_reels_generation: {
        Args: { _scripts_created: number; _user_id: string }
        Returns: undefined
      }
      try_consume_reels_run: { Args: { _user_id: string }; Returns: number }
      update_ad_account_credentials: {
        Args: { p_access_token?: string; p_app_secret?: string; p_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
