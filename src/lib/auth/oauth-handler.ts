import { supabase } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export async function findOrCreateOAuthUser(googleId: string, email: string, name: string): Promise<User> {
  try {
    console.log('Attempting to find/create OAuth user:', { googleId, email, name });

    // First, check if user exists by Google ID
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('google_user_id', googleId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding user by Google ID:', findError);
    }

    if (existingUser) {
      console.log('Found existing user by Google ID:', existingUser);
      return existingUser;
    }

    // Check if user exists by email
    const { data: emailUser, error: emailError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .maybeSingle();

    if (emailError) {
      console.error('Error finding user by email:', emailError);
    }

    if (emailUser) {
      console.log('Found existing user by email, updating with Google ID');
      // User exists with this email but different ID - update the Google ID
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          google_user_id: googleId,
          name: name || emailUser.name,
          auth_type: 'google_oauth',
          password: null  // Must be NULL for google_oauth type
        })
        .eq('email', email)
        .select('id, email, name')
        .single();

      if (updateError) {
        console.error('Error updating user with Google ID:', updateError);
        throw updateError;
      }

      return updatedUser || emailUser;
    }

    // Create new user
    console.log('Creating new OAuth user');
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: googleId,
        email,
        name,
        password: 'oauth_user_no_password', // OAuth users don't need passwords
        google_user_id: googleId,
        auth_type: 'google_oauth',
        google_calendar_enabled: true,
        created_at: new Date().toISOString()
      })
      .select('id, email, name')
      .single();

    if (createError) {
      console.error('Error creating new user:', createError);
      // If the error is a unique constraint violation, try to get the user again
      if (createError.code === '23505') {
        const { data: retryUser } = await supabase
          .from('users')
          .select('id, email, name')
          .eq('email', email)
          .single();

        if (retryUser) {
          return retryUser;
        }
      }
      throw createError;
    }

    if (!newUser) {
      throw new Error('Failed to create user - no data returned');
    }

    console.log('Successfully created new user:', newUser);
    return newUser;
  } catch (error: any) {
    console.error('OAuth user creation error:', error);
    throw new Error('Failed to create or find user');
  }
}