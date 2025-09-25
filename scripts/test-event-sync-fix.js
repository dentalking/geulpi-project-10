const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

async function testEventSyncFix() {
  console.log('🧪 Testing event sync fix...\n');

  // Generate a test JWT token
  const JWT_SECRET = "k8/3SovUdp5K66gOhYiGiRfUsJmiOmNe7meb1ttFxWo=";
  const testToken = jwt.sign(
    {
      id: 'test-user-id',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour from now
    },
    JWT_SECRET
  );
  console.log('🔑 Generated test auth token');

  // 50개의 테스트 이벤트 생성 (UI에 표시되는 것과 동일)
  const testEvents = [];
  const today = new Date();

  // 실제 보이는 이벤트들 추가
  testEvents.push({
    id: '1',
    title: '커피숍',
    start_time: new Date(today.setHours(23, 0, 0, 0)).toISOString(),
    end_time: new Date(today.setHours(23, 30, 0, 0)).toISOString()
  });

  testEvents.push({
    id: '2',
    title: '오늘 오후 2시 미팅',
    start_time: new Date(today.setHours(14, 0, 0, 0)).toISOString(),
    end_time: new Date(today.setHours(15, 0, 0, 0)).toISOString()
  });

  // 나머지 48개 더미 이벤트
  for (let i = 3; i <= 50; i++) {
    const hour = Math.floor(Math.random() * 24);
    const startTime = new Date(today);
    startTime.setHours(hour, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(hour + 1, 0, 0, 0);

    testEvents.push({
      id: `${i}`,
      title: `테스트 일정 ${i}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString()
    });
  }

  // API 호출 테스트
  try {
    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${testToken}` // JWT 토큰 사용
      },
      body: JSON.stringify({
        message: '오늘 일정 알려줘',
        locale: 'ko',
        sessionId: 'test-session',
        timezone: 'Asia/Seoul',
        events: testEvents, // 프론트엔드에서 전달하는 이벤트들
        currentDate: new Date().toISOString()
      })
    });

    const data = await response.json();

    console.log('📊 테스트 결과:');
    console.log('-------------------');
    console.log(`✅ 전달한 이벤트 수: ${testEvents.length}개`);
    console.log(`\n📡 API 응답 상태: ${response.status}`);
    console.log(`📦 응답 데이터:`, JSON.stringify(data, null, 2));
    console.log(`\n📝 AI 응답:`);
    console.log(data.message || data.error || '응답 없음');

    // AI가 이벤트를 인식했는지 확인
    const message = data.message || '';
    const recognizedEvents = message.includes('50') ||
                           message.includes('일정이 있') ||
                           message.includes('커피숍') ||
                           message.includes('미팅');

    console.log('\n🎯 검증 결과:');
    if (recognizedEvents) {
      console.log('✅ 성공: AI가 이벤트를 올바르게 인식했습니다!');
    } else {
      console.log('❌ 실패: AI가 여전히 이벤트를 인식하지 못합니다.');
      console.log('   - AI는 "일정이 없다"고 응답했을 가능성이 있습니다.');
    }

    // suggestions API 테스트
    console.log('\n📋 Quick Actions 테스트...');
    const suggestionsResponse = await fetch('http://localhost:3000/api/ai/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locale: 'ko',
        lastAIResponse: data.message,
        events: testEvents,
        currentDate: new Date().toISOString()
      })
    });

    const suggestions = await suggestionsResponse.json();
    console.log('\n🚀 Quick Actions 제안:');
    suggestions.suggestions?.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.text}`);
    });

    // Quick Actions 품질 평가
    const hasManagementSuggestions = suggestions.suggestions?.some(s =>
      s.text.includes('우선순위') ||
      s.text.includes('정리') ||
      s.text.includes('Prioritize') ||
      s.text.includes('Review')
    );

    console.log('\n📊 Quick Actions 품질:');
    if (hasManagementSuggestions && testEvents.length > 0) {
      console.log('✅ 적절: 많은 일정에 대한 관리 제안 표시');
    } else if (!hasManagementSuggestions && testEvents.length > 0) {
      console.log('⚠️  부적절: 50개 일정이 있는데 생성 제안만 표시');
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 서버가 실행 중이지 않습니다. npm run dev를 먼저 실행하세요.');
    }
  }

  console.log('\n-------------------');
  console.log('✨ 테스트 완료');
}

// 테스트 실행
testEventSyncFix();