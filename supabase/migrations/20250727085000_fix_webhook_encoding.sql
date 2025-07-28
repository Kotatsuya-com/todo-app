-- Fix base64url encoding issue
CREATE OR REPLACE FUNCTION generate_webhook_id()
RETURNS TEXT AS $$
BEGIN
  -- Generate a secure random webhook ID (URL-safe)
  -- Use base64 and replace problematic characters
  RETURN replace(replace(encode(gen_random_bytes(32), 'base64'), '/', '_'), '+', '-');
END;
$$ LANGUAGE plpgsql;