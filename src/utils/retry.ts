/**
 * Retry utility for API calls with exponential backoff
 */

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors or 5xx server errors
    if (!error.response) return true; // Network error
    const status = error.response?.status || error.status;
    return status >= 500 && status < 600;
  },
  onRetry: () => {}
};

export async function retry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts || !opts.shouldRetry(error)) {
        throw error;
      }

      opts.onRetry(attempt, error);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  throw lastError;
}

/**
 * Wrapper for fetch with retry logic
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retry(
    async () => {
      const response = await fetch(url, init);
      
      // Throw error for non-2xx responses to trigger retry
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).response = response;
        (error as any).status = response.status;
        throw error;
      }
      
      return response;
    },
    {
      ...options,
      shouldRetry: (error: any) => {
        // Don't retry on client errors (4xx)
        const status = error.status || error.response?.status;
        if (status >= 400 && status < 500) {
          return false;
        }
        // Use default retry logic for other errors
        return DEFAULT_OPTIONS.shouldRetry(error);
      }
    }
  );
}

/**
 * Batch retry for multiple operations
 */
export async function batchRetry<T>(
  operations: Array<() => Promise<T>>,
  options?: RetryOptions & { concurrency?: number }
): Promise<Array<{ success: boolean; result?: T; error?: any }>> {
  const concurrency = options?.concurrency || 5;
  const results: Array<{ success: boolean; result?: T; error?: any }> = [];
  
  // Process in batches
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(op => retry(op, options))
    );
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push({ success: true, result: result.value });
      } else {
        results.push({ success: false, error: result.reason });
      }
    });
  }
  
  return results;
}