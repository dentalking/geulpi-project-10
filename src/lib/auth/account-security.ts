import { RateLimitError } from '../api-errors';

interface LoginAttempt {
  email: string;
  timestamp: number;
  ip: string;
  success: boolean;
}

interface AccountLockInfo {
  lockedUntil: number;
  failedAttempts: number;
  lastAttempt: number;
}

class AccountSecurityManager {
  private failedAttempts: Map<string, LoginAttempt[]> = new Map();
  private accountLocks: Map<string, AccountLockInfo> = new Map();
  
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly ATTEMPT_WINDOW = 30 * 60 * 1000; // 30 minutes
  
  async checkAccountLock(email: string): Promise<void> {
    const lockInfo = this.accountLocks.get(email);
    
    if (lockInfo && lockInfo.lockedUntil > Date.now()) {
      const remainingTime = Math.ceil((lockInfo.lockedUntil - Date.now()) / 1000 / 60);
      throw new RateLimitError(
        `Account is locked due to multiple failed login attempts. Please try again in ${remainingTime} minutes.`
      );
    }
    
    // Remove expired lock
    if (lockInfo && lockInfo.lockedUntil <= Date.now()) {
      this.accountLocks.delete(email);
      this.failedAttempts.delete(email);
    }
  }
  
  async recordLoginAttempt(email: string, ip: string, success: boolean): Promise<void> {
    const attempt: LoginAttempt = {
      email,
      timestamp: Date.now(),
      ip,
      success
    };
    
    if (success) {
      // Clear failed attempts on successful login
      this.failedAttempts.delete(email);
      this.accountLocks.delete(email);
      return;
    }
    
    // Record failed attempt
    const attempts = this.failedAttempts.get(email) || [];
    const now = Date.now();
    
    // Filter out old attempts outside the window
    const recentAttempts = attempts.filter(
      a => a.timestamp > now - this.ATTEMPT_WINDOW
    );
    
    recentAttempts.push(attempt);
    this.failedAttempts.set(email, recentAttempts);
    
    // Check if account should be locked
    if (recentAttempts.length >= this.MAX_FAILED_ATTEMPTS) {
      this.accountLocks.set(email, {
        lockedUntil: now + this.LOCKOUT_DURATION,
        failedAttempts: recentAttempts.length,
        lastAttempt: now
      });
      
      // Log security event (could be sent to monitoring service)
      console.warn(`Account locked: ${email} after ${recentAttempts.length} failed attempts from IP: ${ip}`);
    }
  }
  
  getFailedAttemptCount(email: string): number {
    const attempts = this.failedAttempts.get(email) || [];
    const now = Date.now();
    
    // Count only recent attempts
    return attempts.filter(
      a => a.timestamp > now - this.ATTEMPT_WINDOW
    ).length;
  }
  
  isAccountLocked(email: string): boolean {
    const lockInfo = this.accountLocks.get(email);
    return lockInfo ? lockInfo.lockedUntil > Date.now() : false;
  }
  
  // Cleanup old data to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    
    // Clean up expired locks
    for (const [email, lockInfo] of this.accountLocks.entries()) {
      if (lockInfo.lockedUntil <= now) {
        this.accountLocks.delete(email);
      }
    }
    
    // Clean up old failed attempts
    for (const [email, attempts] of this.failedAttempts.entries()) {
      const recentAttempts = attempts.filter(
        a => a.timestamp > now - this.ATTEMPT_WINDOW
      );
      
      if (recentAttempts.length === 0) {
        this.failedAttempts.delete(email);
      } else {
        this.failedAttempts.set(email, recentAttempts);
      }
    }
  }
}

// Singleton instance
export const accountSecurity = new AccountSecurityManager();

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    accountSecurity.cleanup();
  }, 5 * 60 * 1000);
}

// Export helper functions
export async function checkAccountSecurity(email: string): Promise<void> {
  return accountSecurity.checkAccountLock(email);
}

export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean
): Promise<void> {
  return accountSecurity.recordLoginAttempt(email, ip, success);
}

export function getFailedAttempts(email: string): number {
  return accountSecurity.getFailedAttemptCount(email);
}

export function isLocked(email: string): boolean {
  return accountSecurity.isAccountLocked(email);
}