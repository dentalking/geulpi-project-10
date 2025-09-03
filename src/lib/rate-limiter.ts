// lib/rate-limiter.ts

import { RateLimitError } from './api-errors';

interface RateLimitOptions {
    maxRequests: number;
    windowMs: number;
    identifier?: string;
}

// 메모리 기반 Rate Limiter (개발용)
class MemoryRateLimiter {
    private requests: Map<string, number[]> = new Map();

    async checkLimit(key: string, options: RateLimitOptions): Promise<void> {
        const now = Date.now();
        const windowStart = now - options.windowMs;

        // 현재 키의 요청 기록 가져오기
        let timestamps = this.requests.get(key) || [];

        // 윈도우 내의 요청만 필터링
        timestamps = timestamps.filter(ts => ts > windowStart);

        // 한도 초과 확인
        if (timestamps.length >= options.maxRequests) {
            const resetTime = Math.min(...timestamps) + options.windowMs;
            const waitTime = Math.ceil((resetTime - now) / 1000);

            throw new RateLimitError(
                `요청 한도를 초과했습니다. ${waitTime}초 후에 다시 시도해주세요.`
            );
        }

        // 새 요청 추가
        timestamps.push(now);
        this.requests.set(key, timestamps);
    }

    // 정리 작업 (메모리 누수 방지)
    cleanup(): void {
        const now = Date.now();
        const maxWindowMs = 60 * 60 * 1000; // 1시간

        for (const [key, timestamps] of this.requests.entries()) {
            const filtered = timestamps.filter(ts => ts > now - maxWindowMs);

            if (filtered.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, filtered);
            }
        }
    }
}

// API 액션별 Rate Limit 설정
const RATE_LIMITS: Record<string, RateLimitOptions> = {
    // 일반 읽기 작업
    'calendar.list': {
        maxRequests: 100,
        windowMs: 60 * 1000 // 1분당 100회
    },
    'calendar.search': {
        maxRequests: 50,
        windowMs: 60 * 1000 // 1분당 50회
    },

    // 쓰기 작업
    'calendar.create': {
        maxRequests: 30,
        windowMs: 60 * 1000 // 1분당 30회
    },
    'calendar.update': {
        maxRequests: 30,
        windowMs: 60 * 1000 // 1분당 30회
    },
    'calendar.delete': {
        maxRequests: 20,
        windowMs: 60 * 1000 // 1분당 20회
    },

    // 대량 작업
    'calendar.batchDelete': {
        maxRequests: 5,
        windowMs: 60 * 1000 // 1분당 5회
    },
    'calendar.cleanup': {
        maxRequests: 2,
        windowMs: 60 * 1000 // 1분당 2회
    },

    // AI 작업
    'assistant.chat': {
        maxRequests: 20,
        windowMs: 60 * 1000 // 1분당 20회
    },
    'briefing.generate': {
        maxRequests: 10,
        windowMs: 60 * 1000 // 1분당 10회
    }
};

// Rate Limiter 인스턴스
const rateLimiter = new MemoryRateLimiter();

// 정리 작업 주기적 실행
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        rateLimiter.cleanup();
    }, 5 * 60 * 1000); // 5분마다 정리
}

/**
 * Rate Limiting 체크
 * @param action API 액션 이름
 * @param userId 사용자 식별자
 */
export async function checkRateLimit(
    action: string,
    userId: string
): Promise<void> {
    const limits = RATE_LIMITS[action];

    if (!limits) {
        // 설정되지 않은 액션은 제한 없음
        return;
    }

    const key = `${action}:${userId}`;
    await rateLimiter.checkLimit(key, limits);
}

/**
 * 배치 작업용 Rate Limiter
 * 동시 실행 제한과 지연 처리
 */
export class BatchRateLimiter {
    private concurrentLimit: number;
    private delayMs: number;
    private running: number = 0;
    private queue: Array<() => Promise<any>> = [];

    constructor(concurrentLimit: number = 5, delayMs: number = 100) {
        this.concurrentLimit = concurrentLimit;
        this.delayMs = delayMs;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        // 동시 실행 제한 확인
        while (this.running >= this.concurrentLimit) {
            await this.sleep(50);
        }

        this.running++;

        try {
            const result = await fn();

            // 지연 적용
            if (this.delayMs > 0) {
                await this.sleep(this.delayMs);
            }

            return result;
        } finally {
            this.running--;
        }
    }

    async executeAll<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
        const results: T[] = [];

        for (const task of tasks) {
            const result = await this.execute(task);
            results.push(result);
        }

        return results;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Google Calendar API용 특화 Rate Limiter
 * Google API의 할당량 정책 준수
 */
export class GoogleCalendarRateLimiter {
    private static readonly QUOTA_LIMITS = {
        queriesPerSecond: 10,
        queriesPerMinute: 300,
        queriesPerDay: 1000000
    };

    private batchLimiter = new BatchRateLimiter(5, 100); // 동시 5개, 100ms 지연

    async executeCalendarOperation<T>(
        operation: () => Promise<T>
    ): Promise<T> {
        return this.batchLimiter.execute(operation);
    }

    async executeBatchDelete(
        calendar: any,
        events: Array<{ id: string }>
    ): Promise<Array<{ success: boolean; eventId: string; error?: any }>> {
        const results: Array<{ success: boolean; eventId: string; error?: any }> = [];

        // 10개씩 배치 처리
        const batchSize = 10;
        for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);

            const batchResults = await Promise.allSettled(
                batch.map(event =>
                    this.executeCalendarOperation(() =>
                        calendar.events.delete({
                            calendarId: 'primary',
                            eventId: event.id,
                        })
                    )
                )
            );

            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push({
                        success: true,
                        eventId: batch[index].id
                    });
                } else {
                    results.push({
                        success: false,
                        eventId: batch[index].id,
                        error: result.reason
                    });
                }
            });

            // 배치 간 추가 지연
            if (i + batchSize < events.length) {
                await this.sleep(500); // 500ms 대기
            }
        }

        return results;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export 인스턴스
export const googleCalendarRateLimiter = new GoogleCalendarRateLimiter();