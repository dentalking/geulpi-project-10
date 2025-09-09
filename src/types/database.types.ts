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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      calendar_sharing: {
        Row: {
          created_at: string | null
          hide_details: boolean | null
          id: string
          owner_id: string
          permission_level: string | null
          share_all_events: boolean | null
          shared_categories: Json | null
          shared_with_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hide_details?: boolean | null
          id?: string
          owner_id: string
          permission_level?: string | null
          share_all_events?: boolean | null
          shared_categories?: Json | null
          shared_with_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hide_details?: boolean | null
          id?: string
          owner_id?: string
          permission_level?: string | null
          share_all_events?: boolean | null
          shared_categories?: Json | null
          shared_with_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sharing_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sharing_shared_with_id_fkey"
            columns: ["shared_with_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          data: Json | null
          id: string
          message_type: string
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          data?: Json | null
          id?: string
          message_type?: string
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          data?: Json | null
          id?: string
          message_type?: string
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      friend_group_members: {
        Row: {
          added_at: string | null
          friend_id: string
          group_id: string
        }
        Insert: {
          added_at?: string | null
          friend_id: string
          group_id: string
        }
        Update: {
          added_at?: string | null
          friend_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_group_members_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friend_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "friend_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_groups: {
        Row: {
          created_at: string | null
          description: string | null
          group_color: string | null
          group_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          group_color?: string | null
          group_name: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          group_color?: string | null
          group_name?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friend_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          invitation_code: string
          invitee_email: string
          inviter_id: string
          message: string | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_code: string
          invitee_email: string
          inviter_id: string
          message?: string | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invitation_code?: string
          invitee_email?: string
          inviter_id?: string
          message?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "friend_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          accepted_at: string | null
          common_event_types: Json | null
          common_locations: Json | null
          created_at: string | null
          friend_id: string
          id: string
          last_meeting_date: string | null
          meeting_frequency: number | null
          nickname: string | null
          notes: string | null
          relationship_type: string | null
          status: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          common_event_types?: Json | null
          common_locations?: Json | null
          created_at?: string | null
          friend_id: string
          id?: string
          last_meeting_date?: string | null
          meeting_frequency?: number | null
          nickname?: string | null
          notes?: string | null
          relationship_type?: string | null
          status?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          common_event_types?: Json | null
          common_locations?: Json | null
          created_at?: string | null
          friend_id?: string
          id?: string
          last_meeting_date?: string | null
          meeting_frequency?: number | null
          nickname?: string | null
          notes?: string | null
          relationship_type?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          allergies: string[] | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          dietary_preferences: string[] | null
          emergency_contact: Json | null
          exercise_routine: string | null
          family_members: Json | null
          full_name: string | null
          goals: string[] | null
          home_address: string | null
          home_latitude: number | null
          home_longitude: number | null
          id: string
          important_dates: Json | null
          interests: string[] | null
          life_context: Json | null
          nickname: string | null
          occupation: string | null
          preferred_language: string | null
          sleep_time: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          wake_up_time: string | null
          work_address: string | null
          work_end_time: string | null
          work_latitude: number | null
          work_longitude: number | null
          work_start_time: string | null
          working_days: Json | null
        }
        Insert: {
          allergies?: string[] | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          dietary_preferences?: string[] | null
          emergency_contact?: Json | null
          exercise_routine?: string | null
          family_members?: Json | null
          full_name?: string | null
          goals?: string[] | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          important_dates?: Json | null
          interests?: string[] | null
          life_context?: Json | null
          nickname?: string | null
          occupation?: string | null
          preferred_language?: string | null
          sleep_time?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          wake_up_time?: string | null
          work_address?: string | null
          work_end_time?: string | null
          work_latitude?: number | null
          work_longitude?: number | null
          work_start_time?: string | null
          working_days?: Json | null
        }
        Update: {
          allergies?: string[] | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          dietary_preferences?: string[] | null
          emergency_contact?: Json | null
          exercise_routine?: string | null
          family_members?: Json | null
          full_name?: string | null
          goals?: string[] | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          important_dates?: Json | null
          interests?: string[] | null
          life_context?: Json | null
          nickname?: string | null
          occupation?: string | null
          preferred_language?: string | null
          sleep_time?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          wake_up_time?: string | null
          work_address?: string | null
          work_end_time?: string | null
          work_latitude?: number | null
          work_longitude?: number | null
          work_start_time?: string | null
          working_days?: Json | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          password: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          password: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          password?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
