/**
 * API 호출을 위한 커스텀 훅
 * 에러 처리, 재시도, 로딩 상태 관리
 */

import { useState, useCallback } from 'react';
import { useToastContext } from '@/providers/ToastProvider';

interface ApiCallOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  retryCount?: number;
  retryDelay?: number;
  showErrorToast?: boolean;
}

interface ApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: any | null;
}

export function useApiCall<T = any>() {
  const { toast } = useToastContext();
  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(
    async (
      apiFunction: () => Promise<Response>,
      options: ApiCallOptions = {}
    ): Promise<T | null> => {
      const {
        onSuccess,
        onError,
        retryCount = 3,
        retryDelay = 1000,
        showErrorToast = true
      } = options;

      setState(prev => ({ ...prev, loading: true, error: null }));

      let lastError: any = null;
      
      for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
          const response = await apiFunction();
          
          if (!response.ok) {
            const errorData = await response.json();
            
            // 토큰 만료 처리
            if (errorData.error?.code === 'TOKEN_EXPIRED') {
              toast.error('세션이 만료되었습니다', '다시 로그인해주세요');
              window.location.href = '/api/auth/login';
              return null;
            }

            // 재시도 가능한 에러인지 확인
            const isRetryable = [
              'NETWORK_ERROR',
              'TIMEOUT',
              'SERVICE_UNAVAILABLE'
            ].includes(errorData.error?.code);

            if (!isRetryable || attempt === retryCount) {
              throw errorData;
            }

            lastError = errorData;
            
            // 재시도 전 대기
            await new Promise(resolve => 
              setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
            );
            
            continue;
          }

          const data = await response.json();
          
          setState({
            data,
            loading: false,
            error: null
          });

          if (onSuccess) {
            onSuccess(data);
          }

          return data;
          
        } catch (error: any) {
          lastError = error;
          
          if (attempt === retryCount) {
            setState({
              data: null,
              loading: false,
              error: lastError
            });

            if (showErrorToast) {
              const errorMessage = lastError?.error?.message || 
                                 lastError?.message || 
                                 '요청 처리 중 오류가 발생했습니다.';
              
              toast.error('오류 발생', errorMessage);
            }

            if (onError) {
              onError(lastError);
            }

            return null;
          }

          // 재시도 알림
          if (attempt < retryCount) {
            console.log(`Retrying API call (${attempt}/${retryCount})...`);
          }
          
          // 재시도 전 대기
          await new Promise(resolve => 
            setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
          );
        }
      }

      return null;
    },
    [toast]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null
    });
  }, []);

  return {
    ...state,
    execute,
    reset
  };
}

// 캘린더 API 전용 훅
export function useCalendarApi() {
  const api = useApiCall();

  const createEvent = useCallback(
    async (eventData: any) => {
      return api.execute(
        () => fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData)
        }),
        {
          onSuccess: (data) => {
            console.log('Event created successfully:', data);
          },
          onError: (error) => {
            console.error('Failed to create event:', error);
          }
        }
      );
    },
    [api]
  );

  const updateEvent = useCallback(
    async (eventId: string, updates: any) => {
      return api.execute(
        () => fetch('/api/calendar/events', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, updates })
        }),
        {
          onSuccess: (data) => {
            console.log('Event updated successfully:', data);
          }
        }
      );
    },
    [api]
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      return api.execute(
        () => fetch('/api/calendar/events', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId })
        }),
        {
          onSuccess: (data) => {
            console.log('Event deleted successfully:', data);
          }
        }
      );
    },
    [api]
  );

  const getEvents = useCallback(
    async (params?: { maxResults?: number; timeMin?: string; timeMax?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.maxResults) searchParams.set('maxResults', params.maxResults.toString());
      if (params?.timeMin) searchParams.set('timeMin', params.timeMin);
      if (params?.timeMax) searchParams.set('timeMax', params.timeMax);
      
      return api.execute(
        () => fetch(`/api/calendar/events?${searchParams}`),
        {
          retryCount: 2,
          showErrorToast: false
        }
      );
    },
    [api]
  );

  return {
    ...api,
    createEvent,
    updateEvent,
    deleteEvent,
    getEvents
  };
}

// AI Chat API 전용 훅
export function useAIChatApi() {
  const api = useApiCall();
  const { toast } = useToastContext();

  const sendMessage = useCallback(
    async (message: string, sessionId: string) => {
      return api.execute(
        () => fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, sessionId })
        }),
        {
          retryCount: 2,
          onError: (error) => {
            // AI 관련 특별 에러 처리
            if (error?.error?.code === 'RATE_LIMIT') {
              toast.warning(
                'AI 요청 한도 초과',
                '잠시 후 다시 시도해주세요.'
              );
            }
          }
        }
      );
    },
    [api, toast]
  );

  return {
    ...api,
    sendMessage
  };
}