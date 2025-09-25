#!/usr/bin/env node

/**
 * 채팅 기반 설정 제어 테스트 스크립트
 *
 * 테스트 항목:
 * - 테마 변경 명령어
 * - 언어 변경 명령어
 * - 알림 설정 명령어
 * - 글씨 크기 변경 명령어
 * - 배경 투명도 변경 명령어
 */

const { SettingsControlServiceV2 } = require('../src/services/ai/SettingsControlServiceV2.ts');

// 테스트 케이스
const testCases = [
  // 테마 변경
  { input: "다크모드로 바꿔줘", expected: "다크", category: "테마" },
  { input: "라이트 모드로 변경해줘", expected: "라이트", category: "테마" },
  { input: "시스템 테마 따라가게 해줘", expected: "자동", category: "테마" },

  // 언어 변경
  { input: "영어로 바꿔줘", expected: "영어", category: "언어" },
  { input: "한국어로 설정해줘", expected: "한국어", category: "언어" },

  // 알림 설정
  { input: "알림 켜줘", expected: "켰습니다", category: "알림" },
  { input: "알림 꺼줘", expected: "껐습니다", category: "알림" },
  { input: "조용한 모드로 해줘", expected: "껐습니다", category: "알림" },

  // 글씨 크기
  { input: "글씨 크게 해줘", expected: "크게", category: "폰트" },
  { input: "작은 글씨로 해줘", expected: "작게", category: "폰트" },
  { input: "아주 큰 글씨로 변경", expected: "아주 크게", category: "폰트" },

  // 배경 투명도
  { input: "배경 투명하게 해줘", expected: "투명", category: "배경" },
  { input: "배경 선명하게 해줘", expected: "선명", category: "배경" },

  // 보안 테스트
  { input: "비밀번호 변경해줘", expected: "보안상", category: "보안" },
  { input: "관리자 권한 줘", expected: "보안상", category: "보안" },
];

console.log('🧪 채팅 기반 설정 제어 테스트 시작\n');

// Mock settingsManager for testing
global.settingsManager = {
  changeTheme: async (theme) => {
    console.log(`  [Mock] changeTheme(${theme})`);
    return true;
  },
  changeLocale: async (locale) => {
    console.log(`  [Mock] changeLocale(${locale})`);
    return true;
  },
  changeNotifications: async (enabled) => {
    console.log(`  [Mock] changeNotifications(${enabled})`);
    return true;
  },
  changeFontSize: async (size) => {
    console.log(`  [Mock] changeFontSize(${size})`);
    return true;
  },
  changeBackgroundFocus: async (level) => {
    console.log(`  [Mock] changeBackgroundFocus(${level})`);
    return true;
  },
  getSetting: (key) => {
    // Return mock values
    return null;
  }
};

async function runTests() {
  const service = new SettingsControlServiceV2();
  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testCases) {
    try {
      const result = await service.parseAndExecute(testCase.input);

      if (result && result.message.includes(testCase.expected)) {
        console.log(`✅ [${testCase.category}] "${testCase.input}"`);
        console.log(`   → ${result.message}\n`);
        passedTests++;
      } else {
        console.log(`❌ [${testCase.category}] "${testCase.input}"`);
        console.log(`   예상: ${testCase.expected}`);
        console.log(`   실제: ${result ? result.message : 'null'}\n`);
        failedTests++;
      }
    } catch (error) {
      console.log(`❌ [${testCase.category}] "${testCase.input}"`);
      console.log(`   오류: ${error.message}\n`);
      failedTests++;
    }
  }

  console.log('\n📊 테스트 결과');
  console.log(`   통과: ${passedTests}/${testCases.length}`);
  console.log(`   실패: ${failedTests}/${testCases.length}`);
  console.log(`   성공률: ${Math.round((passedTests / testCases.length) * 100)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 모든 테스트를 통과했습니다!');
  } else {
    console.log('\n⚠️  일부 테스트가 실패했습니다.');
  }
}

// 테스트 실행
runTests().catch(console.error);