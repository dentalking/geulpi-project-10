import { supabase } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { check2FAEnabled } from './two-factor-auth';
import { pending2FAStore } from './pending-2fa-store';
import { v4 as uuidv4 } from 'uuid';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const getJwtSecret = () => env.get('JWT_SECRET') || env.get('NEXTAUTH_SECRET') || 'your-secret-key-change-in-production';

export interface User {
  id: string;
  email: string;
  name: string | null;
  auth_type: 'standard' | 'google_oauth';
}

export async function registerUser(email: string, password: string, name?: string): Promise<User> {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user into Supabase users table with standard auth type
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        auth_type: 'standard'
      })
      .select('id, email, name, auth_type')
      .single();
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Email already exists');
      }
      throw error;
    }
    
    return data;
  } catch (error: any) {
    logger.error('Registration error:', error);
    throw error;
  }
}

export async function loginUser(email: string, password: string, rememberMe: boolean = false): Promise<{ user?: User; token?: string; requires2FA?: boolean; pendingToken?: string }> {
  try {
    // Get user from Supabase (only standard auth users)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, name, auth_type')
      .eq('email', email)
      .eq('auth_type', 'standard')
      .single();

    if (error || !user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Check if 2FA is enabled
    const has2FA = await check2FAEnabled(user.id);

    if (has2FA) {
      // Generate pending token for 2FA verification
      const pendingToken = uuidv4();

      // Store pending login info
      await pending2FAStore.set(pendingToken, {
        userId: user.id,
        email: user.email,
        rememberMe,
        timestamp: Date.now()
      });

      return {
        requires2FA: true,
        pendingToken
      };
    }

    // Generate JWT token if no 2FA
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: rememberMe ? '30d' : '7d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        auth_type: user.auth_type
      },
      token
    };
  } catch (error: any) {
    logger.error('Login error:', error);
    throw error;
  }
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, auth_type, created_at')
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
      .select('id, email, name, auth_type, created_at')
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error: any) {
    logger.error('Update profile error:', error);
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
    logger.error('Change password error:', error);
    throw error;
  }
}