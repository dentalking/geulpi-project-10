import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export async function registerUser(email: string, password: string, name?: string): Promise<User> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0]
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    return user;
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === 'P2002') {
      throw new Error('Email already exists');
    }
    throw error;
  }
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  try {
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    if (!user.password) {
      throw new Error('Invalid email or password');
    }

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

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}

export async function updateUserProfile(userId: string, updates: { name?: string; email?: string }): Promise<User> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    return user;
  } catch (error: any) {
    console.error('Update profile error:', error);
    throw error;
  }
}

export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  try {
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    if (!user.password) {
      throw new Error('Password not set for this user');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new Error('Invalid current password');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    throw error;
  }
}

// OAuth user creation/update
export async function findOrCreateOAuthUser(googleId: string, email: string, name: string): Promise<User> {
  try {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { id: googleId }
    });

    if (!user) {
      // Check by email
      user = await prisma.user.findUnique({
        where: { email }
      });

      if (user) {
        // Update existing user with Google ID
        user = await prisma.user.update({
          where: { email },
          data: { id: googleId }
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            id: googleId,
            email,
            name,
            password: 'oauth_user_no_password' // OAuth users don't need passwords
          }
        });
      }
    }

    return user!;
  } catch (error: any) {
    console.error('OAuth user creation error:', error);
    throw error;
  }
}