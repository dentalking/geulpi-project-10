interface RateLimitConfig {
  minInterval: number; // Minimum milliseconds between calls
  maxRetries: number; // Maximum number of retries
  backoffMultiplier: number; // Exponential backoff multiplier
}

interface EndpointState {
  lastCallTime: number;
  retryAfter: number;
  retryCount: number;
  isRateLimited: boolean;
}

class ApiRateLimitManager {
  private endpoints: Map<string, EndpointState> = new Map();
  private defaultConfig: RateLimitConfig = {
    minInterval: 1000, // 1 second default
    maxRetries: 3,
    backoffMultiplier: 2
  };

  private configs: Map<string, RateLimitConfig> = new Map([
    ['/api/ai/chat', { minInterval: 2000, maxRetries: 3, backoffMultiplier: 2 }],
    ['/api/ai/suggestions', { minInterval: 5000, maxRetries: 2, backoffMultiplier: 3 }],
    ['/api/calendar/events', { minInterval: 500, maxRetries: 3, backoffMultiplier: 2 }]
  ]);

  /**
   * Check if an API call can be made
   */
  canMakeRequest(endpoint: string): { allowed: boolean; waitTime?: number; message?: string } {
    const now = Date.now();
    const state = this.endpoints.get(endpoint);
    const config = this.configs.get(endpoint) || this.defaultConfig;

    if (!state) {
      // First call to this endpoint
      return { allowed: true };
    }

    // Check if rate limited
    if (state.isRateLimited && state.retryAfter > now) {
      const waitTime = Math.ceil((state.retryAfter - now) / 1000);
      return {
        allowed: false,
        waitTime,
        message: `Rate limited. Please wait ${waitTime} seconds.`
      };
    }

    // Check minimum interval
    const timeSinceLastCall = now - state.lastCallTime;
    if (timeSinceLastCall < config.minInterval) {
      const waitTime = Math.ceil((config.minInterval - timeSinceLastCall) / 1000);
      return {
        allowed: false,
        waitTime,
        message: `Too many requests. Please wait ${waitTime} seconds.`
      };
    }

    return { allowed: true };
  }

  /**
   * Record a successful API call
   */
  recordSuccess(endpoint: string): void {
    const now = Date.now();
    const state = this.endpoints.get(endpoint) || {
      lastCallTime: 0,
      retryAfter: 0,
      retryCount: 0,
      isRateLimited: false
    };

    this.endpoints.set(endpoint, {
      lastCallTime: now,
      retryAfter: 0,
      retryCount: 0,
      isRateLimited: false
    });
  }

  /**
   * Record a rate limit error (429)
   */
  recordRateLimit(endpoint: string, retryAfterSeconds?: number): number {
    const now = Date.now();
    const config = this.configs.get(endpoint) || this.defaultConfig;
    const state = this.endpoints.get(endpoint) || {
      lastCallTime: now,
      retryAfter: 0,
      retryCount: 0,
      isRateLimited: false
    };

    // Calculate retry delay with exponential backoff
    const retryDelay = retryAfterSeconds
      ? retryAfterSeconds * 1000
      : Math.min(
          Math.pow(config.backoffMultiplier, state.retryCount) * 1000,
          60000 // Max 60 seconds
        );

    const newState: EndpointState = {
      lastCallTime: now,
      retryAfter: now + retryDelay,
      retryCount: Math.min(state.retryCount + 1, config.maxRetries),
      isRateLimited: true
    };

    this.endpoints.set(endpoint, newState);
    return retryDelay / 1000; // Return delay in seconds
  }

  /**
   * Reset rate limit state for an endpoint
   */
  reset(endpoint: string): void {
    this.endpoints.delete(endpoint);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.endpoints.clear();
  }

  /**
   * Get current state for debugging
   */
  getState(endpoint?: string): any {
    if (endpoint) {
      return this.endpoints.get(endpoint);
    }
    return Object.fromEntries(this.endpoints);
  }

  /**
   * Wrapper for fetch with automatic rate limit handling
   */
  async fetchWithRateLimit(
    url: string,
    options: RequestInit,
    locale: 'ko' | 'en' = 'ko'
  ): Promise<Response> {
    const endpoint = new URL(url, window.location.origin).pathname;

    // Check if we can make the request
    const check = this.canMakeRequest(endpoint);
    if (!check.allowed) {
      throw new Error(check.message || 'Rate limited');
    }

    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retrySeconds = retryAfter ? parseInt(retryAfter) : undefined;
        const waitTime = this.recordRateLimit(endpoint, retrySeconds);

        const message = locale === 'ko'
          ? `API 요청 한도 초과. ${waitTime}초 후에 다시 시도해주세요.`
          : `API rate limit exceeded. Please try again in ${waitTime} seconds.`;

        throw new Error(message);
      }

      // Record successful call
      this.recordSuccess(endpoint);
      return response;
    } catch (error) {
      // Re-throw the error
      throw error;
    }
  }
}

// Export singleton instance
export const apiRateLimitManager = new ApiRateLimitManager();

// Export type for use in components
export type { RateLimitConfig, EndpointState };