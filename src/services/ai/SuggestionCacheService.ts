/**
 * Suggestion Cache Service
 * Quick Actions 제안 캐싱 및 성능 최적화
 */

import { SmartSuggestion, CacheEntry, SuggestionGenerationContext } from '@/types/suggestions';

export class SuggestionCacheService {
  private cache = new Map<string, CacheEntry<SmartSuggestion[]>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5분
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1분
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * 캐시 키 생성
   */
  private generateCacheKey(context: Partial<SuggestionGenerationContext>): string {
    const keyParts = [
      context.userId || 'anonymous',
      context.locale || 'ko',
      context.timeOfDay || 'unknown',
      context.viewMode || 'default',
      context.selectedDate ? new Date(context.selectedDate).toDateString() : 'no-date',
      context.currentEvents?.length || 0,
      context.recentMessages?.slice(-2).map(m => m.content.substring(0, 20)).join('|') || 'no-messages'
    ];

    return keyParts.join(':');
  }

  /**
   * 캐시에서 제안 가져오기
   */
  get(context: Partial<SuggestionGenerationContext>): SmartSuggestion[] | null {
    const key = this.generateCacheKey(context);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // TTL 체크
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[SuggestionCache] Cache HIT for key: ${key.substring(0, 50)}...`);
    return entry.data;
  }

  /**
   * 캐시에 제안 저장
   */
  set(
    context: Partial<SuggestionGenerationContext>,
    suggestions: SmartSuggestion[],
    ttl?: number
  ): void {
    // 캐시 크기 제한 체크
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    const key = this.generateCacheKey(context);
    const entry: CacheEntry<SmartSuggestion[]> = {
      data: suggestions,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
      key
    };

    this.cache.set(key, entry);
    console.log(`[SuggestionCache] Cached ${suggestions.length} suggestions for key: ${key.substring(0, 50)}...`);
  }

  /**
   * 특정 사용자의 캐시 무효화
   */
  invalidateUser(userId: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (key.startsWith(userId)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`[SuggestionCache] Invalidated ${keysToDelete.length} cache entries for user: ${userId}`);
  }

  /**
   * 전체 캐시 초기화
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[SuggestionCache] Cleared ${size} cache entries`);
  }

  /**
   * 가장 오래된 캐시 항목 제거
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey !== null && typeof oldestKey === 'string') {
      this.cache.delete(oldestKey);
      console.log(`[SuggestionCache] Evicted oldest entry: ${(oldestKey as string).substring(0, 50)}...`);
    }
  }

  /**
   * 만료된 캐시 항목 정리
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`[SuggestionCache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * 정기적 정리 타이머 시작
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 정리 타이머 중지
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 캐시 통계 가져오기
   */
  getStats(): {
    size: number;
    hitRate: number;
    averageAge: number;
  } {
    const now = Date.now();
    let totalAge = 0;

    this.cache.forEach(entry => {
      totalAge += now - entry.timestamp;
    });

    return {
      size: this.cache.size,
      hitRate: 0, // This would need hit/miss tracking
      averageAge: this.cache.size > 0 ? totalAge / this.cache.size : 0
    };
  }

  /**
   * 캐시 워밍
   * 자주 사용되는 컨텍스트에 대해 미리 캐시 생성
   */
  async warmCache(
    contexts: Partial<SuggestionGenerationContext>[],
    generator: (context: Partial<SuggestionGenerationContext>) => Promise<SmartSuggestion[]>
  ): Promise<void> {
    console.log(`[SuggestionCache] Warming cache with ${contexts.length} contexts...`);

    for (const context of contexts) {
      const cached = this.get(context);
      if (!cached) {
        try {
          const suggestions = await generator(context);
          this.set(context, suggestions);
        } catch (error) {
          console.error('[SuggestionCache] Failed to warm cache for context:', error);
        }
      }
    }
  }
}

// Singleton instance
let cacheInstance: SuggestionCacheService | null = null;

export function getSuggestionCache(): SuggestionCacheService {
  if (!cacheInstance) {
    cacheInstance = new SuggestionCacheService();
  }
  return cacheInstance;
}