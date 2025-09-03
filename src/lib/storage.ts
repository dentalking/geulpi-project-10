// lib/storage.ts

import { DeletionRecord } from '@/types';

// 메모리 스토리지 (개발 환경용)
class MemoryStorage {
    private storage = new Map<string, any>();

    async set(key: string, value: any, ttl?: number): Promise<void> {
        this.storage.set(key, {
            value,
            expiresAt: ttl ? Date.now() + (ttl * 1000) : null
        });

        // TTL 설정된 경우 자동 삭제
        if (ttl) {
            setTimeout(() => {
                this.delete(key);
            }, ttl * 1000);
        }
    }

    async get(key: string): Promise<any | null> {
        const item = this.storage.get(key);

        if (!item) return null;

        // 만료 확인
        if (item.expiresAt && Date.now() > item.expiresAt) {
            this.storage.delete(key);
            return null;
        }

        return item.value;
    }

    async delete(key: string): Promise<void> {
        this.storage.delete(key);
    }

    async exists(key: string): Promise<boolean> {
        const item = this.storage.get(key);

        if (!item) return false;

        // 만료 확인
        if (item.expiresAt && Date.now() > item.expiresAt) {
            this.storage.delete(key);
            return false;
        }

        return true;
    }
}

// Redis 스토리지 (프로덕션용 - Upstash Redis 사용)
class RedisStorage {
    private redis: any;

    constructor() {
        // Upstash Redis를 사용하는 경우
        if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
            // dynamic import를 사용하여 선택적 로드
            import('@upstash/redis').then(({ Redis }) => {
                this.redis = new Redis({
                    url: process.env.UPSTASH_REDIS_URL!,
                    token: process.env.UPSTASH_REDIS_TOKEN!
                });
            });
        }
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        if (!this.redis) {
            throw new Error('Redis not initialized');
        }

        const serialized = JSON.stringify(value);

        if (ttl) {
            await this.redis.setex(key, ttl, serialized);
        } else {
            await this.redis.set(key, serialized);
        }
    }

    async get(key: string): Promise<any | null> {
        if (!this.redis) {
            throw new Error('Redis not initialized');
        }

        const value = await this.redis.get(key);

        if (!value) return null;

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    async delete(key: string): Promise<void> {
        if (!this.redis) {
            throw new Error('Redis not initialized');
        }

        await this.redis.del(key);
    }

    async exists(key: string): Promise<boolean> {
        if (!this.redis) {
            throw new Error('Redis not initialized');
        }

        const result = await this.redis.exists(key);
        return result === 1;
    }
}

// 스토리지 싱글톤
class StorageService {
    private storage: MemoryStorage | RedisStorage;

    constructor() {
        // 환경에 따라 적절한 스토리지 선택
        if (process.env.USE_REDIS === 'true' && process.env.UPSTASH_REDIS_URL) {
            this.storage = new RedisStorage();
            console.log('Using Redis storage');
        } else {
            this.storage = new MemoryStorage();
            console.log('Using memory storage');
        }
    }

    // 삭제 기록 저장
    async saveDeletionRecord(record: DeletionRecord): Promise<string> {
        const recordId = this.generateId();
        const key = `deletion:${recordId}`;

        // 30초 TTL 설정
        await this.storage.set(key, record, 30);

        return recordId;
    }

    // 삭제 기록 조회
    async getDeletionRecord(recordId: string): Promise<DeletionRecord | null> {
        const key = `deletion:${recordId}`;
        return await this.storage.get(key);
    }

    // 삭제 기록 제거
    async removeDeletionRecord(recordId: string): Promise<void> {
        const key = `deletion:${recordId}`;
        await this.storage.delete(key);
    }

    // 세션 데이터 저장
    async saveSessionData(sessionId: string, data: any, ttl: number = 1800): Promise<void> {
        const key = `session:${sessionId}`;
        await this.storage.set(key, data, ttl);
    }

    // 세션 데이터 조회
    async getSessionData(sessionId: string): Promise<any | null> {
        const key = `session:${sessionId}`;
        return await this.storage.get(key);
    }

    // 캐시 저장
    async setCache(key: string, value: any, ttl: number = 300): Promise<void> {
        const cacheKey = `cache:${key}`;
        await this.storage.set(cacheKey, value, ttl);
    }

    // 캐시 조회
    async getCache(key: string): Promise<any | null> {
        const cacheKey = `cache:${key}`;
        return await this.storage.get(cacheKey);
    }

    // 캐시 삭제
    async deleteCache(key: string): Promise<void> {
        const cacheKey = `cache:${key}`;
        await this.storage.delete(cacheKey);
    }

    // ID 생성 유틸리티
    private generateId(): string {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }
}

// 싱글톤 인스턴스
let storageInstance: StorageService | null = null;

export function getStorage(): StorageService {
    if (!storageInstance) {
        storageInstance = new StorageService();
    }
    return storageInstance;
}

// Export 편의 함수들
export const storage = {
    saveDeletionRecord: (record: DeletionRecord) =>
        getStorage().saveDeletionRecord(record),

    getDeletionRecord: (recordId: string) =>
        getStorage().getDeletionRecord(recordId),

    removeDeletionRecord: (recordId: string) =>
        getStorage().removeDeletionRecord(recordId),

    saveSessionData: (sessionId: string, data: any, ttl?: number) =>
        getStorage().saveSessionData(sessionId, data, ttl),

    getSessionData: (sessionId: string) =>
        getStorage().getSessionData(sessionId),

    setCache: (key: string, value: any, ttl?: number) =>
        getStorage().setCache(key, value, ttl),

    getCache: (key: string) =>
        getStorage().getCache(key),

    deleteCache: (key: string) =>
        getStorage().deleteCache(key)
};