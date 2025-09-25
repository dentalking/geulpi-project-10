/**
 * Supabase SSR client factory with proper cookie handling for Next.js
 * Uses @supabase/ssr for improved Next.js integration
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

/**
 * Create a Supabase client for server-side operations with proper cookie handling
 * This respects RLS policies and user authentication
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Cookie modification error during server-side rendering
            // This is expected in certain contexts like generateStaticParams
            logger.debug(`Cookie set error (expected in some contexts): ${name}`);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            // Cookie modification error during server-side rendering
            logger.debug(`Cookie remove error (expected in some contexts): ${name}`);
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase client with service role for admin operations
 * This bypasses RLS policies - use with caution
 */
export async function createSupabaseServiceClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            logger.debug(`Service client cookie set error: ${name}`);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            logger.debug(`Service client cookie remove error: ${name}`);
          }
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

/**
 * Get current user with proper SSR cookie handling
 * This checks multiple auth methods including custom JWT and OAuth
 */
export async function getCurrentUserSSR() {
  try {
    const cookieStore = await cookies();

    // First check for custom auth token (email auth)
    const authToken = cookieStore.get('auth-token')?.value;
    if (authToken) {
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
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`
          }
        });

        if (response.ok) {
          const googleUser = await response.json();
          logger.debug('User authenticated via Google OAuth', { googleId: googleUser.id });
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

    // Fall back to Supabase SSR auth
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      logger.debug('No authenticated user found', { error: error.message });
      return null;
    }

    return user;
  } catch (error) {
    logger.error('Error getting current user with SSR', error);
    return null;
  }
}

/**
 * Helper to check if user is authenticated with SSR
 */
export async function isAuthenticatedSSR(): Promise<boolean> {
  const user = await getCurrentUserSSR();
  return !!user;
}

/**
 * Helper to require authentication in API routes with SSR
 * Throws an error if user is not authenticated
 */
export async function requireAuthSSR() {
  const user = await getCurrentUserSSR();

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

// Re-export types for convenience
export type { User } from '@supabase/supabase-js';