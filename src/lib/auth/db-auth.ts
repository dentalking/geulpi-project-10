import { prisma } from '@/lib/prisma';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

// JWT secret
const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'test-secret-key-for-development-only'
);

// Register a new user
export async function registerUser(email: string, password: string, name?: string) {
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0]
      }
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  } catch (error) {
    console.error('Register user error:', error);
    throw error;
  }
}

// Login user
export async function loginUser(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      throw new Error('Invalid password');
    }

    // Create JWT token
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      name: user.name
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  } catch (error) {
    console.error('Login user error:', error);
    throw error;
  }
}

// Verify JWT token
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as {
      id: string;
      email: string;
      name: string | null;
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Get user by email
export async function getUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email,
      name: user.name
    };
  } catch (error) {
    console.error('Get user by email error:', error);
    return null;
  }
}