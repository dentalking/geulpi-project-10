import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface PasswordResetToken {
  token: string;
  email: string;
  expiresAt: Date;
  used: boolean;
}

// In-memory token store (replace with DB in production)
class PasswordResetManager {
  private tokens: Map<string, PasswordResetToken> = new Map();
  private emailTokens: Map<string, string> = new Map(); // email -> latest token
  
  private readonly TOKEN_LENGTH = 32;
  private readonly TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
  private readonly MAX_TOKENS_PER_EMAIL = 3; // Max 3 reset requests per hour
  
  generateSecureToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }
  
  async createResetToken(email: string): Promise<{ token: string; expiresAt: Date }> {
    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (error || !user) {
      // Don't reveal if user exists or not (security)
      // But still create a token to prevent timing attacks
      const fakeToken = this.generateSecureToken();
      return {
        token: fakeToken,
        expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY)
      };
    }
    
    // Invalidate any existing tokens for this email
    const existingToken = this.emailTokens.get(email);
    if (existingToken) {
      const existing = this.tokens.get(existingToken);
      if (existing) {
        existing.used = true;
        this.tokens.set(existingToken, existing);
      }
    }
    
    // Generate new token
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY);
    
    const resetToken: PasswordResetToken = {
      token,
      email,
      expiresAt,
      used: false
    };
    
    // Store token
    this.tokens.set(token, resetToken);
    this.emailTokens.set(email, token);
    
    // Log for security audit
    console.log(`Password reset token created for email: ${email.substring(0, 3)}***`);
    
    return { token, expiresAt };
  }
  
  async validateToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const resetToken = this.tokens.get(token);
    
    if (!resetToken) {
      return { valid: false };
    }
    
    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      this.tokens.delete(token);
      return { valid: false };
    }
    
    // Check if token was already used
    if (resetToken.used) {
      return { valid: false };
    }
    
    return {
      valid: true,
      email: resetToken.email
    };
  }
  
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    // Validate token
    const validation = await this.validateToken(token);
    
    if (!validation.valid || !validation.email) {
      return {
        success: false,
        error: 'Invalid or expired reset token'
      };
    }
    
    // Validate password strength
    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long'
      };
    }
    
    const resetToken = this.tokens.get(token)!;
    
    try {
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password in database
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('email', resetToken.email);
      
      if (updateError) {
        throw updateError;
      }
      
      // Mark token as used
      resetToken.used = true;
      this.tokens.set(token, resetToken);
      
      // Clean up
      this.emailTokens.delete(resetToken.email);
      
      // Log for security audit
      console.log(`Password reset successful for email: ${resetToken.email.substring(0, 3)}***`);
      
      return { success: true };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: 'Failed to reset password'
      };
    }
  }
  
  // Cleanup expired tokens
  cleanup(): void {
    const now = new Date();
    
    for (const [token, resetToken] of this.tokens.entries()) {
      if (resetToken.expiresAt < now || resetToken.used) {
        this.tokens.delete(token);
        
        // Clean up email mapping if this was the latest token
        const latestToken = this.emailTokens.get(resetToken.email);
        if (latestToken === token) {
          this.emailTokens.delete(resetToken.email);
        }
      }
    }
  }
  
  // Get recent token count for rate limiting
  getRecentTokenCount(email: string): number {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let count = 0;
    
    for (const resetToken of this.tokens.values()) {
      if (resetToken.email === email && resetToken.expiresAt > oneHourAgo) {
        count++;
      }
    }
    
    return count;
  }
}

// Singleton instance
export const passwordResetManager = new PasswordResetManager();

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    passwordResetManager.cleanup();
  }, 5 * 60 * 1000);
}

// Email service interface (implement with your email provider)
export interface EmailService {
  sendPasswordResetEmail(email: string, resetLink: string): Promise<void>;
}

// Mock email service for development
export class MockEmailService implements EmailService {
  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    console.log('=================================');
    console.log('PASSWORD RESET EMAIL (DEV MODE)');
    console.log('=================================');
    console.log(`To: ${email}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log('=================================');
    console.log('This link expires in 15 minutes');
    console.log('=================================');
  }
}

// Email template
export function getPasswordResetEmailHtml(resetLink: string, userName?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - Geulpi Calendar</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 20px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Logo -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px;"></div>
            <h1 style="color: #1a1a1a; font-size: 28px; margin: 20px 0 10px;">Geulpi Calendar</h1>
          </div>
          
          <!-- Content -->
          <div style="color: #4a4a4a; line-height: 1.6;">
            <h2 style="color: #1a1a1a; font-size: 20px; margin-bottom: 20px;">
              Reset Your Password
            </h2>
            
            <p style="margin-bottom: 20px;">
              Hi${userName ? ` ${userName}` : ''},
            </p>
            
            <p style="margin-bottom: 20px;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="margin-bottom: 20px; font-size: 14px; color: #666;">
              Or copy and paste this link into your browser:
            </p>
            
            <div style="background: #f5f5f7; padding: 12px; border-radius: 8px; word-break: break-all; font-size: 12px; color: #666; margin-bottom: 20px;">
              ${resetLink}
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ Important:</strong> This link expires in 15 minutes for security reasons.
              </p>
            </div>
            
            <p style="margin-bottom: 20px; font-size: 14px; color: #666;">
              If you didn't request a password reset, please ignore this email. Your password won't be changed.
            </p>
            
            <!-- Footer -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e7;">
              <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                This is an automated email from Geulpi Calendar. Please do not reply.
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #999; text-align: center;">
                © 2025 Geulpi. All rights reserved.
              </p>
            </div>
          </div>
        </div>
        
        <!-- Security Notice -->
        <div style="margin-top: 20px; text-align: center;">
          <p style="font-size: 12px; color: #999;">
            🔒 For security, this link can only be used once.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Export helper functions
export async function createPasswordResetToken(email: string): Promise<{ token: string; expiresAt: Date }> {
  return passwordResetManager.createResetToken(email);
}

export async function validatePasswordResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
  return passwordResetManager.validateToken(token);
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  return passwordResetManager.resetPassword(token, newPassword);
}

export function isRateLimited(email: string): boolean {
  return passwordResetManager.getRecentTokenCount(email) >= 3;
}