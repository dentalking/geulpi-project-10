# 메신저 연동 & 위치 기반 약속 시스템 설계

## 1. 사용자 타입별 플로우

### 가입자 (Full Features)
- ✅ 웹/앱에서 전체 캘린더 관리
- ✅ 메신저 봇으로 빠른 약속 조율
- ✅ AI 기반 자동 일정 추천
- ✅ 과거 약속 패턴 학습

### 비가입자 (Limited Features via Bot)
- ✅ 메신저 봇으로 약속 응답만
- ✅ 가능한 시간 투표
- ✅ 장소 제안
- ❌ 캘린더 저장 불가 (가입 유도)

## 2. 카카오톡 연동

### 2.1 카카오톡 채널 봇
```javascript
// /api/kakao/webhook
export async function POST(request: Request) {
  const body = await request.json();
  const { user_key, type, content } = body;

  if (type === 'text') {
    // 약속 관련 메시지 파싱
    if (content.includes('약속')) {
      return handleAppointment(user_key, content);
    }
  }

  if (type === 'callback') {
    // 버튼 응답 처리
    return handleCallback(user_key, content);
  }
}

// 약속 제안 메시지 템플릿
function createAppointmentMessage(proposal: any) {
  return {
    message: {
      text: `${proposal.proposer}님이 약속을 제안했습니다!\n\n📅 ${proposal.date}\n⏰ ${proposal.time}\n📍 ${proposal.location}`,
      quick_replies: [
        {
          label: "수락하기 ✅",
          action: "block",
          blockId: "accept_meeting",
          data: { proposalId: proposal.id }
        },
        {
          label: "다른 시간 제안 🕐",
          action: "block",
          blockId: "suggest_time"
        },
        {
          label: "거절하기 ❌",
          action: "block",
          blockId: "reject_meeting"
        }
      ]
    }
  };
}
```

### 2.2 카카오 로그인 연동
```javascript
// 카카오 OAuth를 통한 친구 목록 동기화
const kakaoFriends = await fetch('https://kapi.kakao.com/v1/api/talk/friends', {
  headers: {
    'Authorization': `Bearer ${kakaoAccessToken}`
  }
});

// 카톡 친구 중 서비스 사용자 매칭
const matchedFriends = await matchKakaoFriendsWithUsers(kakaoFriends);
```

## 3. 디스코드 연동

### 3.1 디스코드 봇 명령어
```javascript
// Discord.js 봇 구현
const { Client, Intents, MessageEmbed } = require('discord.js');

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'schedule') {
    // /schedule @friend 내일 오후 3시 강남역
    const friend = interaction.options.getUser('friend');
    const date = interaction.options.getString('date');
    const time = interaction.options.getString('time');
    const location = interaction.options.getString('location');

    // 약속 제안 생성
    const proposal = await createMeetingProposal({
      proposerId: interaction.user.id,
      inviteeId: friend.id,
      date,
      time,
      location
    });

    // 임베드 메시지로 응답
    const embed = new MessageEmbed()
      .setTitle('약속 제안 📅')
      .setDescription(`${friend.username}님께 약속을 제안했습니다!`)
      .addField('날짜', date, true)
      .addField('시간', time, true)
      .addField('장소', location, true)
      .setColor('#0099ff');

    await interaction.reply({ embeds: [embed] });
  }
});
```

### 3.2 디스코드 서버 통합
```javascript
// 디스코드 서버별 캘린더 채널
if (commandName === 'team-schedule') {
  // 팀 전체 일정 조회
  const teamEvents = await getTeamEvents(interaction.guildId);

  // 캘린더 뷰 생성
  const calendar = createCalendarView(teamEvents);
  await interaction.reply({ content: calendar });
}
```

## 4. Google Maps/Places API 활용

### 4.1 중간 지점 찾기
```javascript
// /api/maps/midpoint
export async function POST(request: Request) {
  const { userLocation, friendLocation } = await request.json();

  // 두 지점의 중간 좌표 계산
  const midpoint = {
    lat: (userLocation.lat + friendLocation.lat) / 2,
    lng: (userLocation.lng + friendLocation.lng) / 2
  };

  // 중간 지점 주변 추천 장소 검색
  const places = await searchNearbyPlaces(midpoint, {
    radius: 500,
    type: 'cafe|restaurant',
    openNow: true
  });

  // 대중교통 접근성 평가
  const accessiblePlaces = await evaluateTransitAccess(places, [
    userLocation,
    friendLocation
  ]);

  return NextResponse.json({
    midpoint,
    recommendations: accessiblePlaces.slice(0, 5)
  });
}
```

### 4.2 장소 추천 시스템
```javascript
// AI 기반 장소 추천
async function recommendPlaces(context: MeetingContext) {
  const { participants, meetingType, timeOfDay, weather } = context;

  // Google Places API로 후보 검색
  const candidates = await placesClient.nearbySearch({
    location: context.midpoint,
    radius: 1000,
    type: getMeetingPlaceType(meetingType), // cafe, restaurant, etc
    minRating: 4.0
  });

  // 스코어링 시스템
  const scored = candidates.map(place => ({
    ...place,
    score: calculatePlaceScore(place, {
      accessibility: getTransitScore(place, participants),
      popularity: place.user_ratings_total,
      priceLevel: isPriceSuitable(place.price_level, context),
      atmosphere: matchAtmosphere(place, meetingType),
      availability: checkPeakHours(place, timeOfDay)
    })
  }));

  return scored.sort((a, b) => b.score - a.score);
}
```

### 4.3 실시간 교통 정보
```javascript
// 도착 시간 예측
async function estimateArrivalTimes(participants: Participant[], destination: Location) {
  const promises = participants.map(async (participant) => {
    const directions = await directionsClient.route({
      origin: participant.currentLocation,
      destination: destination,
      mode: participant.preferredTransport, // 'transit', 'driving', 'walking'
      departure_time: 'now',
      traffic_model: 'best_guess'
    });

    return {
      participant: participant.id,
      duration: directions.routes[0].legs[0].duration,
      distance: directions.routes[0].legs[0].distance,
      steps: directions.routes[0].legs[0].steps
    };
  });

  return Promise.all(promises);
}
```

## 5. 통합 시나리오

### 시나리오 1: 카톡으로 약속 잡기
```
1. A(가입자): 웹에서 "B와 약속" 클릭
2. 시스템: B의 카톡으로 제안 전송
3. B(비가입자): 카톡 봇에서 시간 선택
4. 시스템: 중간 지점 카페 3곳 추천
5. A&B: 카톡에서 장소 투표
6. 시스템: 최종 확정 & 캘린더 등록
```

### 시나리오 2: 디스코드 팀 미팅
```
1. 팀장: /team-meeting 명령어 실행
2. 봇: 팀원들 가능 시간 DM 수집
3. 시스템: 최적 시간 자동 계산
4. 봇: #일정 채널에 확정 공지
5. 시스템: 참석자 캘린더 자동 등록
```

## 6. 데이터베이스 스키마 확장

```sql
-- 메신저 연동 정보
CREATE TABLE messenger_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  platform VARCHAR(50), -- 'kakao', 'discord', 'slack'
  platform_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  webhook_url TEXT,
  preferences JSONB, -- 알림 설정 등
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 장소 추천 히스토리
CREATE TABLE place_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES calendar_events(id),
  place_id TEXT, -- Google Place ID
  place_name TEXT,
  place_address TEXT,
  place_location JSONB, -- {lat, lng}
  place_rating FLOAT,
  selected BOOLEAN DEFAULT FALSE,
  score FLOAT, -- AI 추천 점수
  factors JSONB, -- 추천 이유
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 약속 투표
CREATE TABLE meeting_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID,
  participant_id TEXT, -- 비가입자도 포함
  participant_type VARCHAR(20), -- 'member', 'guest'
  vote_type VARCHAR(20), -- 'time', 'place'
  vote_value TEXT,
  voted_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 7. 구현 우선순위

### Phase 1 (2주)
- [x] Google Maps API 연동
- [ ] 중간 지점 계산 알고리즘
- [ ] 장소 추천 기본 기능

### Phase 2 (3주)
- [ ] 카카오톡 채널 봇 개발
- [ ] 약속 제안/응답 플로우
- [ ] 비가입자 임시 토큰 시스템

### Phase 3 (3주)
- [ ] 디스코드 봇 개발
- [ ] 팀 일정 관리 기능
- [ ] 실시간 알림 시스템

### Phase 4 (2주)
- [ ] AI 추천 고도화
- [ ] 교통 정보 통합
- [ ] 날씨 연동

## 8. 기대 효과

### 사용성 개선
- **접근성**: 별도 앱 설치 없이 메신저로 이용
- **네트워크 효과**: 비가입자도 참여 가능
- **편의성**: 익숙한 인터페이스 활용

### 비즈니스 가치
- **사용자 획득**: 비가입자 → 가입자 전환
- **활성도 증가**: 일상적인 메신저 사용
- **차별화**: 위치 기반 스마트 추천

### 기술적 장점
- **확장성**: 다양한 메신저 플랫폼 지원
- **모듈화**: 플랫폼별 독립적 구현
- **데이터**: 사용 패턴 학습 데이터 축적