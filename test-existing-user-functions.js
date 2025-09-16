console.log('🧪 기존 사용자 핵심 기능 테스트');
console.log('===============================');

// 테스트용 사용자 생성 및 로그인
const setupTestUser = async () => {
  console.log('📝 테스트 사용자 설정...');

  const testEmail = `existing-test-${Date.now()}@example.com`;
  const testPassword = 'testpass123';

  // 회원가입
  const signupResponse = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: 'Existing Test User'
    })
  });

  const signupData = await signupResponse.json();

  if (!signupData.success) {
    throw new Error('Failed to create test user');
  }

  // 로그인
  const loginResponse = await fetch('http://localhost:3000/api/auth/email-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });

  const loginData = await loginResponse.json();

  if (!loginData.success) {
    throw new Error('Failed to login test user');
  }

  return {
    userId: loginData.user.id,
    email: testEmail,
    token: loginData.token,
    authHeader: `auth-token ${loginData.token}`
  };
};

// AI 채팅 기능 테스트
const testAIChat = async (authHeader) => {
  try {
    console.log('\n🤖 AI 채팅 기능 테스트...');

    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        message: '내일 오후 3시에 미팅 일정을 추가해줘',
        sessionId: 'test-session'
      })
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    return { success: response.status === 200, data };
  } catch (error) {
    console.error('AI Chat error:', error);
    return { success: false, error: error.message };
  }
};

// 캘린더 이벤트 기능 테스트
const testCalendarEvents = async (authHeader) => {
  try {
    console.log('\n📅 캘린더 이벤트 기능 테스트...');

    // 이벤트 생성
    const createResponse = await fetch('http://localhost:3000/api/calendar/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        title: '테스트 미팅',
        description: '기능 테스트용 이벤트',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 내일
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 내일 + 1시간
        location: '온라인'
      })
    });

    const createData = await createResponse.json();
    console.log(`Create Status: ${createResponse.status}`);
    console.log('Create Response:', JSON.stringify(createData, null, 2));

    // 이벤트 조회
    const getResponse = await fetch('http://localhost:3000/api/calendar/events', {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    const getData = await getResponse.json();
    console.log(`Get Status: ${getResponse.status}`);
    console.log('Get Response:', JSON.stringify(getData, null, 2));

    return {
      success: createResponse.status === 200 && getResponse.status === 200,
      createData,
      getData
    };
  } catch (error) {
    console.error('Calendar error:', error);
    return { success: false, error: error.message };
  }
};

// 친구 기능 테스트
const testFriends = async (authHeader) => {
  try {
    console.log('\n👥 친구 기능 테스트...');

    // 친구 목록 조회
    const listResponse = await fetch('http://localhost:3000/api/friends', {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    const listData = await listResponse.json();
    console.log(`List Status: ${listResponse.status}`);
    console.log('List Response:', JSON.stringify(listData, null, 2));

    // 친구 요청 (가상의 이메일로)
    const requestResponse = await fetch('http://localhost:3000/api/friends/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        email: 'friend@example.com',
        message: '친구가 되어주세요!'
      })
    });

    const requestData = await requestResponse.json();
    console.log(`Request Status: ${requestResponse.status}`);
    console.log('Request Response:', JSON.stringify(requestData, null, 2));

    return {
      success: listResponse.status === 200 && requestResponse.status === 200,
      listData,
      requestData
    };
  } catch (error) {
    console.error('Friends error:', error);
    return { success: false, error: error.message };
  }
};

// 프로필 기능 테스트
const testProfile = async (authHeader) => {
  try {
    console.log('\n👤 프로필 기능 테스트...');

    const response = await fetch('http://localhost:3000/api/profile', {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    return { success: response.status === 200, data };
  } catch (error) {
    console.error('Profile error:', error);
    return { success: false, error: error.message };
  }
};

// 모든 테스트 실행
const runAllTests = async () => {
  try {
    console.log('🚀 기존 사용자 기능 테스트 시작...\n');

    // 테스트 사용자 설정
    const testUser = await setupTestUser();
    console.log(`✅ 테스트 사용자 설정 완료: ${testUser.email}`);
    console.log(`   User ID: ${testUser.userId}`);
    console.log(`   Token: ${testUser.token ? 'present' : 'missing'}`);

    // 각 기능 테스트
    const results = {
      aiChat: await testAIChat(testUser.authHeader),
      calendar: await testCalendarEvents(testUser.authHeader),
      friends: await testFriends(testUser.authHeader),
      profile: await testProfile(testUser.authHeader)
    };

    console.log('\n📊 테스트 결과 요약:');
    console.log('==================');

    Object.entries(results).forEach(([test, result]) => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${test}: ${result.success ? 'PASS' : 'FAIL'}`);
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r.success).length;

    console.log(`\n🎯 전체 결과: ${passedTests}/${totalTests} 테스트 통과`);

    if (passedTests === totalTests) {
      console.log('🎉 모든 기존 사용자 기능이 정상 작동합니다!');
    } else {
      console.log('⚠️ 일부 기능에서 문제가 발견되었습니다.');
    }

    return results;
  } catch (error) {
    console.error('테스트 설정 오류:', error);
  }
};

runAllTests().catch(console.error);