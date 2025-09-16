console.log('📅 Calendar API 테스트');
console.log('======================');

const testCalendarAPI = async () => {
  console.log('\n📝 새 사용자 생성 및 캘린더 테스트...');

  const testEmail = `calendar-test-${Date.now()}@example.com`;
  const testPassword = 'testpass123';

  try {
    // 1. 회원가입
    console.log(`\n1️⃣ 회원가입: ${testEmail}`);
    const signupResponse = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Calendar Test User'
      })
    });

    const signupData = await signupResponse.json();
    if (!signupData.success) {
      throw new Error('회원가입 실패');
    }

    // 2. 로그인
    console.log(`\n2️⃣ 로그인: ${testEmail}`);
    const loginResponse = await fetch('http://localhost:3000/api/auth/email-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    const loginData = await loginResponse.json();
    if (!loginData.success || !loginData.token) {
      throw new Error('로그인 실패 또는 토큰 없음');
    }

    const authHeader = `auth-token ${loginData.token}`;
    const userId = loginData.user.id;
    console.log(`   User ID: ${userId}`);
    console.log(`   Token: ${loginData.token.substring(0, 30)}...`);

    // 3. 이벤트 생성 테스트
    console.log(`\n3️⃣ 캘린더 이벤트 생성`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(15, 0, 0, 0);

    const createEventResponse = await fetch('http://localhost:3000/api/calendar/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        summary: '테스트 미팅',
        description: '이메일 인증 사용자 테스트',
        location: '온라인',
        startDateTime: tomorrow.toISOString(),
        endDateTime: endTime.toISOString(),
        attendees: ['test@example.com'],
        reminders: { useDefault: true }
      })
    });

    const createEventData = await createEventResponse.json();
    console.log(`   Status: ${createEventResponse.status}`);
    console.log(`   Response:`, JSON.stringify(createEventData, null, 2));

    // 4. 이벤트 목록 조회
    console.log(`\n4️⃣ 캘린더 이벤트 목록 조회`);
    const listEventsResponse = await fetch('http://localhost:3000/api/calendar/events', {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    const listEventsData = await listEventsResponse.json();
    console.log(`   Status: ${listEventsResponse.status}`);
    console.log(`   Total Events: ${listEventsData.events?.length || 0}`);
    if (listEventsData.events && listEventsData.events.length > 0) {
      console.log(`   First Event:`, JSON.stringify(listEventsData.events[0], null, 2));
    }

    // 5. AI Chat API로 캘린더 연동 테스트
    console.log(`\n5️⃣ AI Chat API로 캘린더 연동 테스트`);
    const aiChatResponse = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        message: '오늘 일정 알려줘',
        sessionId: `test-session-${Date.now()}`,
        locale: 'ko',
        timezone: 'Asia/Seoul'
      })
    });

    const aiChatData = await aiChatResponse.json();
    console.log(`   Status: ${aiChatResponse.status}`);
    console.log(`   AI Response:`, aiChatData.message ? aiChatData.message.substring(0, 100) + '...' : 'No message');

    console.log('\n✅ 모든 캘린더 테스트 완료!');

    return {
      signup: signupResponse.status === 200,
      login: loginResponse.status === 200,
      createEvent: createEventResponse.status === 200,
      listEvents: listEventsResponse.status === 200,
      aiChat: aiChatResponse.status === 200
    };

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
    return { error: error.message };
  }
};

testCalendarAPI()
  .then(results => {
    console.log('\n📊 테스트 결과:');
    console.log('================');
    Object.entries(results).forEach(([test, result]) => {
      const icon = result ? '✅' : '❌';
      console.log(`${icon} ${test}: ${result ? 'PASS' : 'FAIL'}`);
    });
  })
  .catch(console.error);