-- Row Level Security (RLS) 마이그레이션
-- 이 스크립트는 보안 강화를 위해 필요한 RLS 정책을 설정합니다

-- 1. users 테이블 RLS 활성화 및 정책 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 데이터만 읽을 수 있음
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (id = auth.uid()::text OR id = current_setting('app.current_user_id', true));

-- 사용자는 자신의 데이터만 업데이트 할 수 있음
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (id = auth.uid()::text OR id = current_setting('app.current_user_id', true));

-- 2. chat_sessions 테이블 RLS 활성화 및 정책 설정
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 세션만 볼 수 있음
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT
  USING (user_id = auth.uid()::text OR user_id = current_setting('app.current_user_id', true));

-- 사용자는 자신의 세션만 생성할 수 있음
CREATE POLICY "Users can create own chat sessions" ON chat_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text OR user_id = current_setting('app.current_user_id', true));

-- 사용자는 자신의 세션만 업데이트할 수 있음
CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE
  USING (user_id = auth.uid()::text OR user_id = current_setting('app.current_user_id', true));

-- 사용자는 자신의 세션만 삭제할 수 있음
CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
  FOR DELETE
  USING (user_id = auth.uid()::text OR user_id = current_setting('app.current_user_id', true));

-- 3. chat_messages 테이블 RLS 활성화 및 정책 설정
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 세션의 메시지만 볼 수 있음
CREATE POLICY "Users can view own session messages" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND (chat_sessions.user_id = auth.uid()::text
           OR chat_sessions.user_id = current_setting('app.current_user_id', true))
    )
  );

-- 사용자는 자신의 세션에만 메시지를 추가할 수 있음
CREATE POLICY "Users can add messages to own sessions" ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND (chat_sessions.user_id = auth.uid()::text
           OR chat_sessions.user_id = current_setting('app.current_user_id', true))
    )
  );

-- 4. friends 테이블 RLS 활성화 및 정책 설정
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신이 관련된 친구 관계만 볼 수 있음
CREATE POLICY "Users can view own friendships" ON friends
  FOR ALL
  USING (
    user_id = auth.uid()::text
    OR friend_id = auth.uid()::text
    OR user_id = current_setting('app.current_user_id', true)
    OR friend_id = current_setting('app.current_user_id', true)
  );

-- 5. friend_invitations 테이블 RLS 활성화 및 정책 설정
ALTER TABLE friend_invitations ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신이 보내거나 받은 초대만 볼 수 있음
CREATE POLICY "Users can view own invitations" ON friend_invitations
  FOR SELECT
  USING (
    inviter_id = auth.uid()::text
    OR inviter_id = current_setting('app.current_user_id', true)
    OR invitee_email IN (
      SELECT email FROM users
      WHERE id = auth.uid()::text
      OR id = current_setting('app.current_user_id', true)
    )
  );

-- 사용자는 자신의 초대만 생성할 수 있음
CREATE POLICY "Users can create own invitations" ON friend_invitations
  FOR INSERT
  WITH CHECK (
    inviter_id = auth.uid()::text
    OR inviter_id = current_setting('app.current_user_id', true)
  );

-- 6. friend_groups 테이블 RLS 활성화 및 정책 설정
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 그룹만 관리할 수 있음
CREATE POLICY "Users can manage own friend groups" ON friend_groups
  FOR ALL
  USING (
    user_id = auth.uid()::text
    OR user_id = current_setting('app.current_user_id', true)
  );

-- 7. calendar_sharing 테이블 RLS 활성화 및 정책 설정
ALTER TABLE calendar_sharing ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신이 관련된 공유 설정만 볼 수 있음
CREATE POLICY "Users can view related calendar sharing" ON calendar_sharing
  FOR ALL
  USING (
    owner_id = auth.uid()::text
    OR shared_with_id = auth.uid()::text
    OR owner_id = current_setting('app.current_user_id', true)
    OR shared_with_id = current_setting('app.current_user_id', true)
  );

-- 노트:
-- 이 스크립트는 두 가지 인증 방식을 모두 지원합니다:
-- 1. Supabase Auth (auth.uid())
-- 2. Custom JWT Auth (app.current_user_id)
--
-- 애플리케이션에서 JWT 인증 사용 시 다음과 같이 설정해야 합니다:
-- SET LOCAL app.current_user_id TO 'user_id_here';