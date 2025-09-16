# 데이터베이스 정합성 개선 실행 계획

## 🚨 즉시 실행 필요 (보안 이슈)

### 1. RLS (Row Level Security) 활성화
**위험도: 높음** - 현재 대부분의 테이블에 RLS가 비활성화되어 있어 보안 위험

```bash
# Supabase Dashboard에서 실행하거나 Supabase CLI 사용
supabase db push < supabase_rls_migration.sql
```

**영향받는 테이블:**
- users (26개 레코드)
- chat_sessions (123개 레코드)
- chat_messages (263개 레코드)
- friends, friend_invitations, friend_groups, calendar_sharing

### 2. 환경 변수 검증
**.env 파일 확인:**
```bash
DATABASE_URL="postgresql://..."  # Supabase connection string
DIRECT_DATABASE_URL="postgresql://..."  # Supabase direct URL
JWT_SECRET="strong-random-secret-here"  # 변경 필수!
```

## 📋 단기 개선 사항 (1-2주)

### 1. Prisma 스키마 동기화
```bash
# Prisma 스키마 업데이트 후
npx prisma generate
npx prisma db pull  # Supabase DB에서 스키마 가져오기
npx prisma validate  # 스키마 유효성 검사
```

### 2. 데이터 마이그레이션 스크립트
```javascript
// scripts/migrate-user-ids.js
// UUID와 Google ID 형식 통일
const unifyUserIds = async () => {
  // 모든 Google numeric ID를 찾아서 일관된 형식으로 변환
  // 또는 그대로 유지하되 타입을 text로 통일
};
```

### 3. API 엔드포인트 리팩토링
우선순위:
1. `/api/auth/*` - 인증 통합
2. `/api/calendar/*` - Prisma 도입
3. `/api/chat/*` - RLS 활용

## 🏗️ 중기 개선 사항 (1-2개월)

### 1. Prisma ORM 전환

**현재 (Supabase 직접 호출):**
```typescript
const { data, error } = await supabase
  .from('calendar_events')
  .select('*')
  .eq('user_id', userId);
```

**개선 후 (Prisma ORM):**
```typescript
const events = await prisma.calendarEvent.findMany({
  where: { userId },
  include: { user: true }
});
```

**장점:**
- 타입 안정성
- 자동 완성
- 관계 쿼리 최적화
- 트랜잭션 지원

### 2. 인증 시스템 통합

**현재:** 이중 트랙 (JWT + Google OAuth)
**목표:** 통합 인증 미들웨어

```typescript
// middleware/auth.ts
export async function authenticate(request: Request) {
  // 1. JWT 토큰 체크
  // 2. Google OAuth 토큰 체크
  // 3. 통합된 User 객체 반환
  return { user, authType };
}
```

### 3. 데이터베이스 인덱스 최적화

```sql
-- 자주 조회되는 필드에 인덱스 추가
CREATE INDEX idx_chat_sessions_user_updated
  ON chat_sessions(user_id, updated_at DESC);

CREATE INDEX idx_calendar_events_user_time
  ON calendar_events(user_id, start_time);
```

## 📊 모니터링 및 검증

### 1. RLS 정책 테스트
```sql
-- RLS 정책이 제대로 작동하는지 테스트
SET app.current_user_id TO 'test-user-id';
SELECT * FROM users;  -- 본인 데이터만 보여야 함
```

### 2. 성능 모니터링
- Supabase Dashboard의 Performance 탭 활용
- 느린 쿼리 식별 및 최적화

### 3. 보안 감사
- Supabase Security Advisor 실행
- 권한 검토

## ✅ 체크리스트

### 즉시 (오늘)
- [ ] RLS 마이그레이션 스크립트 실행
- [ ] JWT_SECRET 환경 변수 변경
- [ ] Prisma 스키마 업데이트 및 generate

### 이번 주
- [ ] RLS 정책 테스트
- [ ] 중요 API 엔드포인트 보안 검토
- [ ] 백업 생성

### 다음 주
- [ ] Prisma 마이그레이션 계획 수립
- [ ] 인증 시스템 통합 설계
- [ ] 성능 베이스라인 측정

## 📝 주의사항

1. **백업 필수**: 모든 마이그레이션 전 전체 백업 생성
2. **단계적 적용**: 한 번에 모든 것을 바꾸지 말고 단계적으로
3. **테스트 환경**: 가능하면 테스트 환경에서 먼저 검증
4. **롤백 계획**: 각 변경사항에 대한 롤백 계획 준비

## 🔗 참고 자료

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## 🎯 최종 목표

1. **보안**: 모든 테이블에 적절한 RLS 정책 적용
2. **일관성**: Prisma 스키마와 실제 DB 100% 동기화
3. **성능**: 주요 쿼리 응답시간 < 100ms
4. **유지보수성**: 타입 안정성과 문서화 완비

---
작성일: 2025년 1월 16일
다음 검토일: 2025년 1월 23일