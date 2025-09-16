/**
 * Google OAuth 사용자의 이벤트 조회 테스트
 */

const https = require('https');
const http = require('http');

const config = {
  baseUrl: 'http://localhost:3000',
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

async function testGoogleEventsAPI() {
  console.log('🔐 Google OAuth로 로그인...');
  console.log('주의: 이 테스트는 Google OAuth 인증 쿠키가 필요합니다.');
  console.log('브라우저에서 Google로 로그인한 후 쿠키를 복사해야 합니다.\n');

  // Google OAuth 인증 쿠키를 설정 (브라우저에서 복사)
  // 실제로는 브라우저에서 로그인 후 쿠키를 가져와야 함
  console.log('📅 캘린더 이벤트 조회 시도...');

  const eventsRes = await request('/api/calendar/events');

  console.log('\n📊 응답:');
  console.log('Status:', eventsRes.status);
  console.log('Success:', eventsRes.data.success);

  if (eventsRes.data.success) {
    const events = eventsRes.data.events || [];
    console.log(`\n📋 조회된 이벤트: ${events.length}개`);

    // 최근 생성된 이벤트 찾기
    const brainEvents = events.filter(e =>
      e.summary?.includes('뇌인지') ||
      e.summary?.includes('브레인') ||
      e.summary?.includes('적성')
    );

    if (brainEvents.length > 0) {
      console.log('\n✅ 뇌인지 프로그램 관련 이벤트:');
      brainEvents.forEach(e => {
        console.log(`  - ${e.summary}`);
        console.log(`    날짜: ${e.start?.dateTime || e.start?.date}`);
        console.log(`    장소: ${e.location || '미정'}`);
        console.log(`    ID: ${e.id}`);
      });
    } else {
      console.log('\n⚠️ 뇌인지 프로그램 관련 이벤트를 찾을 수 없습니다.');
    }

    // 모든 이벤트 요약
    console.log('\n📊 전체 이벤트 목록 (최대 10개):');
    events.slice(0, 10).forEach((e, i) => {
      console.log(`${i + 1}. ${e.summary || '제목 없음'} - ${e.start?.dateTime || e.start?.date}`);
    });

  } else {
    console.log('❌ 이벤트 조회 실패:', eventsRes.data);
  }

  // 쿠키 확인
  console.log('\n🍪 사용된 쿠키:');
  const cookieList = config.cookies?.split('; ') || [];
  cookieList.forEach(cookie => {
    const [name] = cookie.split('=');
    if (name.includes('auth') || name.includes('token') || name.includes('access')) {
      console.log(`  - ${name}: [존재함]`);
    }
  });
}

// 테스트 실행
testGoogleEventsAPI().catch(console.error);