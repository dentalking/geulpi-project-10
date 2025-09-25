/**
 * 브라우저 콘솔에서 테마 변경 및 상태 감지 테스트
 *
 * 사용법:
 * 1. 개발 서버 실행 (npm run dev)
 * 2. 브라우저 콘솔 열기
 * 3. 이 스크립트 복사해서 실행
 */

// 헬퍼 함수: 현재 테마 상태 체크
function checkCurrentTheme() {
  const htmlElement = document.documentElement;
  const isDark = htmlElement.classList.contains('dark');
  const isLight = htmlElement.classList.contains('light');
  const dataTheme = htmlElement.getAttribute('data-theme');
  const storedTheme = localStorage.getItem('theme');

  console.log('📊 현재 테마 상태:');
  console.log('  - DOM dark class:', isDark);
  console.log('  - DOM light class:', isLight);
  console.log('  - data-theme:', dataTheme);
  console.log('  - localStorage:', storedTheme);
  console.log('  - 실제 표시:', isDark ? 'dark' : isLight ? 'light' : 'unknown');

  return {
    actualTheme: isDark ? 'dark' : isLight ? 'light' : 'unknown',
    settingValue: storedTheme || 'system'
  };
}

// 테스트 1: Custom Event를 통한 테마 변경
console.log('🎨 테마 변경 테스트 시작...');
checkCurrentTheme();

// 다크 모드로 변경
console.log('\n1️⃣ 다크 모드로 변경 시도...');
window.dispatchEvent(new CustomEvent('themeChanged', {
  detail: { theme: 'dark', source: 'test' }
}));

setTimeout(() => {
  console.log('✅ 다크 모드 변경 후:');
  checkCurrentTheme();

  // 라이트 모드로 변경
  console.log('\n2️⃣ 라이트 모드로 변경 시도...');
  window.dispatchEvent(new CustomEvent('themeChanged', {
    detail: { theme: 'light', source: 'test' }
  }));
}, 2000);

setTimeout(() => {
  console.log('✅ 라이트 모드 변경 후:');
  checkCurrentTheme();

  // 시스템 모드로 변경
  console.log('\n3️⃣ 시스템 모드로 변경 시도...');
  window.dispatchEvent(new CustomEvent('themeChanged', {
    detail: { theme: 'system', source: 'test' }
  }));
}, 4000);

setTimeout(() => {
  console.log('✅ 시스템 모드 변경 후:');
  checkCurrentTheme();
}, 6000);

// 테스트 2: 폰트 크기 변경
setTimeout(() => {
  console.log('\n📏 폰트 크기 변경 테스트...');

  console.log('4️⃣ 작은 글씨로 변경...');
  window.dispatchEvent(new CustomEvent('fontSizeChanged', {
    detail: { fontSize: 'small', source: 'test' }
  }));
}, 8000);

setTimeout(() => {
  console.log('5️⃣ 큰 글씨로 변경...');
  window.dispatchEvent(new CustomEvent('fontSizeChanged', {
    detail: { fontSize: 'large', source: 'test' }
  }));
}, 10000);

setTimeout(() => {
  console.log('6️⃣ 보통 글씨로 복원...');
  window.dispatchEvent(new CustomEvent('fontSizeChanged', {
    detail: { fontSize: 'normal', source: 'test' }
  }));
}, 12000);

// 테스트 3: 최종 상태 확인
setTimeout(() => {
  console.log('\n✅ 테스트 완료! 최종 상태:');
  const finalState = checkCurrentTheme();
  console.log('\n📋 요약:');
  console.log('- 실제 표시 테마:', finalState.actualTheme);
  console.log('- 테마 설정값:', finalState.settingValue);
  console.log('- 폰트 크기:', localStorage.getItem('fontSize') || 'normal');
  console.log('- CSS font-base:', getComputedStyle(document.documentElement).getPropertyValue('--font-base'));
}, 14000);