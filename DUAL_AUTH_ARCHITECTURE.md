# 🏗 Geulpi 2트랙 인증 시스템 아키텍처 설계

## 📋 **핵심 설계 원칙**

1. **동일한 사용자 경험** - 인증 방식과 무관하게 모든 핵심 기능 동일 제공
2. **데이터 일관성** - 통일된 사용자 ID 체계로 모든 데이터 연결
3. **확장성** - 향후 다른 OAuth 제공자(Naver, Kakao 등) 추가 용이
4. **개인정보 보호** - 사용자가 데이터 저장 방식 선택 가능

---

## 🔧 **1단계: 통합 사용자 ID 시스템**

### **사용자 테이블 재설계**
```sql
-- 통합 사용자 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    auth_type VARCHAR(20) NOT NULL, -- 'google_oauth' | 'email_auth'

    -- Google OAuth 사용자 전용
    google_user_id TEXT UNIQUE, -- Google numeric ID
    google_access_token TEXT,
    google_refresh_token TEXT,
    google_calendar_enabled BOOLEAN DEFAULT false,

    -- 이메일 인증 사용자 전용
    password_hash TEXT,
    email_verified BOOLEAN DEFAULT false,

    -- 공통 필드
    profile_image_url TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
    preferred_language VARCHAR(10) DEFAULT 'ko',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT auth_type_check CHECK (
        (auth_type = 'google_oauth' AND google_user_id IS NOT NULL AND password_hash IS NULL) OR
        (auth_type = 'email_auth' AND password_hash IS NOT NULL AND google_user_id IS NULL)
    )
);
```

### **장점**
✅ **단일 사용자 ID (UUID)** - 모든 관련 데이터 일관성 보장
✅ **타입 안전성** - 제약 조건으로 데이터 무결성 강화
✅ **확장성** - 새로운 OAuth 제공자 추가 용이

---

## 📅 **2단계: 캘린더 데이터 통합 전략**

### **캘린더 이벤트 테이블 개선**
```sql
-- 개선된 캘린더 이벤트 테이블
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 기본 이벤트 정보
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',

    -- 동기화 메타데이터
    source VARCHAR(20) NOT NULL, -- 'google_calendar' | 'local' | 'imported'
    google_event_id TEXT UNIQUE, -- Google Calendar 이벤트 ID (null if local)
    external_calendar_id TEXT, -- 외부 캘린더 ID
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'synced', -- 'synced' | 'pending' | 'failed'

    -- Geulpi 확장 기능
    ai_generated BOOLEAN DEFAULT false,
    shared_with_friends UUID[], -- 친구들과 공유
    privacy_level VARCHAR(20) DEFAULT 'private', -- 'private' | 'friends' | 'public'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **캘린더 동기화 서비스**
```typescript
interface CalendarSyncService {
  // Google OAuth 사용자
  syncFromGoogleCalendar(userId: string): Promise<SyncResult>;
  syncToGoogleCalendar(eventId: string): Promise<boolean>;

  // 이메일 인증 사용자
  generateCalDAVEndpoint(userId: string): Promise<CalDAVConfig>;
  syncWithCalDAV(userId: string): Promise<SyncResult>;

  // 공통
  mergeConflicts(conflicts: EventConflict[]): Promise<EventConflict[]>;
}
```

---

## 🤝 **3단계: 친구 기능 통합**

### **친구 시스템 재설계**
```sql
-- 친구 관계 테이블 (auth_type 무관하게 작동)
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'blocked'

    -- 친구별 설정
    nickname TEXT, -- 친구에게 보여줄 별명
    calendar_sharing_enabled BOOLEAN DEFAULT false,
    shared_calendar_categories TEXT[], -- 공유할 캘린더 카테고리

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(requester_id, addressee_id),
    CHECK(requester_id != addressee_id)
);

-- 친구 초대 (이메일 기반, auth_type 무관)
CREATE TABLE friend_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_email TEXT NOT NULL,
    invitation_code VARCHAR(50) UNIQUE NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'accepted' | 'expired'
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧠 **4단계: AI 기능 통합**

### **AI 서비스 아키텍처**
```typescript
class UnifiedAIService {
  async processChatMessage(userId: string, message: string): Promise<AIResponse> {
    const user = await this.getUserWithAuth(userId);

    // 사용자 타입에 따른 컨텍스트 수집
    const context = await this.gatherUserContext(user);

    return this.generateResponse(message, context);
  }

  private async gatherUserContext(user: User): Promise<UserContext> {
    const baseContext = {
      events: await this.getUpcomingEvents(user.id),
      friends: await this.getFriendsList(user.id),
      preferences: await this.getUserPreferences(user.id)
    };

    // Google 사용자는 추가 컨텍스트 활용
    if (user.auth_type === 'google_oauth' && user.google_calendar_enabled) {
      baseContext.googleCalendarEvents = await this.getGoogleCalendarEvents(user.google_access_token);
      baseContext.googleContacts = await this.getGoogleContacts(user.google_access_token);
    }

    return baseContext;
  }
}
```

---

## 📱 **5단계: 스마트폰 연동 전략**

### **Google OAuth 사용자**
```typescript
// 자동 동기화 (이미 Google 계정으로 로그인된 상태)
class GoogleCalendarSync {
  async enableAutoSync(userId: string): Promise<void> {
    // Google Calendar API로 실시간 푸시 알림 설정
    await this.setupCalendarWebhook(userId);

    // 사용자 스마트폰에서 Google 계정 동기화 자동 활성화
    // Android: Google Calendar 앱 자동 동기화
    // iOS: Google Calendar 앱 또는 iOS 기본 캘린더 연동
  }
}
```

### **이메일 인증 사용자**
```typescript
// CalDAV/CardDAV 표준 프로토콜 제공
class CalDAVService {
  generateCalDAVConfig(userId: string): CalDAVConfig {
    return {
      server: 'https://geulpi.com/caldav',
      username: `user_${userId}`,
      password: this.generateAppPassword(userId),
      path: `/calendars/${userId}/default/`,

      // 스마트폰 설정 가이드
      setupInstructions: {
        ios: '설정 > 캘린더 > 계정 추가 > 기타 > CalDAV 계정 추가',
        android: 'DAVx5 앱 설치 후 CalDAV 계정 추가'
      }
    };
  }
}
```

---

## 🔄 **6단계: 마이그레이션 전략**

### **기존 데이터 복구 계획**
```sql
-- 1. 고아 레코드 정리
DELETE FROM calendar_events WHERE user_id IS NULL;
DELETE FROM chat_sessions WHERE user_id NOT IN (SELECT id FROM users);

-- 2. Google OAuth 사용자 데이터 복구
UPDATE users SET auth_type = 'google_oauth'
WHERE id IN (
  SELECT DISTINCT user_id FROM chat_sessions
  WHERE user_id ~ '^[0-9]+$'
);

-- 3. 이메일 인증 사용자 정리
UPDATE users SET auth_type = 'email_auth'
WHERE auth_type IS NULL AND password IS NOT NULL;
```

### **단계별 배포 전략**
```typescript
// Phase 1: 기존 시스템 안정화
1. 사용자 테이블 auth_type 컬럼 추가
2. 기존 사용자 데이터 분류 및 정리
3. 통합 인증 미들웨어 적용

// Phase 2: 새로운 기능 활성화
1. Google Calendar 실시간 동기화
2. CalDAV 서버 구축
3. 친구 기능 통합 테스트

// Phase 3: 사용자 경험 개선
1. 스마트폰 연동 가이드 제공
2. AI 기능 고도화
3. 성능 최적화
```

---

## 📊 **예상 결과**

### **Google OAuth 사용자 경험**
✅ 1클릭 로그인 → Google Calendar 자동 동기화
✅ 스마트폰 기본 캘린더 앱에서 실시간 확인
✅ Gmail 연락처 기반 친구 추천
✅ Google Meet 자동 연동

### **이메일 인증 사용자 경험**
✅ 개인정보 보호 강화 (Google 의존성 없음)
✅ CalDAV로 모든 캘린더 앱 연동 가능
✅ 동일한 AI 어시스턴트 + 친구 기능
✅ 자체 백업 및 내보내기 지원

### **개발팀 이점**
✅ 단일 코드베이스로 두 가지 경험 제공
✅ 사용자 선택권 제공으로 시장 확장성 증대
✅ Google 정책 변경에 대한 의존성 리스크 분산

---

## 🎯 **다음 단계 권고사항**

1. **MVP 구현**: Google OAuth 트랙 우선 완성 (기존 구글 사용자 확보)
2. **CalDAV 서버**: 이메일 사용자를 위한 표준 캘린더 동기화 구축
3. **통합 테스트**: 두 트랙 간 친구 기능, AI 기능 동일성 검증
4. **사용자 가이드**: 각 트랙별 최적 사용법 문서화

이 아키텍처로 **"구글의 편리함을 원하는 사용자"**와 **"개인정보 보호를 중시하는 사용자"** 모두를 만족시킬 수 있을 것입니다.