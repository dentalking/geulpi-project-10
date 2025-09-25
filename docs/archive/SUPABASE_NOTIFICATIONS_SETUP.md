# Supabase 실시간 알림 시스템 설정 가이드 🔔

## Next.js + Vercel + Supabase Cloud 조합으로 구현된 실시간 알림

### 구현 완료 사항 ✅

1. **Supabase 테이블 및 RLS**
   - `notifications` 테이블 생성
   - `notification_preferences` 테이블 생성
   - Row Level Security 정책 설정
   - 인덱스 최적화

2. **Supabase Realtime**
   - 실시간 구독 (`useSupabaseNotifications` Hook)
   - INSERT, UPDATE, DELETE 이벤트 감지
   - 자동 알림 표시

3. **API Routes**
   - `/api/notifications` - CRUD operations
   - `/api/notifications/schedule` - 이벤트 기반 알림 스케줄링
   - `/api/cron/notifications` - Vercel Cron Job

4. **Vercel Cron**
   - 5분마다 예약된 알림 처리
   - 만료된 알림 자동 정리

### 설정 방법 📋

#### 1. Supabase 설정

```bash
# 1. Supabase 프로젝트에서 SQL Editor 열기
# 2. 다음 마이그레이션 파일 실행:
- supabase/migrations/20250921_create_notifications_table.sql
- supabase/migrations/20250921_add_processed_at_column.sql
```

#### 2. 환경 변수 설정

`.env.local` 파일에 추가:

```env
# Supabase (이미 있어야 함)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Vercel Cron Secret (랜덤 문자열 생성)
CRON_SECRET=generate_random_string_here
```

#### 3. Vercel 배포 설정

Vercel 대시보드에서:

1. **Environment Variables** 추가
   - `CRON_SECRET` 설정

2. **Cron Job 확인**
   - 배포 후 Settings > Functions > Cron Jobs 확인
   - `/api/cron/notifications` - 5분마다 실행

### 사용 방법 🚀

#### 알림 자동 생성

이벤트가 생성되면 자동으로 알림이 스케줄됩니다:

- **15분 전 알림** - 일정 시작 전 리마인더
- **출발 시간 알림** - 위치가 있는 경우 이동 시간 고려
- **회의 준비 알림** - 회의 1시간 전 준비 체크리스트

#### 알림 설정

사용자별 알림 설정이 `notification_preferences` 테이블에 저장됩니다:

```typescript
interface NotificationPreferences {
  reminder_minutes: number;      // 기본 15분
  travel_buffer_minutes: number; // 기본 30분
  preparation_minutes: number;   // 기본 60분
  briefing_time: string;         // "09:00"
  // 알림 유형별 on/off
  reminder_enabled: boolean;
  travel_enabled: boolean;
  // ...
}
```

### 아키텍처 🏗️

```
[Calendar Event Created]
        ↓
[API: /api/notifications/schedule]
        ↓
[Supabase: Insert Notifications]
        ↓
[Vercel Cron (5분마다)]
        ↓
[Process Due Notifications]
        ↓
[Supabase Realtime]
        ↓
[Client: Real-time Update]
```

### 모니터링 📊

#### Supabase Dashboard
- Table Editor에서 `notifications` 테이블 확인
- Realtime 섹션에서 구독 상태 확인

#### Vercel Dashboard
- Functions 탭에서 Cron 실행 로그 확인
- 에러 발생 시 알림 설정 가능

### 주요 특징 🌟

1. **WebSocket 없이 실시간**
   - Supabase Realtime 활용
   - 서버 관리 불필요

2. **자동 스케줄링**
   - Vercel Cron으로 서버리스 처리
   - 5분 단위 정확도

3. **확장 가능**
   - 이메일 알림 추가 가능
   - 카카오톡 연동 가능
   - Push Notification 추가 가능

### 테스트 방법 🧪

```javascript
// 브라우저 콘솔에서 테스트
// 1. 수동으로 알림 생성
fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'reminder',
    priority: 'high',
    title: 'Test Notification',
    message: 'This is a test notification',
    scheduled_for: new Date(Date.now() + 60000) // 1분 후
  })
})

// 2. 알림 목록 확인
fetch('/api/notifications?unread=true')
  .then(r => r.json())
  .then(console.log)
```

### 트러블슈팅 🔧

#### 알림이 표시되지 않음
1. 브라우저 알림 권한 확인
2. Supabase Realtime 연결 확인
3. RLS 정책 확인

#### Cron이 실행되지 않음
1. Vercel 환경변수 `CRON_SECRET` 확인
2. Vercel Functions 로그 확인
3. `vercel.json` cron 설정 확인

#### 알림이 중복 생성됨
1. 이벤트 ID로 중복 체크
2. `processed_at` 필드 확인

### 향후 개선 사항 🚀

- [ ] 알림 설정 UI 구현
- [ ] 이메일 알림 연동
- [ ] 카카오톡 알림 연동
- [ ] PWA Push Notification
- [ ] 알림 통계 대시보드
- [ ] AI 기반 스마트 알림 시간 추천