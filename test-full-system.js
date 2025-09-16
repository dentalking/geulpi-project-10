/**
 * 전체 시스템 통합 테스트 스크립트
 * 기존 기능 + 메신저 봇 통합 검증
 */

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
  magenta: '\x1b[35m',
  bright: '\x1b[1m'
};

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.baseUrl);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 3000,
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

    const req = http.request(reqOptions, (res) => {
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

// 전체 시스템 테스트 케이스
const systemTests = {
  // === 기본 시스템 ===
  async testSystemHealth() {
    console.log('\n🏥 시스템 상태 확인...');
    const res = await request('/api/health');
    return {
      success: res.status === 200,
      message: res.status === 200 ? '시스템 정상' : '시스템 오류'
    };
  },

  async testAuthentication() {
    console.log('\n🔐 인증 시스템...');
    const loginRes = await request('/api/auth/email-login', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'test123456'
      }
    });

    if (loginRes.data.success) {
      config.authToken = loginRes.data.token || loginRes.data.data?.token;
      return { success: true, message: '인증 성공' };
    }
    return { success: false, message: '인증 실패' };
  },

  async testCalendarAPI() {
    console.log('\n📅 캘린더 API...');
    const eventsRes = await request('/api/calendar/events');
    return {
      success: eventsRes.status === 200,
      message: eventsRes.status === 200 ? `이벤트 ${eventsRes.data.events?.length || 0}개 조회` : '캘린더 API 오류'
    };
  },

  async testAI() {
    console.log('\n🤖 AI 시스템...');
    const aiRes = await request('/api/ai/chat', {
      method: 'POST',
      body: {
        message: '안녕하세요',
        type: 'text',
        sessionId: 'test-' + Date.now(),
        locale: 'ko'
      }
    });

    return {
      success: aiRes.status === 200 && aiRes.data.success,
      message: aiRes.data.success ? 'AI 응답 정상' : 'AI 시스템 오류'
    };
  },

  async testFriendsSystem() {
    console.log('\n👥 친구 시스템...');
    const friendsRes = await request('/api/friends');
    return {
      success: friendsRes.status === 200,
      message: friendsRes.status === 200 ? `친구 ${friendsRes.data.friends?.length || 0}명` : '친구 시스템 오류'
    };
  },

  async testMapsAPI() {
    console.log('\n🗺️ 지도 API...');
    const mapRes = await request('/api/maps/midpoint', {
      method: 'POST',
      body: {
        userLocations: [
          { userId: 'user1', location: { lat: 37.5665, lng: 126.9780 }, name: '사용자1' },
          { userId: 'user2', location: { lat: 37.5172, lng: 127.0473 }, name: '사용자2' }
        ],
        placeType: 'cafe'
      }
    });

    return {
      success: mapRes.status === 200 && mapRes.data.success,
      message: mapRes.data.success ? `${mapRes.data.nearbyPlaces?.length || 0}개 장소 추천` : '지도 API 오류'
    };
  },

  // === 메신저 봇 시스템 ===
  async testKakaoBot() {
    console.log('\n💬 카카오톡 봇...');

    // 인사말 테스트
    const greetRes = await request('/api/kakao/webhook', {
      method: 'POST',
      body: {
        user_key: 'system_test_user',
        type: 'text',
        content: '안녕'
      }
    });

    const hasGreeting = greetRes.data.message?.text?.includes('안녕하세요');

    // 약속 제안 테스트
    const appointmentRes = await request('/api/kakao/webhook', {
      method: 'POST',
      body: {
        user_key: 'system_test_user',
        type: 'text',
        content: '김철수와 내일 오후 3시 강남역에서 만나기'
      }
    });

    const hasAppointment = appointmentRes.data.message?.text?.includes('약속 제안');

    return {
      success: greetRes.status === 200 && hasGreeting && appointmentRes.status === 200 && hasAppointment,
      message: (hasGreeting && hasAppointment) ? '카카오톡 봇 정상' : '카카오톡 봇 오류'
    };
  },

  async testDiscordBot() {
    console.log('\n🎮 Discord 봇...');

    // PING 테스트
    const pingRes = await request('/api/discord/webhook', {
      method: 'POST',
      headers: {
        'X-Signature-Ed25519': 'test',
        'X-Signature-Timestamp': Date.now().toString()
      },
      body: {
        id: 'test_ping',
        application_id: 'test_app',
        type: 1,
        token: 'test_token',
        version: 1
      }
    });

    // 도움말 명령어 테스트
    const helpRes = await request('/api/discord/webhook', {
      method: 'POST',
      headers: {
        'X-Signature-Ed25519': 'test',
        'X-Signature-Timestamp': Date.now().toString()
      },
      body: {
        id: 'test_help',
        application_id: 'test_app',
        type: 2,
        data: { id: 'help', name: 'help', type: 1 },
        user: { id: 'test_user', username: 'TestUser', discriminator: '0001' },
        token: 'test_token',
        version: 1
      }
    });

    const pongOk = pingRes.status === 200 && pingRes.data.type === 1;
    const helpOk = helpRes.status === 200 && helpRes.data.data?.embeds?.[0]?.title?.includes('사용법');

    return {
      success: pongOk && helpOk,
      message: (pongOk && helpOk) ? 'Discord 봇 정상' : 'Discord 봇 오류'
    };
  },

  // === 보안 및 게스트 시스템 ===
  async testGuestTokenSystem() {
    console.log('\n🎟️ 게스트 토큰 시스템...');

    try {
      const { generateGuestToken, verifyGuestToken } = require('./src/lib/guest-token.ts');

      const token = generateGuestToken('web', 'guest_test_user', {
        eventId: 'test_event'
      });

      const verified = verifyGuestToken(token);

      return {
        success: verified !== null && verified.guestId && verified.platform === 'web',
        message: verified ? '게스트 토큰 시스템 정상' : '게스트 토큰 오류'
      };
    } catch (error) {
      return {
        success: false,
        message: `게스트 토큰 오류: ${error.message}`
      };
    }
  },

  async testDatabaseSecurity() {
    console.log('\n🔒 데이터베이스 보안...');

    // 인증 없이 보호된 API 접근 시도
    const savedToken = config.authToken;
    config.authToken = null;

    const protectedRes = await request('/api/profile');
    config.authToken = savedToken;

    return {
      success: protectedRes.status === 401,
      message: protectedRes.status === 401 ? '보안 정책 정상' : '보안 정책 오류'
    };
  },

  // === 성능 및 안정성 ===
  async testConcurrentRequests() {
    console.log('\n⚡ 동시 요청 처리...');

    const startTime = Date.now();
    const promises = Array(10).fill().map(() => request('/api/health'));

    await Promise.all(promises);
    const duration = Date.now() - startTime;

    return {
      success: duration < 3000, // 3초 이내
      message: `10개 동시 요청 ${duration}ms 소요`
    };
  },

  async testErrorHandling() {
    console.log('\n⚠️ 에러 처리...');

    const badRes = await request('/api/calendar/events/invalid-id', {
      method: 'DELETE'
    });

    return {
      success: badRes.status >= 400,
      message: badRes.status >= 400 ? '에러 처리 정상' : '에러 처리 미흡'
    };
  }
};

// 메인 실행 함수
async function runFullSystemTest() {
  console.log(`${colors.bright}${colors.cyan}🚀 전체 시스템 통합 테스트${colors.reset}`);
  console.log('=' .repeat(60));
  console.log(`시간: ${new Date().toLocaleString()}`);
  console.log(`테스트 대상: 기본 시스템 + 메신저 봇 + 보안 + 성능`);
  console.log('=' .repeat(60));

  const results = [];
  let passCount = 0;
  let failCount = 0;

  // 카테고리별 결과 추적
  const categories = {
    '기본 시스템': ['testSystemHealth', 'testAuthentication', 'testCalendarAPI', 'testAI', 'testFriendsSystem', 'testMapsAPI'],
    '메신저 봇': ['testKakaoBot', 'testDiscordBot'],
    '보안 시스템': ['testGuestTokenSystem', 'testDatabaseSecurity'],
    '성능 안정성': ['testConcurrentRequests', 'testErrorHandling']
  };

  // 모든 테스트 실행
  for (const [name, testFn] of Object.entries(systemTests)) {
    try {
      const result = await testFn();
      results.push({ name, ...result });

      if (result.success) {
        console.log(`${colors.green}✅ ${result.message}${colors.reset}`);
        passCount++;
      } else {
        console.log(`${colors.red}❌ ${result.message}${colors.reset}`);
        failCount++;
      }
    } catch (error) {
      console.log(`${colors.red}❌ ${name}: ${error.message}${colors.reset}`);
      results.push({ name, success: false, message: error.message });
      failCount++;
    }
  }

  // 결과 요약
  console.log('\n' + '=' .repeat(60));
  console.log(`${colors.bright}${colors.cyan}📊 전체 시스템 테스트 결과${colors.reset}`);
  console.log(`${colors.green}✅ 성공: ${passCount}/${passCount + failCount}${colors.reset}`);

  const successRate = Math.round((passCount / (passCount + failCount)) * 100);
  let statusColor = colors.green;
  if (successRate < 50) statusColor = colors.red;
  else if (successRate < 80) statusColor = colors.yellow;

  console.log(`${colors.bright}${statusColor}📈 전체 성공률: ${successRate}%${colors.reset}`);

  // 카테고리별 분석
  console.log(`\n${colors.magenta}📋 카테고리별 분석:${colors.reset}`);
  for (const [category, testNames] of Object.entries(categories)) {
    const categoryResults = results.filter(r => testNames.includes(r.name));
    const categoryPass = categoryResults.filter(r => r.success).length;
    const categoryTotal = categoryResults.length;
    const categoryRate = Math.round((categoryPass / categoryTotal) * 100);

    let categoryColor = colors.green;
    if (categoryRate < 50) categoryColor = colors.red;
    else if (categoryRate < 80) categoryColor = colors.yellow;

    console.log(`  ${categoryColor}${category}: ${categoryPass}/${categoryTotal} (${categoryRate}%)${colors.reset}`);
  }

  // 실패한 테스트 상세
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(`\n${colors.yellow}⚠️ 주의가 필요한 항목:${colors.reset}`);
    failures.forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }

  // 시스템 상태 평가
  console.log(`\n${colors.blue}🎯 시스템 상태 평가:${colors.reset}`);
  if (successRate === 100) {
    console.log(`  ${colors.bright}${colors.green}🎉 완벽! 모든 시스템이 정상 작동합니다.${colors.reset}`);
    console.log('  ✨ Production 배포 준비 완료');
    console.log('  🚀 메신저 플랫폼 정식 연동 가능');
  } else if (successRate >= 90) {
    console.log(`  ${colors.green}🌟 우수! 대부분의 시스템이 안정적입니다.${colors.reset}`);
    console.log('  🔧 일부 항목 수정 후 배포 가능');
  } else if (successRate >= 70) {
    console.log(`  ${colors.yellow}⚡ 양호! 주요 기능이 정상 작동합니다.${colors.reset}`);
    console.log('  🛠️ 실패 항목 수정 필요');
  } else {
    console.log(`  ${colors.red}⚠️ 주의! 시스템 안정화가 필요합니다.${colors.reset}`);
    console.log('  🔨 핵심 기능 수정 후 재테스트');
  }

  // 다음 단계 권장사항
  console.log(`\n${colors.blue}💡 다음 단계 권장사항:${colors.reset}`);
  if (successRate >= 95) {
    console.log('  1. 실시간 알림 시스템 구현');
    console.log('  2. 카카오/Discord 정식 채널 생성');
    console.log('  3. Production 환경 배포');
    console.log('  4. 사용자 베타 테스트 시작');
  } else if (successRate >= 80) {
    console.log('  1. 실패한 기능 우선 수정');
    console.log('  2. 추가 안정성 테스트');
    console.log('  3. 실시간 알림 시스템 설계');
  } else {
    console.log('  1. 핵심 기능 안정화');
    console.log('  2. 보안 이슈 해결');
    console.log('  3. 성능 최적화');
  }

  return { successRate, results, categories };
}

// 실행
async function main() {
  try {
    const { successRate } = await runFullSystemTest();
    process.exit(successRate === 100 ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}❌ 테스트 실행 실패!${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { systemTests, request };