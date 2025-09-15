import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'your-refresh-secret-change-in-production';

interface Session {
  id: string;
  userId: string;
  email: string;
  deviceInfo: DeviceInfo;
  createdAt: Date;
  lastActive: Date;
  expiresAt: Date;
  refreshToken?: string;
  rememberMe: boolean;
}

interface DeviceInfo {
  userAgent: string;
  ip: string;
  browser?: string;
  os?: string;
  device?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// In-memory session store (replace with Redis/DB in production)
class SessionStore {
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private refreshTokens: Map<string, string> = new Map(); // refreshToken -> sessionId

  async createSession(
    userId: string,
    email: string,
    deviceInfo: DeviceInfo,
    rememberMe: boolean = false
  ): Promise<{ session: Session; tokens: TokenPair }> {
    const sessionId = uuidv4();
    const now = new Date();
    
    // Different expiry based on Remember Me
    const accessTokenExpiry = rememberMe ? '7d' : '24h';
    const refreshTokenExpiry = rememberMe ? '30d' : '7d';
    const sessionExpiry = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    // Generate tokens
    const accessToken = jwt.sign(
      { 
        sessionId,
        userId,
        email,
        type: 'access'
      },
      JWT_SECRET,
      { expiresIn: accessTokenExpiry }
    );
    
    const refreshToken = jwt.sign(
      {
        sessionId,
        userId,
        type: 'refresh'
      },
      REFRESH_SECRET,
      { expiresIn: refreshTokenExpiry }
    );
    
    // Create session
    const session: Session = {
      id: sessionId,
      userId,
      email,
      deviceInfo,
      createdAt: now,
      lastActive: now,
      expiresAt: new Date(now.getTime() + sessionExpiry),
      refreshToken,
      rememberMe
    };
    
    // Store session
    this.sessions.set(sessionId, session);
    this.refreshTokens.set(refreshToken, sessionId);
    
    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);
    
    // Limit sessions per user (max 5 devices)
    await this.limitUserSessions(userId, 5);
    
    return {
      session,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60
      }
    };
  }
  
  async verifyAccessToken(token: string): Promise<Session | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (decoded.type !== 'access') {
        return null;
      }
      
      const session = this.sessions.get(decoded.sessionId);
      
      if (!session || session.expiresAt < new Date()) {
        return null;
      }
      
      // Update last active
      session.lastActive = new Date();
      this.sessions.set(session.id, session);
      
      return session;
    } catch (error) {
      return null;
    }
  }
  
  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        return null;
      }
      
      const sessionId = this.refreshTokens.get(refreshToken);
      if (!sessionId) {
        return null;
      }
      
      const session = this.sessions.get(sessionId);
      if (!session || session.expiresAt < new Date()) {
        return null;
      }
      
      // Generate new access token
      const accessTokenExpiry = session.rememberMe ? '7d' : '24h';
      const accessToken = jwt.sign(
        {
          sessionId: session.id,
          userId: session.userId,
          email: session.email,
          type: 'access'
        },
        JWT_SECRET,
        { expiresIn: accessTokenExpiry }
      );
      
      // Update session
      session.lastActive = new Date();
      this.sessions.set(session.id, session);
      
      return {
        accessToken,
        refreshToken, // Keep the same refresh token
        expiresIn: session.rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60
      };
    } catch (error) {
      return null;
    }
  }
  
  async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // Remove from stores
    this.sessions.delete(sessionId);
    if (session.refreshToken) {
      this.refreshTokens.delete(session.refreshToken);
    }
    
    // Remove from user sessions
    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }
  }
  
  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return;
    
    for (const sessionId of sessionIds) {
      await this.revokeSession(sessionId);
    }
  }
  
  async getUserSessions(userId: string): Promise<Session[]> {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];
    
    const sessions: Session[] = [];
    const now = new Date();
    
    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.expiresAt > now) {
        sessions.push(session);
      } else if (session) {
        // Clean up expired session
        await this.revokeSession(sessionId);
      }
    }
    
    return sessions.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
  }
  
  private async limitUserSessions(userId: string, maxSessions: number): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    if (sessions.length > maxSessions) {
      // Remove oldest sessions
      const sessionsToRemove = sessions
        .sort((a, b) => a.lastActive.getTime() - b.lastActive.getTime())
        .slice(0, sessions.length - maxSessions);
      
      for (const session of sessionsToRemove) {
        await this.revokeSession(session.id);
      }
    }
  }
  
  // Cleanup expired sessions
  cleanup(): void {
    const now = new Date();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.revokeSession(sessionId);
      }
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionStore();

// Run cleanup every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    sessionManager.cleanup();
  }, 30 * 60 * 1000);
}

// Helper functions
export function parseDeviceInfo(userAgent: string, ip: string): DeviceInfo {
  // Basic parsing (can be enhanced with ua-parser-js)
  const deviceInfo: DeviceInfo = {
    userAgent,
    ip
  };
  
  // Simple browser detection
  if (userAgent.includes('Chrome')) {
    deviceInfo.browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    deviceInfo.browser = 'Firefox';
  } else if (userAgent.includes('Safari')) {
    deviceInfo.browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    deviceInfo.browser = 'Edge';
  }
  
  // Simple OS detection
  if (userAgent.includes('Windows')) {
    deviceInfo.os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    deviceInfo.os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    deviceInfo.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    deviceInfo.os = 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone')) {
    deviceInfo.os = 'iOS';
  }
  
  // Simple device detection
  if (userAgent.includes('Mobile')) {
    deviceInfo.device = 'Mobile';
  } else if (userAgent.includes('Tablet')) {
    deviceInfo.device = 'Tablet';
  } else {
    deviceInfo.device = 'Desktop';
  }
  
  return deviceInfo;
}

// Export types
export type { Session, DeviceInfo, TokenPair };