import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ENCRYPTION_KEY = process.env.TWO_FACTOR_ENCRYPTION_KEY || 'your-32-char-secret-key-change-me!';
const APP_NAME = 'Geulpi Calendar';

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

interface TwoFactorVerification {
  isValid: boolean;
  error?: string;
}

// Encryption utilities
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  
  const textParts = encryptedText.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedData = textParts.join(':');
  
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Generate backup codes
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    // Generate 8-digit backup code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXXX-XXXX
    const formattedCode = code.substring(0, 4) + '-' + code.substring(4, 8);
    codes.push(formattedCode);
  }
  
  return codes;
}

// Two-Factor Authentication Manager
export class TwoFactorAuthManager {
  
  /**
   * Generate a new 2FA secret and setup data for a user
   */
  async generateSetup(userId: string, userEmail: string): Promise<TwoFactorSetup> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: APP_NAME,
      length: 32
    });
    
    // Generate QR code URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    
    // Generate backup codes
    const backupCodes = generateBackupCodes();
    
    // Manual entry key (formatted for easier reading)
    const manualEntryKey = secret.base32.match(/.{1,4}/g)?.join(' ') || secret.base32;
    
    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
      manualEntryKey
    };
  }
  
  /**
   * Verify a TOTP token
   */
  verifyToken(secret: string, token: string): TwoFactorVerification {
    try {
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 time steps (±30 seconds)
      });
      
      return {
        isValid: verified
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid token format'
      };
    }
  }
  
  /**
   * Verify a backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<TwoFactorVerification> {
    try {
      // Get user's backup codes from database
      const { data: user, error } = await supabase
        .from('users')
        .select('twoFactorBackupCodes')
        .eq('id', userId)
        .single();
      
      if (error || !user?.twoFactorBackupCodes) {
        return {
          isValid: false,
          error: 'No backup codes found'
        };
      }
      
      // Decrypt and parse backup codes
      const encryptedCodes = user.twoFactorBackupCodes;
      const decryptedCodes = decrypt(encryptedCodes);
      const backupCodes: string[] = JSON.parse(decryptedCodes);
      
      // Check if code exists and remove it (one-time use)
      const codeIndex = backupCodes.indexOf(code.toUpperCase());
      
      if (codeIndex === -1) {
        return {
          isValid: false,
          error: 'Invalid backup code'
        };
      }
      
      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      
      // Save updated backup codes
      const updatedEncryptedCodes = encrypt(JSON.stringify(backupCodes));
      
      await supabase
        .from('users')
        .update({ 
          twoFactorBackupCodes: updatedEncryptedCodes,
          twoFactorVerifiedAt: new Date().toISOString()
        })
        .eq('id', userId);
      
      return {
        isValid: true
      };
    } catch (error) {
      console.error('Backup code verification error:', error);
      return {
        isValid: false,
        error: 'Failed to verify backup code'
      };
    }
  }
  
  /**
   * Enable 2FA for a user
   */
  async enable2FA(userId: string, secret: string, backupCodes: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      // Encrypt secret and backup codes
      const encryptedSecret = encrypt(secret);
      const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes));
      
      // Update user in database
      const { error } = await supabase
        .from('users')
        .update({
          twoFactorSecret: encryptedSecret,
          twoFactorBackupCodes: encryptedBackupCodes,
          twoFactorEnabled: true,
          twoFactorEnabledAt: new Date().toISOString(),
          twoFactorVerifiedAt: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) {
        throw error;
      }
      
      // Log for security audit
      console.log(`2FA enabled for user: ${userId}`);
      
      return { success: true };
    } catch (error: any) {
      console.error('Enable 2FA error:', error);
      return {
        success: false,
        error: 'Failed to enable 2FA'
      };
    }
  }
  
  /**
   * Disable 2FA for a user
   */
  async disable2FA(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Clear all 2FA data
      const { error } = await supabase
        .from('users')
        .update({
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
          twoFactorEnabled: false,
          twoFactorEnabledAt: null,
          twoFactorVerifiedAt: null
        })
        .eq('id', userId);
      
      if (error) {
        throw error;
      }
      
      // Log for security audit
      console.log(`2FA disabled for user: ${userId}`);
      
      return { success: true };
    } catch (error: any) {
      console.error('Disable 2FA error:', error);
      return {
        success: false,
        error: 'Failed to disable 2FA'
      };
    }
  }
  
  /**
   * Check if user has 2FA enabled
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('twoFactorEnabled')
        .eq('id', userId)
        .single();
      
      if (error || !user) {
        return false;
      }
      
      return user.twoFactorEnabled || false;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get user's 2FA status and info
   */
  async get2FAStatus(userId: string): Promise<{
    enabled: boolean;
    enabledAt?: Date;
    backupCodesCount?: number;
  }> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('twoFactorEnabled, twoFactorEnabledAt, twoFactorBackupCodes')
        .eq('id', userId)
        .single();
      
      if (error || !user) {
        return { enabled: false };
      }
      
      let backupCodesCount = 0;
      if (user.twoFactorBackupCodes) {
        try {
          const decryptedCodes = decrypt(user.twoFactorBackupCodes);
          const backupCodes: string[] = JSON.parse(decryptedCodes);
          backupCodesCount = backupCodes.length;
        } catch (error) {
          // Ignore decryption errors
        }
      }
      
      return {
        enabled: user.twoFactorEnabled || false,
        enabledAt: user.twoFactorEnabledAt ? new Date(user.twoFactorEnabledAt) : undefined,
        backupCodesCount
      };
    } catch (error) {
      return { enabled: false };
    }
  }
  
  /**
   * Verify user's secret for sensitive operations
   */
  async verifyUserToken(userId: string, token: string): Promise<TwoFactorVerification> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('twoFactorSecret, twoFactorEnabled')
        .eq('id', userId)
        .single();
      
      if (error || !user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        return {
          isValid: false,
          error: '2FA not enabled for this user'
        };
      }
      
      // Decrypt secret
      const decryptedSecret = decrypt(user.twoFactorSecret);
      
      // Verify token
      const verification = this.verifyToken(decryptedSecret, token);
      
      if (verification.isValid) {
        // Update last verification time
        await supabase
          .from('users')
          .update({ twoFactorVerifiedAt: new Date().toISOString() })
          .eq('id', userId);
      }
      
      return verification;
    } catch (error: any) {
      console.error('User token verification error:', error);
      return {
        isValid: false,
        error: 'Failed to verify token'
      };
    }
  }
}

// Export singleton instance
export const twoFactorAuth = new TwoFactorAuthManager();

// Export helper functions
export async function generate2FASetup(userId: string, userEmail: string): Promise<TwoFactorSetup> {
  return twoFactorAuth.generateSetup(userId, userEmail);
}

export function verify2FAToken(secret: string, token: string): TwoFactorVerification {
  return twoFactorAuth.verifyToken(secret, token);
}

export async function enable2FAForUser(userId: string, secret: string, backupCodes: string[]): Promise<{ success: boolean; error?: string }> {
  return twoFactorAuth.enable2FA(userId, secret, backupCodes);
}

export async function disable2FAForUser(userId: string): Promise<{ success: boolean; error?: string }> {
  return twoFactorAuth.disable2FA(userId);
}

export async function check2FAEnabled(userId: string): Promise<boolean> {
  return twoFactorAuth.is2FAEnabled(userId);
}

export async function get2FAUserStatus(userId: string): Promise<{
  enabled: boolean;
  enabledAt?: Date;
  backupCodesCount?: number;
}> {
  return twoFactorAuth.get2FAStatus(userId);
}

// Export types
export type { TwoFactorSetup, TwoFactorVerification };