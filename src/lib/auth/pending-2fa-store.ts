/**
 * 2FA 대기 로그인 정보를 안전하게 저장하는 스토어
 * Redis 사용 가능시 Redis, 없으면 인메모리 캐시 사용
 */

import { getStorage } from '@/lib/storage';

export interface Pending2FALogin {
  userId: string;
  email: string;
  deviceInfo?: any;
  rememberMe: boolean;
  timestamp: number;
}

class Pending2FAStore {
  private storage = getStorage();
  private readonly EXPIRY = 10 * 60 * 1000; // 10분
  private readonly PREFIX = 'pending_2fa:';

  async set(token: string, data: Pending2FALogin): Promise<void> {
    try {
      await this.storage.setCache(
        `${this.PREFIX}${token}`,
        JSON.stringify(data),
        Math.ceil(this.EXPIRY / 1000)
      );
    } catch (error) {
      console.error('Failed to store pending 2FA login:', error);
      throw new Error('Failed to store 2FA session');
    }
  }

  async get(token: string): Promise<Pending2FALogin | null> {
    try {
      const data = await this.storage.getCache(`${this.PREFIX}${token}`);
      if (!data) return null;

      const parsed = JSON.parse(data);

      // 만료 체크
      if (Date.now() - parsed.timestamp > this.EXPIRY) {
        await this.remove(token);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Failed to retrieve pending 2FA login:', error);
      return null;
    }
  }

  async remove(token: string): Promise<void> {
    try {
      await this.storage.deleteCache(`${this.PREFIX}${token}`);
    } catch (error) {
      console.error('Failed to remove pending 2FA login:', error);
    }
  }

  /**
   * 만료된 엔트리 정리 (주기적으로 실행)
   */
  async cleanup(): Promise<void> {
    // Redis는 TTL로 자동 정리됨
    // 인메모리 캐시의 경우 storage 레이어에서 처리
    console.log('Pending 2FA cleanup completed');
  }
}

export const pending2FAStore = new Pending2FAStore();