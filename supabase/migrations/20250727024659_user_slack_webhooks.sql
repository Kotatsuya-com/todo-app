-- Create user_slack_webhooks table for user-specific Slack event webhook management
CREATE TABLE IF NOT EXISTS public.user_slack_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slack_connection_id UUID REFERENCES public.slack_connections(id) ON DELETE CASCADE NOT NULL,
  webhook_id TEXT UNIQUE NOT NULL,
  webhook_secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_event_at TIMESTAMP WITH TIME ZONE,
  event_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, slack_connection_id)
);

-- Enable RLS
ALTER TABLE public.user_slack_webhooks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own slack webhooks" ON public.user_slack_webhooks
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_slack_webhooks_user_id ON public.user_slack_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_slack_webhooks_webhook_id ON public.user_slack_webhooks(webhook_id);
CREATE INDEX IF NOT EXISTS idx_user_slack_webhooks_slack_connection ON public.user_slack_webhooks(slack_connection_id);
CREATE INDEX IF NOT EXISTS idx_user_slack_webhooks_active ON public.user_slack_webhooks(is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_slack_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_slack_webhooks_updated_at
  BEFORE UPDATE ON public.user_slack_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_user_slack_webhooks_updated_at();

-- Add function to generate secure webhook IDs
CREATE OR REPLACE FUNCTION generate_webhook_id()
RETURNS TEXT AS $$
BEGIN
  -- Generate a secure random webhook ID (URL-safe)
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Add function to generate webhook secrets
CREATE OR REPLACE FUNCTION generate_webhook_secret()
RETURNS TEXT AS $$
BEGIN
  -- Generate a secure random webhook secret
  RETURN encode(gen_random_bytes(64), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Add function to create user slack webhook with generated IDs
CREATE OR REPLACE FUNCTION create_user_slack_webhook(
  p_user_id UUID,
  p_slack_connection_id UUID
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  slack_connection_id UUID,
  webhook_id TEXT,
  is_active BOOLEAN,
  event_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_webhook_id TEXT;
  v_webhook_secret TEXT;
BEGIN
  -- Generate secure IDs
  v_webhook_id := generate_webhook_id();
  v_webhook_secret := generate_webhook_secret();
  
  -- Insert new webhook
  RETURN QUERY
  INSERT INTO public.user_slack_webhooks (
    user_id,
    slack_connection_id,
    webhook_id,
    webhook_secret,
    is_active,
    event_count
  ) VALUES (
    p_user_id,
    p_slack_connection_id,
    v_webhook_id,
    v_webhook_secret,
    true,
    0
  ) RETURNING 
    user_slack_webhooks.id,
    user_slack_webhooks.user_id,
    user_slack_webhooks.slack_connection_id,
    user_slack_webhooks.webhook_id,
    user_slack_webhooks.is_active,
    user_slack_webhooks.event_count,
    user_slack_webhooks.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;