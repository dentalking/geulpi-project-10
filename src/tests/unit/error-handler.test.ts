/**
 * 에러 처리 유닛 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AppError,
  ErrorCode,
  withRetry,
  createErrorResponse,
  validateRequired,
  validateDateRange,
  CircuitBreaker
} from '@/lib/error-handler';

describe('Error Handler Unit Tests', () => {
  describe('AppError', () => {
    it('should create custom error with correct properties', () => {
      const error = new AppError(
        ErrorCode.VALIDATION_ERROR,
        '검증 실패',
        400,
        { field: 'email' }
      );

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('검증 실패');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('withRetry', () => {
    it('should retry on failure and succeed', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new AppError(ErrorCode.NETWORK_ERROR, 'Network error', 503);
        }
        return 'success';
      });

      const result = await withRetry(fn, {
        maxAttempts: 3,
        baseDelay: 10
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable error', async () => {
      const fn = vi.fn(async () => {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Validation error', 400);
      });

      await expect(
        withRetry(fn, { maxAttempts: 3 })
      ).rejects.toThrow('Validation error');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect max attempts', async () => {
      const fn = vi.fn(async () => {
        throw new AppError(ErrorCode.NETWORK_ERROR, 'Network error', 503);
      });

      await expect(
        withRetry(fn, { maxAttempts: 2, baseDelay: 10 })
      ).rejects.toThrow('Network error');

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const fn = vi.fn(async () => {
        throw new AppError(ErrorCode.TIMEOUT, 'Timeout', 504);
      });

      await expect(
        withRetry(fn, {
          maxAttempts: 3,
          baseDelay: 10,
          onRetry
        })
      ).rejects.toThrow();

      expect(onRetry).toHaveBeenCalledTimes(2); // 3 attempts, 2 retries
    });
  });

  describe('createErrorResponse', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError(
        ErrorCode.UNAUTHORIZED,
        '인증 필요',
        401
      );

      const response = createErrorResponse(error);
      const data = response.body ? JSON.parse(response.body.toString()) : null;

      expect(response.status).toBe(401);
      expect(data.error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(data.error.message).toBe('인증 필요');
    });

    it('should handle Google API token expiry', () => {
      const error = {
        response: {
          data: {
            error: {
              code: 401,
              message: 'Invalid Credentials'
            }
          }
        }
      };

      const response = createErrorResponse(error);
      const data = response.body ? JSON.parse(response.body.toString()) : null;

      expect(response.status).toBe(401);
      expect(data.error.code).toBe(ErrorCode.TOKEN_EXPIRED);
      expect(data.error.action).toBe('REAUTHENTICATE');
    });

    it('should handle rate limit errors', () => {
      const error = {
        response: {
          data: {
            error: {
              code: 429,
              message: 'Rate Limit Exceeded',
              retryAfter: 120
            }
          }
        }
      };

      const response = createErrorResponse(error);
      const data = response.body ? JSON.parse(response.body.toString()) : null;

      expect(response.status).toBe(429);
      expect(data.error.code).toBe(ErrorCode.RATE_LIMIT);
      expect(data.error.retryAfter).toBe(120);
    });

    it('should handle network errors', () => {
      const error = { code: 'ECONNREFUSED' };

      const response = createErrorResponse(error);
      const data = response.body ? JSON.parse(response.body.toString()) : null;

      expect(response.status).toBe(503);
      expect(data.error.code).toBe(ErrorCode.NETWORK_ERROR);
    });
  });

  describe('Validation Helpers', () => {
    describe('validateRequired', () => {
      it('should return empty array when all fields present', () => {
        const data = {
          name: 'John',
          email: 'john@example.com',
          age: 30
        };

        const missing = validateRequired(data, ['name', 'email']);
        expect(missing).toEqual([]);
      });

      it('should return missing fields', () => {
        const data = {
          name: 'John'
        };

        const missing = validateRequired(data, ['name', 'email', 'phone']);
        expect(missing).toEqual(['email', 'phone']);
      });
    });

    describe('validateDateRange', () => {
      it('should return true for valid date range', () => {
        const start = '2024-01-15T10:00:00';
        const end = '2024-01-15T11:00:00';

        expect(validateDateRange(start, end)).toBe(true);
      });

      it('should return false when end is before start', () => {
        const start = '2024-01-15T11:00:00';
        const end = '2024-01-15T10:00:00';

        expect(validateDateRange(start, end)).toBe(false);
      });

      it('should return false for invalid dates', () => {
        expect(validateDateRange('invalid', '2024-01-15')).toBe(false);
        expect(validateDateRange('2024-01-15', 'invalid')).toBe(false);
      });
    });
  });

  describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker(2, 100); // threshold: 2, timeout: 100ms
    });

    it('should execute function normally when closed', async () => {
      const fn = vi.fn(async () => 'success');
      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should open after threshold failures', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Failed');
      });

      // First failure
      await expect(breaker.execute(fn)).rejects.toThrow('Failed');
      
      // Second failure (reaches threshold)
      await expect(breaker.execute(fn)).rejects.toThrow('Failed');

      // Circuit should be open now
      await expect(breaker.execute(fn)).rejects.toThrow('서비스가 일시적으로 사용 불가능합니다');
      
      // Function should not be called when circuit is open
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should reset after timeout', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Failed');
      });

      // Open the circuit
      await expect(breaker.execute(fn)).rejects.toThrow();
      await expect(breaker.execute(fn)).rejects.toThrow();

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should enter half-open state and try again
      const successFn = vi.fn(async () => 'success');
      const result = await breaker.execute(successFn);

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledOnce();
    });
  });
});