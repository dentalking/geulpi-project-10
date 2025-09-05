// Simple in-memory email authentication for testing
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

// In-memory storage for test users
const users = new Map<string, {
  id: string;
  email: string;
  password: string; // hashed
  name: string;
  createdAt: Date;
}>();

// JWT secret
const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'test-secret-key-for-development-only'
);

// Password hashing
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Create a test user for development
export function initTestUser() {
  const testUser = {
    id: 'test-user-001',
    email: 'test@geulpi.com',
    password: hashPassword('test1234'),
    name: 'Test User',
    createdAt: new Date()
  };
  users.set(testUser.email, testUser);
  console.log('Test user created:', testUser.email);
}

// Initialize test user on module load
initTestUser();

// Register a new user
export async function registerUser(email: string, password: string, name?: string) {
  if (users.has(email)) {
    throw new Error('User already exists');
  }

  const user = {
    id: `user-${Date.now()}`,
    email,
    password: hashPassword(password),
    name: name || email.split('@')[0],
    createdAt: new Date()
  };

  users.set(email, user);
  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
}

// Login user
export async function loginUser(email: string, password: string) {
  const user = users.get(email);
  
  if (!user) {
    throw new Error('User not found');
  }

  if (user.password !== hashPassword(password)) {
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
}

// Verify JWT token
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as {
      id: string;
      email: string;
      name: string;
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Get user by email
export function getUserByEmail(email: string) {
  const user = users.get(email);
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
}

// List all users (for debugging)
export function listUsers() {
  return Array.from(users.values()).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt
  }));
}