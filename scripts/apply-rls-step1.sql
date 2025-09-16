-- ==========================================
-- STEP 1: RLS 활성화 (테이블별 단계적 적용)
-- ==========================================
-- 실행 시간: 2025-01-16
-- 활성 연결: 1개 (안전)

-- 1. 먼저 가장 중요한 테이블부터 RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. 친구 관련 테이블
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_group_members ENABLE ROW LEVEL SECURITY;

-- 3. 캘린더 공유 테이블
ALTER TABLE calendar_sharing ENABLE ROW LEVEL SECURITY;

-- 확인
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅' ELSE '❌' END as "RLS"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;