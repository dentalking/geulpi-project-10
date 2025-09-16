/**
 * 동시성 제어 관리자 - 경쟁 상태 방지를 위한 뮤텍스 및 세마포어
 */

import { getStorage } from '@/lib/storage';

interface LockOptions {
  timeout?: number; // 기본 30초
  retryInterval?: number; // 기본 100ms
}

/**
 * 분산 뮤텍스 구현 (Redis 기반)
 */
export class DistributedMutex {
  private storage = getStorage();
  private defaultTimeout = 30000; // 30초
  private defaultRetryInterval = 100; // 100ms

  /**
   * 락 획득 시도
   */
  async acquireLock(
    key: string,
    value: string = `lock_${Date.now()}_${Math.random()}`,
    options: LockOptions = {}
  ): Promise<string | null> {
    const timeout = options.timeout || this.defaultTimeout;
    const retryInterval = options.retryInterval || this.defaultRetryInterval;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // Redis SET NX 구현 (존재하지 않으면 설정)
        const existing = await this.storage.getCache(`mutex:${key}`);

        if (!existing) {
          // 락 설정 (TTL로 자동 해제)
          await this.storage.setCache(`mutex:${key}`, value, Math.ceil(timeout / 1000));

          // 다시 확인해서 실제로 우리가 락을 획득했는지 검증
          const verification = await this.storage.getCache(`mutex:${key}`);
          if (verification === value) {
            return value;
          }
        }

        // 잠시 대기 후 재시도
        await this.sleep(retryInterval);
      } catch (error) {
        console.warn('Mutex acquire error:', error);
        // 오류 시 잠시 대기
        await this.sleep(retryInterval);
      }
    }

    return null; // 타임아웃
  }

  /**
   * 락 해제
   */
  async releaseLock(key: string, value: string): Promise<boolean> {
    try {
      const currentValue = await this.storage.getCache(`mutex:${key}`);

      // 자신이 설정한 락인지 확인
      if (currentValue === value) {
        await this.storage.deleteCache(`mutex:${key}`);
        return true;
      }

      return false; // 다른 프로세스의 락
    } catch (error) {
      console.warn('Mutex release error:', error);
      return false;
    }
  }

  /**
   * 락과 함께 작업 실행
   */
  async withLock<T>(
    key: string,
    operation: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const lockValue = `lock_${Date.now()}_${Math.random()}`;
    const acquired = await this.acquireLock(key, lockValue, options);

    if (!acquired) {
      throw new Error(`Failed to acquire lock for key: ${key}`);
    }

    try {
      return await operation();
    } finally {
      await this.releaseLock(key, lockValue);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 세마포어 구현 (동시 실행 제한)
 */
export class Semaphore {
  private permits: number;
  private available: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
    this.available = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.available > 0) {
        this.available--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      next?.();
    } else {
      this.available = Math.min(this.permits, this.available + 1);
    }
  }

  async withPermit<T>(operation: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await operation();
    } finally {
      this.release();
    }
  }
}

/**
 * 동시성 제어 매니저
 */
export class ConcurrencyManager {
  private mutex = new DistributedMutex();
  private semaphores = new Map<string, Semaphore>();

  /**
   * 중요한 작업에 대한 뮤텍스
   */
  async withEventMutex<T>(
    userId: string,
    eventId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const key = `event_${userId}_${eventId}`;
    return this.mutex.withLock(key, operation, { timeout: 10000 });
  }

  /**
   * 사용자별 캘린더 동기화 뮤텍스
   */
  async withCalendarSyncMutex<T>(
    userId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const key = `calendar_sync_${userId}`;
    return this.mutex.withLock(key, operation, { timeout: 60000 }); // 1분
  }

  /**
   * 친구 요청 뮤텍스
   */
  async withFriendRequestMutex<T>(
    userId: string,
    friendId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const key = `friend_request_${userId < friendId ? userId : friendId}_${userId < friendId ? friendId : userId}`;
    return this.mutex.withLock(key, operation, { timeout: 5000 });
  }

  /**
   * AI 요청 세마포어 (동시 요청 제한)
   */
  async withAISemaphore<T>(operation: () => Promise<T>): Promise<T> {
    const semaphore = this.getSemaphore('ai_requests', 3); // 동시 3개
    return semaphore.withPermit(operation);
  }

  /**
   * Google API 요청 세마포어
   */
  async withGoogleAPISemaphore<T>(operation: () => Promise<T>): Promise<T> {
    const semaphore = this.getSemaphore('google_api', 5); // 동시 5개
    return semaphore.withPermit(operation);
  }

  /**
   * 배치 작업 세마포어
   */
  async withBatchSemaphore<T>(operation: () => Promise<T>): Promise<T> {
    const semaphore = this.getSemaphore('batch_operations', 2); // 동시 2개
    return semaphore.withPermit(operation);
  }

  /**
   * 세마포어 가져오기 (캐싱)
   */
  private getSemaphore(key: string, permits: number): Semaphore {
    if (!this.semaphores.has(key)) {
      this.semaphores.set(key, new Semaphore(permits));
    }
    return this.semaphores.get(key)!;
  }

  /**
   * 중복 요청 방지를 위한 디바운스
   */
  private debounceCache = new Map<string, Promise<any>>();

  async withDebounce<T>(
    key: string,
    operation: () => Promise<T>,
    ttlMs: number = 1000
  ): Promise<T> {
    // 이미 실행 중인 동일한 작업이 있으면 그 결과를 반환
    if (this.debounceCache.has(key)) {
      return this.debounceCache.get(key);
    }

    // 새 작업 시작
    const promise = operation().finally(() => {
      // TTL 후 캐시에서 제거
      setTimeout(() => {
        this.debounceCache.delete(key);
      }, ttlMs);
    });

    this.debounceCache.set(key, promise);
    return promise;
  }
}

// 싱글톤 인스턴스
export const concurrencyManager = new ConcurrencyManager();

/**
 * 편의 함수들
 */

// 이벤트 생성/수정 시 경쟁 상태 방지
export async function withEventLock<T>(
  userId: string,
  eventId: string,
  operation: () => Promise<T>
): Promise<T> {
  return concurrencyManager.withEventMutex(userId, eventId, operation);
}

// 캘린더 동기화 시 중복 실행 방지
export async function withCalendarSync<T>(
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  return concurrencyManager.withCalendarSyncMutex(userId, operation);
}

// 친구 요청 시 중복 방지
export async function withFriendRequest<T>(
  userId: string,
  friendId: string,
  operation: () => Promise<T>
): Promise<T> {
  return concurrencyManager.withFriendRequestMutex(userId, friendId, operation);
}

// AI 요청 제한
export async function withAILimit<T>(operation: () => Promise<T>): Promise<T> {
  return concurrencyManager.withAISemaphore(operation);
}

// Google API 요청 제한
export async function withGoogleAPILimit<T>(operation: () => Promise<T>): Promise<T> {
  return concurrencyManager.withGoogleAPISemaphore(operation);
}

// 중복 요청 방지 디바운스
export async function withDebounce<T>(
  key: string,
  operation: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  return concurrencyManager.withDebounce(key, operation, ttlMs);
}