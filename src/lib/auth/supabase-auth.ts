import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase client for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export async function registerUser(email: string, password: string, name?: string): Promise<User> {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user into Supabase users table
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        name: name || email.split('@')[0]
      })
      .select('id, email, name')
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Email already exists');
      }
      throw error;
    }
    
    return data;
  } catch (error: any) {
    console.error('Registration error:', error);
    throw error;
  }
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  try {
    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, name')
      .eq('email', email)
      .single();
    
    if (error || !user) {
      throw new Error('Invalid email or password');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    };
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .eq('id', decoded.userId)
      .single();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    return null;
  }
}

export async function updateUserProfile(userId: string, updates: { name?: string; email?: string }): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, email, name, created_at')
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error: any) {
    console.error('Update profile error:', error);
    throw error;
  }
}

export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  try {
    // First, verify the current password
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .single();
    
    if (fetchError || !user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      throw new Error('Invalid current password');
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedNewPassword })
      .eq('id', userId);
    
    if (updateError) {
      throw updateError;
    }
  } catch (error: any) {
    console.error('Change password error:', error);
    throw error;
  }
}