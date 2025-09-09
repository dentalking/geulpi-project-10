-- 채팅 데이터베이스 스키마 설계 (수정본)
-- Supabase용 SQL 스크립트
-- users 테이블 외래 키 제약 조건 제거

-- 1. 채팅 세션 테이블
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT, -- 외래 키 제약 없이 단순 텍스트로 저장
  title TEXT NOT NULL DEFAULT '새 채팅',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- 인덱스
  CONSTRAINT chat_sessions_id_check CHECK (length(id) > 0),
  CONSTRAINT chat_sessions_title_check CHECK (length(title) > 0)
);

-- 2. 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- 인덱스
  CONSTRAINT chat_messages_id_check CHECK (length(id) > 0),
  CONSTRAINT chat_messages_content_check CHECK (length(content) > 0)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated ON chat_sessions(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(session_id, created_at ASC);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- chat_sessions 테이블에 업데이트 트리거 적용
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- chat_messages 추가 시 chat_sessions의 updated_at도 업데이트
CREATE OR REPLACE FUNCTION update_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions 
  SET updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_session_on_message ON chat_messages;
CREATE TRIGGER update_session_on_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_updated_at();

-- RLS (Row Level Security) 설정 - 사용자별 데이터 격리
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 개발 환경을 위한 임시 정책 (모든 사용자 접근 허용)
-- 프로덕션에서는 더 제한적인 정책으로 변경 필요

-- 모든 사용자가 모든 세션에 접근 가능 (개발용)
DROP POLICY IF EXISTS "Public read access to sessions" ON chat_sessions;
CREATE POLICY "Public read access to sessions"
  ON chat_sessions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public write access to sessions" ON chat_sessions;
CREATE POLICY "Public write access to sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access to sessions" ON chat_sessions;
CREATE POLICY "Public update access to sessions"
  ON chat_sessions FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete access to sessions" ON chat_sessions;
CREATE POLICY "Public delete access to sessions"
  ON chat_sessions FOR DELETE
  USING (true);

-- 모든 사용자가 모든 메시지에 접근 가능 (개발용)
DROP POLICY IF EXISTS "Public read access to messages" ON chat_messages;
CREATE POLICY "Public read access to messages"
  ON chat_messages FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public write access to messages" ON chat_messages;
CREATE POLICY "Public write access to messages"
  ON chat_messages FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public update access to messages" ON chat_messages;
CREATE POLICY "Public update access to messages"
  ON chat_messages FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete access to messages" ON chat_messages;
CREATE POLICY "Public delete access to messages"
  ON chat_messages FOR DELETE
  USING (true);

-- 익명 사용자를 위한 추가 정책 (Supabase anon key 사용 시)
DROP POLICY IF EXISTS "Allow anonymous read access to sessions" ON chat_sessions;
CREATE POLICY "Allow anonymous read access to sessions"
  ON chat_sessions FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous write access to sessions" ON chat_sessions;
CREATE POLICY "Allow anonymous write access to sessions"
  ON chat_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous update access to sessions" ON chat_sessions;
CREATE POLICY "Allow anonymous update access to sessions"
  ON chat_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous delete access to sessions" ON chat_sessions;
CREATE POLICY "Allow anonymous delete access to sessions"
  ON chat_sessions FOR DELETE
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous read access to messages" ON chat_messages;
CREATE POLICY "Allow anonymous read access to messages"
  ON chat_messages FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anonymous write access to messages" ON chat_messages;
CREATE POLICY "Allow anonymous write access to messages"
  ON chat_messages FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous update access to messages" ON chat_messages;
CREATE POLICY "Allow anonymous update access to messages"
  ON chat_messages FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous delete access to messages" ON chat_messages;
CREATE POLICY "Allow anonymous delete access to messages"
  ON chat_messages FOR DELETE
  TO anon
  USING (true);

-- 테스트용 샘플 데이터 (선택사항)
/*
INSERT INTO chat_sessions (id, user_id, title) VALUES 
  ('sample_session_1', 'anonymous', 'AI 일정 관리'),
  ('sample_session_2', 'anonymous', '스크린샷 분석');

INSERT INTO chat_messages (id, session_id, role, content) VALUES 
  ('msg_1', 'sample_session_1', 'assistant', '안녕하세요! 캘린더 관리를 도와드릴게요.'),
  ('msg_2', 'sample_session_1', 'user', '내일 3시 회의 일정 추가해줘'),
  ('msg_3', 'sample_session_2', 'user', '이 스크린샷에서 일정 정보 추출해줘');
*/