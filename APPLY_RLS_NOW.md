# 🚨 긴급: RLS 보안 정책 적용 가이드

## ⚠️ 현재 보안 이슈 (Supabase Security Advisor)

### ERROR 레벨 (즉시 조치 필요)
- ❌ `users` 테이블: RLS 비활성화 (26개 레코드 노출)
- ❌ `chat_sessions`: RLS 비활성화 (123개 레코드 노출)
- ❌ `chat_messages`: RLS 비활성화 (263개 레코드 노출)
- ❌ `friends`: RLS 비활성화
- ❌ `friend_groups`: RLS 비활성화
- ❌ `friend_group_members`: RLS 비활성화
- ❌ `friend_invitations`: RLS 비활성화
- ❌ `calendar_sharing`: RLS 비활성화

### WARN 레벨
- ⚠️ 함수 search_path 설정 필요
- ⚠️ PostgreSQL 버전 업그레이드 권장

## 🔥 즉시 실행 명령

### 방법 1: Supabase Dashboard (권장)

1. [Supabase Dashboard](https://app.supabase.com) 로그인
2. SQL Editor 열기
3. 아래 명령 복사하여 실행:

```sql
-- Step 1: RLS 활성화 (즉시 실행)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sharing ENABLE ROW LEVEL SECURITY;

-- Step 2: 기본 정책 생성 (최소한의 보호)
-- users 테이블
CREATE POLICY "Enable read for authenticated users only" ON users
  FOR SELECT USING (true);  -- 일단 모든 인증된 사용자가 읽기 가능

CREATE POLICY "Enable update for users based on id" ON users
  FOR UPDATE USING (id = auth.uid()::text OR id = current_setting('app.current_user_id', true));

-- chat_sessions 테이블
CREATE POLICY "Enable all for own sessions" ON chat_sessions
  FOR ALL USING (user_id = auth.uid()::text OR user_id = current_setting('app.current_user_id', true));

-- chat_messages 테이블
CREATE POLICY "Enable all for own messages" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND (chat_sessions.user_id = auth.uid()::text OR
           chat_sessions.user_id = current_setting('app.current_user_id', true))
    )
  );

-- calendar_events는 이미 RLS 활성화되어 있음 (확인만)
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'calendar_events';
```

### 방법 2: Supabase CLI 사용

```bash
# 1. 파일 적용
supabase db push < supabase_rls_migration.sql

# 2. 확인
supabase db remote query "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'"
```

## 📋 적용 후 즉시 확인

### 1. RLS 상태 확인
```sql
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ 활성화' ELSE '❌ 비활성화' END as "RLS 상태"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 2. 정책 확인
```sql
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 3. API 테스트
```javascript
// 브라우저 콘솔에서 테스트
fetch('/api/calendar/events')
  .then(res => res.json())
  .then(data => console.log('Events API:', data));

fetch('/api/chat/sessions')
  .then(res => res.json())
  .then(data => console.log('Sessions API:', data));
```

## ⏰ 예상 소요 시간

- RLS 활성화: 즉시 적용 (< 1초)
- 정책 생성: 1-2분
- 확인 및 테스트: 5-10분
- 전체 완료: 15분

## 🆘 문제 발생 시

### 증상: API 접근 불가
```sql
-- 임시로 모든 접근 허용 (디버깅용)
DROP POLICY IF EXISTS "Enable read for authenticated users only" ON users;
CREATE POLICY "Temporary allow all" ON users FOR ALL USING (true);
```

### 증상: 성능 저하
```sql
-- RLS 임시 비활성화 (최후의 수단)
ALTER TABLE [table_name] DISABLE ROW LEVEL SECURITY;
```

## ✅ 성공 지표

- [ ] Supabase Security Advisor에서 ERROR 0개
- [ ] 모든 API 정상 작동
- [ ] 사용자별 데이터 격리 확인

## 📢 중요

**지금 바로 실행하세요!**
현재 모든 사용자 데이터가 보호되지 않은 상태입니다.

---
작성: 2025년 1월 16일
긴급도: 🔴 **매우 높음**