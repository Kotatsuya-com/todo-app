-- Add created_via column to todos table to distinguish between manual and webhook creation
ALTER TABLE todos ADD COLUMN created_via TEXT DEFAULT 'manual' 
    CHECK (created_via IN ('manual', 'slack_webhook'));

-- Add index for better query performance on created_via
CREATE INDEX idx_todos_created_via ON todos(created_via);

-- Add comment to document the column purpose
COMMENT ON COLUMN todos.created_via IS 'Source of task creation: manual (user created) or slack_webhook (automatic via Slack reaction)';