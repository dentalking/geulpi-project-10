console.log('🔧 수정된 이메일 인증 시스템 테스트');
console.log('=====================================');

// 테스트 함수들
const testSignup = async () => {
  try {
    console.log('\n📝 회원가입 테스트...');
    const response = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'testpass123',
        name: 'Test User'
      })
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    return { success: response.status === 200, data };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: error.message };
  }
};

const testLogin = async () => {
  try {
    console.log('\n🔐 기존 사용자 로그인 테스트...');
    const response = await fetch('http://localhost:3000/api/auth/email-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com', // 기존 사용자
        password: 'testpass123'
      })
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    return { success: response.status === 200, data };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
};

const testAuthStatus = async () => {
  try {
    console.log('\n✅ 인증 상태 확인 테스트...');
    const response = await fetch('http://localhost:3000/api/auth/status');
    const data = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));

    return { success: response.status === 200, data };
  } catch (error) {
    console.error('Auth status error:', error);
    return { success: false, error: error.message };
  }
};

// 모든 테스트 실행
const runAllTests = async () => {
  console.log('🚀 이메일 인증 API 테스트 시작...\n');

  const results = {
    signup: await testSignup(),
    login: await testLogin(),
    authStatus: await testAuthStatus()
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
    console.log('🎉 모든 이메일 인증 API가 정상 작동합니다!');
  } else {
    console.log('⚠️ 일부 API에서 문제가 발견되었습니다.');
  }

  return results;
};

runAllTests().catch(console.error);