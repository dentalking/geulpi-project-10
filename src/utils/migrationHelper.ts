import { ChatSession, AIMessage } from '@/types';

// 기존 localStorage 키들
const LEGACY_CHAT_SESSIONS_KEY = 'geulpi_chat_sessions';
const LEGACY_ACTIVE_CHAT_KEY = 'geulpi_active_chat';

export interface MigrationResult {
  success: boolean;
  migratedSessions: number;
  migratedMessages: number;
  errors: string[];
  details: {
    sessionsCreated: ChatSession[];
    failedSessions: { session: any; error: string }[];
  };
}

export class MigrationHelper {
  /**
   * localStorage에서 기존 채팅 데이터를 확인
   */
  static checkLocalStorageData(): {
    hasData: boolean;
    sessionCount: number;
    messageCount: number;
    sessions: ChatSession[];
  } {
    try {
      // 서버 사이드에서는 localStorage에 접근할 수 없음
      if (typeof window === 'undefined') {
        return {
          hasData: false,
          sessionCount: 0,
          messageCount: 0,
          sessions: []
        };
      }

      const stored = localStorage.getItem(LEGACY_CHAT_SESSIONS_KEY);
      if (!stored) {
        return {
          hasData: false,
          sessionCount: 0,
          messageCount: 0,
          sessions: []
        };
      }

      const sessions = JSON.parse(stored).map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));

      const totalMessages = sessions.reduce((total: number, session: ChatSession) => {
        return total + (session.messages?.length || 0);
      }, 0);

      return {
        hasData: true,
        sessionCount: sessions.length,
        messageCount: totalMessages,
        sessions
      };
    } catch (error) {
      console.error('Error checking localStorage data:', error);
      return {
        hasData: false,
        sessionCount: 0,
        messageCount: 0,
        sessions: []
      };
    }
  }

  /**
   * localStorage 데이터를 Supabase로 마이그레이션
   */
  static async migrateToSupabase(userId?: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedSessions: 0,
      migratedMessages: 0,
      errors: [],
      details: {
        sessionsCreated: [],
        failedSessions: []
      }
    };

    try {
      const localData = this.checkLocalStorageData();
      
      if (!localData.hasData) {
        result.errors.push('No localStorage data found');
        return result;
      }

      console.log(`Starting migration of ${localData.sessionCount} sessions with ${localData.messageCount} messages`);

      for (const session of localData.sessions) {
        try {
          // 1. 세션 생성
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          const sessionResponse = await fetch(`${baseUrl}/api/chat/sessions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: session.title,
              userId: userId || session.userId,
              metadata: session.metadata || {}
            }),
          });

          const sessionResult = await sessionResponse.json();

          if (!sessionResult.success) {
            result.details.failedSessions.push({
              session,
              error: `Session creation failed: ${sessionResult.error}`
            });
            result.errors.push(`Failed to create session "${session.title}": ${sessionResult.error}`);
            continue;
          }

          const createdSession = sessionResult.data;
          result.details.sessionsCreated.push(createdSession);
          result.migratedSessions++;

          // 2. 메시지들 마이그레이션
          if (session.messages && session.messages.length > 0) {
            for (const message of session.messages) {
              try {
                const messageResponse = await fetch(`${baseUrl}/api/chat/messages`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    sessionId: createdSession.id,
                    role: message.role,
                    content: message.content,
                    messageType: message.type || 'text',
                    data: message.data || {},
                    metadata: message.metadata || {}
                  }),
                });

                const messageResult = await messageResponse.json();

                if (messageResult.success) {
                  result.migratedMessages++;
                } else {
                  result.errors.push(`Failed to migrate message in session "${session.title}": ${messageResult.error}`);
                }
              } catch (messageError) {
                result.errors.push(`Error migrating message: ${messageError}`);
              }

              // 잠시 대기 (API 과부하 방지)
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }

          console.log(`Migrated session: ${createdSession.title} with ${session.messages?.length || 0} messages`);

        } catch (sessionError) {
          result.details.failedSessions.push({
            session,
            error: `Session migration error: ${sessionError}`
          });
          result.errors.push(`Error migrating session "${session.title}": ${sessionError}`);
        }

        // 세션 간 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      result.success = result.migratedSessions > 0;

      console.log('Migration completed:', {
        sessions: result.migratedSessions,
        messages: result.migratedMessages,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
      result.success = false;
      return result;
    }
  }

  /**
   * 마이그레이션 후 localStorage 데이터 백업 및 정리
   */
  static backupAndClearLocalStorage(): {
    success: boolean;
    backupData?: string;
    error?: string;
  } {
    try {
      const localData = this.checkLocalStorageData();
      
      if (!localData.hasData) {
        return {
          success: true
        };
      }

      // 백업 데이터 생성
      const backupData = {
        timestamp: new Date().toISOString(),
        sessions: localData.sessions,
        activeSessionId: localStorage.getItem(LEGACY_ACTIVE_CHAT_KEY),
        migrationNote: 'This is a backup of localStorage chat data before Supabase migration'
      };

      const backupString = JSON.stringify(backupData, null, 2);

      // localStorage 정리
      localStorage.removeItem(LEGACY_CHAT_SESSIONS_KEY);
      localStorage.removeItem(LEGACY_ACTIVE_CHAT_KEY);

      console.log('localStorage chat data backed up and cleared');

      return {
        success: true,
        backupData: backupString
      };

    } catch (error) {
      return {
        success: false,
        error: `Backup failed: ${error}`
      };
    }
  }

  /**
   * 전체 마이그레이션 프로세스 실행
   */
  static async performFullMigration(userId?: string): Promise<{
    migrationResult: MigrationResult;
    backupResult: { success: boolean; backupData?: string; error?: string };
  }> {
    console.log('Starting full migration process...');

    // 1. 데이터 확인
    const localData = this.checkLocalStorageData();
    if (!localData.hasData) {
      console.log('No localStorage data to migrate');
      return {
        migrationResult: {
          success: true,
          migratedSessions: 0,
          migratedMessages: 0,
          errors: ['No data to migrate'],
          details: { sessionsCreated: [], failedSessions: [] }
        },
        backupResult: { success: true }
      };
    }

    // 2. 마이그레이션 실행
    const migrationResult = await this.migrateToSupabase(userId);

    // 3. 마이그레이션이 성공적이면 localStorage 정리
    let backupResult = { success: true };
    if (migrationResult.success && migrationResult.migratedSessions > 0) {
      backupResult = this.backupAndClearLocalStorage();
    }

    return {
      migrationResult,
      backupResult
    };
  }
}

// 편의 함수들
export const migrationHelper = {
  checkData: () => MigrationHelper.checkLocalStorageData(),
  migrate: (userId?: string) => MigrationHelper.migrateToSupabase(userId),
  backupAndClear: () => MigrationHelper.backupAndClearLocalStorage(),
  fullMigration: (userId?: string) => MigrationHelper.performFullMigration(userId)
};