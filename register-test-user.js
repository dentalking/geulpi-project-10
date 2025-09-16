/**
 * 테스트 사용자 등록 스크립트
 */

const https = require('https');
const http = require('http');

const config = {
  baseUrl: 'http://localhost:3000',
  testEmail: 'test@example.com',
  testPassword: 'test123456'
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
        ...options.headers
      }
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
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

async function registerTestUser() {
  console.log('📝 테스트 사용자 등록 시도...');
  console.log(`Email: ${config.testEmail}`);
  console.log(`Password: ${config.testPassword}`);

  try {
    // Signup endpoint 사용
    const res = await request('/api/auth/signup', {
      method: 'POST',
      body: {
        email: config.testEmail,
        password: config.testPassword,
        name: 'Test User'
      }
    });

    if (res.status === 200 && res.data.success) {
      console.log('✅ 사용자 등록 성공:', res.data);
    } else if (res.status === 409 || res.data.error?.includes('already')) {
      console.log('ℹ️ 사용자가 이미 존재합니다');
    } else {
      console.log('❌ 등록 실패:', res.data);
    }

    // 로그인 테스트
    console.log('\n🔐 로그인 테스트...');
    const loginRes = await request('/api/auth/email-login', {
      method: 'POST',
      body: {
        email: config.testEmail,
        password: config.testPassword
      }
    });

    if (loginRes.status === 200 && loginRes.data.success) {
      console.log('✅ 로그인 성공!');
      console.log('Token:', loginRes.data.token ? '받음' : '없음');
    } else {
      console.log('❌ 로그인 실패:', loginRes.data);
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  }
}

registerTestUser();