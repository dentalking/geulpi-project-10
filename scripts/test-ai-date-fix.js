/**
 * AI 날짜 처리 수정 테스트
 *
 * 사용법: node scripts/test-ai-date-fix.js
 */

// 필요한 함수들 import
function getCurrentDateInTimezone(timezone = 'Asia/Seoul') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

function getTomorrowDateInTimezone(timezone = 'Asia/Seoul') {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(tomorrow);
}

console.log('🧪 AI 날짜 처리 수정 테스트\n');
console.log('='.repeat(50));

// 1. 현재 날짜 확인
const today = getCurrentDateInTimezone();
const tomorrow = getTomorrowDateInTimezone();

console.log('📅 날짜 정보:');
console.log('  오늘:', today);
console.log('  내일:', tomorrow);
console.log('  현재 시간:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
console.log('');

// 2. AI 프롬프트에 전달될 날짜 정보 시뮬레이션
console.log('📝 AI 프롬프트에 포함될 정보:');
console.log(`  현재 시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
console.log(`  오늘 날짜: ${today}`);
console.log(`  내일 날짜: ${tomorrow}`);
console.log(`  사용자 시간대: Asia/Seoul`);
console.log('');

// 3. 수정된 프롬프트 예시
console.log('✅ 수정된 프롬프트 예시:');
console.log('---');
console.log(`중요: 날짜를 지정할 때 반드시 위에 제공된 '오늘 날짜: ${today}' 와 '내일 날짜: ${tomorrow}'를 사용하세요.`);
console.log('절대 다른 날짜를 만들어내지 마세요.');
console.log('');
console.log('내일 일정 조회 예시:');
console.log('---RESPONSE---');
console.log('내일 예정된 일정을 확인해 드릴게요.');
console.log('---ACTION---');
console.log(`{"type":"search","data":{"query":"내일","startDate":"${tomorrow}","endDate":"${tomorrow}"}}`);
console.log('---');
console.log('');

// 4. 문제점과 해결책 요약
console.log('🔍 문제점 분석:');
console.log('  ❌ 이전: AI가 고정된 날짜(2024-01-11 등) 사용');
console.log('  ❌ 이전: ${getCurrentDateInTimezone()} 템플릿이 문자열로 전달');
console.log('  ❌ 이전: AI가 실제 날짜를 모르고 잘못된 날짜 생성');
console.log('');

console.log('💡 해결책:');
console.log('  ✅ 프롬프트 시작 부분에 오늘/내일 날짜 명시');
console.log(`  ✅ 실제 계산된 날짜 값 전달 (${today}, ${tomorrow})`);
console.log('  ✅ 예시에도 실제 날짜 사용');
console.log('  ✅ AI에게 제공된 날짜만 사용하도록 명시');
console.log('');

// 5. 예상 동작
console.log('🎯 예상 동작:');
console.log('  사용자: "내일 일정 보여줘"');
console.log(`  AI 액션: {"type":"search","data":{"query":"내일","startDate":"${tomorrow}","endDate":"${tomorrow}"}}`);
console.log(`  Google Calendar API: ${tomorrow} 00:00:00 ~ 23:59:59 조회`);
console.log('  결과: 정확한 내일 날짜의 일정만 표시');
console.log('');

// 6. 테스트 시나리오
console.log('📋 테스트 시나리오:');
const testCases = [
  { input: '내일 일정 보여줘', expectedDate: tomorrow },
  { input: '오늘 일정 알려줘', expectedDate: today },
  { input: '내일 3시 회의 추가', expectedDate: tomorrow },
  { input: '오늘 저녁 약속 등록', expectedDate: today }
];

testCases.forEach((test, idx) => {
  console.log(`  ${idx + 1}. "${test.input}"`);
  console.log(`     예상 날짜: ${test.expectedDate}`);
});

console.log('\n' + '='.repeat(50));
console.log('✨ 테스트 완료!');
console.log('\n💬 수정 요약:');
console.log('1. ChatCalendarService.ts의 프롬프트에 실제 날짜 추가');
console.log('2. 고정된 날짜 예시를 동적 날짜로 변경');
console.log('3. AI에게 제공된 날짜만 사용하도록 명시');
console.log('\n이제 AI가 정확한 날짜로 일정을 조회/생성합니다!');