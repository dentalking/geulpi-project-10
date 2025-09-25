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
      calendar_events: {
        Row: {
          attendees: Json | null
          category: string | null
          color_id: string | null
          created_at: string | null
          creator: Json | null
          description: string | null
          end_time: string
          google_event_id: string | null
          google_user_id: string | null
          id: string
          is_all_day: boolean | null
          last_synced_at: string | null
          location: string | null
          metadata: Json | null
          organizer: Json | null
          recurrence: Json | null
          recurring_event_id: string | null
          reminders: Json | null
          share_permission: string | null
          shared_with: string[] | null
          source: string | null
          start_time: string
          status: string | null
          summary: string
          tags: string[] | null
          timezone: string | null
          transparency: string | null
          updated_at: string | null
          user_id: string | null
          visibility: string | null
        }
        Insert: {
          attendees?: Json | null
          category?: string | null
          color_id?: string | null
          created_at?: string | null
          creator?: Json | null
          description?: string | null
          end_time: string
          google_event_id?: string | null
          google_user_id?: string | null
          id?: string
          is_all_day?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          metadata?: Json | null
          organizer?: Json | null
          recurrence?: Json | null
          recurring_event_id?: string | null
          reminders?: Json | null
          share_permission?: string | null
          shared_with?: string[] | null
          source?: string | null
          start_time: string
          status?: string | null
          summary: string
          tags?: string[] | null
          timezone?: string | null
          transparency?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Update: {
          attendees?: Json | null
          category?: string | null
          color_id?: string | null
          created_at?: string | null
          creator?: Json | null
          description?: string | null
          end_time?: string
          google_event_id?: string | null
          google_user_id?: string | null
          id?: string
          is_all_day?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          metadata?: Json | null
          organizer?: Json | null
          recurrence?: Json | null
          recurring_event_id?: string | null
          reminders?: Json | null
          share_permission?: string | null
          shared_with?: string[] | null
          source?: string | null
          start_time?: string
          status?: string | null
          summary?: string
          tags?: string[] | null
          timezone?: string | null
          transparency?: string | null
          updated_at?: string | null
          user_id?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      context_templates: {
        Row: {
          condition_rules: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          locale: string | null
          priority_weight: number | null
          suggested_actions: Json
          template_name: string
        }
        Insert: {
          condition_rules: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          locale?: string | null
          priority_weight?: number | null
          suggested_actions: Json
          template_name: string
        }
        Update: {
          condition_rules?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          locale?: string | null
          priority_weight?: number | null
          suggested_actions?: Json
          template_name?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attempts: number | null
          body_text: string | null
          created_at: string | null
          error_message: string | null
          html: string | null
          id: string
          last_attempt_at: string | null
          recipient: string
          sent_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          body_text?: string | null
          created_at?: string | null
          error_message?: string | null
          html?: string | null
          id?: string
          last_attempt_at?: string | null
          recipient: string
          sent_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          body_text?: string | null
          created_at?: string | null
          error_message?: string | null
          html?: string | null
          id?: string
          last_attempt_at?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
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
      guest_actions: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string | null
          guest_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string | null
          guest_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string | null
          guest_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          action_count: number | null
          created_at: string | null
          expires_at: string
          guest_id: string
          id: string
          last_activity_at: string | null
          metadata: Json | null
          platform: string | null
          platform_user_id: string | null
          upgraded_at: string | null
          upgraded_to_user_id: string | null
        }
        Insert: {
          action_count?: number | null
          created_at?: string | null
          expires_at: string
          guest_id: string
          id?: string
          last_activity_at?: string | null
          metadata?: Json | null
          platform?: string | null
          platform_user_id?: string | null
          upgraded_at?: string | null
          upgraded_to_user_id?: string | null
        }
        Update: {
          action_count?: number | null
          created_at?: string | null
          expires_at?: string
          guest_id?: string
          id?: string
          last_activity_at?: string | null
          metadata?: Json | null
          platform?: string | null
          platform_user_id?: string | null
          upgraded_at?: string | null
          upgraded_to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_sessions_upgraded_to_user_id_fkey"
            columns: ["upgraded_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_coordination_sessions: {
        Row: {
          created_at: string | null
          current_status: string | null
          deadline: string | null
          final_decision: Json | null
          id: string
          initiator_id: string | null
          meeting_title: string
          participants: Json
          proposed_locations: Json | null
          proposed_times: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_status?: string | null
          deadline?: string | null
          final_decision?: Json | null
          id?: string
          initiator_id?: string | null
          meeting_title: string
          participants: Json
          proposed_locations?: Json | null
          proposed_times?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_status?: string | null
          deadline?: string | null
          final_decision?: Json | null
          id?: string
          initiator_id?: string | null
          meeting_title?: string
          participants?: Json
          proposed_locations?: Json | null
          proposed_times?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meeting_polls: {
        Row: {
          event_id: string | null
          id: string
          participant_id: string
          participant_name: string | null
          participant_type: string | null
          proposal_id: string | null
          vote_metadata: Json | null
          vote_type: string | null
          vote_value: string | null
          voted_at: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          participant_id: string
          participant_name?: string | null
          participant_type?: string | null
          proposal_id?: string | null
          vote_metadata?: Json | null
          vote_type?: string | null
          vote_value?: string | null
          voted_at?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          participant_id?: string
          participant_name?: string | null
          participant_type?: string | null
          proposal_id?: string | null
          vote_metadata?: Json | null
          vote_type?: string | null
          vote_value?: string | null
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_polls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      messenger_integrations: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          platform: string
          platform_user_id: string
          preferences: Json | null
          refresh_token: string | null
          updated_at: string | null
          user_id: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          platform: string
          platform_user_id: string
          preferences?: Json | null
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          platform?: string
          platform_user_id?: string
          preferences?: Json | null
          refresh_token?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messenger_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          briefing_enabled: boolean | null
          briefing_time: string | null
          browser_enabled: boolean | null
          conflict_enabled: boolean | null
          created_at: string | null
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          preparation_enabled: boolean | null
          preparation_minutes: number | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reminder_enabled: boolean | null
          reminder_minutes: number | null
          travel_buffer_minutes: number | null
          travel_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          briefing_enabled?: boolean | null
          briefing_time?: string | null
          browser_enabled?: boolean | null
          conflict_enabled?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          preparation_enabled?: boolean | null
          preparation_minutes?: number | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes?: number | null
          travel_buffer_minutes?: number | null
          travel_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          briefing_enabled?: boolean | null
          briefing_time?: string | null
          browser_enabled?: boolean | null
          conflict_enabled?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          preparation_enabled?: boolean | null
          preparation_minutes?: number | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes?: number | null
          travel_buffer_minutes?: number | null
          travel_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          notification_type: string
          platforms: string[] | null
          priority: number | null
          recipient_id: string | null
          scheduled_at: string | null
          sender_id: string | null
          sent_at: string | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          notification_type: string
          platforms?: string[] | null
          priority?: number | null
          recipient_id?: string | null
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          notification_type?: string
          platforms?: string[] | null
          priority?: number | null
          recipient_id?: string | null
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          id: string
          notification_types: Json | null
          platform: string
          preferences: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_types?: Json | null
          platform: string
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_types?: Json | null
          platform?: string
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actions: Json | null
          created_at: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          event_id: string | null
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          priority: string
          processed_at: string | null
          read: boolean | null
          read_at: string | null
          scheduled_for: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actions?: Json | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority: string
          processed_at?: string | null
          read?: boolean | null
          read_at?: string | null
          scheduled_for?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actions?: Json | null
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          event_id?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string
          processed_at?: string | null
          read?: boolean | null
          read_at?: string | null
          scheduled_for?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      place_recommendations: {
        Row: {
          created_at: string | null
          id: string
          meeting_id: string | null
          place_address: string | null
          place_id: string
          place_location: Json | null
          place_name: string | null
          place_photo_url: string | null
          place_rating: number | null
          score: number | null
          score_details: Json | null
          selected: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          place_address?: string | null
          place_id: string
          place_location?: Json | null
          place_name?: string | null
          place_photo_url?: string | null
          place_rating?: number | null
          score?: number | null
          score_details?: Json | null
          selected?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_id?: string | null
          place_address?: string | null
          place_id?: string
          place_location?: Json | null
          place_name?: string | null
          place_photo_url?: string | null
          place_rating?: number | null
          score?: number | null
          score_details?: Json | null
          selected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "place_recommendations_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      realtime_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_activity: string | null
          platform_data: Json | null
          session_id: string
          session_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          platform_data?: Json | null
          session_id: string
          session_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_activity?: string | null
          platform_data?: Json | null
          session_id?: string
          session_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_action_logs: {
        Row: {
          action_timestamp: string | null
          action_type: string
          browser: string | null
          created_at: string | null
          day_of_week: number | null
          device_type: string | null
          event_count: number | null
          id: string
          last_ai_response: string | null
          locale: string | null
          response_time_ms: number | null
          session_id: string
          suggestion_category: string | null
          suggestion_position: number | null
          suggestion_text: string
          time_of_day: string | null
          user_id: string | null
        }
        Insert: {
          action_timestamp?: string | null
          action_type: string
          browser?: string | null
          created_at?: string | null
          day_of_week?: number | null
          device_type?: string | null
          event_count?: number | null
          id?: string
          last_ai_response?: string | null
          locale?: string | null
          response_time_ms?: number | null
          session_id: string
          suggestion_category?: string | null
          suggestion_position?: number | null
          suggestion_text: string
          time_of_day?: string | null
          user_id?: string | null
        }
        Update: {
          action_timestamp?: string | null
          action_type?: string
          browser?: string | null
          created_at?: string | null
          day_of_week?: number | null
          device_type?: string | null
          event_count?: number | null
          id?: string
          last_ai_response?: string | null
          locale?: string | null
          response_time_ms?: number | null
          session_id?: string
          suggestion_category?: string | null
          suggestion_position?: number | null
          suggestion_text?: string
          time_of_day?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_action_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_behavior_patterns: {
        Row: {
          action_type: string
          context_data: Json | null
          created_at: string | null
          frequency: number | null
          id: string
          last_action_at: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          context_data?: Json | null
          created_at?: string | null
          frequency?: number | null
          id?: string
          last_action_at?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          context_data?: Json | null
          created_at?: string | null
          frequency?: number | null
          id?: string
          last_action_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          active_time_slots: Json | null
          id: string
          personalization_data: Json | null
          preferred_event_types: string[] | null
          quick_action_history: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_time_slots?: Json | null
          id?: string
          personalization_data?: Json | null
          preferred_event_types?: string[] | null
          quick_action_history?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_time_slots?: Json | null
          id?: string
          personalization_data?: Json | null
          preferred_event_types?: string[] | null
          quick_action_history?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_type: string
          created_at: string | null
          email: string
          google_access_token: string | null
          google_calendar_enabled: boolean | null
          google_refresh_token: string | null
          google_user_id: string | null
          id: string
          name: string | null
          password: string | null
          updated_at: string | null
        }
        Insert: {
          auth_type: string
          created_at?: string | null
          email: string
          google_access_token?: string | null
          google_calendar_enabled?: boolean | null
          google_refresh_token?: string | null
          google_user_id?: string | null
          id?: string
          name?: string | null
          password?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_type?: string
          created_at?: string | null
          email?: string
          google_access_token?: string | null
          google_calendar_enabled?: boolean | null
          google_refresh_token?: string | null
          google_user_id?: string | null
          id?: string
          name?: string | null
          password?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      unread_notification_counts: {
        Row: {
          high_count: number | null
          low_count: number | null
          medium_count: number | null
          total_count: number | null
          urgent_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      user_suggestion_stats: {
        Row: {
          click_count: number | null
          ctr_percentage: number | null
          display_count: number | null
          last_interaction: string | null
          suggestion_category: string | null
          suggestion_text: string | null
          time_of_day: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_action_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_user_preferences: {
        Args: { p_user_id: string }
        Returns: {
          avg_response_time_ms: number
          most_clicked_suggestions: string[]
          preferred_category: string
          preferred_time_of_day: string
        }[]
      }
      schedule_event_notifications: {
        Args: {
          p_event_id: string
          p_event_location?: string
          p_event_time: string
          p_event_title: string
          p_user_id: string
        }
        Returns: undefined
      }
      set_current_user_id: {
        Args: { user_id: string }
        Returns: undefined
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
  public: {
    Enums: {},
  },
} as const