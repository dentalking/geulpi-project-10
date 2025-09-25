-- Add processed_at column to track when a scheduled notification was processed
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Create index for efficient querying of unprocessed notifications
CREATE INDEX IF NOT EXISTS idx_notifications_processed
ON notifications(processed_at)
WHERE processed_at IS NULL;