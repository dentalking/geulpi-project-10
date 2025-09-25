/**
 * "내일 일정 보여줘" 명령어 처리 테스트
 *
 * 사용법: node scripts/test-calendar-query.js
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

// 날짜 파싱 테스트
function testDateParsing() {
  console.log('📅 날짜 파싱 테스트\n');

  const testCases = [
    { input: '내일 일정 보여줘', expected: 'tomorrow' },
    { input: '오늘 일정 알려줘', expected: 'today' },
    { input: '이번 주 일정 확인', expected: 'this_week' },
    { input: '다음 주 회의', expected: 'next_week' }
  ];

  testCases.forEach(test => {
    let dateRange = {};

    if (test.input.includes('내일') || test.input.includes('tomorrow')) {
      dateRange.startDate = getTomorrowDateInTimezone();
      dateRange.endDate = getTomorrowDateInTimezone();
      dateRange.type = 'tomorrow';
    } else if (test.input.includes('오늘') || test.input.includes('today')) {
      dateRange.startDate = getCurrentDateInTimezone();
      dateRange.endDate = getCurrentDateInTimezone();
      dateRange.type = 'today';
    } else if (test.input.includes('이번 주') || test.input.includes('this week')) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      dateRange.startDate = startOfWeek.toISOString().split('T')[0];
      dateRange.endDate = endOfWeek.toISOString().split('T')[0];
      dateRange.type = 'this_week';
    }

    console.log(`입력: "${test.input}"`);
    console.log(`  시작일: ${dateRange.startDate}`);
    console.log(`  종료일: ${dateRange.endDate}`);
    console.log(`  타입: ${dateRange.type}`);
    console.log('');
  });
}

// AI 프롬프트 생성 시뮬레이션
function generateAIPrompt(message) {
  const prompt = `
사용자 메시지: "${message}"

이 메시지에서 다음을 분석하세요:
1. 의도 파악: SEARCH (일정 조회)
2. 날짜 범위: ${message.includes('내일') ? '내일' : '오늘'}
3. 액션 생성:

예상 응답:
---RESPONSE---
${message.includes('내일') ? '내일' : '오늘'} 예정된 일정을 확인해 드릴게요.
---ACTION---
{"type":"search","data":{"query":"${message.includes('내일') ? '내일' : '오늘'}","startDate":"${message.includes('내일') ? getTomorrowDateInTimezone() : getCurrentDateInTimezone()}","endDate":"${message.includes('내일') ? getTomorrowDateInTimezone() : getCurrentDateInTimezone()}"}}
`;

  return prompt;
}

// 액션 파싱 테스트
function testActionParsing() {
  console.log('🤖 액션 파싱 테스트\n');

  const testQueries = [
    '내일 일정 보여줘',
    '오늘 일정 알려줘',
    '내일 회의 있어?',
    '오늘 스케줄 뭐야?'
  ];

  testQueries.forEach(query => {
    console.log(`\n📝 쿼리: "${query}"`);

    // 예상 액션 생성
    let action = {
      type: 'search',
      data: {}
    };

    if (query.includes('내일')) {
      action.data = {
        query: '내일',
        startDate: getTomorrowDateInTimezone(),
        endDate: getTomorrowDateInTimezone()
      };
    } else if (query.includes('오늘')) {
      action.data = {
        query: '오늘',
        startDate: getCurrentDateInTimezone(),
        endDate: getCurrentDateInTimezone()
      };
    }

    console.log('생성된 액션:', JSON.stringify(action, null, 2));

    // Google Calendar API 파라미터 시뮬레이션
    const searchParams = {
      calendarId: 'primary',
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
      timeMin: new Date(action.data.startDate).toISOString(),
      timeMax: new Date(action.data.endDate + 'T23:59:59').toISOString()
    };

    console.log('Google Calendar API 파라미터:');
    console.log('  timeMin:', searchParams.timeMin);
    console.log('  timeMax:', searchParams.timeMax);
  });
}

// 전체 흐름 테스트
function testFullFlow() {
  console.log('\n' + '='.repeat(50));
  console.log('📋 "내일 일정 보여줘" 전체 처리 흐름');
  console.log('='.repeat(50) + '\n');

  const userMessage = '내일 일정 보여줘';

  console.log('1️⃣ 사용자 입력:', userMessage);

  console.log('\n2️⃣ ChatCalendarService.processMessage() 호출');
  console.log('   - 현재 시간 (KST):', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  console.log('\n3️⃣ AI 프롬프트 생성:');
  const prompt = generateAIPrompt(userMessage);
  console.log(prompt.substring(0, 200) + '...');

  console.log('\n4️⃣ AI 응답 파싱:');
  const aiResponse = {
    message: '내일 예정된 일정을 확인해 드릴게요.',
    action: {
      type: 'search',
      data: {
        query: '내일',
        startDate: getTomorrowDateInTimezone(),
        endDate: getTomorrowDateInTimezone()
      }
    }
  };
  console.log(JSON.stringify(aiResponse, null, 2));

  console.log('\n5️⃣ Google Calendar API 호출:');
  console.log(`   GET /calendar/v3/calendars/primary/events`);
  console.log(`   timeMin: ${new Date(aiResponse.action.data.startDate).toISOString()}`);
  console.log(`   timeMax: ${new Date(aiResponse.action.data.endDate + 'T23:59:59').toISOString()}`);

  console.log('\n6️⃣ 결과 표시:');
  console.log('   - AI 메시지: "내일 예정된 일정을 확인해 드릴게요."');
  console.log('   - 아티팩트 패널에 일정 목록 표시');
  console.log('   - artifactMode: "list"');

  console.log('\n✅ 처리 완료!');
}

// 메인 실행
console.log('🧪 캘린더 쿼리 처리 테스트 시작\n');
console.log('='.repeat(50));

testDateParsing();
console.log('='.repeat(50));
testActionParsing();
testFullFlow();

// 현재 날짜 정보
console.log('\n' + '='.repeat(50));
console.log('📍 테스트 환경 정보:');
console.log('   오늘:', getCurrentDateInTimezone());
console.log('   내일:', getTomorrowDateInTimezone());
console.log('   현재 시간 (KST):', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
console.log('='.repeat(50));

console.log('\n✨ 모든 테스트 완료!');