import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 값의 변경을 지연시키는 디바운스 훅
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 함수 호출을 디바운싱하는 훅
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * 입력 필드의 검증을 디바운싱하는 훅
 */
export function useDebouncedValidation(
  value: string,
  validator: (value: string) => string | null,
  delay: number = 300
) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const debouncedValue = useDebounce(value, delay);

  useEffect(() => {
    if (debouncedValue) {
      setIsValidating(true);
      const validationError = validator(debouncedValue);
      setError(validationError);
      setIsValidating(false);
    } else {
      setError(null);
    }
  }, [debouncedValue, validator]);

  return { error, isValidating };
}