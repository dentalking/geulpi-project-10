/**
 * AI 채팅을 통한 다중 이벤트 생성 테스트
 */

const https = require('https');
const http = require('http');

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

async function testMultipleEvents() {
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

  // 기존 이벤트 개수 확인
  console.log('\n📊 기존 이벤트 개수 확인...');
  const beforeRes = await request('/api/calendar/events');
  const beforeCount = beforeRes.data.events?.length || 0;
  console.log(`현재 이벤트 개수: ${beforeCount}개`);

  console.log('\n🤖 AI 채팅으로 다중 이벤트 생성 요청...');

  // AI에게 여러 일정을 한 번에 추가하도록 요청
  const chatRes = await request('/api/ai/chat', {
    method: 'POST',
    body: {
      message: '다음 일정들을 등록해줘: 1월 20일 오전 10시 팀 미팅, 1월 21일 오후 2시 프로젝트 발표, 1월 22일 오전 11시 고객 미팅',
      type: 'text',
      sessionId: 'test-multiple-' + Date.now(),
      locale: 'ko'
    }
  });

  console.log('\n📊 AI 응답:');
  console.log('Status:', chatRes.status);
  console.log('Message:', chatRes.data.data?.message);
  console.log('Action:', JSON.stringify(chatRes.data.data?.action, null, 2));

  // 잠시 대기
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 이벤트가 생성되었는지 확인
  console.log('\n🔍 생성된 이벤트 확인...');

  const afterRes = await request('/api/calendar/events');
  const afterCount = afterRes.data.events?.length || 0;
  const newEvents = afterCount - beforeCount;

  console.log(`\n📈 결과:`);
  console.log(`  - 이전 이벤트 개수: ${beforeCount}개`);
  console.log(`  - 현재 이벤트 개수: ${afterCount}개`);
  console.log(`  - 새로 생성된 이벤트: ${newEvents}개`);

  if (newEvents > 0) {
    console.log('\n✅ 다중 이벤트 생성 성공!');
    const events = afterRes.data.events || [];
    const recentEvents = events.slice(-newEvents);
    console.log('\n새로 생성된 이벤트:');
    recentEvents.forEach(e => {
      console.log(`  - ${e.summary || e.title}: ${e.start_time || e.start?.dateTime}`);
    });
  } else {
    console.log('\n❌ 이벤트가 생성되지 않았습니다.');
    console.log('문제 가능성:');
    console.log('1. AI가 create_multiple action을 반환하지 않음');
    console.log('2. action handler가 create_multiple을 처리하지 못함');
    console.log('3. 데이터베이스 저장 실패');
  }

  // 단일 이벤트도 테스트
  console.log('\n\n🎯 단일 이벤트 생성 테스트...');

  const singleChatRes = await request('/api/ai/chat', {
    method: 'POST',
    body: {
      message: '내일 오후 3시에 치과 예약 추가해줘',
      type: 'text',
      sessionId: 'test-single-' + Date.now(),
      locale: 'ko'
    }
  });

  console.log('단일 이벤트 AI 응답:', singleChatRes.data.data?.message);
  console.log('Action:', singleChatRes.data.data?.action?.type);

  // 잠시 대기 후 확인
  await new Promise(resolve => setTimeout(resolve, 2000));

  const finalRes = await request('/api/calendar/events');
  const finalCount = finalRes.data.events?.length || 0;
  const singleEventCreated = finalCount > afterCount;

  if (singleEventCreated) {
    console.log('✅ 단일 이벤트 생성 성공');
  } else {
    console.log('❌ 단일 이벤트 생성 실패');
  }
}

testMultipleEvents().catch(console.error);