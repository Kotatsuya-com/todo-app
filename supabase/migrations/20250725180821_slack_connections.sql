-- Create slack_connections table for user-specific Slack workspace connections
CREATE TABLE IF NOT EXISTS public.slack_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  bot_user_id TEXT,
  scope TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, workspace_id)
);

-- Enable RLS
ALTER TABLE public.slack_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own Slack connections" ON public.slack_connections
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_slack_connections_user_id ON public.slack_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_slack_connections_workspace_id ON public.slack_connections(user_id, workspace_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_slack_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_slack_connections_updated_at
  BEFORE UPDATE ON public.slack_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_connections_updated_at();