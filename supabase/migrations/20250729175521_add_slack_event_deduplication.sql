-- Add event deduplication table for Slack webhook events
CREATE TABLE slack_event_processed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  channel_id TEXT NOT NULL,
  message_ts TEXT NOT NULL,
  reaction TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  
  -- Indexes for performance
  CONSTRAINT unique_event_key UNIQUE (event_key)
);

-- Index for cleanup queries
CREATE INDEX idx_slack_event_processed_timestamp ON slack_event_processed(processed_at);

-- RLS policies
ALTER TABLE slack_event_processed ENABLE ROW LEVEL SECURITY;

-- Users can only see their own processed events
CREATE POLICY "Users can view own processed events" ON slack_event_processed
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update for webhook processing
CREATE POLICY "Service role can manage processed events" ON slack_event_processed
  FOR ALL USING (true);

-- Add cleanup function to remove old processed events (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_slack_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM slack_event_processed 
  WHERE processed_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Create a scheduled job to run cleanup daily (if pg_cron is available in production)
-- This is optional and can be handled by application code if needed
COMMENT ON TABLE slack_event_processed IS 'Tracks processed Slack events to prevent duplicate task creation';