-- RLS(Row Level Security) 정책 테스트 스크립트
-- 실행 전 백업 필수!

-- ==========================================
-- 1단계: 현재 RLS 상태 확인
-- ==========================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ==========================================
-- 2단계: 기존 정책 확인 (있다면)
-- ==========================================
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

-- ==========================================
-- 3단계: 테스트용 사용자 생성 (옵션)
-- ==========================================
-- 테스트 사용자 1
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM users WHERE email = 'test1@example.com'
  ) THEN
    INSERT INTO users (id, email, password, name, auth_type)
    VALUES ('test-user-1', 'test1@example.com', 'hashed_password', 'Test User 1', 'standard');
  END IF;
END $$;

-- 테스트 사용자 2
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM users WHERE email = 'test2@example.com'
  ) THEN
    INSERT INTO users (id, email, password, name, auth_type)
    VALUES ('test-user-2', 'test2@example.com', 'hashed_password', 'Test User 2', 'standard');
  END IF;
END $$;

-- ==========================================
-- 4단계: RLS 정책 테스트 (DRY RUN)
-- ==========================================

-- users 테이블 테스트
-- RLS 활성화 전 상태 확인
SELECT '=== users 테이블 (RLS 활성화 전) ===' as test_step;
SELECT count(*) as total_users FROM users;

-- RLS 활성화 (테스트 모드)
-- 주의: 실제 적용 시 주석 제거
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 정책 생성 (테스트 모드)
-- 실제 적용 시 주석 제거하고 실행
/*
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (id = current_setting('app.current_user_id', true));
*/

-- RLS 정책 테스트
-- 사용자 컨텍스트 설정 후 쿼리 테스트
SELECT '=== RLS 테스트: test-user-1로 조회 ===' as test_step;
SET LOCAL app.current_user_id TO 'test-user-1';
-- SELECT * FROM users; -- 본인 데이터만 보여야 함

-- 다른 사용자로 전환
SELECT '=== RLS 테스트: test-user-2로 조회 ===' as test_step;
SET LOCAL app.current_user_id TO 'test-user-2';
-- SELECT * FROM users; -- 본인 데이터만 보여야 함

-- ==========================================
-- 5단계: chat_sessions 테이블 테스트
-- ==========================================
SELECT '=== chat_sessions 테이블 테스트 ===' as test_step;

-- 테스트 세션 생성
INSERT INTO chat_sessions (id, user_id, title)
VALUES
  ('session-1', 'test-user-1', 'Test Session 1'),
  ('session-2', 'test-user-2', 'Test Session 2')
ON CONFLICT DO NOTHING;

-- RLS 활성화 전 카운트
SELECT count(*) as total_sessions FROM chat_sessions;

-- RLS 정책 적용 후 테스트
-- SET LOCAL app.current_user_id TO 'test-user-1';
-- SELECT count(*) as my_sessions FROM chat_sessions; -- 본인 세션만 카운트

-- ==========================================
-- 6단계: calendar_events 테이블 테스트
-- ==========================================
SELECT '=== calendar_events 테이블 테스트 ===' as test_step;

-- 테스트 이벤트 생성
INSERT INTO calendar_events (id, user_id, summary, start_time, end_time)
VALUES
  ('event-1', 'test-user-1', 'Test Event 1', NOW(), NOW() + INTERVAL '1 hour'),
  ('event-2', 'test-user-2', 'Test Event 2', NOW(), NOW() + INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

-- RLS 적용 전후 비교
SELECT count(*) as total_events FROM calendar_events;
-- SET LOCAL app.current_user_id TO 'test-user-1';
-- SELECT count(*) as my_events FROM calendar_events; -- 본인 이벤트만

-- ==========================================
-- 7단계: 성능 테스트
-- ==========================================
SELECT '=== 성능 테스트 ===' as test_step;

-- RLS 적용 전 쿼리 플랜
EXPLAIN ANALYZE
SELECT * FROM calendar_events
WHERE user_id = 'test-user-1';

-- RLS 적용 후 쿼리 플랜 (정책 적용 후 실행)
-- SET LOCAL app.current_user_id TO 'test-user-1';
-- EXPLAIN ANALYZE SELECT * FROM calendar_events;

-- ==========================================
-- 8단계: 롤백 스크립트 (필요 시)
-- ==========================================
/*
-- RLS 비활성화
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE friends DISABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE friend_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sharing DISABLE ROW LEVEL SECURITY;

-- 정책 삭제
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can create own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view own session messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can add messages to own sessions" ON chat_messages;
DROP POLICY IF EXISTS "Users can view own friendships" ON friends;
DROP POLICY IF EXISTS "Users can view own invitations" ON friend_invitations;
DROP POLICY IF EXISTS "Users can create own invitations" ON friend_invitations;
DROP POLICY IF EXISTS "Users can manage own friend groups" ON friend_groups;
DROP POLICY IF EXISTS "Users can view related calendar sharing" ON calendar_sharing;

-- 테스트 데이터 정리
DELETE FROM calendar_events WHERE id IN ('event-1', 'event-2');
DELETE FROM chat_sessions WHERE id IN ('session-1', 'session-2');
DELETE FROM users WHERE id IN ('test-user-1', 'test-user-2');
*/

-- ==========================================
-- 실행 결과 요약
-- ==========================================
SELECT '=== 테스트 완료 ===' as summary;
SELECT
  'RLS 테스트 스크립트 실행 완료' as status,
  '실제 적용 전 검토 필요' as next_action;