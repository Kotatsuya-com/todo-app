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
          variables?: Json
          operationName?: string
          query?: string
          extensions?: Json
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
      comparisons: {
        Row: {
          created_at: string | null
          id: string
          loser_id: string | null
          user_id: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          loser_id?: string | null
          user_id?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          loser_id?: string | null
          user_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comparisons_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparisons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparisons_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      completion_log: {
        Row: {
          completed_at: string | null
          id: string
          quadrant: string | null
          todo_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          quadrant?: string | null
          todo_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          quadrant?: string | null
          todo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "completion_log_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_connections: {
        Row: {
          access_token: string
          bot_user_id: string | null
          created_at: string
          id: string
          scope: string
          team_name: string
          updated_at: string
          user_id: string
          workspace_id: string
          workspace_name: string
        }
        Insert: {
          access_token: string
          bot_user_id?: string | null
          created_at?: string
          id?: string
          scope: string
          team_name: string
          updated_at?: string
          user_id: string
          workspace_id: string
          workspace_name: string
        }
        Update: {
          access_token?: string
          bot_user_id?: string | null
          created_at?: string
          id?: string
          scope?: string
          team_name?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
          workspace_name?: string
        }
        Relationships: []
      }
      slack_event_processed: {
        Row: {
          channel_id: string
          event_key: string
          id: string
          message_ts: string
          processed_at: string | null
          reaction: string
          todo_id: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          event_key: string
          id?: string
          message_ts: string
          processed_at?: string | null
          reaction: string
          todo_id?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          event_key?: string
          id?: string
          message_ts?: string
          processed_at?: string | null
          reaction?: string
          todo_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slack_event_processed_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slack_event_processed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          body: string | null
          completed_at: string | null
          created_at: string | null
          deadline: string | null
          id: string
          importance_score: number | null
          status: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string
          importance_score?: number | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string
          importance_score?: number | null
          status?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_emoji_settings: {
        Row: {
          created_at: string
          id: string
          later_emoji: string
          today_emoji: string
          tomorrow_emoji: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          later_emoji?: string
          today_emoji?: string
          tomorrow_emoji?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          later_emoji?: string
          today_emoji?: string
          tomorrow_emoji?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_slack_webhooks: {
        Row: {
          created_at: string
          event_count: number
          id: string
          is_active: boolean
          last_event_at: string | null
          slack_connection_id: string
          updated_at: string
          user_id: string
          webhook_id: string
          webhook_secret: string
        }
        Insert: {
          created_at?: string
          event_count?: number
          id?: string
          is_active?: boolean
          last_event_at?: string | null
          slack_connection_id: string
          updated_at?: string
          user_id: string
          webhook_id: string
          webhook_secret: string
        }
        Update: {
          created_at?: string
          event_count?: number
          id?: string
          is_active?: boolean
          last_event_at?: string | null
          slack_connection_id?: string
          updated_at?: string
          user_id?: string
          webhook_id?: string
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_slack_webhooks_slack_connection_id_fkey"
            columns: ["slack_connection_id"]
            isOneToOne: false
            referencedRelation: "slack_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          enable_webhook_notifications: boolean | null
          id: string
          slack_user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          enable_webhook_notifications?: boolean | null
          id: string
          slack_user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          enable_webhook_notifications?: boolean | null
          id?: string
          slack_user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_slack_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_user_slack_webhook: {
        Args: { p_slack_connection_id: string; p_user_id: string }
        Returns: {
          slack_connection_id: string
          user_id: string
          id: string
          created_at: string
          event_count: number
          is_active: boolean
          webhook_id: string
        }[]
      }
      generate_webhook_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_webhook_secret: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
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
    Enums: {},
  },
} as const

