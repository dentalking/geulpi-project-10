/**
 * 이미지에서 추출한 이벤트가 실제로 생성되는지 테스트
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

const config = {
  baseUrl: 'http://localhost:3000',
  authToken: null,
  cookies: ''
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

async function testImageEventCreation() {
  console.log('🔐 먼저 로그인...');

  // 로그인
  const loginRes = await request('/api/auth/email-login', {
    method: 'POST',
    body: {
      email: 'test@example.com',
      password: 'test123456'
    }
  });

  if (loginRes.data.success) {
    config.authToken = loginRes.data.token || loginRes.data.data?.token;
    console.log('✅ 로그인 성공!');
  } else {
    console.log('❌ 로그인 실패:', loginRes.data);
    return;
  }

  console.log('\n📸 이미지에서 이벤트 추출 시뮬레이션...');

  // 테스트용 가짜 이미지 데이터 (실제로는 Gemini API가 처리)
  // ChatCalendarService가 반환하는 것과 동일한 형식으로 테스트
  const simulatedImageResponse = {
    message: 'KAIST SSL Lab 인턴십 일정을 발견했습니다. 2025년 9월 28일과 29일에 진행되는 것으로 보입니다.',
    action: {
      type: 'create_multiple',
      data: {
        events: [
          {
            title: 'KAIST SSL Lab 인턴십 (Day 1)',
            date: '2025-09-28',
            time: '09:00',
            duration: 480,
            location: 'KAIST 대전캠퍼스',
            description: 'SSL Lab 인턴십 프로그램 첫째 날'
          },
          {
            title: 'KAIST SSL Lab 인턴십 (Day 2)',
            date: '2025-09-29',
            time: '09:00',
            duration: 480,
            location: 'KAIST 대전캠퍼스',
            description: 'SSL Lab 인턴십 프로그램 둘째 날'
          }
        ]
      }
    },
    suggestions: ['일정 확인하기', '다른 일정 추가', '일정 수정하기']
  };

  console.log('📅 추출된 이벤트:', JSON.stringify(simulatedImageResponse.action.data.events, null, 2));

  console.log('\n🚀 AI 채팅 API를 통해 이벤트 생성 시도...');

  // AI 채팅 API 호출 (이미지 타입으로 처리되도록)
  const chatRes = await request('/api/ai/chat', {
    method: 'POST',
    body: {
      message: 'KAIST 인턴십 일정 등록',
      type: 'text',
      sessionId: 'test-session-' + Date.now(),
      locale: 'ko',
      // 직접 action을 포함하여 테스트 (실제로는 ChatCalendarService가 이를 반환)
      actionOverride: simulatedImageResponse.action // 테스트용
    }
  });

  console.log('\n📊 AI 채팅 응답:');
  console.log('Status:', chatRes.status);
  console.log('Response:', JSON.stringify(chatRes.data, null, 2));

  // 이벤트가 생성되었는지 확인
  console.log('\n🔍 생성된 이벤트 확인...');

  const eventsRes = await request('/api/calendar/events');

  if (eventsRes.data.success) {
    const events = eventsRes.data.data?.events || [];
    const kaistEvents = events.filter(e =>
      e.summary?.includes('KAIST') || e.title?.includes('KAIST')
    );

    console.log(`\n✅ 발견된 KAIST 관련 이벤트: ${kaistEvents.length}개`);
    kaistEvents.forEach(e => {
      console.log(`  - ${e.summary || e.title}: ${e.start_time || e.start?.dateTime}`);
    });

    if (kaistEvents.length === 0) {
      console.log('\n⚠️ 이벤트가 DB에 저장되지 않았습니다!');
      console.log('문제: AI가 action을 반환하지만 실제로 /api/calendar/create가 호출되지 않음');
    }
  } else {
    console.log('❌ 이벤트 조회 실패:', eventsRes.data);
  }
}

testImageEventCreation().catch(console.error);