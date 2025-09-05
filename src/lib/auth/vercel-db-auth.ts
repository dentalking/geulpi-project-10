import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export async function registerUser(email: string, password: string, name?: string): Promise<User> {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await sql<User>`
      INSERT INTO users (email, password, name)
      VALUES (${email}, ${hashedPassword}, ${name || email.split('@')[0]})
      RETURNING id, email, name
    `;
    
    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('Email already exists');
    }
    throw error;
  }
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const result = await sql`
    SELECT id, email, password, name 
    FROM users 
    WHERE email = ${email}
  `;
  
  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }
  
  const user = result.rows[0];
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }
  
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
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const result = await sql<User>`
      SELECT id, email, name 
      FROM users 
      WHERE id = ${decoded.userId}
    `;
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    return null;
  }
}