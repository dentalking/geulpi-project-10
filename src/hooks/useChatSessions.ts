import useSWR, { mutate } from 'swr';
import { ChatSession } from '@/types';
import { chatStorage } from '@/utils/chatStorage';

interface UseChatSessionsOptions {
  userId?: string;
  refreshInterval?: number;
  revalidateOnFocus?: boolean;
  suspense?: boolean;
}

interface UseChatSessionsReturn {
  sessions: ChatSession[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  mutate: () => void;
}

/**
 * SWR 기반 채팅 세션 데이터 훅
 * 자동 캐싱, 재검증, 중복 제거 기능 포함
 */
export function useChatSessions(options: UseChatSessionsOptions = {}): UseChatSessionsReturn {
  const {
    userId,
    refreshInterval = 30000, // 30초마다 자동 갱신
    revalidateOnFocus = false, // 포커스 시 재검증 비활성화
    suspense = false
  } = options;

  const fetcher = async () => {
    const sessions = await chatStorage.getAllSessions(userId);
    return sessions;
  };

  const { data, error, mutate, isLoading } = useSWR<ChatSession[]>(
    userId ? `chat-sessions-${userId}` : 'chat-sessions',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus,
      suspense,
      dedupingInterval: 10000, // 10초 내 중복 요청 방지
      errorRetryCount: 3, // 에러 시 3회 재시도
      errorRetryInterval: 5000, // 5초 간격으로 재시도
      fallbackData: [], // 초기 데이터
      keepPreviousData: true, // 새 데이터 로딩 중 이전 데이터 유지
      onError: (err) => {
        console.error('Failed to fetch chat sessions:', err);
      }
    }
  );

  return {
    sessions: data || [],
    isLoading,
    isError: !!error,
    error,
    mutate
  };
}

/**
 * 특정 채팅 세션 데이터 훅
 */
export function useChatSession(sessionId: string | null) {
  const fetcher = async () => {
    if (!sessionId) return null;
    return await chatStorage.getSession(sessionId);
  };

  const { data, error, mutate, isLoading } = useSWR<ChatSession | null>(
    sessionId ? `chat-session-${sessionId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      keepPreviousData: true
    }
  );

  return {
    session: data,
    isLoading,
    isError: !!error,
    error,
    mutate
  };
}

/**
 * 채팅 세션 생성 뮤테이션 훅
 */
export function useCreateChatSession() {
  const createSession = async (title: string, userId?: string) => {
    try {
      const newSession = await chatStorage.createSession(title, userId);
      
      // SWR 캐시 업데이트 (Optimistic Update)
      const key = userId ? `chat-sessions-${userId}` : 'chat-sessions';
      await mutate(
        key,
        async (sessions: ChatSession[] = []) => {
          if (newSession) {
            return [...sessions, newSession];
          }
          return sessions;
        },
        {
          revalidate: false // 서버 재검증 스킵 (이미 생성됨)
        }
      );
      
      return newSession;
    } catch (error) {
      console.error('Failed to create chat session:', error);
      throw error;
    }
  };

  return { createSession };
}

/**
 * 채팅 메시지 추가 뮤테이션 훅
 */
export function useAddChatMessage() {
  const addMessage = async (sessionId: string, message: any) => {
    try {
      const updatedSession = await chatStorage.addMessage(sessionId, message);
      
      // 개별 세션 캐시 업데이트
      await mutate(`chat-session-${sessionId}`, updatedSession, {
        revalidate: false
      });
      
      // 세션 목록 캐시도 업데이트
      await mutate(
        (key: string) => key.startsWith('chat-sessions'),
        undefined,
        { revalidate: true }
      );
      
      return updatedSession;
    } catch (error) {
      console.error('Failed to add message:', error);
      throw error;
    }
  };

  return { addMessage };
}

// SWR 전역 뮤테이트 함수
export { mutate } from 'swr';