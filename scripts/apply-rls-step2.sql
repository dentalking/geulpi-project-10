-- ==========================================
-- STEP 2: 기본 RLS 정책 적용 (앱이 계속 작동하도록)
-- ==========================================
-- 주의: 이 정책들은 임시 정책입니다.
-- 앱이 정상 작동하는지 확인 후 더 엄격한 정책으로 교체해야 합니다.

-- ==========================================
-- users 테이블 정책
-- ==========================================
-- 모든 인증된 사용자가 users 테이블 읽기 가능 (친구 찾기 등)
CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT
  USING (true);  -- 임시: 모든 사용자 조회 가능

-- 자신의 데이터만 업데이트
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (
    id::text = coalesce(current_setting('app.current_user_id', true), '')
  );

-- 새 사용자 등록 허용
CREATE POLICY "users_insert_registration" ON users
  FOR INSERT
  WITH CHECK (true);  -- 회원가입 허용

-- ==========================================
-- chat_sessions 테이블 정책
-- ==========================================
-- 자신의 세션만 조회
CREATE POLICY "chat_sessions_select_own" ON chat_sessions
  FOR SELECT
  USING (
    user_id::text = coalesce(current_setting('app.current_user_id', true), '') OR
    user_id IS NULL  -- null user_id도 허용 (임시)
  );

-- 세션 생성 허용
CREATE POLICY "chat_sessions_insert" ON chat_sessions
  FOR INSERT
  WITH CHECK (
    user_id::text = coalesce(current_setting('app.current_user_id', true), '') OR
    user_id IS NULL
  );

-- 자신의 세션만 업데이트
CREATE POLICY "chat_sessions_update_own" ON chat_sessions
  FOR UPDATE
  USING (
    user_id::text = coalesce(current_setting('app.current_user_id', true), '') OR
    user_id IS NULL
  );

-- ==========================================
-- chat_messages 테이블 정책
-- ==========================================
-- 자신의 세션의 메시지만 조회
CREATE POLICY "chat_messages_select_own" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND (chat_sessions.user_id::text = coalesce(current_setting('app.current_user_id', true), '')
           OR chat_sessions.user_id IS NULL)
    )
  );

-- 자신의 세션에만 메시지 추가
CREATE POLICY "chat_messages_insert_own" ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = chat_messages.session_id
      AND (chat_sessions.user_id::text = coalesce(current_setting('app.current_user_id', true), '')
           OR chat_sessions.user_id IS NULL)
    )
  );

-- ==========================================
-- friends 테이블 정책
-- ==========================================
-- 자신이 관련된 친구 관계만 조회
CREATE POLICY "friends_select_related" ON friends
  FOR SELECT
  USING (
    user_id::text = coalesce(current_setting('app.current_user_id', true), '') OR
    friend_id::text = coalesce(current_setting('app.current_user_id', true), '')
  );

-- 친구 요청 생성
CREATE POLICY "friends_insert" ON friends
  FOR INSERT
  WITH CHECK (
    user_id::text = coalesce(current_setting('app.current_user_id', true), '')
  );

-- 관련된 친구 관계 업데이트
CREATE POLICY "friends_update_related" ON friends
  FOR UPDATE
  USING (
    user_id::text = coalesce(current_setting('app.current_user_id', true), '') OR
    friend_id::text = coalesce(current_setting('app.current_user_id', true), '')
  );

-- ==========================================
-- friend_invitations 테이블 정책
-- ==========================================
-- 자신이 보내거나 받은 초대만 조회
CREATE POLICY "friend_invitations_select" ON friend_invitations
  FOR SELECT
  USING (
    inviter_id::text = coalesce(current_setting('app.current_user_id', true), '') OR
    invitee_email IN (
      SELECT email FROM users
      WHERE id::text = coalesce(current_setting('app.current_user_id', true), '')
    )
  );

-- 초대 생성
CREATE POLICY "friend_invitations_insert" ON friend_invitations
  FOR INSERT
  WITH CHECK (
    inviter_id::text = coalesce(current_setting('app.current_user_id', true), '')
  );

-- ==========================================
-- friend_groups 테이블 정책
-- ==========================================
-- 자신의 그룹만 관리
CREATE POLICY "friend_groups_all_own" ON friend_groups
  FOR ALL
  USING (
    user_id::text = coalesce(current_setting('app.current_user_id', true), '')
  );

-- ==========================================
-- friend_group_members 테이블 정책
-- ==========================================
-- 자신의 그룹 멤버만 관리
CREATE POLICY "friend_group_members_all" ON friend_group_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM friend_groups
      WHERE friend_groups.id = friend_group_members.group_id
      AND friend_groups.user_id::text = coalesce(current_setting('app.current_user_id', true), '')
    )
  );

-- ==========================================
-- calendar_sharing 테이블 정책
-- ==========================================
-- 관련된 공유 설정만 조회
CREATE POLICY "calendar_sharing_all_related" ON calendar_sharing
  FOR ALL
  USING (
    owner_id::text = coalesce(current_setting('app.current_user_id', true), '') OR
    shared_with_id::text = coalesce(current_setting('app.current_user_id', true), '')
  );