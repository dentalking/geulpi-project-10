-- Create email queue table for storing emails when service is unavailable
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT,
  text TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at);

-- Add RLS policies
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can access email queue
CREATE POLICY "Service role can manage email queue"
  ON email_queue
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();

-- Function to process email queue (can be called by a cron job)
CREATE OR REPLACE FUNCTION process_email_queue()
RETURNS TABLE(processed_count INT, failed_count INT) AS $$
DECLARE
  processed INT := 0;
  failed INT := 0;
BEGIN
  -- Mark emails as being processed (you'd integrate with your email service here)
  UPDATE email_queue
  SET
    status = 'sent',
    sent_at = NOW(),
    attempts = attempts + 1
  WHERE status = 'pending'
    AND attempts < 3
    AND created_at > NOW() - INTERVAL '7 days'
  RETURNING id INTO processed;

  -- Mark old emails as failed
  UPDATE email_queue
  SET
    status = 'failed',
    error_message = 'Max attempts reached or email too old'
  WHERE status = 'pending'
    AND (attempts >= 3 OR created_at <= NOW() - INTERVAL '7 days')
  RETURNING id INTO failed;

  RETURN QUERY SELECT processed, failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;