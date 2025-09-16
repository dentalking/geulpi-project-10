# Supabase DB와 코드 정합성 검토 보고서

## 1. 현재 상황 요약

- **Prisma 스키마**: 정의되어 있지만 **실제로 사용되지 않음**
- **실제 사용**: 모든 API 엔드포인트가 Supabase 클라이언트를 직접 사용
- **데이터베이스**: Supabase Cloud의 PostgreSQL

## 2. 주요 불일치 사항

### 2.1 Users 테이블

**Supabase DB에는 있지만 Prisma에는 없는 필드:**
- `auth_type` (standard | google_oauth) - 인증 방식 구분
- `google_user_id` - Google OAuth 사용자 ID
- `google_access_token` - Google 액세스 토큰
- `google_refresh_token` - Google 리프레시 토큰
- `google_calendar_enabled` - Google 캘린더 연동 여부

**데이터 타입 차이:**
- Prisma: `id String @default(cuid())`
- Supabase: `id text default gen_random_uuid()`
- **영향**: ID 형식이 다름 (cuid vs UUID)

### 2.2 타임스탬프 필드

**Prisma:**
- `createdAt DateTime`
- `updatedAt DateTime`

**Supabase:**
- `created_at timestamp with time zone`
- `updated_at timestamp with time zone`
- 일부 테이블은 `timestamp without time zone` 사용

### 2.3 RLS (Row Level Security)

**RLS 활성화 상태:**
- ✅ 활성화: `user_profiles`, `calendar_events`
- ❌ 비활성화: `chat_sessions`, `chat_messages`, `friends`, `friend_groups`, `friend_invitations`, `calendar_sharing`, `users`

**문제점:** RLS가 비활성화된 테이블은 보안 취약점이 될 수 있음

### 2.4 외래키 제약조건

Supabase에는 모든 외래키가 정상적으로 설정되어 있음:
- `user_profiles.user_id -> users.id`
- `calendar_events.user_id -> users.id`
- `chat_sessions.user_id -> users.id` (nullable)
- `chat_messages.session_id -> chat_sessions.id`
- 등등...

## 3. 데이터 현황

| 테이블 | 레코드 수 | RLS 상태 |
|--------|-----------|----------|
| users | 26 | ❌ |
| user_profiles | 1 | ✅ |
| calendar_events | 73 | ✅ |
| chat_sessions | 123 | ❌ |
| chat_messages | 263 | ❌ |
| friends | 1 | ❌ |
| friend_invitations | 2 | ❌ |
| friend_groups | 0 | ❌ |
| friend_group_members | 0 | ❌ |
| calendar_sharing | 0 | ❌ |

## 4. 코드와 DB 정합성 이슈

### 4.1 이중 인증 시스템
현재 두 가지 인증 트랙이 병행 운영 중:
1. **JWT 이메일 인증** (표준 인증)
2. **Google OAuth 인증**

코드에서 두 트랙을 모두 체크하고 있어 복잡성 증가

### 4.2 Prisma 사용하지 않음
- `@prisma/client` 패키지는 설치되어 있지만 사용 안함
- 모든 DB 작업이 `supabase.from()` 직접 호출
- 타입 안정성 부족

### 4.3 userId 타입 불일치
- Prisma 스키마: `String @default(cuid())`
- Supabase: `text` (UUID 또는 Google numeric ID 저장)
- 실제 데이터: 혼재 (UUID와 Google numeric ID)

## 5. 권장 마이그레이션 사항

### 즉시 필요한 작업

1. **Prisma 스키마 업데이트**
   ```prisma
   model User {
     id                    String   @id @default(uuid())
     email                 String   @unique
     password              String?  // nullable for OAuth users
     name                  String?
     authType              String   @default("standard") @map("auth_type")
     googleUserId          String?  @unique @map("google_user_id")
     googleAccessToken     String?  @map("google_access_token")
     googleRefreshToken    String?  @map("google_refresh_token")
     googleCalendarEnabled Boolean  @default(false) @map("google_calendar_enabled")
     // ... rest of fields
   }
   ```

2. **RLS 정책 설정**
   - 최소한 `users`, `chat_sessions`, `chat_messages` 테이블에 RLS 활성화
   - 적절한 정책 작성 필요

3. **데이터 타입 통일**
   - 모든 timestamp를 `timestamp with time zone`으로 통일
   - userId 형식 통일 (text로 유지하되 일관성 확보)

### 중장기 개선사항

1. **Prisma 마이그레이션**
   - Supabase 직접 호출을 Prisma ORM으로 전환
   - 타입 안정성 확보
   - 쿼리 성능 최적화

2. **인증 시스템 통합**
   - 두 인증 트랙을 하나의 통합 시스템으로
   - 세션 관리 개선

3. **인덱스 최적화**
   - 자주 조회되는 필드에 인덱스 추가
   - 복합 인덱스 고려

## 6. 보안 권고사항

⚠️ **긴급**: RLS가 비활성화된 테이블들에 대한 보안 정책 수립 필요
- 특히 `users`, `chat_sessions`, `chat_messages` 테이블
- 현재는 애플리케이션 레벨에서만 보안이 적용되고 있음

## 7. 성능 고려사항

- `calendar_events`: 73개 레코드 (인덱스 있음)
- `chat_sessions`: 123개 레코드 (인덱스 필요할 수 있음)
- `chat_messages`: 263개 레코드 (session_id 인덱스 있음)

현재 데이터 규모에서는 성능 이슈 없을 것으로 보이나,
향후 확장을 고려한 인덱스 전략 필요

## 8. 결론

**현재 시스템은 작동하고 있지만 다음과 같은 개선이 필요:**

1. **즉시**: RLS 정책 설정으로 보안 강화
2. **단기**: Prisma 스키마와 실제 DB 동기화
3. **중기**: Prisma ORM 도입으로 타입 안정성 확보
4. **장기**: 인증 시스템 통합 및 최적화

현재 데이터 손실이나 치명적 오류는 없지만,
보안과 유지보수성 측면에서 개선이 필요한 상황입니다.