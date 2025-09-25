-- Fix user_action_logs table to reference the custom users table instead of auth.users
-- This resolves the type mismatch between TEXT (users.id) and UUID (auth.users.id)

-- Drop existing foreign key constraint and policies
ALTER TABLE user_action_logs DROP CONSTRAINT IF EXISTS user_action_logs_user_id_fkey;
DROP POLICY IF EXISTS "Users can view own action logs" ON user_action_logs;
DROP POLICY IF EXISTS "Users can insert own action logs" ON user_action_logs;

-- Change user_id column type from UUID to TEXT to match users.id
ALTER TABLE user_action_logs ALTER COLUMN user_id TYPE TEXT;

-- Add foreign key constraint to reference custom users table
ALTER TABLE user_action_logs
ADD CONSTRAINT user_action_logs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Recreate RLS policies with updated user identification
-- Note: Since we're not using Supabase Auth, we need custom JWT-based policies
CREATE POLICY "Users can view own action logs"
  ON user_action_logs FOR SELECT
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')
  );

CREATE POLICY "Users can insert own action logs"
  ON user_action_logs FOR INSERT
  WITH CHECK (
    user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')
  );

-- Create a policy for service role to bypass RLS when needed (for server-side operations)
CREATE POLICY "Service role can manage all action logs"
  ON user_action_logs FOR ALL
  USING (
    current_setting('role') = 'service_role'
  );

-- Update the user preferences function to work with TEXT user_id
DROP FUNCTION IF EXISTS get_user_preferences(UUID);

CREATE OR REPLACE FUNCTION get_user_preferences(p_user_id TEXT)
RETURNS TABLE(
  preferred_category TEXT,
  preferred_time_of_day TEXT,
  most_clicked_suggestions TEXT[],
  avg_response_time_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- 가장 많이 클릭한 카테고리
    (SELECT suggestion_category
     FROM user_action_logs
     WHERE user_id = p_user_id AND action_type = 'clicked'
     GROUP BY suggestion_category
     ORDER BY COUNT(*) DESC
     LIMIT 1) as preferred_category,

    -- 가장 활발한 시간대
    (SELECT time_of_day
     FROM user_action_logs
     WHERE user_id = p_user_id AND action_type = 'clicked'
     GROUP BY time_of_day
     ORDER BY COUNT(*) DESC
     LIMIT 1) as preferred_time_of_day,

    -- 상위 5개 자주 클릭한 제안
    ARRAY(
      SELECT suggestion_text
      FROM user_action_logs
      WHERE user_id = p_user_id AND action_type = 'clicked'
      GROUP BY suggestion_text
      ORDER BY COUNT(*) DESC
      LIMIT 5
    ) as most_clicked_suggestions,

    -- 평균 응답 시간
    AVG(response_time_ms)::INTEGER as avg_response_time_ms
  FROM user_action_logs
  WHERE user_id = p_user_id AND action_type = 'clicked';
END;
$$ LANGUAGE plpgsql;

-- Update the test helper function to work with TEXT user_id
DROP FUNCTION IF EXISTS insert_test_action_log(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION insert_test_action_log(
  p_user_id TEXT,
  p_suggestion_text TEXT,
  p_action_type TEXT
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO user_action_logs (
    user_id,
    session_id,
    suggestion_text,
    suggestion_category,
    suggestion_position,
    time_of_day,
    day_of_week,
    event_count,
    action_type,
    response_time_ms
  ) VALUES (
    p_user_id,
    'test-session-' || gen_random_uuid()::TEXT,
    p_suggestion_text,
    'create',
    1,
    CASE
      WHEN EXTRACT(HOUR FROM NOW()) < 12 THEN 'morning'
      WHEN EXTRACT(HOUR FROM NOW()) < 18 THEN 'afternoon'
      ELSE 'evening'
    END,
    EXTRACT(DOW FROM NOW()),
    FLOOR(RANDOM() * 10),
    p_action_type,
    FLOOR(RANDOM() * 3000 + 500)
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Update the user_suggestion_stats view to use TEXT user_id
DROP VIEW IF EXISTS user_suggestion_stats;

CREATE OR REPLACE VIEW user_suggestion_stats AS
SELECT
  user_id,
  suggestion_text,
  suggestion_category,
  time_of_day,
  COUNT(*) FILTER (WHERE action_type = 'clicked') as click_count,
  COUNT(*) FILTER (WHERE action_type = 'displayed') as display_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE action_type = 'displayed') > 0
    THEN ROUND(
      COUNT(*) FILTER (WHERE action_type = 'clicked')::NUMERIC /
      COUNT(*) FILTER (WHERE action_type = 'displayed')::NUMERIC * 100,
      2
    )
    ELSE 0
  END as ctr_percentage,
  MAX(created_at) as last_interaction
FROM user_action_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id, suggestion_text, suggestion_category, time_of_day;

-- Create a helper function to get current user ID from JWT token (for API routes)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
  -- Extract user_id from JWT claims if available
  BEGIN
    RETURN current_setting('request.jwt.claims', true)::json->>'user_id';
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;