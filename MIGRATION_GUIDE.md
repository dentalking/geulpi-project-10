# 데이터베이스 스키마 통합 마이그레이션 가이드

## 📋 마이그레이션 체크리스트

### 사전 준비사항
- [ ] 데이터베이스 전체 백업 완료
- [ ] 현재 운영 중인 서비스 중단 공지
- [ ] 롤백 계획 준비

## 🚀 마이그레이션 실행 단계

### 1. 로컬 환경 테스트

```bash
# 로컬 Supabase 시작
supabase start

# 기존 마이그레이션 적용
supabase db reset

# 새 마이그레이션 적용
supabase migration up 20250109_unified_auth_migration
```

### 2. 스테이징 환경 테스트

```bash
# 스테이징 프로젝트 연결
supabase link --project-ref [STAGING_PROJECT_ID]

# 마이그레이션 상태 확인
supabase migration list

# 마이그레이션 적용
supabase db push
```

### 3. 프로덕션 배포

⚠️ **주의: 프로덕션 배포 전 반드시 백업을 확인하세요**

```bash
# 프로덕션 프로젝트 연결
supabase link --project-ref [PRODUCTION_PROJECT_ID]

# 마이그레이션 적용
supabase db push
```

## 🔍 검증 테스트

### 1. 테이블 구조 확인

```sql
-- 모든 테이블 확인
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 외래키 관계 확인
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

### 2. RLS 정책 확인

```sql
-- RLS 활성화 상태 확인
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 3. 인덱스 확인

```sql
-- 모든 인덱스 확인
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 4. 기능 테스트

#### 사용자 인증
- [ ] 새 사용자 등록 가능
- [ ] 로그인/로그아웃 정상 작동
- [ ] 프로필 조회/수정 가능

#### 친구 관계
- [ ] 친구 요청 전송/수락 가능
- [ ] 친구 목록 조회 가능
- [ ] 친구 그룹 생성/관리 가능

#### 캘린더 공유
- [ ] 캘린더 공유 설정 가능
- [ ] 공유받은 캘린더 조회 가능

#### 채팅
- [ ] 채팅 세션 생성 가능
- [ ] 메시지 전송/조회 가능
- [ ] 사용자별 세션 격리 확인

## 🔄 롤백 절차

문제 발생 시 즉시 롤백:

```bash
# 롤백 스크립트 실행
supabase migration up 20250109_rollback_unified_auth

# 또는 SQL 직접 실행
psql $DATABASE_URL < supabase/migrations/20250109_rollback_unified_auth.sql
```

## 📊 성능 모니터링

마이그레이션 후 24시간 동안 모니터링:

```sql
-- 느린 쿼리 확인
SELECT 
    query,
    calls,
    total_time,
    mean,
    max,
    min
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean DESC
LIMIT 20;

-- 테이블 크기 확인
SELECT
    schemaname AS schema,
    tablename AS table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 인덱스 사용률 확인
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## ⚠️ 주요 변경사항

### 1. 인증 시스템
- ❌ 기존: Custom `users` 테이블 사용
- ✅ 변경: Supabase `auth.users` 사용

### 2. 채팅 시스템
- ❌ 기존: `user_id` TEXT 타입, 외래키 없음
- ✅ 변경: `user_id` UUID 타입, `auth.users` 참조

### 3. RLS 정책
- ❌ 기존: 일부 테이블만 RLS, 개발용 전체 접근 허용
- ✅ 변경: 모든 테이블 RLS 적용, 사용자별 접근 제어

### 4. 성능 최적화
- ✅ 복합 인덱스 추가
- ✅ JSONB GIN 인덱스 추가
- ✅ 중복 함수 제거

## 📝 마이그레이션 후 필수 작업

### 1. 애플리케이션 코드 업데이트

```typescript
// 기존 코드
const userId = session.user_id; // TEXT

// 변경 후
const userId = session.user.id; // UUID from auth.users
```

### 2. 환경 변수 확인

```env
# Supabase 연결 정보 확인
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 3. 타입 재생성

```bash
# TypeScript 타입 재생성
supabase gen types typescript --local > src/types/database.types.ts
```

## 🆘 문제 해결

### 외래키 제약 조건 오류
```sql
-- 고아 레코드 확인
SELECT * FROM friends 
WHERE user_id NOT IN (SELECT id FROM auth.users)
   OR friend_id NOT IN (SELECT id FROM auth.users);
```

### RLS 정책 충돌
```sql
-- 정책 삭제 후 재생성
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

### 인덱스 중복
```sql
-- 중복 인덱스 제거
DROP INDEX IF EXISTS duplicate_index_name;
```

## 📞 지원

문제 발생 시 연락처:
- 기술 지원: [support@example.com]
- 긴급 연락처: [emergency-number]

---

마지막 업데이트: 2025-01-09