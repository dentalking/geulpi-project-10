/**
 * Server-side Supabase client singleton
 * Prevents duplicate client creation in API routes
 */

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';
import { Database } from '@/types/database.types';
// Import SSR functions for improved cookie handling
import { createSupabaseServerClient, createSupabaseServiceClient, getCurrentUserSSR } from './supabase-ssr';

let serverClient: ReturnType<typeof createClient<Database>> | null = null;
let serviceRoleClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Get Supabase client with service role key (full admin access)
 * Use this for server-side operations that need to bypass RLS
 */
export function getServiceRoleSupabase() {
  if (!serviceRoleClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      logger.error('Missing Supabase environment variables');
      throw new Error('Supabase configuration error');
    }

    serviceRoleClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    logger.debug('Service role Supabase client created');
  }

  return serviceRoleClient;
}

/**
 * Get Supabase client with anon key (respects RLS)
 * Use this for server-side operations that should respect user permissions
 */
export function getServerSupabase() {
  if (!serverClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('Missing Supabase environment variables');
      throw new Error('Supabase configuration error');
    }

    serverClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    logger.debug('Server Supabase client created');
  }

  return serverClient;
}

/**
 * Get authenticated Supabase client for the current user
 * This respects the user's session and RLS policies
 */
export async function getAuthenticatedSupabase() {
  const supabase = getServerSupabase();

  try {
    // Try to get the session from cookies or headers
    const cookieStore = await cookies();

    // Check for standard Supabase session cookies
    const sbAccessToken = cookieStore.get('sb-access-token')?.value;
    const sbRefreshToken = cookieStore.get('sb-refresh-token')?.value;

    if (sbAccessToken && sbRefreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: sbAccessToken,
        refresh_token: sbRefreshToken
      });

      if (error) {
        logger.warn('Failed to set Supabase session from cookies', { error: error.message });
      } else {
        return supabase;
      }
    }
  } catch (error) {
    logger.error('Error setting up authenticated client', error);
  }

  return supabase;
}

/**
 * Get the current user from the server-side Supabase client
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();

    // First, check for our custom auth token (email auth)
    const authToken = cookieStore.get('auth-token')?.value;
    if (authToken) {
      // Verify the JWT token using our custom auth
      const { verifyToken } = await import('@/lib/auth/supabase-auth');
      const user = await verifyToken(authToken);
      if (user) {
        logger.debug('User authenticated via custom auth token', { userId: user.id });
        return user;
      }
    }

    // Check for Google OAuth tokens
    const googleAccessToken = cookieStore.get('google_access_token')?.value || cookieStore.get('access_token')?.value;
    if (googleAccessToken) {
      // Get user info from Google OAuth
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`
          }
        });

        if (response.ok) {
          const googleUser = await response.json();
          logger.debug('User authenticated via Google OAuth', { googleId: googleUser.id });
          // Return a user object compatible with Supabase User type
          return {
            id: googleUser.id,
            email: googleUser.email,
            user_metadata: {
              full_name: googleUser.name,
              avatar_url: googleUser.picture
            },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString()
          } as any;
        }
      } catch (error) {
        logger.warn('Failed to get user from Google token', error);
      }
    }

    // Fall back to standard Supabase auth
    const supabase = await getAuthenticatedSupabase();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      logger.debug('No authenticated user found', { error: error.message });
      return null;
    }

    return user;
  } catch (error) {
    logger.error('Error getting current user', error);
    return null;
  }
}

/**
 * Helper to check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Helper to require authentication in API routes
 * Throws an error if user is not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

// Re-export types for convenience
export type { User } from '@supabase/supabase-js';
export type SupabaseClient = ReturnType<typeof createClient>;