/**
 * 언어 변경 명령어 테스트
 * 브라우저 콘솔에서 실행하여 언어 변경 패턴 매칭 테스트
 *
 * 사용법:
 * 1. 개발 서버 실행 (npm run dev)
 * 2. 브라우저에서 localhost:3000 열기
 * 3. 브라우저 콘솔에서 이 스크립트 실행
 */

// 언어 변경 패턴 테스트
function testLanguagePatterns() {
  console.log('🌐 언어 변경 패턴 테스트 시작...\n');

  // 한국어 패턴들
  const koreanPatterns = [
    /한국어.*모드/i,
    /한국어.*변경/i,
    /한국어.*전환/i,
    /한국어로/i,
    /한국어/i,
    /한글.*모드/i,
    /한글로/i,
    /한글/i,
    /korean/i,
    /ko/i
  ];

  // 영어 패턴들
  const englishPatterns = [
    /영어.*모드/i,
    /영어.*변경/i,
    /영어.*전환/i,
    /영어로/i,
    /영어/i,
    /english/i,
    /en/i,
    /잉글리시/i
  ];

  // 테스트할 메시지들
  const testMessages = [
    "한국어모드로 변경",
    "한국어 모드로 변경해줘",
    "한국어로 바꿔줘",
    "한글로 설정",
    "영어모드로 변경",
    "영어 모드로 전환",
    "영어로 바꿔줘",
    "English mode",
    "korean mode"
  ];

  // 각 메시지 테스트
  testMessages.forEach(msg => {
    console.log(`\n📝 메시지: "${msg}"`);

    let matched = false;

    // 한국어 패턴 체크
    koreanPatterns.forEach((pattern, idx) => {
      if (pattern.test(msg)) {
        console.log(`  ✅ 한국어 패턴 ${idx + 1} 매칭: ${pattern}`);
        matched = true;
      }
    });

    // 영어 패턴 체크
    englishPatterns.forEach((pattern, idx) => {
      if (pattern.test(msg)) {
        console.log(`  ✅ 영어 패턴 ${idx + 1} 매칭: ${pattern}`);
        matched = true;
      }
    });

    if (!matched) {
      console.log('  ❌ 매칭되는 패턴 없음');
    }
  });
}

// 현재 언어 상태 확인
function checkCurrentLanguage() {
  console.log('\n📊 현재 언어 설정 상태:');

  const checks = {
    'localStorage': localStorage.getItem('locale'),
    'URL path': window.location.pathname.split('/').filter(Boolean)[0],
    'HTML lang': document.documentElement.lang,
    'Browser lang': navigator.language,
    'Browser languages': navigator.languages?.join(', ')
  };

  console.table(checks);

  // 실제 언어 판별
  let currentLocale = 'unknown';

  if (localStorage.getItem('locale')) {
    currentLocale = localStorage.getItem('locale');
  } else if (window.location.pathname.includes('/ko')) {
    currentLocale = 'ko';
  } else if (window.location.pathname.includes('/en')) {
    currentLocale = 'en';
  } else if (document.documentElement.lang) {
    currentLocale = document.documentElement.lang;
  } else {
    currentLocale = 'ko'; // 기본값
  }

  console.log(`\n🎯 현재 언어: ${currentLocale === 'ko' ? '한국어' : '영어'} (${currentLocale})`);
  return currentLocale;
}

// 언어 변경 시뮬레이션
async function simulateLanguageChange(targetLocale) {
  console.log(`\n🔄 언어 변경 시뮬레이션: ${targetLocale === 'ko' ? '한국어' : '영어'}`);

  const currentLocale = checkCurrentLanguage();

  if (currentLocale === targetLocale) {
    console.log(`⚠️ 이미 ${targetLocale === 'ko' ? '한국어' : '영어'}로 설정되어 있습니다.`);
    return false;
  }

  console.log('✅ 언어 변경 중...');

  // localStorage 업데이트
  localStorage.setItem('locale', targetLocale);

  // URL 변경 시뮬레이션
  const currentPath = window.location.pathname;
  const segments = currentPath.split('/').filter(Boolean);
  const localeIndex = segments.findIndex(seg => ['ko', 'en'].includes(seg));

  if (localeIndex !== -1) {
    segments[localeIndex] = targetLocale;
  } else {
    segments.unshift(targetLocale);
  }

  const newPath = '/' + segments.join('/');
  console.log(`📍 새 경로: ${newPath}`);

  // 실제로 페이지 이동하려면:
  // window.location.pathname = newPath;

  return true;
}

// 실행
console.log('='.repeat(50));
testLanguagePatterns();
console.log('\n' + '='.repeat(50));
checkCurrentLanguage();
console.log('\n' + '='.repeat(50));

// 테스트 예시
console.log('\n💡 테스트하려면:');
console.log('  simulateLanguageChange("ko")  // 한국어로 변경');
console.log('  simulateLanguageChange("en")  // 영어로 변경');

// 실제 패턴 매칭 테스트 함수
window.testLanguageCommand = function(message) {
  console.log(`\n🧪 명령어 테스트: "${message}"`);

  const koreanPatterns = [
    /한국어.*모드/i,
    /한국어.*변경/i,
    /한국어.*전환/i,
    /한국어로/i,
    /한국어/i,
    /한글.*모드/i,
    /한글로/i,
    /한글/i,
    /korean/i,
    /ko/i
  ];

  const englishPatterns = [
    /영어.*모드/i,
    /영어.*변경/i,
    /영어.*전환/i,
    /영어로/i,
    /영어/i,
    /english/i,
    /en/i,
    /잉글리시/i
  ];

  const isKorean = koreanPatterns.some(p => p.test(message));
  const isEnglish = englishPatterns.some(p => p.test(message));

  if (isKorean) {
    console.log('✅ 한국어 변경 명령어로 인식됨');
    return 'ko';
  } else if (isEnglish) {
    console.log('✅ 영어 변경 명령어로 인식됨');
    return 'en';
  } else {
    console.log('❌ 인식되지 않는 명령어');
    return null;
  }
};

console.log('\n사용법: testLanguageCommand("한국어모드로 변경")');