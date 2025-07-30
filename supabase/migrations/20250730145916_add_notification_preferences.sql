-- Add notification preferences to users table
-- This migration adds user-specific notification settings for webhook events

-- Add notification preferences column to users table
ALTER TABLE users ADD COLUMN enable_webhook_notifications BOOLEAN DEFAULT true;

-- Update RLS policies to ensure users can only access their own notification settings
-- (This is already covered by existing user RLS policies)

-- Add index for performance when checking notification preferences
CREATE INDEX idx_users_webhook_notifications ON users(id, enable_webhook_notifications) WHERE enable_webhook_notifications = true;