-- 채팅 데이터베이스 스키마 설계
-- Supabase용 SQL 스크립트

-- 1. 채팅 세션 테이블
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
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

-- RLS 정책: 사용자는 자신의 채팅만 접근 가능
CREATE POLICY "Users can only access their own chat sessions"
  ON chat_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can only access messages from their sessions"
  ON chat_messages FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()::text
    )
  );

-- 익명 사용자를 위한 임시 정책 (개발용 - 프로덕션에서는 제거)
CREATE POLICY "Allow anonymous read access to sessions"
  ON chat_sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous read access to messages"
  ON chat_messages FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous write access to sessions"
  ON chat_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous write access to messages"
  ON chat_messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access to sessions"
  ON chat_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 샘플 데이터 (개발용)
-- INSERT INTO chat_sessions (id, user_id, title) VALUES 
--   ('sample_session_1', 'user_123', 'AI 일정 관리'),
--   ('sample_session_2', 'user_123', '스크린샷 분석');
-- 
-- INSERT INTO chat_messages (id, session_id, role, content) VALUES 
--   ('msg_1', 'sample_session_1', 'assistant', '안녕하세요! 캘린더 관리를 도와드릴게요.'),
--   ('msg_2', 'sample_session_1', 'user', '내일 3시 회의 일정 추가해줘'),
--   ('msg_3', 'sample_session_2', 'user', '이 스크린샷에서 일정 정보 추출해줘');