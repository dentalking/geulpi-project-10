/**
 * "내일 일정 보여줘" 명령어 처리 테스트 v2
 * 시간대 처리 개선 버전
 *
 * 사용법: node scripts/test-calendar-query-v2.js
 */

// 날짜 관련 함수들
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

function getCurrentDateInTimezone(timezone = 'Asia/Seoul') {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

// 시간대 처리 수정된 API 파라미터 생성
function createSearchParams(startDateStr, endDateStr) {
  const params = {
    calendarId: 'primary',
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  };

  if (startDateStr) {
    // 시작일 00:00:00으로 설정
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    params.timeMin = startDate.toISOString();
  }

  if (endDateStr) {
    // 종료일 23:59:59로 설정
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);
    params.timeMax = endDate.toISOString();
  }

  return params;
}

// 시간대 테스트
function testTimezoneHandling() {
  console.log('⏰ 시간대 처리 테스트\n');

  const testCases = [
    {
      name: '내일 일정',
      startDate: getTomorrowDateInTimezone(),
      endDate: getTomorrowDateInTimezone()
    },
    {
      name: '오늘 일정',
      startDate: getCurrentDateInTimezone(),
      endDate: getCurrentDateInTimezone()
    }
  ];

  testCases.forEach(test => {
    console.log(`📅 ${test.name}`);
    console.log(`  날짜: ${test.startDate}`);

    const params = createSearchParams(test.startDate, test.endDate);

    console.log('  Google Calendar API 파라미터:');
    console.log(`    timeMin: ${params.timeMin}`);
    console.log(`    timeMax: ${params.timeMax}`);

    // UTC와 KST 시간 비교
    const minDate = new Date(params.timeMin);
    const maxDate = new Date(params.timeMax);

    console.log('  한국 시간 (KST):');
    console.log(`    시작: ${minDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    console.log(`    종료: ${maxDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
    console.log('');
  });
}

// 전체 처리 흐름 (개선 버전)
function testImprovedFlow() {
  console.log('📋 "내일 일정 보여줘" 처리 흐름 (개선 버전)');
  console.log('='.repeat(50) + '\n');

  const userMessage = '내일 일정 보여줘';
  const tomorrowDate = getTomorrowDateInTimezone();

  console.log('1️⃣ 사용자 입력:', userMessage);
  console.log('   내일 날짜:', tomorrowDate);

  console.log('\n2️⃣ ChatCalendarService 처리:');
  const action = {
    type: 'search',
    data: {
      query: '내일',
      startDate: tomorrowDate,
      endDate: tomorrowDate
    }
  };
  console.log('   생성된 액션:', JSON.stringify(action, null, 2));

  console.log('\n3️⃣ API Route 처리 (개선된 버전):');
  const searchParams = createSearchParams(action.data.startDate, action.data.endDate);

  console.log('   시간대 처리 전:');
  console.log(`     startDate: ${action.data.startDate}`);
  console.log(`     endDate: ${action.data.endDate}`);

  console.log('   시간대 처리 후:');
  console.log(`     timeMin: ${searchParams.timeMin}`);
  console.log(`     timeMax: ${searchParams.timeMax}`);

  const minDate = new Date(searchParams.timeMin);
  const maxDate = new Date(searchParams.timeMax);

  console.log('\n4️⃣ 실제 조회 범위 (KST):');
  console.log(`   ${minDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 부터`);
  console.log(`   ${maxDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 까지`);

  console.log('\n✅ 결과: 내일 하루 전체 (00:00:00 ~ 23:59:59) 일정 조회 가능');
}

// 버그 시나리오 테스트
function testBugScenarios() {
  console.log('🐛 버그 시나리오 테스트');
  console.log('='.repeat(50) + '\n');

  console.log('❌ 수정 전 문제:');
  const buggyDate = new Date('2025-09-19');
  console.log(`  new Date('2025-09-19').toISOString()`);
  console.log(`  = ${buggyDate.toISOString()}`);
  console.log(`  = ${buggyDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
  console.log('  문제: UTC 00:00:00이 한국 시간 09:00:00이 되어 오전 일정만 조회됨\n');

  console.log('✅ 수정 후:');
  const fixedStartDate = new Date('2025-09-19');
  fixedStartDate.setHours(0, 0, 0, 0);
  const fixedEndDate = new Date('2025-09-19');
  fixedEndDate.setHours(23, 59, 59, 999);

  console.log('  시작 시간:');
  console.log(`    ${fixedStartDate.toISOString()}`);
  console.log(`    = ${fixedStartDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

  console.log('  종료 시간:');
  console.log(`    ${fixedEndDate.toISOString()}`);
  console.log(`    = ${fixedEndDate.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

  console.log('  결과: 하루 전체 일정 조회 가능!');
}

// 메인 실행
console.log('🧪 캘린더 쿼리 처리 테스트 v2\n');
console.log('='.repeat(50) + '\n');

testTimezoneHandling();
console.log('='.repeat(50) + '\n');

testImprovedFlow();
console.log('\n' + '='.repeat(50) + '\n');

testBugScenarios();

// 현재 환경 정보
console.log('\n' + '='.repeat(50));
console.log('📍 테스트 환경:');
console.log('   오늘 (KST):', getCurrentDateInTimezone());
console.log('   내일 (KST):', getTomorrowDateInTimezone());
console.log('   현재 시간:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
console.log('   Node.js 버전:', process.version);
console.log('='.repeat(50));

console.log('\n✨ 테스트 완료!\n');
console.log('💡 개선 사항:');
console.log('   1. startDate를 00:00:00으로 설정');
console.log('   2. endDate를 23:59:59으로 설정');
console.log('   3. 하루 전체 일정 조회 가능');