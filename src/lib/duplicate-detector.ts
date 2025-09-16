import type { CalendarEvent } from '@/types';
import { getStorage } from '@/lib/storage';

interface EventSimilarity {
  isDuplicate: boolean;
  similarity: number;
  matchedEvent?: CalendarEvent;
  reason?: string;
}

/**
 * 두 이벤트의 유사도를 계산
 */
function calculateSimilarity(event1: any, event2: any): number {
  let score = 0;
  
  // 제목 유사도 (40점)
  if (event1.title && event2.summary) {
    const title1 = event1.title.toLowerCase().trim();
    const title2 = event2.summary.toLowerCase().trim();
    
    if (title1 === title2) {
      score += 40;
    } else if (title1.includes(title2) || title2.includes(title1)) {
      score += 30;
    } else {
      // 단어 기반 유사도
      const words1 = title1.split(/\s+/);
      const words2 = title2.split(/\s+/);
      const commonWords = words1.filter((w: string) => words2.includes(w));
      const similarity = commonWords.length / Math.max(words1.length, words2.length);
      score += Math.round(similarity * 20);
    }
  }
  
  // 시간 유사도 (40점)
  if (event1.date && event1.time) {
    const dateTime1 = new Date(`${event1.date}T${event1.time}`);
    const dateTime2 = new Date(event2.start?.dateTime || event2.start?.date || '');
    
    const timeDiff = Math.abs(dateTime1.getTime() - dateTime2.getTime());
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff === 0) {
      score += 40; // 정확히 같은 시간
    } else if (hoursDiff < 1) {
      score += 30; // 1시간 이내
    } else if (hoursDiff < 24) {
      score += 20; // 같은 날
    } else if (hoursDiff < 168) {
      score += 10; // 같은 주
    }
  }
  
  // 장소 유사도 (20점)
  if (event1.location && event2.location) {
    const loc1 = event1.location.toLowerCase().trim();
    const loc2 = event2.location.toLowerCase().trim();
    
    if (loc1 === loc2) {
      score += 20;
    } else if (loc1.includes(loc2) || loc2.includes(loc1)) {
      score += 10;
    }
  }
  
  return score;
}

/**
 * 새 이벤트가 기존 이벤트와 중복되는지 확인
 */
export function checkDuplicateEvent(
  newEvent: any,
  existingEvents: CalendarEvent[],
  threshold: number = 70
): EventSimilarity {
  let maxSimilarity = 0;
  let mostSimilarEvent: CalendarEvent | undefined;

  for (const existingEvent of existingEvents) {
    const similarity = calculateSimilarity(newEvent, existingEvent);

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilarEvent = existingEvent;
    }
  }

  const isDuplicate = maxSimilarity >= threshold;

  let reason = '';
  if (isDuplicate && mostSimilarEvent) {
    const reasons: string[] = [];

    // 유사도 점수에 따른 이유 설명
    if (newEvent.title?.toLowerCase() === mostSimilarEvent.summary?.toLowerCase()) {
      reasons.push('같은 제목');
    }

    if (newEvent.date && newEvent.time) {
      const dateTime1 = new Date(`${newEvent.date}T${newEvent.time}`);
      const dateTime2 = new Date(mostSimilarEvent.start?.dateTime || mostSimilarEvent.start?.date || '');
      const hoursDiff = Math.abs(dateTime1.getTime() - dateTime2.getTime()) / (1000 * 60 * 60);

      if (hoursDiff === 0) {
        reasons.push('같은 시간');
      } else if (hoursDiff < 1) {
        reasons.push('비슷한 시간 (1시간 이내)');
      }
    }

    if (newEvent.location === mostSimilarEvent.location) {
      reasons.push('같은 장소');
    }

    reason = reasons.join(', ');
  }

  return {
    isDuplicate,
    similarity: maxSimilarity,
    matchedEvent: mostSimilarEvent,
    reason
  };
}

/**
 * 캐시된 최근 이벤트까지 포함해서 중복 확인 (async)
 */
export async function checkDuplicateEventWithCache(
  newEvent: any,
  existingEvents: CalendarEvent[],
  sessionId: string,
  threshold: number = 70
): Promise<EventSimilarity> {
  // 기존 이벤트와 중복 확인
  let result = checkDuplicateEvent(newEvent, existingEvents, threshold);

  // 이미 중복이 발견되었으면 즉시 반환
  if (result.isDuplicate) {
    return result;
  }

  try {
    // 최근 캐시된 이벤트들과도 중복 확인
    const recentEvents = await recentEventCache.getRecentEvents(sessionId);
    if (recentEvents.length > 0) {
      const recentResult = checkDuplicateEvent(newEvent, recentEvents, threshold);

      // 최근 이벤트와의 유사도가 더 높으면 그것을 반환
      if (recentResult.similarity > result.similarity) {
        return recentResult;
      }
    }
  } catch (error) {
    console.warn('Failed to check recent events cache:', error);
    // 캐시 오류는 무시하고 기존 결과 반환
  }

  return result;
}

/**
 * 최근 생성된 이벤트 추적을 위한 Redis 기반 캐시
 */
class RecentEventCache {
  private fallbackCache: Map<string, { event: any; createdAt: Date }[]> = new Map();
  private readonly TTL = 10 * 60; // 10분 (초 단위)
  private storage = getStorage();

  async addEvent(sessionId: string, event: any) {
    try {
      // Redis에 저장 시도
      const cacheKey = `recent_events:${sessionId}`;
      const existingEvents = await this.storage.getCache(cacheKey) || [];
      const newEventRecord = { event, createdAt: new Date().toISOString() };

      existingEvents.push(newEventRecord);

      // 최대 20개 이벤트만 유지
      if (existingEvents.length > 20) {
        existingEvents.splice(0, existingEvents.length - 20);
      }

      await this.storage.setCache(cacheKey, existingEvents, this.TTL);
    } catch (error) {
      console.warn('Redis cache add failed, using fallback:', error);
      // 폴백: 인메모리 캐시 사용
      const events = this.fallbackCache.get(sessionId) || [];
      events.push({ event, createdAt: new Date() });
      this.fallbackCache.set(sessionId, events);
      this.cleanupFallback(sessionId);
    }
  }

  async getRecentEvents(sessionId: string): Promise<any[]> {
    try {
      // Redis에서 조회 시도
      const cacheKey = `recent_events:${sessionId}`;
      const events = await this.storage.getCache(cacheKey) || [];

      // 만료된 이벤트 필터링
      const now = new Date();
      const validEvents = events.filter((e: any) => {
        const createdAt = new Date(e.createdAt);
        return now.getTime() - createdAt.getTime() < (this.TTL * 1000);
      });

      return validEvents.map((e: any) => e.event);
    } catch (error) {
      console.warn('Redis cache get failed, using fallback:', error);
      // 폴백: 인메모리 캐시 사용
      this.cleanupFallback(sessionId);
      const events = this.fallbackCache.get(sessionId) || [];
      return events.map(e => e.event);
    }
  }

  async clearSession(sessionId: string) {
    try {
      const cacheKey = `recent_events:${sessionId}`;
      await this.storage.deleteCache(cacheKey);
    } catch (error) {
      console.warn('Redis cache clear failed, using fallback:', error);
      this.fallbackCache.delete(sessionId);
    }
  }

  // 폴백 인메모리 캐시 정리
  private cleanupFallback(sessionId: string) {
    const events = this.fallbackCache.get(sessionId) || [];
    const now = new Date();
    const validEvents = events.filter(e =>
      now.getTime() - e.createdAt.getTime() < (this.TTL * 1000)
    );

    if (validEvents.length > 0) {
      this.fallbackCache.set(sessionId, validEvents);
    } else {
      this.fallbackCache.delete(sessionId);
    }
  }
}

export const recentEventCache = new RecentEventCache();

/**
 * 중복 확인 메시지 생성
 */
export function getDuplicateWarningMessage(
  similarity: EventSimilarity,
  locale: string = 'ko'
): string {
  if (!similarity.isDuplicate || !similarity.matchedEvent) {
    return '';
  }
  
  const event = similarity.matchedEvent;
  const messages = {
    ko: `⚠️ 비슷한 일정이 이미 있습니다.\n"${event.summary}" (${similarity.reason})\n유사도: ${similarity.similarity}%\n\n그래도 추가하시겠습니까?`,
    en: `⚠️ Similar event already exists.\n"${event.summary}" (${similarity.reason})\nSimilarity: ${similarity.similarity}%\n\nDo you still want to add it?`
  };
  
  return messages[locale as keyof typeof messages] || messages.ko;
}