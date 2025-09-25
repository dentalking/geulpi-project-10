const fetch = require('node-fetch');

async function testQuickActionTracking() {
  console.log('🧪 Quick Actions 추적 시스템 테스트...\n');

  try {
    // 1. 테스트용 로그 생성
    console.log('1️⃣ Display 이벤트 전송 테스트...');
    const displayResponse = await fetch('http://localhost:3000/api/analytics/quick-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        suggestionText: '오늘 일정 확인해줘',
        suggestionCategory: 'view',
        suggestionPosition: 1,
        actionType: 'displayed',
        context: {
          locale: 'ko',
          eventCount: 0
        }
      })
    });

    if (displayResponse.ok) {
      const displayData = await displayResponse.json();
      console.log('✅ Display 이벤트 기록 성공:', displayData.data?.logId);
    } else {
      console.log('❌ Display 이벤트 기록 실패:', displayResponse.status);
    }

    // 2초 대기 (응답 시간 시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n2️⃣ Click 이벤트 전송 테스트...');
    const clickResponse = await fetch('http://localhost:3000/api/analytics/quick-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        suggestionText: '오늘 일정 확인해줘',
        suggestionCategory: 'view',
        suggestionPosition: 1,
        actionType: 'clicked',
        responseTimeMs: 2000,
        context: {
          locale: 'ko',
          eventCount: 0
        }
      })
    });

    if (clickResponse.ok) {
      const clickData = await clickResponse.json();
      console.log('✅ Click 이벤트 기록 성공:', clickData.data?.logId);
    } else {
      console.log('❌ Click 이벤트 기록 실패:', clickResponse.status);
    }

    console.log('\n3️⃣ Batch 로그 전송 테스트...');
    const batchResponse = await fetch('http://localhost:3000/api/analytics/quick-action', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logs: [
          {
            suggestionText: '내일 회의 일정 추가',
            suggestionCategory: 'create',
            suggestionPosition: 2,
            actionType: 'displayed'
          },
          {
            suggestionText: '이번주 일정 정리해줘',
            suggestionCategory: 'organize',
            suggestionPosition: 3,
            actionType: 'displayed'
          },
          {
            suggestionText: '사진에서 일정 추출하기',
            suggestionCategory: 'action',
            suggestionPosition: 4,
            actionType: 'ignored'
          }
        ]
      })
    });

    if (batchResponse.ok) {
      const batchData = await batchResponse.json();
      console.log('✅ Batch 로그 기록 성공:', {
        count: batchData.data?.count,
        logIds: batchData.data?.logIds?.slice(0, 3)
      });
    } else {
      console.log('❌ Batch 로그 기록 실패:', batchResponse.status);
    }

    console.log('\n-------------------');
    console.log('📊 테스트 완료!');
    console.log('\nSupabase 대시보드에서 확인:');
    console.log('1. Table Editor > user_action_logs 테이블 확인');
    console.log('2. SQL Editor에서 다음 쿼리 실행:');
    console.log(`
SELECT
  suggestion_text,
  action_type,
  response_time_ms,
  created_at
FROM user_action_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
    `);

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 서버가 실행 중이지 않습니다. npm run dev를 먼저 실행하세요.');
    }
  }
}

// 테스트 실행
testQuickActionTracking();