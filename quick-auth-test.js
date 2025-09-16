console.log('🔐 JWT 인증 토큰 테스트');
console.log('=======================');

const testDirectAuth = async () => {
  console.log('\n📝 새 사용자 생성 및 즉시 인증 테스트...');

  const testEmail = `quick-test-${Date.now()}@example.com`;
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
        name: 'Quick Test User'
      })
    });

    const signupData = await signupResponse.json();
    console.log(`   Status: ${signupResponse.status}`);
    console.log(`   Response:`, JSON.stringify(signupData, null, 2));

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
    console.log(`   Status: ${loginResponse.status}`);
    console.log(`   Response:`, JSON.stringify(loginData, null, 2));

    if (!loginData.success || !loginData.token) {
      throw new Error('로그인 실패 또는 토큰 없음');
    }

    const authHeader = `auth-token ${loginData.token}`;
    console.log(`\n🔑 인증 헤더: ${authHeader.substring(0, 50)}...`);

    // 3. auth/status 테스트
    console.log(`\n3️⃣ Auth Status 테스트`);
    const statusResponse = await fetch('http://localhost:3000/api/auth/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    const statusData = await statusResponse.json();
    console.log(`   Status: ${statusResponse.status}`);
    console.log(`   Response:`, JSON.stringify(statusData, null, 2));

    // 4. Profile API 테스트
    console.log(`\n4️⃣ Profile API 테스트`);
    const profileResponse = await fetch('http://localhost:3000/api/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    const profileData = await profileResponse.json();
    console.log(`   Status: ${profileResponse.status}`);
    console.log(`   Response:`, JSON.stringify(profileData, null, 2));

    // 5. Friends API 테스트
    console.log(`\n5️⃣ Friends API 테스트`);
    const friendsResponse = await fetch('http://localhost:3000/api/friends', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    const friendsData = await friendsResponse.json();
    console.log(`   Status: ${friendsResponse.status}`);
    console.log(`   Response:`, JSON.stringify(friendsData, null, 2));

    console.log('\n✅ 모든 테스트 완료!');

    return {
      signup: signupResponse.status === 200,
      login: loginResponse.status === 200,
      status: statusResponse.status === 200 && statusData.authenticated,
      profile: profileResponse.status === 200,
      friends: friendsResponse.status === 200
    };

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
    return { error: error.message };
  }
};

testDirectAuth()
  .then(results => {
    console.log('\n📊 테스트 결과:');
    console.log('================');
    Object.entries(results).forEach(([test, result]) => {
      const icon = result ? '✅' : '❌';
      console.log(`${icon} ${test}: ${result ? 'PASS' : 'FAIL'}`);
    });
  })
  .catch(console.error);