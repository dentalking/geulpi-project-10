/**
 * 언어 변경 리다이렉트 테스트
 * 브라우저 콘솔에서 실행하여 언어 변경이 실제로 작동하는지 확인
 */

console.log('🔄 언어 변경 리다이렉트 테스트\n');
console.log('='.repeat(50));

// 현재 상태 확인
console.log('📍 현재 상태:');
console.log('  URL:', window.location.pathname);
console.log('  localStorage locale:', localStorage.getItem('locale'));
console.log('  브라우저 언어:', navigator.language);

// changeLocale 동작 시뮬레이션
function simulateLanguageChange(targetLocale) {
  console.log(`\n🔄 ${targetLocale === 'ko' ? '한국어' : '영어'}로 변경 시뮬레이션...`);

  // 1. localStorage 저장 (실제 코드와 동일)
  localStorage.setItem('locale', targetLocale);
  console.log('✅ localStorage 저장됨:', targetLocale);

  // 2. URL 경로 계산
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

  console.log('📝 경로 계산:');
  console.log('  현재 경로:', currentPath);
  console.log('  새 경로:', newPath);
  console.log('  전체 URL:', fullUrl);

  return fullUrl;
}

// 테스트 함수
window.testLanguageRedirect = function(locale) {
  console.log('\n' + '='.repeat(50));
  console.log('🧪 실제 테스트 시작...');

  const targetUrl = simulateLanguageChange(locale);

  console.log('\n⏱️ 1초 후 리다이렉트 예정...');
  console.log('  목적지:', targetUrl);

  // 실제 리다이렉트 (사용자가 확인 후)
  if (confirm(`${locale === 'ko' ? '한국어' : '영어'}로 변경하시겠습니까?\n\n${targetUrl}로 이동합니다.`)) {
    console.log('✅ 리다이렉트 실행!');
    setTimeout(() => {
      window.location.replace(targetUrl);
    }, 1000);
  } else {
    console.log('❌ 사용자가 취소함');
    // localStorage 원복
    const currentLocale = window.location.pathname.split('/').filter(Boolean)[0];
    if (currentLocale === 'ko' || currentLocale === 'en') {
      localStorage.setItem('locale', currentLocale);
    }
  }
};

// 문제 진단
console.log('\n🔍 문제 진단:');

const currentUrlLocale = window.location.pathname.split('/').filter(Boolean)[0];
const storedLocale = localStorage.getItem('locale');

if (currentUrlLocale !== storedLocale && ['ko', 'en'].includes(currentUrlLocale)) {
  console.log('⚠️ URL과 localStorage 불일치!');
  console.log('  URL locale:', currentUrlLocale);
  console.log('  Stored locale:', storedLocale);
} else {
  console.log('✅ 정상 상태');
}

// 수정 사항 확인
console.log('\n📋 수정 사항:');
console.log('1. chat source일 때 무조건 페이지 리로드');
console.log('2. window.location.replace() 사용 (완전한 리로드)');
console.log('3. 절대 URL 사용 (origin + path)');
console.log('4. 1초 대기 (사용자가 메시지 확인)');

console.log('\n💡 사용법:');
console.log('  testLanguageRedirect("ko")  - 한국어로 테스트');
console.log('  testLanguageRedirect("en")  - 영어로 테스트');

// 빠른 디버그
window.debugLocale = function() {
  console.log('\n🐛 디버그 정보:');
  console.log('window.location:', {
    href: window.location.href,
    origin: window.location.origin,
    pathname: window.location.pathname
  });
  console.log('localStorage:', {
    locale: localStorage.getItem('locale'),
    'app-settings': localStorage.getItem('app-settings')
  });

  // UI 텍스트 확인
  const bodyText = document.body?.innerText || '';
  const hasKorean = /[가-힣]+/.test(bodyText);
  const hasEnglish = /Events|Settings|Today|Tomorrow/.test(bodyText);

  console.log('UI 언어 감지:', {
    hasKorean,
    hasEnglish,
    detected: hasEnglish && !hasKorean ? 'en' : 'ko'
  });
};

console.log('\n추가 명령어:');
console.log('  debugLocale()  - 현재 상태 디버깅');