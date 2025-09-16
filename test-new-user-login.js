console.log('🧪 새로 생성된 사용자 로그인 테스트');
console.log('=====================================');

const testNewUserLogin = async () => {
  console.log('📝 1단계: 새 사용자 생성...');

  // 고유한 이메일로 새 사용자 생성
  const newEmail = `test-login-${Date.now()}@example.com`;
  const password = 'testpass123';

  try {
    // 회원가입
    const signupResponse = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: password,
        name: 'Test Login User'
      })
    });

    const signupData = await signupResponse.json();
    console.log(`✅ 회원가입 성공: ${signupResponse.status}`);
    console.log('사용자:', JSON.stringify(signupData.user, null, 2));

    if (!signupData.success) {
      console.log('❌ 회원가입 실패, 로그인 테스트 중단');
      return;
    }

    console.log('\n🔐 2단계: 동일한 사용자로 로그인...');

    // 바로 로그인 시도
    const loginResponse = await fetch('http://localhost:3000/api/auth/email-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: password
      })
    });

    const loginData = await loginResponse.json();
    console.log(`Status: ${loginResponse.status}`);
    console.log('Response:', JSON.stringify(loginData, null, 2));

    if (loginResponse.status === 200) {
      console.log('\n🎉 로그인 테스트 성공!');
      console.log(`✅ 사용자 ID: ${loginData.user.id}`);
      console.log(`✅ 인증 타입: ${loginData.user.auth_type}`);
      console.log(`✅ JWT 토큰 생성됨: ${loginData.token ? '예' : '아니오'}`);
    } else {
      console.log('\n❌ 로그인 테스트 실패');
    }

  } catch (error) {
    console.error('테스트 오류:', error);
  }
};

testNewUserLogin();