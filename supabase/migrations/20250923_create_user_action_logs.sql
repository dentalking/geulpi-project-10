-- Quick Actions 사용자 행동 추적 테이블
CREATE TABLE IF NOT EXISTS user_action_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,

  -- 제안 정보
  suggestion_text TEXT NOT NULL,
  suggestion_category TEXT, -- 'create', 'view', 'action', 'organize'
  suggestion_position INTEGER, -- 표시된 순서 (1-5)

  -- 컨텍스트 정보
  time_of_day TEXT, -- 'morning', 'afternoon', 'evening'
  day_of_week INTEGER, -- 0-6 (일-토)
  event_count INTEGER, -- 현재 표시된 이벤트 수
  last_ai_response TEXT, -- 마지막 AI 응답 (follow-up 추적용)
  locale TEXT DEFAULT 'ko',

  -- 행동 정보
  action_type TEXT NOT NULL, -- 'clicked', 'ignored', 'displayed'
  action_timestamp TIMESTAMPTZ DEFAULT NOW(),
  response_time_ms INTEGER, -- 클릭까지 걸린 시간 (밀리초)

  -- 메타 정보
  created_at TIMESTAMPTZ DEFAULT NOW(),
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,

  -- 인덱스용
  CONSTRAINT valid_action_type CHECK (action_type IN ('clicked', 'ignored', 'displayed'))
);

-- 인덱스 생성 (쿼리 성능 최적화)
CREATE INDEX idx_user_action_logs_user_id ON user_action_logs(user_id);
CREATE INDEX idx_user_action_logs_created_at ON user_action_logs(created_at DESC);
CREATE INDEX idx_user_action_logs_action_type ON user_action_logs(action_type);
CREATE INDEX idx_user_action_logs_suggestion_text ON user_action_logs(suggestion_text);

-- Row Level Security 활성화
ALTER TABLE user_action_logs ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 로그만 볼 수 있음
CREATE POLICY "Users can view own action logs"
  ON user_action_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 로그를 생성할 수 있음
CREATE POLICY "Users can insert own action logs"
  ON user_action_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 집계 뷰 (자주 사용하는 제안 분석용)
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

-- 사용자별 선호 패턴 분석 함수
CREATE OR REPLACE FUNCTION get_user_preferences(p_user_id UUID)
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

-- 테스트 데이터 삽입을 위한 도우미 함수 (개발용)
CREATE OR REPLACE FUNCTION insert_test_action_log(
  p_user_id UUID,
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