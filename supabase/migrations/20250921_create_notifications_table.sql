-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,

  -- Notification details
  type VARCHAR(50) NOT NULL CHECK (type IN ('reminder', 'conflict', 'suggestion', 'briefing', 'alert', 'insight')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- JSON data
  actions JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Scheduling and status
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_event_id ON notifications(event_id);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read, dismiss)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can insert notifications (for system-generated notifications)
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE expires_at < NOW()
    AND expires_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Notification types enabled/disabled
  reminder_enabled BOOLEAN DEFAULT TRUE,
  travel_enabled BOOLEAN DEFAULT TRUE,
  preparation_enabled BOOLEAN DEFAULT TRUE,
  briefing_enabled BOOLEAN DEFAULT TRUE,
  conflict_enabled BOOLEAN DEFAULT TRUE,

  -- Timing preferences (in minutes)
  reminder_minutes INTEGER DEFAULT 15,
  travel_buffer_minutes INTEGER DEFAULT 30,
  preparation_minutes INTEGER DEFAULT 60,

  -- Daily briefing time
  briefing_time TIME DEFAULT '09:00:00',

  -- Quiet hours
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  -- Channels
  in_app_enabled BOOLEAN DEFAULT TRUE,
  browser_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification preferences
CREATE POLICY "Users can view own preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON notification_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for notification preferences updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for unread notification count
CREATE OR REPLACE VIEW unread_notification_counts AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
  COUNT(*) FILTER (WHERE priority = 'high') as high_count,
  COUNT(*) FILTER (WHERE priority = 'medium') as medium_count,
  COUNT(*) FILTER (WHERE priority = 'low') as low_count,
  COUNT(*) as total_count
FROM notifications
WHERE read = FALSE
  AND dismissed = FALSE
  AND (expires_at IS NULL OR expires_at > NOW())
GROUP BY user_id;

-- Grant access to the view
GRANT SELECT ON unread_notification_counts TO authenticated;

-- Create function to schedule event notifications
CREATE OR REPLACE FUNCTION schedule_event_notifications(
  p_event_id UUID,
  p_user_id UUID,
  p_event_time TIMESTAMPTZ,
  p_event_title TEXT,
  p_event_location TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_preferences notification_preferences;
BEGIN
  -- Get user preferences
  SELECT * INTO v_preferences
  FROM notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences exist, use defaults
  IF v_preferences IS NULL THEN
    v_preferences := ROW(
      gen_random_uuid(), p_user_id,
      TRUE, TRUE, TRUE, TRUE, TRUE,  -- all notifications enabled
      15, 30, 60,                     -- timing defaults
      '09:00:00'::TIME,               -- briefing time
      NULL, NULL,                     -- no quiet hours
      TRUE, TRUE, FALSE,              -- channels
      NOW(), NOW()
    );
  END IF;

  -- Create reminder notification
  IF v_preferences.reminder_enabled THEN
    INSERT INTO notifications (
      user_id, event_id, type, priority, title, message,
      scheduled_for, expires_at
    ) VALUES (
      p_user_id,
      p_event_id,
      'reminder',
      'high',
      'Event Reminder',
      p_event_title || ' starts in ' || v_preferences.reminder_minutes || ' minutes',
      p_event_time - (v_preferences.reminder_minutes * INTERVAL '1 minute'),
      p_event_time
    );
  END IF;

  -- Create travel notification if location exists
  IF v_preferences.travel_enabled AND p_event_location IS NOT NULL THEN
    INSERT INTO notifications (
      user_id, event_id, type, priority, title, message,
      scheduled_for, expires_at, metadata
    ) VALUES (
      p_user_id,
      p_event_id,
      'alert',
      'urgent',
      'Time to Leave',
      'Leave for ' || p_event_title || ' at ' || p_event_location,
      p_event_time - (v_preferences.travel_buffer_minutes * INTERVAL '1 minute'),
      p_event_time,
      jsonb_build_object('location', p_event_location)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;