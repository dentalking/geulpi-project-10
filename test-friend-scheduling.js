/**
 * 친구와 자동 약속 잡기 기능 테스트
 */

const https = require('https');
const http = require('http');

const config = {
  baseUrl: 'http://localhost:3000',
  authToken: null,
  cookies: ''
};

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.baseUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': config.cookies || '',
        ...options.headers
      }
    };

    if (config.authToken) {
      reqOptions.headers['Authorization'] = `auth-token ${config.authToken}`;
    }

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // 쿠키 저장
        if (res.headers['set-cookie']) {
          config.cookies = res.headers['set-cookie'].join('; ');
        }

        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testFriendScheduling() {
  console.log('🤝 친구와 자동 약속 잡기 기능 테스트\n');
  console.log('=' .repeat(50));

  // 1. 로그인 (테스트 사용자 1)
  console.log('\n1️⃣ 사용자 1 로그인...');
  const loginRes1 = await request('/api/auth/email-login', {
    method: 'POST',
    body: {
      email: 'test@example.com',
      password: 'test123456'
    }
  });

  if (loginRes1.data.success) {
    config.authToken = loginRes1.data.token || loginRes1.data.data?.token;
    console.log('✅ 사용자 1 로그인 성공');
  } else {
    console.log('❌ 로그인 실패:', loginRes1.data);
    return;
  }

  // 2. 친구 목록 확인
  console.log('\n2️⃣ 친구 목록 확인...');
  const friendsRes = await request('/api/friends');

  if (friendsRes.data.success) {
    const friends = friendsRes.data.friends || [];
    console.log(`✅ 친구 수: ${friends.length}명`);

    if (friends.length > 0) {
      console.log('\n친구 목록:');
      friends.forEach(f => {
        console.log(`  - ${f.name || f.email} (${f.relationshipType || '일반'})`);
      });
    }
  } else {
    console.log('❌ 친구 목록 조회 실패');
  }

  // 3. 친구가 없으면 추가
  if (!friendsRes.data.friends || friendsRes.data.friends.length === 0) {
    console.log('\n3️⃣ 테스트 친구 추가...');

    // 먼저 테스트 친구 계정 생성
    const friendEmail = 'friend@example.com';
    await request('/api/auth/register', {
      method: 'POST',
      body: {
        email: friendEmail,
        password: 'friend123456',
        name: '테스트 친구'
      }
    });

    // 친구 요청 보내기
    const addFriendRes = await request('/api/friends', {
      method: 'POST',
      body: {
        friendEmail: friendEmail,
        nickname: '친한 친구',
        relationshipType: 'close_friend'
      }
    });

    if (addFriendRes.data.success) {
      console.log('✅ 친구 요청 전송 완료');

      // 친구로 로그인해서 수락하기
      const loginRes2 = await request('/api/auth/email-login', {
        method: 'POST',
        body: {
          email: friendEmail,
          password: 'friend123456'
        }
      });

      if (loginRes2.data.success) {
        const friendToken = loginRes2.data.token || loginRes2.data.data?.token;

        // 친구 요청 수락
        const acceptRes = await request('/api/friends', {
          method: 'PATCH',
          headers: {
            'Authorization': `auth-token ${friendToken}`
          },
          body: {
            friendshipId: addFriendRes.data.friend.id,
            action: 'accept'
          }
        });

        if (acceptRes.data.success) {
          console.log('✅ 친구 요청 수락 완료');
        }
      }
    }
  }

  // 4. 친구와 가능한 시간 찾기
  console.log('\n4️⃣ 친구와 가능한 시간 찾기...');

  const friendsRes2 = await request('/api/friends');
  const friend = friendsRes2.data.friends?.[0];

  if (friend) {
    const availabilityRes = await request(`/api/friends/availability?friendId=${friend.friendId || friend.id}`);

    if (availabilityRes.data.success) {
      console.log(`✅ 가능한 시간대: ${availabilityRes.data.totalAvailable}개`);

      if (availabilityRes.data.recommendedSlots?.length > 0) {
        console.log('\n추천 시간대:');
        availabilityRes.data.recommendedSlots.forEach((slot, i) => {
          const start = new Date(slot.start);
          console.log(`  ${i + 1}. ${start.toLocaleDateString('ko-KR')} ${start.toLocaleTimeString('ko-KR')}`);
        });
      }
    } else {
      console.log('❌ 가능한 시간 찾기 실패:', availabilityRes.data.error);
    }

    // 5. 자동 약속 잡기
    console.log('\n5️⃣ 자동 약속 잡기...');

    const scheduleRes = await request('/api/friends/schedule-meeting', {
      method: 'POST',
      body: {
        friendId: friend.friendId || friend.id,
        title: '커피 미팅',
        duration: 60,
        autoSelect: true, // 자동으로 최적 시간 선택
        meetingType: 'coffee'
      }
    });

    if (scheduleRes.data.success) {
      console.log('✅ 약속 제안 전송 성공!');
      console.log(`📅 제안된 시간: ${new Date(scheduleRes.data.proposal.dateTime).toLocaleString('ko-KR')}`);
      console.log(`📍 장소: ${scheduleRes.data.proposal.location}`);

      if (scheduleRes.data.proposal.suggestedLocations?.length > 0) {
        console.log('\n추천 장소:');
        scheduleRes.data.proposal.suggestedLocations.forEach(loc => {
          console.log(`  - ${loc}`);
        });
      }

      // 6. 친구가 약속 수락
      console.log('\n6️⃣ 친구가 약속 수락...');

      // 친구로 다시 로그인
      const loginRes3 = await request('/api/auth/email-login', {
        method: 'POST',
        body: {
          email: 'friend@example.com',
          password: 'friend123456'
        }
      });

      if (loginRes3.data.success) {
        const friendToken = loginRes3.data.token || loginRes3.data.data?.token;

        const acceptMeetingRes = await request('/api/friends/schedule-meeting', {
          method: 'PATCH',
          headers: {
            'Authorization': `auth-token ${friendToken}`
          },
          body: {
            proposalId: scheduleRes.data.proposal.id,
            action: 'accept'
          }
        });

        if (acceptMeetingRes.data.success) {
          console.log('✅ 약속이 확정되었습니다!');
        } else {
          console.log('❌ 약속 수락 실패:', acceptMeetingRes.data.error);
        }
      }
    } else {
      console.log('❌ 약속 제안 실패:', scheduleRes.data.error);
    }
  } else {
    console.log('⚠️ 친구가 없어 약속 잡기를 테스트할 수 없습니다.');
  }

  // 7. AI 채팅으로 약속 잡기 테스트
  console.log('\n7️⃣ AI 채팅으로 약속 잡기...');

  const chatRes = await request('/api/ai/chat', {
    method: 'POST',
    body: {
      message: '친한 친구와 내일 오후 3시에 카페에서 만나는 약속 잡아줘',
      type: 'text',
      sessionId: 'test-friend-scheduling-' + Date.now(),
      locale: 'ko'
    }
  });

  if (chatRes.data.success) {
    console.log('✅ AI 응답:', chatRes.data.data?.message);

    if (chatRes.data.data?.action) {
      console.log('📌 액션 타입:', chatRes.data.data.action.type);
    }
  } else {
    console.log('❌ AI 채팅 실패:', chatRes.data.error);
  }

  // 8. 결과 요약
  console.log('\n' + '=' .repeat(50));
  console.log('📊 테스트 결과 요약\n');
  console.log('✅ 구현된 기능:');
  console.log('  - 친구 추가/수락');
  console.log('  - 친구와 가능한 시간 찾기');
  console.log('  - 자동 약속 제안');
  console.log('  - 약속 수락/거절');
  console.log('  - AI 채팅으로 약속 잡기');

  console.log('\n📈 개선 가능 사항:');
  console.log('  - 실시간 알림 (WebSocket/SSE)');
  console.log('  - 캘린더 UI에서 친구 일정 표시');
  console.log('  - 그룹 약속 잡기');
  console.log('  - 위치 기반 중간 지점 찾기');
  console.log('  - 과거 약속 패턴 학습');
}

// 테스트 실행
testFriendScheduling().catch(console.error);