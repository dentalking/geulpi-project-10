/**
 * 언어 변경 빠른 테스트
 * 브라우저 콘솔에 복사-붙여넣기로 바로 실행
 */

// 현재 상태 확인
console.log('📍 현재 언어:', localStorage.getItem('locale') || 'ko');
console.log('📍 현재 URL:', window.location.pathname);

// 한국어로 변경 테스트
function testKorean() {
  console.log('🇰🇷 한국어로 변경 시도...');
  localStorage.setItem('locale', 'ko');

  const path = window.location.pathname;
  const segments = path.split('/').filter(Boolean);
  const idx = segments.findIndex(s => ['ko', 'en'].includes(s));

  if (idx !== -1) segments[idx] = 'ko';
  else segments.unshift('ko');

  const newPath = '/' + segments.join('/');
  console.log('새 경로:', newPath);

  if (confirm('한국어로 변경하시겠습니까? (페이지 새로고침)')) {
    window.location.pathname = newPath;
  }
}

// 영어로 변경 테스트
function testEnglish() {
  console.log('🇺🇸 영어로 변경 시도...');
  localStorage.setItem('locale', 'en');

  const path = window.location.pathname;
  const segments = path.split('/').filter(Boolean);
  const idx = segments.findIndex(s => ['ko', 'en'].includes(s));

  if (idx !== -1) segments[idx] = 'en';
  else segments.unshift('en');

  const newPath = '/' + segments.join('/');
  console.log('새 경로:', newPath);

  if (confirm('영어로 변경하시겠습니까? (페이지 새로고침)')) {
    window.location.pathname = newPath;
  }
}

console.log('\n💡 사용법:');
console.log('  testKorean()  - 한국어로 변경');
console.log('  testEnglish() - 영어로 변경');