# 알림 시스템 개선 계획 📱

## 1. 즉시 개선 가능한 부분 (Phase 1)

### 1.1 NotificationCenter 통합
```tsx
// src/app/[locale]/dashboard/page.tsx에 추가
import NotificationCenter from '@/components/NotificationCenter';

// 헤더 영역에 NotificationCenter 컴포넌트 추가
<div className="flex items-center gap-2">
  <NotificationCenter />
  <GoogleCalendarLink ... />
</div>
```

### 1.2 브라우저 알림 권한 요청
```tsx
// src/hooks/useNotificationPermission.ts
export function useNotificationPermission() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
}
```

### 1.3 알림 초기화
```tsx
// dashboard에서 NotificationStore 초기화
useEffect(() => {
  if (userId) {
    useNotificationStore.getState().initialize(userId);
  }
}, [userId]);
```

## 2. API 구현 (Phase 2)

### 2.1 알림 API 엔드포인트
```typescript
// src/app/api/notifications/route.ts
- GET: 사용자 알림 목록 조회
- POST: 새 알림 생성
- PUT: 알림 상태 업데이트 (읽음 처리)
- DELETE: 알림 삭제
```

### 2.2 알림 스케줄링 API
```typescript
// src/app/api/notifications/schedule/route.ts
- POST: 이벤트 기반 알림 자동 생성
- GET: 예정된 알림 조회
```

## 3. 실시간 알림 (Phase 3)

### 3.1 WebSocket 서버 구현
```typescript
// src/services/websocket/NotificationSocket.ts
- Socket.io 서버 설정
- 실시간 알림 전송
- 연결 상태 관리
```

### 3.2 Push Notification (PWA)
```typescript
// public/service-worker.js
- Service Worker 등록
- Push 알림 수신
- 백그라운드 동기화
```

## 4. 데이터베이스 스키마

```sql
-- 알림 테이블
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  event_id UUID REFERENCES calendar_events(id),
  type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  actions JSONB,
  metadata JSONB,
  scheduled_for TIMESTAMP,
  expires_at TIMESTAMP,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX idx_notifications_read ON notifications(read);
```

## 5. 사용자 설정 확장

```typescript
interface NotificationPreferences {
  enabled: boolean;
  types: {
    reminder: boolean;
    travel: boolean;
    preparation: boolean;
    briefing: boolean;
    conflict: boolean;
  };
  timing: {
    reminderMinutes: number; // 기본 15분
    travelBuffer: number;    // 기본 30분
    briefingTime: string;    // "09:00"
  };
  channels: {
    inApp: boolean;
    browser: boolean;
    email: boolean;
    push: boolean;
  };
}
```

## 6. 테스트 시나리오

### 6.1 단위 테스트
- NotificationManager 로직 테스트
- 알림 생성 조건 테스트
- 충돌 감지 테스트

### 6.2 통합 테스트
- API 엔드포인트 테스트
- WebSocket 연결 테스트
- 알림 전달 파이프라인 테스트

### 6.3 E2E 테스트
- 사용자 플로우 테스트
- 알림 수신 및 액션 테스트
- 권한 요청 플로우 테스트

## 7. 모니터링 및 분석

### 7.1 메트릭 수집
- 알림 전송 성공률
- 사용자 반응률 (클릭률)
- 알림 유형별 효과성

### 7.2 에러 트래킹
- 전송 실패 로깅
- 권한 거부 추적
- 네트워크 오류 처리

## 8. 구현 우선순위

### Phase 1 (즉시 구현 가능)
1. ✅ NotificationCenter 대시보드 통합
2. ✅ 브라우저 권한 요청
3. ✅ 로컬 알림 생성 및 표시

### Phase 2 (1주일)
1. API 엔드포인트 구현
2. 데이터베이스 스키마 생성
3. 알림 스케줄링 로직

### Phase 3 (2주일)
1. WebSocket 서버 구현
2. Service Worker 설정
3. Push Notification 구현

### Phase 4 (추가 개선)
1. 이메일 알림 연동
2. 카카오톡 알림 연동
3. AI 기반 스마트 알림

## 9. 예상 효과

- **사용자 참여도 향상**: 중요한 일정을 놓치지 않음
- **생산성 증가**: 자동 알림으로 일정 관리 효율화
- **사용자 만족도**: 스마트한 알림으로 편의성 제공

## 10. 주의사항

- 알림 피로도 관리 (너무 많은 알림 방지)
- 사용자 프라이버시 보호
- 배터리 소모 최소화
- 네트워크 사용량 최적화