import { useState, useCallback, useRef } from 'react';

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  onRetry?: (attemptNumber: number) => void;
  onSuccess?: (data: any) => void;
  onFail?: (error: Error) => void;
}

interface RetryState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRetrying: boolean;
  attemptCount: number;
}

export function useRetry<T = any>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    onRetry,
    onSuccess,
    onFail
  } = options;

  const [state, setState] = useState<RetryState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isRetrying: false,
    attemptCount: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateDelay = useCallback((attempt: number) => {
    if (backoff === 'exponential') {
      return delay * Math.pow(2, attempt - 1);
    }
    return delay;
  }, [delay, backoff]);

  const execute = useCallback(async () => {
    // Cancel any pending retry
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    let currentAttempt = 0;

    const attemptRequest = async (): Promise<T> => {
      currentAttempt++;

      try {
        setState(prev => ({
          ...prev,
          attemptCount: currentAttempt,
          isRetrying: currentAttempt > 1
        }));

        if (currentAttempt > 1 && onRetry) {
          onRetry(currentAttempt);
        }

        const result = await fn();

        setState({
          data: result,
          error: null,
          isLoading: false,
          isRetrying: false,
          attemptCount: currentAttempt
        });

        if (onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (error) {
        // 중단된 요청은 무시
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }

        if (currentAttempt < maxAttempts) {
          const retryDelay = calculateDelay(currentAttempt);
          
          return new Promise<T>((resolve, reject) => {
            timeoutRef.current = setTimeout(async () => {
              try {
                const result = await attemptRequest();
                resolve(result);
              } catch (err) {
                reject(err);
              }
            }, retryDelay);
          });
        } else {
          const finalError = error instanceof Error ? error : new Error('Unknown error');
          
          setState({
            data: null,
            error: finalError,
            isLoading: false,
            isRetrying: false,
            attemptCount: currentAttempt
          });

          if (onFail) {
            onFail(finalError);
          }

          throw finalError;
        }
      }
    };

    try {
      return await attemptRequest();
    } catch (error) {
      // 에러는 이미 처리됨
      return null as any;
    }
  }, [fn, maxAttempts, calculateDelay, onRetry, onSuccess, onFail]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState({
      data: null,
      error: null,
      isLoading: false,
      isRetrying: false,
      attemptCount: 0
    });
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      isRetrying: false
    }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    cancel
  };
}

// Fetch with retry wrapper
export async function fetchWithRetry(
  url: string,
  options: RequestInit & { retryOptions?: RetryOptions } = {}
) {
  const { retryOptions = {}, ...fetchOptions } = options;
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential'
  } = retryOptions;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        // 4xx 에러는 재시도하지 않음
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        // 5xx 에러는 재시도
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // 4xx 에러는 즉시 실패
      if (lastError.message.includes('HTTP 4')) {
        throw lastError;
      }

      // 마지막 시도가 아니면 재시도
      if (attempt < maxAttempts) {
        const retryDelay = backoff === 'exponential' 
          ? delay * Math.pow(2, attempt - 1)
          : delay;
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError || new Error('Failed after maximum retry attempts');
}

// React Query retry configuration
export const queryRetryConfig = {
  retry: (failureCount: number, error: any) => {
    // 4xx 에러는 재시도하지 않음
    if (error?.response?.status >= 400 && error?.response?.status < 500) {
      return false;
    }
    // 최대 3번까지 재시도
    return failureCount < 3;
  },
  retryDelay: (attemptIndex: number) => {
    // 지수 백오프: 1s, 2s, 4s
    return Math.min(1000 * 2 ** attemptIndex, 30000);
  }
};