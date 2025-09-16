/**
 * Google OAuth 사용자 이벤트 표시 테스트
 * Google OAuth로 인증된 사용자가 Google Calendar의 이벤트를
 * 우리 서비스 UI에서 볼 수 있는지 확인
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

async function testGoogleOAuthEventsDisplay() {
  console.log('🔍 Google OAuth 사용자 이벤트 표시 테스트\n');
  console.log('=' .repeat(50));

  // 1. 서버 상태 확인
  console.log('\n1️⃣ 서버 상태 확인...');
  const healthRes = await request('/api/health');
  if (healthRes.status === 200) {
    console.log('✅ 서버 정상 작동');
  } else {
    console.log('❌ 서버 응답 없음');
    return;
  }

  // 2. Google OAuth 인증 상태 확인
  console.log('\n2️⃣ Google OAuth 인증 확인...');
  console.log('⚠️  브라우저에서 Google OAuth로 로그인한 후 쿠키를 복사해야 합니다.');
  console.log('   개발자 도구 > Application > Cookies에서 다음 쿠키들을 확인:');
  console.log('   - access_token 또는 google_access_token');
  console.log('   - refresh_token 또는 google_refresh_token\n');

  // 3. 캘린더 이벤트 조회 API 테스트
  console.log('3️⃣ 캘린더 이벤트 조회 API 호출...');
  const eventsRes = await request('/api/calendar/events');

  console.log('\n📊 API 응답 상태:');
  console.log('   Status Code:', eventsRes.status);
  console.log('   Success:', eventsRes.data.success);

  if (eventsRes.data.success) {
    const events = eventsRes.data.events || [];
    console.log(`\n✅ 조회 성공! 총 ${events.length}개의 이벤트를 가져왔습니다.`);

    // 이벤트 소스 확인
    const googleEvents = events.filter(e => e.source === 'google');
    const localEvents = events.filter(e => e.source === 'local' || !e.source);

    console.log(`\n📊 이벤트 분석:`);
    console.log(`   - Google Calendar 이벤트: ${googleEvents.length}개`);
    console.log(`   - 로컬 DB 이벤트: ${localEvents.length}개`);

    // 최근 이벤트 표시
    if (events.length > 0) {
      console.log('\n📅 최근 이벤트 (최대 5개):');
      events.slice(0, 5).forEach((event, i) => {
        console.log(`\n   ${i + 1}. ${event.summary || '제목 없음'}`);
        console.log(`      - 시작: ${event.start?.dateTime || event.start?.date || event.start_time}`);
        console.log(`      - 종료: ${event.end?.dateTime || event.end?.date || event.end_time}`);
        console.log(`      - 위치: ${event.location || '미정'}`);
        console.log(`      - 소스: ${event.source || 'unknown'}`);
        if (event.googleEventId) {
          console.log(`      - Google ID: ${event.googleEventId}`);
        }
      });
    }

    // Google Calendar API 연동 확인
    console.log('\n🔗 Google Calendar API 연동 상태:');
    if (googleEvents.length > 0) {
      console.log('   ✅ Google Calendar와 정상 연동됨');
      console.log('   📌 Google Calendar의 이벤트가 UI에 표시되어야 합니다.');
    } else if (events.length > 0) {
      console.log('   ⚠️ 로컬 DB 이벤트만 조회됨');
      console.log('   📌 Google OAuth 인증이 필요하거나 Google Calendar에 이벤트가 없습니다.');
    } else {
      console.log('   ℹ️ 이벤트가 없습니다.');
    }

  } else {
    console.log('\n❌ 이벤트 조회 실패:');
    console.log('   Error:', eventsRes.data.error || eventsRes.data.message);

    if (eventsRes.status === 401) {
      console.log('\n💡 해결 방법:');
      console.log('   1. 브라우저에서 Google OAuth로 로그인');
      console.log('   2. 개발자 도구에서 쿠키 확인');
      console.log('   3. 이 스크립트의 config.cookies에 쿠키 설정');
    }
  }

  // 4. 테스트 요약
  console.log('\n' + '=' .repeat(50));
  console.log('📋 테스트 요약:\n');

  if (eventsRes.data.success && eventsRes.data.events?.length > 0) {
    const hasGoogleEvents = events.some(e => e.source === 'google');
    if (hasGoogleEvents) {
      console.log('✅ Google OAuth 사용자의 Google Calendar 이벤트가 성공적으로 조회됩니다!');
      console.log('✅ UI에서 이벤트가 정상적으로 표시되어야 합니다.');
    } else {
      console.log('⚠️ Google Calendar 이벤트가 조회되지 않습니다.');
      console.log('   - Google Calendar에 이벤트가 있는지 확인');
      console.log('   - OAuth 인증이 올바른지 확인');
    }
  } else if (eventsRes.data.success) {
    console.log('ℹ️ API는 정상 작동하나 이벤트가 없습니다.');
    console.log('   - Google Calendar에 이벤트 추가 후 재시도');
  } else {
    console.log('❌ API 호출 실패. 인증 또는 서버 문제를 확인하세요.');
  }

  // 5. UI 확인 가이드
  console.log('\n🖥️ UI 확인 방법:');
  console.log('   1. 브라우저에서 http://localhost:3000 접속');
  console.log('   2. Google OAuth로 로그인');
  console.log('   3. 캘린더 페이지에서 이벤트 확인');
  console.log('   4. Google Calendar의 이벤트가 표시되는지 확인');
}

// 테스트 실행
testGoogleOAuthEventsDisplay().catch(console.error);