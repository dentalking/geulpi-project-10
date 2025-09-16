/**
 * 통합 테스트 스크립트
 * 모든 핵심 기능이 정상 작동하는지 확인
 */

const https = require('https');
const http = require('http');

const config = {
  baseUrl: 'http://localhost:3000',
  authToken: null,
  cookies: ''
};

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': config.cookies || '',
        ...options.headers
      }
    };

    if (config.authToken) {
      reqOptions.headers['Authorization'] = `auth-token ${config.authToken}`;
    }

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.headers['set-cookie']) {
          config.cookies = res.headers['set-cookie'].join('; ');
        }

        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// 테스트 케이스들
const testCases = {
  // 1. 인증 시스템
  async testAuthentication() {
    console.log('\n📝 인증 시스템 테스트...');

    // 이메일 로그인
    const loginRes = await request('/api/auth/email-login', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'test123456'
      }
    });

    if (loginRes.data.success) {
      config.authToken = loginRes.data.token || loginRes.data.data?.token;
      return { success: true, message: '이메일 인증 성공' };
    }

    return { success: false, message: loginRes.data.error || '인증 실패' };
  },

  // 2. 캘린더 이벤트
  async testCalendarEvents() {
    console.log('\n📅 캘린더 이벤트 테스트...');

    // 이벤트 조회
    const eventsRes = await request('/api/calendar/events');

    if (eventsRes.status === 200) {
      const eventCount = eventsRes.data.events?.length || 0;

      // 이벤트 생성
      const createRes = await request('/api/calendar/create', {
        method: 'POST',
        body: {
          title: '통합 테스트 이벤트',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          location: '테스트 장소'
        }
      });

      return {
        success: createRes.status === 200,
        message: `이벤트 ${eventCount}개 조회, 생성 ${createRes.status === 200 ? '성공' : '실패'}`
      };
    }

    return { success: false, message: '이벤트 조회 실패' };
  },

  // 3. AI 채팅
  async testAIChat() {
    console.log('\n🤖 AI 채팅 테스트...');

    const chatRes = await request('/api/ai/chat', {
      method: 'POST',
      body: {
        message: '안녕하세요',
        type: 'text',
        sessionId: 'test-integration-' + Date.now(),
        locale: 'ko'
      }
    });

    return {
      success: chatRes.status === 200 && chatRes.data.success,
      message: chatRes.data.success ? 'AI 응답 정상' : chatRes.data.error || 'AI 응답 실패'
    };
  },

  // 4. 친구 시스템
  async testFriendsSystem() {
    console.log('\n👥 친구 시스템 테스트...');

    const friendsRes = await request('/api/friends');

    if (friendsRes.status === 200) {
      const friendCount = friendsRes.data.friends?.length || 0;

      // 친구가 있으면 가능한 시간 찾기 테스트
      if (friendCount > 0) {
        const friend = friendsRes.data.friends[0];
        const availabilityRes = await request(
          `/api/friends/availability?friendId=${friend.friendId || friend.id}`
        );

        return {
          success: availabilityRes.status === 200,
          message: `친구 ${friendCount}명, 가능한 시간 ${availabilityRes.data?.totalAvailable || 0}개`
        };
      }

      return {
        success: true,
        message: `친구 ${friendCount}명 조회 성공`
      };
    }

    return { success: false, message: '친구 시스템 접근 실패' };
  },

  // 5. 위치 기반 서비스 (Google Maps)
  async testLocationServices() {
    console.log('\n🗺️ 위치 기반 서비스 테스트...');

    // 중간 지점 찾기
    const midpointRes = await request('/api/maps/midpoint', {
      method: 'POST',
      body: {
        userLocations: [
          {
            userId: 'user1',
            location: { lat: 37.5665, lng: 126.9780 }, // 서울시청
            name: '사용자1'
          },
          {
            userId: 'user2',
            location: { lat: 37.5172, lng: 127.0473 }, // 강남역
            name: '사용자2'
          }
        ],
        placeType: 'cafe'
      }
    });

    if (midpointRes.status === 200 && midpointRes.data.success) {
      const placeCount = midpointRes.data.nearbyPlaces?.length || 0;
      return {
        success: true,
        message: `중간 지점 계산 성공, ${placeCount}개 장소 추천`
      };
    }

    return {
      success: midpointRes.status === 200,
      message: midpointRes.data.error || 'Google Maps API 키 필요'
    };
  },

  // 6. 데이터베이스 연결
  async testDatabaseConnection() {
    console.log('\n💾 데이터베이스 연결 테스트...');

    // 프로필 조회로 DB 연결 확인
    const profileRes = await request('/api/profile');

    return {
      success: profileRes.status === 200,
      message: profileRes.status === 200 ? 'DB 연결 정상' : 'DB 연결 실패'
    };
  },

  // 7. 에러 핸들링
  async testErrorHandling() {
    console.log('\n⚠️ 에러 핸들링 테스트...');

    // 잘못된 요청
    const badRes = await request('/api/calendar/events/invalid-id', {
      method: 'DELETE'
    });

    // 인증 없이 요청
    const savedToken = config.authToken;
    config.authToken = null;

    const unauthRes = await request('/api/friends');

    config.authToken = savedToken;

    return {
      success: badRes.status >= 400 && unauthRes.status === 401,
      message: '에러 핸들링 정상 작동'
    };
  },

  // 8. 성능 테스트
  async testPerformance() {
    console.log('\n⚡ 성능 테스트...');

    const startTime = Date.now();
    const promises = [];

    // 동시 요청 5개
    for (let i = 0; i < 5; i++) {
      promises.push(request('/api/health'));
    }

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    return {
      success: duration < 2000, // 2초 이내
      message: `5개 동시 요청 ${duration}ms 소요`
    };
  }
};

// 메인 실행 함수
async function runIntegrationTests() {
  console.log(`${colors.cyan}🚀 통합 테스트 시작${colors.reset}`);
  console.log('=' .repeat(50));
  console.log(`시간: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(50));

  const results = [];
  let passCount = 0;
  let failCount = 0;

  // 모든 테스트 실행
  for (const [name, testFn] of Object.entries(testCases)) {
    try {
      const result = await testFn();
      results.push({ name, ...result });

      if (result.success) {
        console.log(`${colors.green}✅ ${result.message}${colors.reset}`);
        passCount++;
      } else {
        console.log(`${colors.yellow}⚠️ ${result.message}${colors.reset}`);
        failCount++;
      }
    } catch (error) {
      console.log(`${colors.red}❌ ${name}: ${error.message}${colors.reset}`);
      results.push({ name, success: false, message: error.message });
      failCount++;
    }
  }

  // 결과 요약
  console.log('\n' + '=' .repeat(50));
  console.log(`${colors.cyan}📊 테스트 결과 요약${colors.reset}`);
  console.log(`${colors.green}✅ 성공: ${passCount}/${passCount + failCount}${colors.reset}`);

  const successRate = Math.round((passCount / (passCount + failCount)) * 100);
  let statusColor = colors.green;
  if (successRate < 50) statusColor = colors.red;
  else if (successRate < 80) statusColor = colors.yellow;

  console.log(`${statusColor}📈 성공률: ${successRate}%${colors.reset}`);

  // 실패한 테스트 상세
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(`\n${colors.yellow}⚠️ 주의가 필요한 항목:${colors.reset}`);
    failures.forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }

  // 다음 단계 추천
  console.log(`\n${colors.blue}💡 다음 단계 권장사항:${colors.reset}`);

  if (successRate === 100) {
    console.log('  ✨ 모든 테스트 통과! 카카오톡 봇 구현 진행 가능');
    console.log('  - 카카오 비즈니스 채널 생성');
    console.log('  - Webhook 엔드포인트 구현');
    console.log('  - 메시지 템플릿 설계');
  } else if (successRate >= 80) {
    console.log('  ⚡ 대부분 정상. 일부 수정 후 진행');
    console.log('  - 실패한 기능 수정');
    console.log('  - 에러 핸들링 강화');
    console.log('  - 재테스트 후 진행');
  } else {
    console.log('  ⚠️ 기존 기능 안정화 필요');
    console.log('  - 핵심 기능 버그 수정');
    console.log('  - 데이터베이스 연결 확인');
    console.log('  - API 키 설정 확인');
  }

  return { successRate, results };
}

// 서버 상태 확인 후 테스트 시작
async function main() {
  try {
    console.log(`${colors.yellow}🔍 서버 연결 확인 중...${colors.reset}`);
    await request('/api/health');
    console.log(`${colors.green}✅ 서버 연결 성공${colors.reset}\n`);

    const { successRate } = await runIntegrationTests();

    // 성공률에 따른 종료 코드
    process.exit(successRate === 100 ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}❌ 서버 연결 실패!${colors.reset}`);
    console.error('서버를 먼저 시작하세요: npm run dev');
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  main();
}

module.exports = { testCases, request };