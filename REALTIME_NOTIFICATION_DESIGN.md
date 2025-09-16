# 실시간 알림 시스템 설계

## 1. 개요

글피 캘린더의 실시간 알림 시스템은 웹 클라이언트, 카카오톡 봇, Discord 봇 간의 실시간 통신을 지원하여 즉시적인 일정 조율과 알림을 제공합니다.

## 2. 시스템 아키텍처

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  웹 클라이언트   │    │   카카오톡 봇    │    │  Discord 봇   │
│   (React)   │    │   (Webhook)  │    │  (Webhook)  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │ WebSocket         │ HTTP              │ HTTP
       │                   │                   │
┌─────────────────────────────────────────────────────┐
│              실시간 알림 서버 (Next.js)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ WebSocket   │  │ 알림 큐      │  │ 사용자 상태   │  │
│  │ 관리자       │  │ (Redis)     │  │ 관리자       │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────┘
                       │
                ┌─────────────┐
                │  Supabase   │
                │  (Database) │
                └─────────────┘
```

## 3. 핵심 기능

### 3.1 실시간 약속 조율
- 친구 간 실시간 시간 협의
- 즉시 응답 및 반영
- 투표 기반 장소/시간 결정

### 3.2 다중 플랫폼 알림
- 웹: WebSocket 실시간 알림
- 카카오톡: 메시지 자동 전송
- Discord: 임베드 알림 메시지

### 3.3 스마트 알림 필터링
- 사용자 선호도 기반 필터링
- 긴급도별 우선순위
- Do Not Disturb 모드

## 4. 기술 스택

### 4.1 실시간 통신
- **WebSocket**: 웹 클라이언트 실시간 통신
- **Server-Sent Events (SSE)**: 단방향 알림용 대안
- **Socket.IO**: WebSocket 폴백 지원

### 4.2 메시지 큐
- **Redis**: 알림 큐 및 사용자 세션 관리
- **Bull Queue**: 작업 스케줄링
- **Redis Pub/Sub**: 서버 간 이벤트 브로드캐스팅

### 4.3 알림 전송
- **카카오톡 API**: 템플릿 메시지
- **Discord API**: 웹훅 및 봇 메시지
- **Web Push API**: 브라우저 푸시 알림

## 5. 데이터베이스 스키마

### 5.1 알림 관련 테이블

```sql
-- 알림 설정
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  platform VARCHAR(20) NOT NULL, -- 'web', 'kakao', 'discord'
  notification_types JSONB DEFAULT '{}', -- 알림 타입별 활성화 여부
  preferences JSONB DEFAULT '{}', -- 선호 시간, DND 설정 등
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 실시간 알림 큐
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES auth.users(id),
  sender_id UUID REFERENCES auth.users(id),
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  platforms TEXT[] DEFAULT ARRAY['web'], -- 전송할 플랫폼들
  priority INTEGER DEFAULT 1, -- 1: 낮음, 2: 보통, 3: 높음, 4: 긴급
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 실시간 세션 관리
CREATE TABLE realtime_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_type VARCHAR(20) NOT NULL, -- 'web', 'kakao', 'discord'
  session_id VARCHAR(255) NOT NULL,
  platform_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 약속 조율 세션
CREATE TABLE meeting_coordination_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id UUID REFERENCES auth.users(id),
  participants JSONB NOT NULL, -- [user_id, ...]
  meeting_title VARCHAR(255) NOT NULL,
  proposed_times JSONB DEFAULT '[]', -- [{datetime, votes}, ...]
  proposed_locations JSONB DEFAULT '[]', -- [{location, votes}, ...]
  current_status VARCHAR(20) DEFAULT 'proposing', -- proposing, voting, confirmed, cancelled
  deadline TIMESTAMP WITH TIME ZONE,
  final_decision JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.2 RLS 정책

```sql
-- 알림 설정 보안
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notification settings" ON notification_settings
  FOR ALL USING (auth.uid() = user_id);

-- 알림 큐 보안
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own notifications" ON notification_queue
  FOR SELECT USING (auth.uid() = recipient_id);

-- 실시간 세션 보안
ALTER TABLE realtime_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sessions" ON realtime_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 약속 조율 세션 보안
ALTER TABLE meeting_coordination_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can access coordination sessions" ON meeting_coordination_sessions
  FOR ALL USING (
    auth.uid() = initiator_id OR
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
  );
```

## 6. API 엔드포인트

### 6.1 WebSocket 연결

```typescript
// /api/ws/notifications
interface WebSocketMessage {
  type: 'notification' | 'meeting_update' | 'friend_request' | 'ping';
  data: any;
  timestamp: string;
  id: string;
}
```

### 6.2 알림 관리

```typescript
// POST /api/notifications/send
interface SendNotificationRequest {
  recipientId: string;
  type: 'meeting_invitation' | 'meeting_update' | 'friend_request' | 'reminder';
  title: string;
  message: string;
  data?: any;
  platforms?: ('web' | 'kakao' | 'discord')[];
  priority?: 1 | 2 | 3 | 4;
  scheduledAt?: string;
}

// GET /api/notifications
interface GetNotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

// PUT /api/notifications/settings
interface UpdateNotificationSettingsRequest {
  platform: 'web' | 'kakao' | 'discord';
  notificationTypes: Record<string, boolean>;
  preferences: {
    quietHours?: { start: string; end: string };
    dndMode?: boolean;
    soundEnabled?: boolean;
  };
}
```

### 6.3 실시간 약속 조율

```typescript
// POST /api/meetings/coordinate
interface CreateCoordinationRequest {
  participantIds: string[];
  title: string;
  proposedTimes: Array<{
    datetime: string;
    description?: string;
  }>;
  proposedLocations?: Array<{
    name: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  }>;
  deadline?: string;
}

// PUT /api/meetings/{sessionId}/vote
interface VoteRequest {
  timeIndex?: number;
  locationIndex?: number;
  vote: 'yes' | 'no' | 'maybe';
}
```

## 7. 실시간 이벤트 처리

### 7.1 이벤트 타입

```typescript
type NotificationEvent =
  | 'meeting.invitation'
  | 'meeting.response'
  | 'meeting.confirmed'
  | 'meeting.cancelled'
  | 'friend.request'
  | 'friend.accepted'
  | 'calendar.reminder'
  | 'calendar.conflict'
  | 'system.announcement';

interface NotificationPayload {
  id: string;
  type: NotificationEvent;
  title: string;
  message: string;
  data: Record<string, any>;
  priority: number;
  timestamp: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
}
```

### 7.2 플랫폼별 전송 로직

```typescript
class NotificationDispatcher {
  async send(notification: NotificationPayload, platforms: Platform[]) {
    const promises = platforms.map(platform => {
      switch (platform.type) {
        case 'web':
          return this.sendWebSocket(platform.sessionId, notification);
        case 'kakao':
          return this.sendKakaoMessage(platform.userId, notification);
        case 'discord':
          return this.sendDiscordMessage(platform.userId, notification);
      }
    });

    return Promise.allSettled(promises);
  }

  private async sendWebSocket(sessionId: string, notification: NotificationPayload) {
    // WebSocket을 통한 실시간 전송
  }

  private async sendKakaoMessage(userId: string, notification: NotificationPayload) {
    // 카카오톡 메시지 템플릿 전송
  }

  private async sendDiscordMessage(userId: string, notification: NotificationPayload) {
    // Discord DM 또는 채널 메시지 전송
  }
}
```

## 8. 성능 최적화

### 8.1 연결 관리
- **연결 풀링**: WebSocket 연결 효율적 관리
- **Heartbeat**: 연결 상태 모니터링
- **재연결 로직**: 네트워크 끊김 시 자동 재연결

### 8.2 메시지 배치 처리
- **큐 배치**: 유사한 알림들 배치 전송
- **Rate Limiting**: 플랫폼별 API 제한 준수
- **Fallback**: 실패 시 다른 플랫폼으로 전송

### 8.3 캐싱 전략
- **Redis**: 활성 세션 및 사용자 상태 캐싱
- **메모리 캐시**: 자주 사용되는 알림 템플릿
- **TTL**: 적절한 만료 시간 설정

## 9. 모니터링 및 로깅

### 9.1 메트릭
- WebSocket 연결 수
- 알림 전송 성공/실패율
- 평균 응답 시간
- 플랫폼별 전송 통계

### 9.2 알림 전송 로깅
```typescript
interface NotificationLog {
  id: string;
  userId: string;
  platform: string;
  type: string;
  status: 'sent' | 'failed' | 'pending';
  latency: number;
  error?: string;
  timestamp: string;
}
```

## 10. 보안 고려사항

### 10.1 인증 및 권한
- JWT 토큰 기반 WebSocket 인증
- 플랫폼별 사용자 검증
- 알림 전송 권한 확인

### 10.2 데이터 보호
- 민감한 정보 암호화
- 알림 내용 필터링
- 개인정보 마스킹

### 10.3 Rate Limiting
- 사용자별 알림 전송 제한
- API 남용 방지
- DDoS 공격 대응

## 11. 단계별 구현 계획

### Phase 1: 기본 WebSocket 실시간 알림
- [ ] WebSocket 서버 구축
- [ ] 기본 알림 큐 시스템
- [ ] 웹 클라이언트 실시간 알림

### Phase 2: 메신저 플랫폼 통합
- [ ] 카카오톡 템플릿 메시지 연동
- [ ] Discord 알림 메시지 전송
- [ ] 플랫폼 간 동기화

### Phase 3: 실시간 약속 조율
- [ ] 약속 조율 세션 관리
- [ ] 실시간 투표 시스템
- [ ] 자동 결정 알고리즘

### Phase 4: 고도화 기능
- [ ] Push Notification
- [ ] 스마트 알림 필터링
- [ ] AI 기반 알림 최적화

## 12. 테스트 전략

### 12.1 단위 테스트
- 알림 전송 로직
- 세션 관리 기능
- 큐 처리 시스템

### 12.2 통합 테스트
- 플랫폼 간 연동
- 실시간 동기화
- 장애 복구 시나리오

### 12.3 부하 테스트
- 동시 연결 수 테스트
- 대량 알림 전송
- 메모리 및 CPU 사용량 모니터링