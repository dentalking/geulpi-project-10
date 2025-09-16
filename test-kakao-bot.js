/**
 * 카카오톡 봇 & 게스트 토큰 테스트 스크립트
 */

const http = require('http');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
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

// 테스트 케이스들
const tests = {
  // 1. 카카오톡 인사말 테스트
  async testKakaoGreeting() {
    console.log('\n👋 카카오톡 인사말 테스트...');

    const res = await request('/api/kakao/webhook', {
      method: 'POST',
      body: {
        user_key: 'test_user_123',
        type: 'text',
        content: '안녕'
      }
    });

    const hasGreeting = res.data.message?.text?.includes('안녕하세요');
    const hasButtons = res.data.keyboard?.buttons?.length > 0;

    return {
      success: res.status === 200 && hasGreeting && hasButtons,
      message: hasGreeting ? '인사말 응답 정상' : '인사말 응답 실패'
    };
  },

  // 2. 비가입자 일정 조회 테스트
  async testGuestScheduleQuery() {
    console.log('\n📅 비가입자 일정 조회 테스트...');

    const res = await request('/api/kakao/webhook', {
      method: 'POST',
      body: {
        user_key: 'guest_user_456',
        type: 'text',
        content: '오늘 일정 보기'
      }
    });

    const hasRegistrationPrompt = res.data.message?.text?.includes('서비스와 연결');
    const hasButton = res.data.message?.message_button?.url?.includes('/auth/register');

    return {
      success: res.status === 200 && hasRegistrationPrompt,
      message: hasRegistrationPrompt ? '비가입자 안내 정상' : '비가입자 처리 실패'
    };
  },

  // 3. 친구와 약속 제안 테스트
  async testAppointmentProposal() {
    console.log('\n👥 친구와 약속 제안 테스트...');

    const res = await request('/api/kakao/webhook', {
      method: 'POST',
      body: {
        user_key: 'test_user_123',
        type: 'text',
        content: '김철수와 내일 오후 3시 강남역에서 만나기'
      }
    });

    const hasConfirmation = res.data.message?.text?.includes('약속 제안');

    return {
      success: res.status === 200 && hasConfirmation,
      message: hasConfirmation ? '약속 제안 처리 정상' : '약속 파싱 실패'
    };
  },

  // 4. 도움말 테스트
  async testHelp() {
    console.log('\n❓ 도움말 테스트...');

    const res = await request('/api/kakao/webhook', {
      method: 'POST',
      body: {
        user_key: 'test_user_123',
        type: 'text',
        content: '도움말'
      }
    });

    const hasHelpText = res.data.message?.text?.includes('사용법');

    return {
      success: res.status === 200 && hasHelpText,
      message: hasHelpText ? '도움말 표시 정상' : '도움말 응답 실패'
    };
  },

  // 5. 게스트 토큰 생성 테스트
  async testGuestTokenGeneration() {
    console.log('\n🎟️ 게스트 토큰 생성 테스트...');

    // 게스트 토큰 생성을 위한 내부 테스트
    const { generateGuestToken, verifyGuestToken } = require('./src/lib/guest-token.ts');

    try {
      const token = generateGuestToken('kakao', 'kakao_user_789', {
        eventId: 'test_event_123'
      });

      const verified = verifyGuestToken(token);

      return {
        success: verified !== null && verified.guestId && verified.platform === 'kakao',
        message: verified ? '게스트 토큰 생성/검증 성공' : '토큰 검증 실패'
      };
    } catch (error) {
      return {
        success: false,
        message: `토큰 생성 에러: ${error.message}`
      };
    }
  },

  // 6. 사진 메시지 처리 테스트
  async testPhotoMessage() {
    console.log('\n📸 사진 메시지 테스트...');

    const res = await request('/api/kakao/webhook', {
      method: 'POST',
      body: {
        user_key: 'test_user_123',
        type: 'photo',
        content: 'http://example.com/photo.jpg'
      }
    });

    const hasPhotoResponse = res.data.message?.text?.includes('사진');

    return {
      success: res.status === 200 && hasPhotoResponse,
      message: hasPhotoResponse ? '사진 메시지 처리 정상' : '사진 처리 실패'
    };
  },

  // 7. 버튼 선택 테스트
  async testButtonSelection() {
    console.log('\n🔘 버튼 선택 테스트...');

    const res = await request('/api/kakao/webhook', {
      method: 'POST',
      body: {
        user_key: 'test_user_123',
        type: 'button',
        content: '📅 오늘 일정 보기'
      }
    });

    // 버튼 선택은 텍스트로 처리됨
    const hasResponse = res.status === 200 && res.data.message;

    return {
      success: hasResponse,
      message: hasResponse ? '버튼 선택 처리 정상' : '버튼 처리 실패'
    };
  },

  // 8. 연속 대화 테스트
  async testConversationFlow() {
    console.log('\n💬 연속 대화 흐름 테스트...');

    const userKey = 'conversation_test_' + Date.now();

    // 첫 번째 메시지
    const res1 = await request('/api/kakao/webhook', {
      method: 'POST',
      body: {
        user_key: userKey,
        type: 'text',
        content: '안녕'
      }
    });

    // 두 번째 메시지 (친구와 약속)
    const res2 = await request('/api/kakao/webhook', {
      method: 'POST',
      body: {
        user_key: userKey,
        type: 'text',
        content: '친구와 약속 잡기'
      }
    });

    const firstOk = res1.status === 200;
    const secondOk = res2.status === 200 && res2.data.message?.text?.includes('친구');

    return {
      success: firstOk && secondOk,
      message: firstOk && secondOk ? '대화 흐름 정상' : '대화 연속성 문제'
    };
  }
};

// 메인 실행 함수
async function runTests() {
  console.log(`${colors.cyan}🤖 카카오톡 봇 & 게스트 토큰 테스트 시작${colors.reset}`);
  console.log('=' .repeat(50));
  console.log(`시간: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(50));

  const results = [];
  let passCount = 0;
  let failCount = 0;

  for (const [name, testFn] of Object.entries(tests)) {
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
    console.log(`\n${colors.yellow}⚠️ 실패한 테스트:${colors.reset}`);
    failures.forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }

  // 다음 단계
  console.log(`\n${colors.blue}💡 다음 단계:${colors.reset}`);
  if (successRate === 100) {
    console.log('  ✨ 모든 테스트 통과!');
    console.log('  - 카카오 비즈니스 채널 생성 진행');
    console.log('  - Production 환경 설정');
  } else if (successRate >= 70) {
    console.log('  ⚡ 주요 기능 정상');
    console.log('  - 실패한 기능 디버깅');
    console.log('  - 에러 처리 강화');
  } else {
    console.log('  ⚠️ 추가 개발 필요');
    console.log('  - 핵심 로직 수정');
    console.log('  - 테스트 케이스 보완');
  }

  return { successRate, results };
}

// 실행
async function main() {
  try {
    console.log(`${colors.yellow}🔍 서버 연결 확인 중...${colors.reset}`);
    await request('/api/health');
    console.log(`${colors.green}✅ 서버 연결 성공${colors.reset}\n`);

    const { successRate } = await runTests();
    process.exit(successRate === 100 ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}❌ 서버 연결 실패!${colors.reset}`);
    console.error('서버를 먼저 시작하세요: npm run dev');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { tests, request };