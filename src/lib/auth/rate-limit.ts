// Simple rate limiting for 2FA operations
import { checkRateLimit as baseCheckRateLimit } from '@/lib/rate-limiter';

interface RateLimitResult {
  success: boolean;
  resetTime?: number;
}

// Simple rate limiting wrapper for 2FA operations
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    // Use existing rate limiter but create a custom implementation for 2FA
    await checkRateLimit2FA(key, maxRequests, windowMs);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      resetTime: Date.now() + windowMs
    };
  }
}

// Custom 2FA rate limiter using the same pattern as the main rate limiter
const memoryStore = new Map<string, number[]>();

async function checkRateLimit2FA(
  key: string, 
  maxRequests: number, 
  windowMs: number
): Promise<void> {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get current requests for this key
  let timestamps = memoryStore.get(key) || [];

  // Filter to only include requests within the window
  timestamps = timestamps.filter(ts => ts > windowStart);

  // Check if limit is exceeded
  if (timestamps.length >= maxRequests) {
    const resetTime = Math.min(...timestamps) + windowMs;
    const waitTime = Math.ceil((resetTime - now) / 1000);

    throw new Error(
      `Too many requests. Please try again in ${waitTime} seconds.`
    );
  }

  // Add new request
  timestamps.push(now);
  memoryStore.set(key, timestamps);

  // Cleanup old entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    cleanup();
  }
}

function cleanup(): void {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  for (const [key, timestamps] of memoryStore.entries()) {
    const filtered = timestamps.filter(ts => ts > now - maxAge);
    
    if (filtered.length === 0) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, filtered);
    }
  }
}