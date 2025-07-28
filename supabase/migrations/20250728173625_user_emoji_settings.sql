-- Create user emoji settings table for customizable Slack reaction emojis
CREATE TABLE IF NOT EXISTS public.user_emoji_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  today_emoji TEXT NOT NULL DEFAULT 'fire',           -- Today (urgent)
  tomorrow_emoji TEXT NOT NULL DEFAULT 'calendar',    -- Tomorrow (planned)  
  later_emoji TEXT NOT NULL DEFAULT 'memo',           -- Later (low priority)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_emoji_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can only access their own emoji settings" ON public.user_emoji_settings
  FOR ALL USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_emoji_settings_user_id ON public.user_emoji_settings(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_emoji_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_emoji_settings_updated_at
  BEFORE UPDATE ON public.user_emoji_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_emoji_settings_updated_at();

-- Insert default settings for existing users
INSERT INTO public.user_emoji_settings (user_id, today_emoji, tomorrow_emoji, later_emoji)
SELECT 
  id,
  'fire',
  'calendar', 
  'memo'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_emoji_settings)
ON CONFLICT (user_id) DO NOTHING;