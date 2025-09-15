// Simple auth wrapper for 2FA endpoints
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface AuthSession {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export async function auth(): Promise<AuthSession> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return {};
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    return {
      user: {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name
      }
    };
  } catch (error) {
    return {};
  }
}