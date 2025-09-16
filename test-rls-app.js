/**
 * RLS 적용 후 앱 기능 테스트 스크립트
 * 실행: node test-rls-app.js
 */

const https = require('https');
const http = require('http');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// 테스트 설정
const config = {
  baseUrl: 'http://localhost:3000',
  authToken: null,  // 로그인 후 설정됨
  testEmail: 'test@example.com',
  testPassword: 'test123456',
  cookies: ''
};

// HTTP 요청 헬퍼 함수
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
        'Cookie': config.cookies,
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
        // 쿠키 저장
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

// 테스트 함수들
const tests = {
  // 1. Health Check
  async healthCheck() {
    console.log('\n📋 Health Check...');
    const res = await request('/api/health');
    return {
      name: 'Health Check',
      success: res.status === 200 && res.data.status === 'healthy',
      details: res.data
    };
  },

  // 2. 로그인 테스트
  async loginTest() {
    console.log('\n🔐 로그인 테스트...');

    // 먼저 회원가입 시도 (이미 있으면 실패해도 OK)
    await request('/api/auth/register', {
      method: 'POST',
      body: {
        email: config.testEmail,
        password: config.testPassword,
        name: 'Test User'
      }
    });

    // 로그인
    const res = await request('/api/auth/email-login', {
      method: 'POST',
      body: {
        email: config.testEmail,
        password: config.testPassword
      }
    });

    if (res.data.success && res.data.data?.token) {
      config.authToken = res.data.data.token;
    }

    return {
      name: '이메일 로그인',
      success: res.status === 200 && res.data.success,
      details: res.data.success ? 'Token received' : res.data.error
    };
  },

  // 3. 프로필 조회
  async profileTest() {
    console.log('\n👤 프로필 조회...');
    const res = await request('/api/profile');
    return {
      name: '프로필 조회',
      success: res.status === 200,
      details: res.data.data ? `User: ${res.data.data.email}` : res.data.error
    };
  },

  // 4. 캘린더 이벤트 조회
  async calendarEventsTest() {
    console.log('\n📅 캘린더 이벤트...');
    const res = await request('/api/calendar/events');
    return {
      name: '캘린더 이벤트 조회',
      success: res.status === 200 && res.data.success,
      details: res.data.events ? `Events: ${res.data.events?.length || 0}` : res.data.error
    };
  },

  // 5. 캘린더 이벤트 생성
  async createEventTest() {
    console.log('\n➕ 이벤트 생성...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const res = await request('/api/calendar/create', {
      method: 'POST',
      body: {
        title: 'RLS Test Event',
        description: 'Testing RLS policies',
        startTime: tomorrow.toISOString(),
        endTime: new Date(tomorrow.getTime() + 3600000).toISOString(),
        location: 'Test Location'
      }
    });

    return {
      name: '캘린더 이벤트 생성',
      success: res.status === 200 && res.data.success,
      details: res.data.createdEventId || res.data.error
    };
  },

  // 6. 채팅 세션 조회
  async chatSessionsTest() {
    console.log('\n💬 채팅 세션...');
    const res = await request('/api/chat/sessions');
    return {
      name: '채팅 세션 조회',
      success: res.status === 200 && res.data.success,
      details: res.data.data ? `Sessions: ${res.data.data.sessions?.length || 0}` : res.data.error
    };
  },

  // 7. AI 채팅 테스트
  async aiChatTest() {
    console.log('\n🤖 AI 채팅...');

    // 세션 생성
    const sessionRes = await request('/api/chat/sessions', {
      method: 'POST',
      body: { title: 'RLS Test Chat' }
    });

    if (sessionRes.data.success && sessionRes.data.data?.id) {
      // 메시지 전송 - sessionId가 아니라 id 사용
      const chatRes = await request('/api/ai/chat', {
        method: 'POST',
        body: {
          message: '안녕하세요',
          sessionId: sessionRes.data.data.id,
          locale: 'ko'
        }
      });

      return {
        name: 'AI 채팅',
        success: chatRes.status === 200 && chatRes.data.success,
        details: chatRes.data.data?.message ? 'AI responded' : chatRes.data.error
      };
    }

    return {
      name: 'AI 채팅',
      success: false,
      details: sessionRes.data.error || 'Failed to create session'
    };
  },

  // 8. 친구 목록
  async friendsTest() {
    console.log('\n👥 친구 목록...');
    const res = await request('/api/friends');
    return {
      name: '친구 목록 조회',
      success: res.status === 200 && res.data.success,
      details: res.data.data ? `Friends: ${res.data.data.friends?.length || 0}` : res.data.error
    };
  },

  // 9. 인증 상태 확인
  async authStatusTest() {
    console.log('\n🔍 인증 상태...');
    const res = await request('/api/auth/status');
    return {
      name: '인증 상태 확인',
      success: res.status === 200,
      details: res.data.isAuthenticated ? 'Authenticated' : 'Not authenticated'
    };
  }
};

// 메인 실행 함수
async function runTests() {
  console.log(`${colors.cyan}🚀 RLS 적용 후 앱 테스트 시작${colors.reset}`);
  console.log('=' .repeat(50));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(50));

  const results = [];
  let passCount = 0;
  let failCount = 0;

  // 모든 테스트 실행
  for (const [name, testFn] of Object.entries(tests)) {
    try {
      const result = await testFn();
      results.push(result);

      if (result.success) {
        console.log(`${colors.green}✅ ${result.name}${colors.reset} - ${result.details}`);
        passCount++;
      } else {
        console.log(`${colors.red}❌ ${result.name}${colors.reset} - ${result.details}`);
        failCount++;
      }
    } catch (error) {
      console.log(`${colors.red}❌ ${name}${colors.reset} - Error: ${error.message}`);
      results.push({ name, success: false, details: error.message });
      failCount++;
    }
  }

  // 결과 요약
  console.log('\n' + '=' .repeat(50));
  console.log(`${colors.cyan}📊 테스트 결과 요약${colors.reset}`);
  console.log(`${colors.green}✅ 성공: ${passCount}${colors.reset}`);
  console.log(`${colors.red}❌ 실패: ${failCount}${colors.reset}`);

  const successRate = Math.round((passCount / (passCount + failCount)) * 100);
  let statusColor = colors.green;
  if (successRate < 50) statusColor = colors.red;
  else if (successRate < 80) statusColor = colors.yellow;

  console.log(`${statusColor}📈 성공률: ${successRate}%${colors.reset}`);

  // 실패한 테스트 상세 정보
  if (failCount > 0) {
    console.log(`\n${colors.yellow}⚠️ 실패한 테스트:${colors.reset}`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
  }

  // 권장 사항
  console.log(`\n${colors.blue}💡 다음 단계:${colors.reset}`);
  if (successRate === 100) {
    console.log('  ✨ 모든 테스트 통과! RLS 정책이 정상 작동합니다.');
    console.log('  - 실제 사용자로 추가 테스트 권장');
    console.log('  - 성능 모니터링 시작');
  } else if (successRate >= 80) {
    console.log('  ⚡ 대부분 테스트 통과. 일부 조정 필요.');
    console.log('  - 실패한 API 엔드포인트 확인');
    console.log('  - RLS 정책 세부 조정');
  } else {
    console.log('  ⚠️ RLS 정책 조정이 필요합니다.');
    console.log('  - Supabase 로그 확인');
    console.log('  - 정책에서 app.current_user_id 설정 확인');
    console.log('  - API 미들웨어 확인');
  }
}

// 서버 확인 후 테스트 시작
async function main() {
  try {
    // 서버 연결 확인
    console.log(`${colors.yellow}🔍 서버 연결 확인 중...${colors.reset}`);
    await request('/api/health');
    console.log(`${colors.green}✅ 서버 연결 성공${colors.reset}`);

    // 테스트 실행
    await runTests();
  } catch (error) {
    console.error(`${colors.red}❌ 서버 연결 실패!${colors.reset}`);
    console.error('서버를 먼저 시작하세요: npm run dev');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// 실행
if (require.main === module) {
  main();
}

module.exports = { tests, request };