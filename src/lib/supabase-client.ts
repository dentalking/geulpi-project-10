/**
 * 클라이언트사이드 Supabase 클라이언트
 * 브라우저에서 안전하게 사용할 수 있는 anon key 사용
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// 클라이언트사이드 Supabase 클라이언트 (anon key 사용)
// Singleton pattern to prevent multiple instances
let clientInstance: ReturnType<typeof createClient> | null = null;

export const supabaseClient = (() => {
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      realtime: {
        // Realtime 연결 설정
        params: {
          eventsPerSecond: 10,
        },
        // Reconnect options
        heartbeatIntervalMs: 30000,
      },
      // Add global fetch options
      global: {
        headers: {
          'x-client-info': 'supabase-js-web'
        },
      },
    });
  }
  return clientInstance;
})();

// 연결 상태 체크 함수
export function checkSupabaseConnection(): boolean {
  try {
    return !!supabaseClient && !!supabaseUrl && !!supabaseAnonKey;
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
}