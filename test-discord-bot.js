/**
 * Discord 봇 테스트 스크립트
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
  magenta: '\x1b[35m'
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
        'X-Signature-Ed25519': 'test_signature',
        'X-Signature-Timestamp': Date.now().toString(),
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

// 샘플 Discord 인터랙션 생성기
function createDiscordInteraction(type, data = {}, userId = 'test_user_123') {
  const baseInteraction = {
    id: `test_interaction_${Date.now()}`,
    application_id: 'test_app_id',
    type: type,
    user: {
      id: userId,
      username: 'TestUser',
      discriminator: '1234'
    },
    token: 'test_token',
    version: 1
  };

  if (type === 2) { // APPLICATION_COMMAND
    baseInteraction.data = data;
  } else if (type === 3) { // MESSAGE_COMPONENT
    baseInteraction.data = data;
  }

  return baseInteraction;
}

// 테스트 케이스들
const tests = {
  // 1. PING 테스트 (Discord 필수)
  async testPing() {
    console.log('\n🏓 Discord PING 테스트...');

    const interaction = createDiscordInteraction(1); // PING
    const res = await request('/api/discord/webhook', {
      method: 'POST',
      body: interaction
    });

    const isPong = res.data.type === 1;

    return {
      success: res.status === 200 && isPong,
      message: isPong ? 'PING/PONG 정상' : 'PING 응답 실패'
    };
  },

  // 2. 도움말 슬래시 커맨드 테스트
  async testHelpCommand() {
    console.log('\n❓ 도움말 명령어 테스트...');

    const interaction = createDiscordInteraction(2, {
      id: 'help_cmd',
      name: 'help',
      type: 1
    });

    const res = await request('/api/discord/webhook', {
      method: 'POST',
      body: interaction
    });

    const hasEmbed = res.data.data?.embeds?.[0]?.title?.includes('사용법');
    const hasFields = res.data.data?.embeds?.[0]?.fields?.length > 0;

    return {
      success: res.status === 200 && hasEmbed && hasFields,
      message: hasEmbed ? '도움말 임베드 정상' : '도움말 응답 실패'
    };
  },

  // 3. 오늘 일정 명령어 테스트 (비가입자)
  async testTodayCommandUnregistered() {
    console.log('\n📅 비가입자 오늘 일정 테스트...');

    const interaction = createDiscordInteraction(2, {
      id: 'today_cmd',
      name: 'today',
      type: 1
    }, 'unregistered_user_456');

    const res = await request('/api/discord/webhook', {
      method: 'POST',
      body: interaction
    });

    const hasRegistrationPrompt = res.data.data?.embeds?.[0]?.title?.includes('연결');
    const hasButton = res.data.data?.components?.[0]?.components?.[0]?.url?.includes('register');

    return {
      success: res.status === 200 && hasRegistrationPrompt,
      message: hasRegistrationPrompt ? '비가입자 안내 정상' : '등록 안내 실패'
    };
  },

  // 4. 일정 생성 명령어 테스트
  async testScheduleCommand() {
    console.log('\n➕ 일정 생성 명령어 테스트...');

    const interaction = createDiscordInteraction(2, {
      id: 'schedule_cmd',
      name: 'schedule',
      type: 1,
      options: [
        { name: 'title', type: 3, value: '팀 미팅' },
        { name: 'datetime', type: 3, value: '2024-01-15 14:00' },
        { name: 'location', type: 3, value: '회의실 A' }
      ]
    });

    const res = await request('/api/discord/webhook', {
      method: 'POST',
      body: interaction
    });

    // 비가입자이므로 등록 안내가 나와야 함
    const hasRegistrationPrompt = res.data.data?.embeds?.[0]?.title?.includes('연결');

    return {
      success: res.status === 200 && hasRegistrationPrompt,
      message: hasRegistrationPrompt ? '일정 생성 요청 처리 정상' : '일정 생성 실패'
    };
  },

  // 5. 친구 명령어 테스트
  async testFriendsCommand() {
    console.log('\n👥 친구 관리 명령어 테스트...');

    const interaction = createDiscordInteraction(2, {
      id: 'friends_cmd',
      name: 'friends',
      type: 1
    });

    const res = await request('/api/discord/webhook', {
      method: 'POST',
      body: interaction
    });

    const hasRegistrationPrompt = res.data.data?.embeds?.[0]?.title?.includes('연결');

    return {
      success: res.status === 200 && hasRegistrationPrompt,
      message: hasRegistrationPrompt ? '친구 명령어 처리 정상' : '친구 명령어 실패'
    };
  },

  // 6. 만나기 명령어 테스트
  async testMeetCommand() {
    console.log('\n🤝 만나기 명령어 테스트...');

    const interaction = createDiscordInteraction(2, {
      id: 'meet_cmd',
      name: 'meet',
      type: 1,
      options: [
        { name: 'friend', type: 6, value: '987654321' }, // USER type
        { name: 'date', type: 3, value: '내일' }
      ]
    });

    const res = await request('/api/discord/webhook', {
      method: 'POST',
      body: interaction
    });

    const hasRegistrationPrompt = res.data.data?.embeds?.[0]?.title?.includes('연결');

    return {
      success: res.status === 200 && hasRegistrationPrompt,
      message: hasRegistrationPrompt ? '만나기 명령어 처리 정상' : '만나기 명령어 실패'
    };
  },

  // 7. 버튼 인터랙션 테스트
  async testButtonInteraction() {
    console.log('\n🔘 버튼 인터랙션 테스트...');

    const interaction = createDiscordInteraction(3, {
      custom_id: 'register_btn',
      component_type: 2
    });

    const res = await request('/api/discord/webhook', {
      method: 'POST',
      body: interaction
    });

    const hasResponse = res.status === 200 && res.data.data;

    return {
      success: hasResponse,
      message: hasResponse ? '버튼 인터랙션 처리 정상' : '버튼 처리 실패'
    };
  },

  // 8. 잘못된 명령어 테스트
  async testInvalidCommand() {
    console.log('\n❌ 잘못된 명령어 테스트...');

    const interaction = createDiscordInteraction(2, {
      id: 'invalid_cmd',
      name: 'nonexistent',
      type: 1
    });

    const res = await request('/api/discord/webhook', {
      method: 'POST',
      body: interaction
    });

    const hasDefaultResponse = res.status === 200 && res.data.data;

    return {
      success: hasDefaultResponse,
      message: hasDefaultResponse ? '잘못된 명령어 처리 정상' : '기본 응답 실패'
    };
  },

  // 9. 새로운 사용자 등록 테스트
  async testNewUserRegistration() {
    console.log('\n👤 신규 사용자 등록 테스트...');

    const newUserId = `new_user_${Date.now()}`;
    const interaction = createDiscordInteraction(2, {
      id: 'help_cmd',
      name: 'help',
      type: 1
    }, newUserId);

    const res = await request('/api/discord/webhook', {
      method: 'POST',
      body: interaction
    });

    const hasResponse = res.status === 200 && res.data.type === 4;

    return {
      success: hasResponse,
      message: hasResponse ? '신규 사용자 처리 정상' : '신규 사용자 처리 실패'
    };
  },

  // 10. 임베드 메시지 형식 검증
  async testEmbedFormat() {
    console.log('\n🎨 임베드 메시지 형식 테스트...');

    const interaction = createDiscordInteraction(2, {
      id: 'help_cmd',
      name: 'help',
      type: 1
    });

    const res = await request('/api/discord/webhook', {
      method: 'POST',
      body: interaction
    });

    const embed = res.data.data?.embeds?.[0];
    const hasTitle = embed?.title;
    const hasColor = typeof embed?.color === 'number';
    const hasFields = Array.isArray(embed?.fields);

    return {
      success: res.status === 200 && hasTitle && hasColor && hasFields,
      message: (hasTitle && hasColor && hasFields) ? '임베드 형식 정상' : '임베드 형식 오류'
    };
  }
};

// 메인 실행 함수
async function runTests() {
  console.log(`${colors.cyan}🤖 Discord 봇 테스트 시작${colors.reset}`);
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

  // Discord 봇 특화 분석
  console.log(`\n${colors.magenta}🎯 Discord 봇 특화 분석:${colors.reset}`);

  const pingTest = results.find(r => r.name === 'testPing');
  const embedTest = results.find(r => r.name === 'testEmbedFormat');
  const interactionTest = results.find(r => r.name === 'testButtonInteraction');

  if (pingTest?.success) {
    console.log(`  ${colors.green}✅ Discord 검증 (PING/PONG) 통과${colors.reset}`);
  }

  if (embedTest?.success) {
    console.log(`  ${colors.green}✅ 임베드 메시지 형식 정상${colors.reset}`);
  }

  if (interactionTest?.success) {
    console.log(`  ${colors.green}✅ 인터랙션 처리 정상${colors.reset}`);
  }

  // 다음 단계
  console.log(`\n${colors.blue}💡 다음 단계:${colors.reset}`);
  if (successRate === 100) {
    console.log('  ✨ 모든 테스트 통과!');
    console.log('  - Discord 앱 생성 및 봇 등록');
    console.log('  - 슬래시 커맨드 배포');
    console.log('  - Production 서버 설정');
  } else if (successRate >= 80) {
    console.log('  ⚡ 주요 기능 정상');
    console.log('  - 실패한 기능 수정');
    console.log('  - Discord API 연동 테스트');
  } else {
    console.log('  ⚠️ 추가 개발 필요');
    console.log('  - 핵심 로직 검토');
    console.log('  - Discord 인터랙션 형식 확인');
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