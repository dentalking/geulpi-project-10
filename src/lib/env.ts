/**
 * Environment Variables Validation and Type Safety
 * Ensures all required environment variables are present and typed
 */

import { logger } from './logger';

// Environment variable schema
interface EnvSchema {
  // Required variables
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Optional but recommended
  JWT_SECRET?: string;
  NEXTAUTH_SECRET?: string;
  NEXTAUTH_URL?: string;

  // Google OAuth
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;

  // Google APIs
  GOOGLE_API_KEY?: string;
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  GEMINI_API_KEY?: string;

  // Email Service
  GMAIL_USER?: string;
  GMAIL_APP_PASSWORD?: string;
  FROM_EMAIL?: string;
  RESEND_API_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;

  // Discord Bot
  DISCORD_BOT_TOKEN?: string;
  DISCORD_APPLICATION_ID?: string;
  DISCORD_PUBLIC_KEY?: string;

  // Kakao Bot
  KAKAO_BOT_SECRET?: string;

  // Vercel Cron
  CRON_SECRET?: string;

  // Runtime
  NODE_ENV?: 'development' | 'production' | 'test';
  VERCEL_ENV?: 'production' | 'preview' | 'development';
  VERCEL?: string;
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_BASE_URL?: string;
}

class EnvironmentConfig {
  private config: Partial<EnvSchema> = {};
  private validated = false;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    // Load all environment variables
    this.config = {
      // Core Supabase
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

      // Auth
      JWT_SECRET: process.env.JWT_SECRET,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,

      // Google
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,

      // Email
      GMAIL_USER: process.env.GMAIL_USER,
      GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
      FROM_EMAIL: process.env.FROM_EMAIL,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

      // Discord
      DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
      DISCORD_APPLICATION_ID: process.env.DISCORD_APPLICATION_ID,
      DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY,

      // Kakao
      KAKAO_BOT_SECRET: process.env.KAKAO_BOT_SECRET,

      // Cron
      CRON_SECRET: process.env.CRON_SECRET,

      // Runtime
      NODE_ENV: process.env.NODE_ENV as any,
      VERCEL_ENV: process.env.VERCEL_ENV as any,
      VERCEL: process.env.VERCEL,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    };
  }

  /**
   * Validate required environment variables
   */
  public validate(): void {
    if (this.validated) return;

    // Check if running on server or client
    const isServer = typeof window === 'undefined';

    const required: (keyof EnvSchema)[] = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    // Only check for service role key on server side
    if (isServer) {
      required.push('SUPABASE_SERVICE_ROLE_KEY');
    }

    const missing: string[] = [];

    for (const key of required) {
      if (!this.config[key]) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      const message = `Missing required environment variables: ${missing.join(', ')}`;

      // Only log error on server or in production
      if (isServer || process.env.NODE_ENV === 'production') {
        logger.error(message);
      }

      // Only throw in production
      if (process.env.NODE_ENV === 'production') {
        throw new Error(message);
      } else if (isServer) {
        logger.warn('Running with missing environment variables in development mode');
      }
    }

    // Validate optional but recommended variables
    const recommended = ['JWT_SECRET', 'NEXTAUTH_SECRET'];
    const missingRecommended = recommended.filter(key => !this.config[key as keyof EnvSchema]);

    if (missingRecommended.length > 0) {
      logger.warn(`Missing recommended environment variables: ${missingRecommended.join(', ')}`);
    }

    // Security warnings
    this.checkSecurityIssues();

    this.validated = true;
    logger.info('Environment variables validated successfully');
  }

  /**
   * Check for security issues
   */
  private checkSecurityIssues() {
    const warnings: string[] = [];

    // Check for default/weak secrets
    if (this.config.JWT_SECRET === 'your-secret-key-change-in-production') {
      warnings.push('JWT_SECRET is using default value - please change in production');
    }

    if (this.config.NEXTAUTH_SECRET && this.config.NEXTAUTH_SECRET.length < 32) {
      warnings.push('NEXTAUTH_SECRET should be at least 32 characters long');
    }

    // Check for exposed sensitive data in public variables
    if (this.config.NEXT_PUBLIC_SUPABASE_URL?.includes('service_role')) {
      warnings.push('Service role key should not be in public URL');
    }

    // Log warnings
    warnings.forEach(warning => logger.warn(`Security: ${warning}`));
  }

  /**
   * Get configuration value
   */
  public get<K extends keyof EnvSchema>(key: K): EnvSchema[K] {
    if (!this.validated) {
      this.validate();
    }

    const value = this.config[key];

    if (value === undefined && typeof window === 'undefined') {
      logger.debug(`Environment variable ${key} is not defined`);
    }

    return value as EnvSchema[K];
  }

  /**
   * Get all configuration
   */
  public getAll(): Partial<EnvSchema> {
    if (!this.validated) {
      this.validate();
    }
    return { ...this.config };
  }

  /**
   * Check if running in production
   */
  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production' || this.config.VERCEL_ENV === 'production';
  }

  /**
   * Check if running in development
   */
  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  /**
   * Get safe config for client-side
   */
  public getPublicConfig() {
    return {
      NEXT_PUBLIC_SUPABASE_URL: this.config.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: this.config.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: this.config.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      NEXT_PUBLIC_APP_URL: this.config.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_BASE_URL: this.config.NEXT_PUBLIC_BASE_URL,
      NODE_ENV: this.config.NODE_ENV,
    };
  }

  /**
   * Mask sensitive values for logging
   */
  public getSafeConfig(): Record<string, string> {
    const safeConfig: Record<string, string> = {};

    for (const [key, value] of Object.entries(this.config)) {
      if (!value) {
        safeConfig[key] = 'not_set';
      } else if (key.toLowerCase().includes('key') ||
                 key.toLowerCase().includes('secret') ||
                 key.toLowerCase().includes('password') ||
                 key.toLowerCase().includes('token')) {
        // Mask sensitive values
        safeConfig[key] = value.substring(0, 4) + '****' + value.substring(value.length - 4);
      } else {
        safeConfig[key] = value;
      }
    }

    return safeConfig;
  }
}

// Singleton instance
export const env = new EnvironmentConfig();

// Export for convenience
export const getEnv = <K extends keyof EnvSchema>(key: K): EnvSchema[K] => env.get(key);
export const isProduction = () => env.isProduction();
export const isDevelopment = () => env.isDevelopment();

// Validate on module load (server-side only)
if (typeof window === 'undefined') {
  env.validate();
}

export type { EnvSchema };