/**
 * 언어 전환 수정 사항 테스트
 * 브라우저 콘솔에서 실행
 */

async function testLanguageSwitchFix() {
  console.clear();
  console.log('🧪 언어 전환 수정 테스트 시작...\n');

  // 1. 현재 상태 확인
  console.log('📊 현재 상태:');
  console.log('  URL:', window.location.pathname);
  console.log('  localStorage:', localStorage.getItem('locale'));

  const urlSegments = window.location.pathname.split('/').filter(Boolean);
  const currentUrlLocale = ['ko', 'en'].includes(urlSegments[0]) ? urlSegments[0] : 'unknown';
  console.log('  현재 언어 (URL):', currentUrlLocale === 'ko' ? '한국어' : currentUrlLocale === 'en' ? '영어' : '알 수 없음');

  // 2. SettingsControlServiceV2 인스턴스 생성
  if (typeof SettingsControlServiceV2 === 'undefined') {
    console.log('\n❌ SettingsControlServiceV2를 찾을 수 없습니다.');
    console.log('   채팅 인터페이스가 열려있는지 확인하세요.');
    return;
  }

  // 3. 테스트 명령어 실행
  console.log('\n🔄 언어 전환 명령어 테스트...');

  const testCommands = [
    { command: '한국어모드로 전환', expectedLocale: 'ko' },
    { command: '영어 모드로 전환', expectedLocale: 'en' }
  ];

  for (const test of testCommands) {
    console.log(`\n📝 명령어: "${test.command}"`);
    console.log('  예상 결과:', test.expectedLocale === 'ko' ? '한국어로 전환' : '영어로 전환');

    // 현재 언어와 목표 언어가 같은지 확인
    if (currentUrlLocale === test.expectedLocale) {
      console.log('  ⚠️ 이미 해당 언어로 설정되어 있음');
      continue;
    }

    console.log('  ✅ 전환 가능');

    // 실제 전환을 원하는지 확인
    if (confirm(`정말로 ${test.expectedLocale === 'ko' ? '한국어' : '영어'}로 전환하시겠습니까?`)) {
      // localStorage 설정
      localStorage.setItem('locale', test.expectedLocale);

      // URL 계산
      const newSegments = [...urlSegments];
      const localeIndex = newSegments.findIndex(seg => ['ko', 'en'].includes(seg));

      if (localeIndex !== -1) {
        newSegments[localeIndex] = test.expectedLocale;
      } else {
        newSegments.unshift(test.expectedLocale);
      }

      const newPath = '/' + newSegments.join('/');
      const fullUrl = window.location.origin + newPath;

      console.log('  🚀 리디렉션:', fullUrl);
      console.log('  3초 후 자동 전환...');

      setTimeout(() => {
        window.location.href = fullUrl;
      }, 3000);

      return; // 한 번만 실행
    }
  }
}

// 수동 언어 전환 함수
function switchLanguageManually(targetLocale) {
  console.log(`\n🔄 수동 언어 전환: ${targetLocale === 'ko' ? '한국어' : '영어'}`);

  // localStorage 업데이트
  localStorage.setItem('locale', targetLocale);

  // URL 계산
  const urlSegments = window.location.pathname.split('/').filter(Boolean);
  const localeIndex = urlSegments.findIndex(seg => ['ko', 'en'].includes(seg));

  if (localeIndex !== -1) {
    urlSegments[localeIndex] = targetLocale;
  } else {
    urlSegments.unshift(targetLocale);
  }

  const newPath = '/' + urlSegments.join('/');
  const fullUrl = window.location.origin + newPath;

  console.log('  localStorage 업데이트 완료');
  console.log('  새 URL:', fullUrl);
  console.log('  리디렉션 실행 중...');

  // 즉시 리디렉션
  window.location.href = fullUrl;
}

// 언어 전환 디버깅 로그 활성화
function enableLanguageDebug() {
  console.log('🐛 언어 전환 디버깅 활성화');

  // localStorage 변경 감지
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    if (key === 'locale') {
      console.log(`[LocalStorage] locale 변경: ${localStorage.getItem('locale')} → ${value}`);
      console.trace('호출 스택:');
    }
    return originalSetItem.apply(this, arguments);
  };

  // console.log 확장하여 SettingsManager 로그 강조
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args[0];
    if (typeof message === 'string' && (
      message.includes('[SettingsManager]') ||
      message.includes('[SettingsControlServiceV2]')
    )) {
      console.group('🔵 ' + message);
      if (args.length > 1) {
        originalLog.apply(console, args.slice(1));
      }
      console.groupEnd();
    } else {
      originalLog.apply(console, args);
    }
  };

  console.log('  ✅ 디버깅 로그 활성화 완료');
}

// 실행
console.log('언어 전환 테스트 스크립트 로드 완료\n');
console.log('사용 가능한 명령어:');
console.log('  testLanguageSwitchFix()      - 전체 테스트 실행');
console.log('  switchLanguageManually("ko") - 한국어로 수동 전환');
console.log('  switchLanguageManually("en") - 영어로 수동 전환');
console.log('  enableLanguageDebug()        - 디버깅 로그 활성화');

// 전역 함수로 노출
window.langTest = {
  test: testLanguageSwitchFix,
  switchTo: switchLanguageManually,
  debug: enableLanguageDebug
};