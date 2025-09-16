/**
 * 캘린더 이벤트 생성 디버깅 스크립트
 */

const https = require('https');
const http = require('http');

const config = {
  baseUrl: 'http://localhost:3000',
  authToken: null
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

async function testCalendarCreate() {
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

  console.log('\n📅 캘린더 이벤트 생성 시도...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const eventRes = await request('/api/calendar/create', {
    method: 'POST',
    body: {
      title: 'Debug Test Event',
      description: 'Testing RLS policies debug',
      startTime: tomorrow.toISOString(),
      endTime: new Date(tomorrow.getTime() + 3600000).toISOString(),
      location: 'Test Location'
    }
  });

  console.log('\n📊 결과:');
  console.log('Status:', eventRes.status);
  console.log('Response:', JSON.stringify(eventRes.data, null, 2));

  if (!eventRes.data.success) {
    console.log('\n⚠️ 에러 상세:');
    console.log('Error:', eventRes.data.error);
    console.log('Message:', eventRes.data.message);
  }
}

testCalendarCreate().catch(console.error);