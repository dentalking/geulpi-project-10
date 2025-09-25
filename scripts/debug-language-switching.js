/**
 * 언어 전환 디버깅 및 수정 스크립트
 * 브라우저 콘솔에서 실행하여 언어 전환 문제 디버깅
 */

// 1. 현재 상태 확인
function checkCurrentState() {
  console.log('=== 현재 언어 설정 상태 ===');
  console.log('URL Path:', window.location.pathname);
  console.log('localStorage locale:', localStorage.getItem('locale'));
  console.log('Browser language:', navigator.language);

  // URL에서 locale 추출
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const urlLocale = ['ko', 'en'].includes(pathSegments[0]) ? pathSegments[0] : null;
  console.log('URL Locale:', urlLocale);

  // UI 텍스트로 실제 렌더링된 언어 확인
  const bodyText = document.body?.innerText || '';
  const hasKorean = /일정|추가|오늘|내일|설정/.test(bodyText);
  const hasEnglish = /Events|Add|Today|Tomorrow|Settings/.test(bodyText);
  console.log('UI Language:', hasEnglish ? 'English' : hasKorean ? 'Korean' : 'Unknown');

  return {
    urlLocale,
    storageLocale: localStorage.getItem('locale'),
    uiLanguage: hasEnglish ? 'en' : hasKorean ? 'ko' : 'unknown'
  };
}

// 2. 언어 전환 시뮬레이션 (수정된 버전)
function simulateLanguageChange(targetLocale) {
  console.log(`\n=== ${targetLocale === 'ko' ? '한국어' : '영어'}로 전환 시도 ===`);

  const currentState = checkCurrentState();
  console.log('현재 상태:', currentState);

  // localStorage 업데이트
  console.log('1. localStorage 업데이트...');
  localStorage.setItem('locale', targetLocale);

  // URL 경로 계산
  const currentPath = window.location.pathname;
  const segments = currentPath.split('/').filter(Boolean);
  const localeIndex = segments.findIndex(seg => ['ko', 'en'].includes(seg));

  if (localeIndex !== -1) {
    segments[localeIndex] = targetLocale;
  } else {
    segments.unshift(targetLocale);
  }

  const newPath = '/' + segments.join('/');
  const fullUrl = window.location.origin + newPath;

  console.log('2. 새 경로 계산:');
  console.log('   현재 경로:', currentPath);
  console.log('   새 경로:', newPath);
  console.log('   전체 URL:', fullUrl);

  return {
    currentPath,
    newPath,
    fullUrl
  };
}

// 3. 실제 리디렉션 수행 (즉시 실행 버전)
function forceLanguageChangeNow(targetLocale) {
  console.log(`\n=== 강제 언어 전환 (즉시) ===`);

  const result = simulateLanguageChange(targetLocale);

  console.log('3. 즉시 리디렉션 실행...');
  window.location.replace(result.fullUrl);
}

// 4. 타임아웃 없이 바로 리디렉션 (href 사용)
function forceLanguageChangeHref(targetLocale) {
  console.log(`\n=== 강제 언어 전환 (href) ===`);

  const result = simulateLanguageChange(targetLocale);

  console.log('3. href로 리디렉션 실행...');
  window.location.href = result.fullUrl;
}

// 5. Next.js router 사용 (가능한 경우)
function tryNextRouter(targetLocale) {
  console.log(`\n=== Next.js Router 사용 시도 ===`);

  // Next.js router 찾기
  const nextRouter = window.next?.router;
  if (nextRouter) {
    const result = simulateLanguageChange(targetLocale);
    console.log('Next.js router push:', result.newPath);
    nextRouter.push(result.newPath);
  } else {
    console.log('❌ Next.js router를 찾을 수 없습니다');
    console.log('대신 location.replace 사용...');
    forceLanguageChangeNow(targetLocale);
  }
}

// 6. 디버깅용 이벤트 리스너 추가
function addDebugListeners() {
  console.log('\n=== 디버깅 리스너 추가 ===');

  // storage 이벤트 리스너
  window.addEventListener('storage', (e) => {
    if (e.key === 'locale') {
      console.log('[Storage Event] locale 변경:', e.oldValue, '→', e.newValue);
    }
  });

  // beforeunload 이벤트 리스너
  window.addEventListener('beforeunload', (e) => {
    console.log('[BeforeUnload] 페이지 떠나기 전');
  });

  // popstate 이벤트 리스너
  window.addEventListener('popstate', (e) => {
    console.log('[PopState] 히스토리 변경:', e.state);
  });

  console.log('리스너 추가 완료');
}

// 7. 언어 전환 명령 직접 테스트
async function testLanguageCommand(command) {
  console.log(`\n=== 명령어 테스트: "${command}" ===`);

  // SettingsControlServiceV2의 패턴 체크
  const koreanPatterns = [
    /한국어.*모드/i, /한국어.*변경/i, /한국어.*전환/i,
    /한국어로/i, /한국어/i, /한글.*모드/i, /한글로/i, /한글/i
  ];

  const englishPatterns = [
    /영어.*모드/i, /영어.*변경/i, /영어.*전환/i,
    /영어로/i, /영어/i, /english/i, /en/i
  ];

  let targetLocale = null;
  if (koreanPatterns.some(p => p.test(command))) {
    targetLocale = 'ko';
    console.log('✅ 한국어 전환 명령어로 인식');
  } else if (englishPatterns.some(p => p.test(command))) {
    targetLocale = 'en';
    console.log('✅ 영어 전환 명령어로 인식');
  } else {
    console.log('❌ 인식할 수 없는 명령어');
    return;
  }

  // 현재 locale 확인
  const currentState = checkCurrentState();
  if (currentState.urlLocale === targetLocale) {
    console.log(`⚠️ 이미 ${targetLocale === 'ko' ? '한국어' : '영어'} 모드입니다`);
    return;
  }

  // 실제 전환 수행
  console.log(`🔄 ${targetLocale === 'ko' ? '한국어' : '영어'}로 전환 중...`);
  forceLanguageChangeNow(targetLocale);
}

// === 실행 ===
console.clear();
console.log('🌐 언어 전환 디버깅 스크립트 로드됨\n');

// 현재 상태 확인
checkCurrentState();

// 디버깅 리스너 추가
addDebugListeners();

// 사용법 안내
console.log('\n📝 사용 가능한 명령어:');
console.log('  checkCurrentState()           - 현재 언어 상태 확인');
console.log('  forceLanguageChangeNow("ko")  - 한국어로 즉시 전환');
console.log('  forceLanguageChangeNow("en")  - 영어로 즉시 전환');
console.log('  testLanguageCommand("한국어모드로 전환") - 명령어 테스트');

// 전역 변수로 함수 노출
window.debugLang = {
  checkState: checkCurrentState,
  changeNow: forceLanguageChangeNow,
  changeHref: forceLanguageChangeHref,
  testCommand: testLanguageCommand,
  simulate: simulateLanguageChange
};

console.log('\n💡 빠른 실행: window.debugLang.changeNow("ko") 또는 window.debugLang.changeNow("en")');