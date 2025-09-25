/**
 * HTTP 폴링 동기화 시스템 테스트 스크립트
 * usePollingSync 훅과 /api/sync/poll-changes API 검증
 */

const fetch = require('node-fetch');

// 테스트 설정
const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'f362e8ad-4066-4107-8125-832fe1b1453f';

console.log('🔄 HTTP 폴링 동기화 시스템 테스트 시작\n');

async function runPollingTests() {
  try {
    console.log('📡 1. 기본 폴링 API 테스트');
    await testBasicPolling();

    console.log('\n⏰ 2. 시간 기반 변경사항 감지 테스트');
    await testTimeBasedPolling();

    console.log('\n🔄 3. 수동 동기화 테스트');
    await testManualSync();

    console.log('\n⚡ 4. 성능 테스트');
    await testPerformance();

    console.log('\n✅ 모든 폴링 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    process.exit(1);
  }
}

/**
 * 기본 폴링 API 테스트
 */
async function testBasicPolling() {
  try {
    const startTime = Date.now();

    // 현재 시간부터 5분 전까지의 변경사항 확인
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const url = `${BASE_URL}/api/sync/poll-changes?userId=${TEST_USER_ID}&since=${since}`;

    console.log(`   📤 폴링 요청 전송: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`   ✅ API 응답 성공 (${responseTime}ms)`);
    console.log('   📊 응답 데이터:');
    console.log(`      - 성공 여부: ${data.success}`);
    console.log(`      - 변경사항 개수: ${data.data?.changes?.length || 0}`);
    console.log(`      - 변경사항 있음: ${data.data?.hasChanges}`);
    console.log(`      - 마지막 타임스탬프: ${data.data?.lastTimestamp}`);
    console.log(`      - 폴링 윈도우: ${data.data?.pollInfo?.windowMinutes}분`);

    if (data.data?.changes && data.data.changes.length > 0) {
      console.log('      - 변경사항 세부 정보:');
      data.data.changes.slice(0, 3).forEach((change, index) => {
        console.log(`        ${index + 1}. ${change.type}: ${change.event?.title || change.eventId}`);
      });
    }

    return data;

  } catch (error) {
    console.error('   ❌ 기본 폴링 테스트 실패:', error);
    throw error;
  }
}

/**
 * 시간 기반 변경사항 감지 테스트
 */
async function testTimeBasedPolling() {
  try {
    console.log('   🕐 다양한 시간 간격으로 테스트...');

    const timeIntervals = [
      { name: '1분 전', minutes: 1 },
      { name: '10분 전', minutes: 10 },
      { name: '1시간 전', minutes: 60 },
      { name: '1일 전', minutes: 24 * 60 }
    ];

    for (const interval of timeIntervals) {
      const since = new Date(Date.now() - interval.minutes * 60 * 1000).toISOString();
      const url = `${BASE_URL}/api/sync/poll-changes?userId=${TEST_USER_ID}&since=${since}`;

      const response = await fetch(url);
      const data = await response.json();

      console.log(`      ${interval.name}: ${data.data?.changes?.length || 0}개 변경사항`);
    }

  } catch (error) {
    console.error('   ❌ 시간 기반 테스트 실패:', error);
    throw error;
  }
}

/**
 * 수동 동기화 테스트 (POST 메서드)
 */
async function testManualSync() {
  try {
    const startTime = Date.now();

    console.log('   📤 수동 동기화 요청 전송...');

    const response = await fetch(`${BASE_URL}/api/sync/poll-changes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        forceSync: false
      })
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`   ✅ 수동 동기화 성공 (${responseTime}ms)`);
    console.log(`      - 변경사항: ${data.data?.changes?.length || 0}개`);

    // 강제 동기화 테스트
    console.log('   🔄 강제 동기화 테스트...');

    const forceResponse = await fetch(`${BASE_URL}/api/sync/poll-changes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        forceSync: true
      })
    });

    const forceData = await forceResponse.json();

    console.log(`   ✅ 강제 동기화 성공`);
    console.log(`      - 동기화 타입: ${forceData.data?.syncType}`);
    console.log(`      - 이벤트: ${forceData.data?.events?.length || 0}개`);

  } catch (error) {
    console.error('   ❌ 수동 동기화 테스트 실패:', error);
    throw error;
  }
}

/**
 * 성능 테스트
 */
async function testPerformance() {
  try {
    console.log('   🏃‍♂️ 성능 벤치마크 시작...');

    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();

      try {
        const since = new Date(Date.now() - 30 * 1000).toISOString(); // 30초 전
        const response = await fetch(
          `${BASE_URL}/api/sync/poll-changes?userId=${TEST_USER_ID}&since=${since}`
        );

        if (response.ok) {
          await response.json();
          times.push(Date.now() - start);
        }
      } catch (error) {
        console.log(`     반복 ${i + 1} 실패:`, error.message);
      }
    }

    if (times.length > 0) {
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`     평균 응답시간: ${Math.round(avgTime)}ms`);
      console.log(`     최소 응답시간: ${minTime}ms`);
      console.log(`     최대 응답시간: ${maxTime}ms`);

      // 성능 평가
      if (avgTime < 500) {
        console.log('     🟢 성능 우수 (< 500ms)');
      } else if (avgTime < 1000) {
        console.log('     🟡 성능 양호 (< 1s)');
      } else {
        console.log('     🔴 성능 개선 필요 (> 1s)');
      }
    }

  } catch (error) {
    console.error('   ❌ 성능 테스트 실패:', error);
    throw error;
  }
}

/**
 * 오류 시나리오 테스트
 */
async function testErrorScenarios() {
  console.log('   🧪 오류 시나리오 테스트...');

  const scenarios = [
    {
      name: '잘못된 사용자 ID',
      url: `${BASE_URL}/api/sync/poll-changes?userId=invalid&since=${new Date().toISOString()}`
    },
    {
      name: '사용자 ID 누락',
      url: `${BASE_URL}/api/sync/poll-changes?since=${new Date().toISOString()}`
    },
    {
      name: '잘못된 시간 형식',
      url: `${BASE_URL}/api/sync/poll-changes?userId=${TEST_USER_ID}&since=invalid-date`
    }
  ];

  for (const scenario of scenarios) {
    try {
      console.log(`     테스트: ${scenario.name}`);

      const response = await fetch(scenario.url);
      const data = await response.json();

      if (response.status === 400 || (data.success === false && data.error)) {
        console.log(`       ✅ 적절한 오류 처리됨`);
      } else {
        console.log(`       ⚠️  예상과 다른 응답:`, response.status, data);
      }

    } catch (error) {
      console.log(`       ❌ 네트워크 오류:`, error.message);
    }
  }
}

/**
 * 실제 폴링 시뮬레이션
 */
async function simulateRealPolling() {
  console.log('\n🔄 실제 폴링 시뮬레이션 (30초간)');

  let pollCount = 0;
  let lastTimestamp = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const pollInterval = setInterval(async () => {
    try {
      pollCount++;
      console.log(`   폴링 #${pollCount} - ${new Date().toLocaleTimeString()}`);

      const response = await fetch(
        `${BASE_URL}/api/sync/poll-changes?userId=${TEST_USER_ID}&since=${lastTimestamp}`
      );

      if (response.ok) {
        const data = await response.json();

        if (data.data?.hasChanges) {
          console.log(`     📢 변경사항 감지: ${data.data.changes.length}개`);
        } else {
          console.log(`     ✅ 변경사항 없음`);
        }

        // 타임스탬프 업데이트
        if (data.data?.lastTimestamp) {
          lastTimestamp = data.data.lastTimestamp;
        }
      }

    } catch (error) {
      console.log(`     ❌ 폴링 실패:`, error.message);
    }
  }, 5000); // 5초마다 폴링

  // 30초 후 중단
  setTimeout(() => {
    clearInterval(pollInterval);
    console.log(`   🏁 폴링 시뮬레이션 완료 (총 ${pollCount}회)`);
  }, 30000);
}

// 메인 테스트 실행
if (require.main === module) {
  runPollingTests()
    .then(async () => {
      console.log('\n🎉 HTTP 폴링 동기화 시스템이 성공적으로 구현되었습니다!');

      console.log('\n📋 구현된 기능:');
      console.log('   • HTTP 폴링 기반 실시간 동기화');
      console.log('   • usePollingSync React Hook');
      console.log('   • /api/sync/poll-changes API 엔드포인트');
      console.log('   • 시간 기반 변경사항 감지');
      console.log('   • 수동/강제 동기화 지원');
      console.log('   • 페이지 가시성 변경 감지');

      console.log('\n🔗 다음 단계:');
      console.log('   1. UnifiedEventProvider에 usePollingSync 통합');
      console.log('   2. Vercel 프로덕션 환경에서 테스트');
      console.log('   3. 폴링 간격 최적화 (네트워크/배터리 고려)');
      console.log('   4. 오류 복구 및 백오프 전략 구현');

      // 실제 폴링 시뮬레이션 실행 여부 확인
      const args = process.argv.slice(2);
      if (args.includes('--simulate')) {
        await simulateRealPolling();
      }
    })
    .catch(error => {
      console.error('💥 테스트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { runPollingTests };