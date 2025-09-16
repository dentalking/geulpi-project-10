import { supabase } from '@/lib/db';

/**
 * Sets the current user ID in PostgreSQL session for RLS policies
 * This is necessary when using JWT authentication instead of Supabase Auth
 */
export async function setRLSContext(userId: string) {
  try {
    // Use our custom RPC function to set the user ID
    const { error } = await supabase.rpc('set_current_user_id', {
      user_id: userId
    });

    if (error) {
      console.error('Failed to set RLS context:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error setting RLS context:', error);
    return false;
  }
}

/**
 * Gets a Supabase client with RLS context set for the given user
 */
export async function getAuthenticatedSupabase(userId: string) {
  await setRLSContext(userId);
  return supabase;
}