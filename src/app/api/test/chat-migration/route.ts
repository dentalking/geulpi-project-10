import { NextResponse } from 'next/server';
import { chatStorage } from '@/utils/chatStorage';
import { migrationHelper } from '@/utils/migrationHelper';

// GET /api/test/chat-migration - 마이그레이션 테스트 API
export async function GET() {
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        passed: 0,
        failed: 0,
        total: 0
      }
    };

    // 테스트 1: Supabase 연결 확인
    try {
      const sessions = await chatStorage.getAllSessions();
      testResults.tests.push({
        name: 'Supabase Connection Test',
        status: 'PASSED',
        details: `Successfully connected to Supabase. Found ${sessions.length} sessions.`
      });
      testResults.summary.passed++;
    } catch (error) {
      testResults.tests.push({
        name: 'Supabase Connection Test',
        status: 'FAILED',
        details: `Failed to connect to Supabase: ${error}`
      });
      testResults.summary.failed++;
    }

    // 테스트 2: 채팅 세션 생성
    try {
      const testSession = await chatStorage.createSession('테스트 채팅', 'test-user-id');
      if (testSession) {
        testResults.tests.push({
          name: 'Session Creation Test',
          status: 'PASSED',
          details: `Successfully created session: ${testSession.id}`
        });
        testResults.summary.passed++;

        // 테스트 3: 메시지 추가
        try {
          const testMessage = {
            id: 'test-msg-1',
            role: 'user' as const,
            content: '테스트 메시지입니다.',
            timestamp: new Date(),
            type: 'text' as const
          };

          const updatedSession = await chatStorage.addMessage(testSession.id, testMessage);
          if (updatedSession) {
            testResults.tests.push({
              name: 'Message Addition Test',
              status: 'PASSED',
              details: `Successfully added message to session. Session now has ${updatedSession.messages.length} messages.`
            });
            testResults.summary.passed++;
          } else {
            throw new Error('Updated session is null');
          }
        } catch (error) {
          testResults.tests.push({
            name: 'Message Addition Test',
            status: 'FAILED',
            details: `Failed to add message: ${error}`
          });
          testResults.summary.failed++;
        }

        // 테스트 4: 세션 조회
        try {
          const retrievedSession = await chatStorage.getSession(testSession.id);
          if (retrievedSession && retrievedSession.id === testSession.id) {
            testResults.tests.push({
              name: 'Session Retrieval Test',
              status: 'PASSED',
              details: `Successfully retrieved session: ${retrievedSession.title}`
            });
            testResults.summary.passed++;
          } else {
            throw new Error('Retrieved session does not match');
          }
        } catch (error) {
          testResults.tests.push({
            name: 'Session Retrieval Test',
            status: 'FAILED',
            details: `Failed to retrieve session: ${error}`
          });
          testResults.summary.failed++;
        }

        // 정리: 테스트 세션 삭제
        try {
          await chatStorage.deleteSession(testSession.id);
          console.log(`Cleanup: Deleted test session ${testSession.id}`);
        } catch (error) {
          console.error(`Cleanup failed: ${error}`);
        }

      } else {
        throw new Error('Session creation returned null');
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Session Creation Test',
        status: 'FAILED',
        details: `Failed to create session: ${error}`
      });
      testResults.summary.failed++;
    }

    // 테스트 5: localStorage 마이그레이션 검사
    try {
      const localStorageCheck = migrationHelper.checkData();
      testResults.tests.push({
        name: 'localStorage Migration Check',
        status: 'PASSED',
        details: `localStorage check completed. Found ${localStorageCheck.sessionCount} sessions and ${localStorageCheck.messageCount} messages to potentially migrate.`
      });
      testResults.summary.passed++;
    } catch (error) {
      testResults.tests.push({
        name: 'localStorage Migration Check',
        status: 'FAILED',
        details: `Failed to check localStorage: ${error}`
      });
      testResults.summary.failed++;
    }

    testResults.summary.total = testResults.summary.passed + testResults.summary.failed;

    return NextResponse.json({
      success: testResults.summary.failed === 0,
      message: `Migration test completed. ${testResults.summary.passed}/${testResults.summary.total} tests passed.`,
      results: testResults
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Test execution failed: ${error.message}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/test/chat-migration - 전체 마이그레이션 실행 테스트
export async function POST() {
  try {
    console.log('Starting full migration test...');

    // localStorage 데이터 확인
    const localData = migrationHelper.checkData();
    
    if (!localData.hasData) {
      return NextResponse.json({
        success: true,
        message: 'No localStorage data found to migrate',
        data: {
          localStorageData: localData,
          migrationPerformed: false
        }
      });
    }

    // 전체 마이그레이션 실행
    const migrationResult = await migrationHelper.fullMigration();

    return NextResponse.json({
      success: migrationResult.migrationResult.success,
      message: `Migration completed. ${migrationResult.migrationResult.migratedSessions} sessions and ${migrationResult.migrationResult.migratedMessages} messages migrated.`,
      data: {
        localStorageData: localData,
        migrationResult: migrationResult.migrationResult,
        backupResult: migrationResult.backupResult,
        migrationPerformed: true
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: `Migration test failed: ${error.message}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}