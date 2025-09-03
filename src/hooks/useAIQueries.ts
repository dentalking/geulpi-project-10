import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import type { 
  AIMessage, 
  SmartSuggestion, 
  PatternInsight, 
  ConversationHistory 
} from '@/types';

// AI API 함수들
const aiAPI = {
  fetchSuggestions: async (userId: string): Promise<SmartSuggestion[]> => {
    const response = await fetch(`/api/ai/suggestions?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch AI suggestions');
    return response.json();
  },
  
  fetchInsights: async (userId: string): Promise<PatternInsight[]> => {
    const response = await fetch(`/api/ai/insights?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch AI insights');
    return response.json();
  },
  
  fetchPredictions: async (userId: string): Promise<string[]> => {
    const response = await fetch(`/api/ai/predictions?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch AI predictions');
    return response.json();
  },
  
  fetchConversation: async (sessionId: string): Promise<ConversationHistory> => {
    const response = await fetch(`/api/ai/conversation/${sessionId}`);
    if (!response.ok) throw new Error('Failed to fetch conversation');
    return response.json();
  },
  
  sendMessage: async (message: {
    sessionId: string;
    content: string;
    type: 'text' | 'voice';
  }): Promise<AIMessage> => {
    const response = await fetch('/api/ai/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },
  
  processNaturalLanguage: async (input: {
    text: string;
    context?: any;
  }): Promise<{
    intent: string;
    entities: any[];
    action: any;
  }> => {
    const response = await fetch('/api/ai/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error('Failed to process natural language');
    return response.json();
  },
  
  generateSchedulingSuggestion: async (params: {
    userId: string;
    eventType: string;
    duration: number;
    constraints?: any;
  }): Promise<SmartSuggestion[]> => {
    const response = await fetch('/api/ai/scheduling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Failed to generate scheduling suggestion');
    return response.json();
  },
};

// AI 제안 조회
export function useAISuggestions(userId: string) {
  return useQuery({
    queryKey: queryKeys.ai.suggestions(userId),
    queryFn: () => aiAPI.fetchSuggestions(userId),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3분
  });
}

// AI 인사이트 조회
export function useAIInsights(userId: string) {
  return useQuery({
    queryKey: queryKeys.ai.insights(userId),
    queryFn: () => aiAPI.fetchInsights(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5분
  });
}

// AI 예측 조회
export function useAIPredictions(userId: string) {
  return useQuery({
    queryKey: queryKeys.ai.predictions(userId),
    queryFn: () => aiAPI.fetchPredictions(userId),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10분
  });
}

// 대화 히스토리 조회
export function useConversation(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.ai.conversation(sessionId),
    queryFn: () => aiAPI.fetchConversation(sessionId),
    enabled: !!sessionId,
  });
}

// AI 메시지 전송
export function useSendAIMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: aiAPI.sendMessage,
    onSuccess: (newMessage, variables) => {
      // 대화 캐시 업데이트
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.ai.conversation(variables.sessionId) 
      });
    },
  });
}

// 자연어 처리
export function useProcessNaturalLanguage() {
  return useMutation({
    mutationFn: aiAPI.processNaturalLanguage,
    onSuccess: (result) => {
      console.log('NLP Result:', result);
    },
  });
}

// 스케줄링 제안 생성
export function useGenerateSchedulingSuggestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: aiAPI.generateSchedulingSuggestion,
    onSuccess: (suggestions, variables) => {
      // 제안 캐시 업데이트
      queryClient.setQueryData<SmartSuggestion[]>(
        queryKeys.ai.suggestions(variables.userId),
        (old) => [...(old || []), ...suggestions]
      );
    },
  });
}

// 스트리밍 AI 응답을 위한 훅
export function useAIStreamResponse(
  sessionId: string,
  onChunk?: (chunk: string) => void
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (prompt: string) => {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, prompt }),
      });
      
      if (!response.ok) throw new Error('Failed to get AI stream');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          result += chunk;
          onChunk?.(chunk);
        }
      }
      
      return result;
    },
    onSuccess: (result) => {
      // 대화 캐시 업데이트
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.ai.conversation(sessionId) 
      });
    },
  });
}