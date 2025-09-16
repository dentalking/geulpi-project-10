import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to handle database errors
export function handleDbError(error: any): string {
  if (error.code === '23505') {
    return 'Record already exists';
  }
  if (error.code === '23503') {
    return 'Referenced record not found';
  }
  if (error.code === '42P01') {
    return 'Table does not exist';
  }
  return error.message || 'Database error occurred';
}