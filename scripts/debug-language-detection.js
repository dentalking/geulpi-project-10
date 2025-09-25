/**
 * 언어 감지 디버깅 스크립트
 * 브라우저 콘솔에서 실행하여 현재 언어 설정 상태 확인
 *
 * 사용법: 브라우저 콘솔에서 이 스크립트 복사/붙여넣기
 */

console.log('🔍 언어 감지 디버깅 시작...\n');
console.log('='.repeat(50));

// 1. localStorage 확인
console.log('1️⃣ localStorage 확인:');
const storedLocale = localStorage.getItem('locale');
console.log('  locale:', storedLocale || '❌ 없음');
console.log('  app-settings:', localStorage.getItem('app-settings') || '❌ 없음');

// 2. URL 확인
console.log('\n2️⃣ URL 확인:');
const path = window.location.pathname;
const segments = path.split('/').filter(Boolean);
console.log('  현재 경로:', path);
console.log('  세그먼트:', segments);
console.log('  첫 세그먼트:', segments[0] || '❌ 없음');
console.log('  언어 감지:', ['ko', 'en'].includes(segments[0]) ? `✅ ${segments[0]}` : '❌ 없음');

// 3. HTML lang 속성 확인
console.log('\n3️⃣ HTML lang 속성:');
const htmlLang = document.documentElement.lang;
console.log('  lang 속성:', htmlLang || '❌ 없음');
console.log('  언어 감지:', ['ko', 'en'].includes(htmlLang) ? `✅ ${htmlLang}` : '❌ 인식 안됨');

// 4. 브라우저 언어 설정
console.log('\n4️⃣ 브라우저 언어:');
console.log('  navigator.language:', navigator.language);
console.log('  navigator.languages:', navigator.languages?.join(', '));
const browserLang = navigator.language.toLowerCase();
let detectedFromBrowser = null;
if (browserLang.startsWith('ko')) {
  detectedFromBrowser = 'ko';
} else if (browserLang.startsWith('en')) {
  detectedFromBrowser = 'en';
}
console.log('  감지된 언어:', detectedFromBrowser || '❌ ko/en 아님');

// 5. UI 실제 상태 확인
console.log('\n5️⃣ UI 실제 상태:');
// 특정 텍스트 요소를 찾아서 실제 언어 확인
const sampleTexts = {
  ko: ['일정', '추가', '오늘', '내일', '설정'],
  en: ['Events', 'Add', 'Today', 'Tomorrow', 'Settings']
};

let actualUILang = 'unknown';
const bodyText = document.body.innerText;

// 한국어/영어 텍스트 카운트
const koCount = sampleTexts.ko.filter(text => bodyText.includes(text)).length;
const enCount = sampleTexts.en.filter(text => bodyText.includes(text)).length;

if (koCount > enCount) {
  actualUILang = 'ko';
} else if (enCount > koCount) {
  actualUILang = 'en';
}

console.log('  한국어 키워드 발견:', koCount);
console.log('  영어 키워드 발견:', enCount);
console.log('  실제 UI 언어:', actualUILang === 'ko' ? '🇰🇷 한국어' : actualUILang === 'en' ? '🇺🇸 영어' : '❓ 불명');

// 6. getCurrentLocale 시뮬레이션
console.log('\n6️⃣ getCurrentLocale() 시뮬레이션:');
function simulateGetCurrentLocale() {
  // 1. localStorage
  if (storedLocale === 'ko' || storedLocale === 'en') {
    return { source: 'localStorage', value: storedLocale };
  }

  // 2. URL path
  if (segments[0] === 'ko' || segments[0] === 'en') {
    return { source: 'URL path', value: segments[0] };
  }

  // 3. HTML lang
  if (htmlLang === 'ko' || htmlLang === 'en') {
    return { source: 'HTML lang', value: htmlLang };
  }

  // 4. Browser lang
  if (browserLang.startsWith('ko')) {
    return { source: 'Browser', value: 'ko' };
  } else if (browserLang.startsWith('en')) {
    return { source: 'Browser', value: 'en' };
  }

  // 5. 기본값
  return { source: '기본값', value: 'ko' };
}

const result = simulateGetCurrentLocale();
console.log(`  결과: ${result.value} (소스: ${result.source})`);

// 7. 문제 진단
console.log('\n🔴 문제 진단:');
if (result.value !== actualUILang && actualUILang !== 'unknown') {
  console.log(`  ⚠️ 불일치 발견!`);
  console.log(`     감지된 언어: ${result.value}`);
  console.log(`     실제 UI 언어: ${actualUILang}`);
  console.log(`     감지 소스: ${result.source}`);
} else if (result.source === '기본값') {
  console.log(`  ⚠️ 기본값 사용 중 - 명시적 설정 없음`);
} else {
  console.log(`  ✅ 정상 작동 중`);
}

// 8. 해결 방법 제안
console.log('\n💡 해결 방법:');
if (!storedLocale) {
  console.log('  1. localStorage에 locale 설정:');
  console.log(`     localStorage.setItem('locale', '${actualUILang === 'en' ? 'en' : 'ko'}');`);
}
if (!segments[0] || !['ko', 'en'].includes(segments[0])) {
  console.log('  2. URL에 언어 추가:');
  console.log(`     window.location.pathname = '/${actualUILang === 'en' ? 'en' : 'ko'}${path}';`);
}

console.log('\n' + '='.repeat(50));
console.log('✅ 디버깅 완료!');

// 실제 언어 변경 함수
window.forceLanguageChange = function(locale) {
  console.log(`\n🔄 강제로 ${locale}로 변경 중...`);
  localStorage.setItem('locale', locale);

  const currentPath = window.location.pathname;
  const segments = currentPath.split('/').filter(Boolean);
  const localeIndex = segments.findIndex(seg => ['ko', 'en'].includes(seg));

  if (localeIndex !== -1) {
    segments[localeIndex] = locale;
  } else {
    segments.unshift(locale);
  }

  const newPath = '/' + segments.join('/');
  console.log('새 경로:', newPath);

  if (confirm(`${locale === 'ko' ? '한국어' : '영어'}로 변경하시겠습니까?\n(페이지가 새로고침됩니다)`)) {
    window.location.pathname = newPath;
  }
};

console.log('\n사용 가능한 명령어:');
console.log('  forceLanguageChange("ko")  - 한국어로 강제 변경');
console.log('  forceLanguageChange("en")  - 영어로 강제 변경');