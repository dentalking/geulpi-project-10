const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const userId = '2ced695b-b2f6-40ea-802f-a181303e8ab4';
const email = 'test@example.com';

// Generate test token
const token = jwt.sign(
  { userId, email },
  JWT_SECRET,
  { expiresIn: '7d' }
);

console.log('프론트엔드-백엔드 API 연결 상태 종합 테스트');
console.log('===============================================');

// API 엔드포인트 목록
const apiEndpoints = [
  // 인증 관련
  { name: 'Auth Status', method: 'GET', url: '/api/auth/status', requiresAuth: false },
  { name: 'Email Login', method: 'POST', url: '/api/auth/email-login', requiresAuth: false,
    body: { email: 'test@example.com', password: 'wrongpassword' } },
  { name: 'Signup', method: 'POST', url: '/api/auth/signup', requiresAuth: false,
    body: { email: 'newuser@test.com', password: 'testpass123', name: 'New User' } },

  // 캘린더 관련
  { name: 'Calendar Events List', method: 'GET', url: '/api/calendar/events', requiresAuth: true },
  { name: 'Calendar Sync', method: 'GET', url: '/api/calendar/sync', requiresAuth: true },
  { name: 'Create Calendar Event', method: 'POST', url: '/api/calendar/create', requiresAuth: true,
    body: { title: 'Test Event', startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() } },

  // AI 관련
  { name: 'AI Chat', method: 'POST', url: '/api/ai/chat', requiresAuth: true,
    body: { message: '안녕하세요', sessionId: 'test-session', locale: 'ko', timezone: 'Asia/Seoul' } },

  // 친구 관련
  { name: 'Friends List', method: 'GET', url: '/api/friends', requiresAuth: true },
  { name: 'Friend Request', method: 'POST', url: '/api/friends/request', requiresAuth: true,
    body: { friendEmail: 'friend@example.com', message: 'Test friend request' } },

  // 사용자 프로필 관련
  { name: 'User Profile', method: 'GET', url: '/api/user/profile', requiresAuth: true },
  { name: 'Profile Update', method: 'POST', url: '/api/profile', requiresAuth: true,
    body: { name: 'Updated Name' } },
];

// API 테스트 함수
const testAPI = async (endpoint) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(endpoint.requiresAuth && { 'Cookie': `auth-token=${token}` })
    };

    const options = {
      method: endpoint.method,
      headers,
      ...(endpoint.body && { body: JSON.stringify(endpoint.body) })
    };

    const response = await fetch(`http://localhost:3000${endpoint.url}`, options);
    const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));

    return {
      name: endpoint.name,
      status: response.status,
      success: response.status < 400,
      data: response.status < 500 ? data : { error: 'Server error' },
      requiresAuth: endpoint.requiresAuth
    };
  } catch (error) {
    return {
      name: endpoint.name,
      status: 0,
      success: false,
      data: { error: error.message },
      requiresAuth: endpoint.requiresAuth
    };
  }
};

// 모든 API 테스트 실행
const runAPITests = async () => {
  console.log('API 테스트 시작...\n');

  const results = [];

  for (const endpoint of apiEndpoints) {
    console.log(`테스트 중: ${endpoint.name}...`);
    const result = await testAPI(endpoint);
    results.push(result);

    const statusIcon = result.success ? '✅' : '❌';
    const authIcon = result.requiresAuth ? '🔒' : '🔓';
    console.log(`${statusIcon} ${authIcon} ${result.name}: ${result.status}`);

    if (!result.success) {
      console.log(`   오류: ${JSON.stringify(result.data, null, 2)}`);
    }
    console.log('');
  }

  // 결과 요약
  console.log('\n=== API 연결 상태 요약 ===');

  const publicAPIs = results.filter(r => !r.requiresAuth);
  const privateAPIs = results.filter(r => r.requiresAuth);

  console.log(`\n🔓 공개 API (${publicAPIs.length}개):`);
  publicAPIs.forEach(api => {
    const icon = api.success ? '✅' : '❌';
    console.log(`${icon} ${api.name}: ${api.status}`);
  });

  console.log(`\n🔒 인증 필요 API (${privateAPIs.length}개):`);
  privateAPIs.forEach(api => {
    const icon = api.success ? '✅' : '❌';
    console.log(`${icon} ${api.name}: ${api.status}`);
  });

  const totalSuccess = results.filter(r => r.success).length;
  const totalFailed = results.length - totalSuccess;

  console.log(`\n📊 전체 결과: ${totalSuccess}/${results.length} 성공, ${totalFailed}개 실패`);

  if (totalFailed > 0) {
    console.log('\n🚨 주요 문제점:');
    results.filter(r => !r.success).forEach(api => {
      console.log(`- ${api.name}: ${api.data.error || 'Unknown error'}`);
    });
  }

  return results;
};

runAPITests().catch(console.error);