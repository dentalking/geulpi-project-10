/**
 * AI 채팅 테스트 스크립트
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

async function testAIChat() {
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

  console.log('\n💬 채팅 세션 생성...');

  // 세션 생성
  const sessionRes = await request('/api/chat/sessions', {
    method: 'POST',
    body: {
      title: 'AI Test Chat Session'
    }
  });

  console.log('Session Response:', sessionRes.status, sessionRes.data);

  if (!sessionRes.data.success || !sessionRes.data.data?.id) {
    console.log('❌ 세션 생성 실패');
    return;
  }

  const sessionId = sessionRes.data.data.id;
  console.log('✅ 세션 생성 성공:', sessionId);

  console.log('\n🤖 AI 메시지 전송...');

  // AI 메시지 전송
  const chatRes = await request('/api/ai/chat', {
    method: 'POST',
    body: {
      message: '안녕하세요! 오늘 날씨가 어떤가요?',
      sessionId: sessionId,
      locale: 'ko'
    }
  });

  console.log('\n📊 AI 응답:');
  console.log('Status:', chatRes.status);
  console.log('Response:', JSON.stringify(chatRes.data, null, 2));

  if (!chatRes.data.success) {
    console.log('\n⚠️ 에러 상세:');
    console.log('Error:', chatRes.data.error);
    console.log('Message:', chatRes.data.message);
  }
}

testAIChat().catch(console.error);
