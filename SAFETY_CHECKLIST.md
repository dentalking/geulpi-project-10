# 🛡️ 안전 체크리스트 - DB 개선 작업

## ✅ 완료된 작업

### 1. 백업 및 준비
- [x] 백업 스크립트 생성 (`scripts/backup-database.sh`)
- [x] .env 파일 백업 생성
- [x] JWT_SECRET 생성 및 설정
- [x] NODE_ENV 설정
- [x] 환경 변수 보안 검사 (95/100점)

### 2. 테스트 스크립트 준비
- [x] RLS 테스트 SQL 스크립트 생성 (`scripts/test-rls-policies.sql`)
- [x] 환경 변수 보안 체크 스크립트 (`scripts/check-env-security.js`)
- [x] RLS 마이그레이션 SQL 준비 (`supabase_rls_migration.sql`)

### 3. 문서화
- [x] DB 스키마 리뷰 보고서 (`DB_SCHEMA_REVIEW.md`)
- [x] 실행 계획 문서 (`ACTION_PLAN.md`)
- [x] Prisma 예제 코드 (`events-prisma/route.ts.example`)

## 🚀 진행할 작업

### Step 1: RLS 적용 전 최종 확인
```bash
# 1. 현재 RLS 상태 확인
supabase db remote status

# 2. 활성 연결 수 확인 (트래픽이 적을 때 진행)
SELECT count(*) FROM pg_stat_activity WHERE datname = 'postgres';
```

### Step 2: RLS 정책 적용 (개발 환경)
```bash
# 1. 테스트 모드로 실행 (DRY RUN)
psql $DATABASE_URL < scripts/test-rls-policies.sql

# 2. 실제 RLS 정책 적용
psql $DATABASE_URL < supabase_rls_migration.sql

# 3. 적용 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### Step 3: 기능 테스트
- [ ] 로그인 테스트 (JWT 인증)
- [ ] 로그인 테스트 (Google OAuth)
- [ ] 캘린더 이벤트 CRUD
- [ ] 채팅 세션 생성/조회
- [ ] 친구 기능 테스트

### Step 4: 성능 모니터링
```sql
-- 쿼리 실행 시간 확인
EXPLAIN ANALYZE
SELECT * FROM calendar_events
WHERE user_id = 'test-user-id';

-- 슬로우 쿼리 확인
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## ⚠️ 롤백 계획

문제 발생 시 즉시 실행:

### 1. RLS 정책 롤백
```sql
-- RLS 비활성화
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE friends DISABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE friend_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sharing DISABLE ROW LEVEL SECURITY;

-- 정책 삭제 (필요 시)
DROP POLICY IF EXISTS "Users can view own data" ON users;
-- ... (모든 정책 삭제)
```

### 2. 백업 복원
```bash
# 백업에서 복원 (Supabase Dashboard 사용)
# 또는
pg_restore -d $DATABASE_URL backup_20250116_120000.sql.gz
```

### 3. 환경 변수 복원
```bash
# 백업한 .env 파일 복원
cp .env.backup.20250116_* .env
```

## 📊 성공 기준

- [ ] 모든 API 엔드포인트 정상 작동
- [ ] 성능 저하 없음 (응답시간 < 100ms)
- [ ] 보안 테스트 통과
- [ ] 에러 로그 없음

## 🔍 모니터링 체크포인트

### 적용 직후 (0-1시간)
- [ ] 에러 로그 모니터링
- [ ] API 응답 시간 체크
- [ ] 활성 사용자 테스트

### 안정화 (1-24시간)
- [ ] 일일 활성 사용자 수 확인
- [ ] 쿼리 성능 분석
- [ ] 메모리 사용량 체크

### 장기 모니터링 (1주일)
- [ ] 주간 보고서 생성
- [ ] 성능 트렌드 분석
- [ ] 보안 이벤트 검토

## 📞 비상 연락처

문제 발생 시:
1. Supabase Dashboard 확인
2. 로그 수집 (`supabase logs`)
3. 롤백 스크립트 실행
4. 팀원 공유

## 📅 타임라인

- **D-Day (오늘)**: 준비 완료 ✅
- **D+1**: 개발 환경 RLS 적용
- **D+2-3**: 기능 테스트 및 모니터링
- **D+4-7**: 안정화 관찰
- **D+8**: Production 적용 검토

---
최종 업데이트: 2025년 1월 16일
다음 검토: 내일 오전