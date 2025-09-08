import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side Supabase client (for frontend)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with service role (for API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Database types for better TypeScript support
export interface Database {
  public: {
    Tables: {
      chat_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          created_at: string;
          updated_at: string;
          is_active: boolean | null;
          metadata: Record<string, any> | null;
        };
        Insert: {
          id: string;
          user_id?: string | null;
          title?: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean | null;
          metadata?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean | null;
          metadata?: Record<string, any> | null;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          message_type: string;
          created_at: string;
          data: Record<string, any> | null;
          metadata: Record<string, any> | null;
        };
        Insert: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          message_type?: string;
          created_at?: string;
          data?: Record<string, any> | null;
          metadata?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: 'user' | 'assistant' | 'system';
          content?: string;
          message_type?: string;
          created_at?: string;
          data?: Record<string, any> | null;
          metadata?: Record<string, any> | null;
        };
      };
    };
  };
}

export type ChatSession = Database['public']['Tables']['chat_sessions']['Row'];
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
export type InsertChatSession = Database['public']['Tables']['chat_sessions']['Insert'];
export type InsertChatMessage = Database['public']['Tables']['chat_messages']['Insert'];