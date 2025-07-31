-- Enable realtime for todos table
-- This allows realtime subscriptions to receive INSERT/UPDATE/DELETE events

-- Add todos table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE todos;

-- Ensure the publication includes all operations (INSERT, UPDATE, DELETE)
-- This is usually the default, but we make it explicit
ALTER PUBLICATION supabase_realtime SET (publish = 'insert,update,delete');

-- Grant necessary permissions for realtime functionality
-- The anon role needs to be able to read from todos for RLS to work with realtime
-- (This should already exist from initial schema but we ensure it's present)
GRANT SELECT ON TABLE todos TO anon;

-- Add a comment for documentation
COMMENT ON TABLE todos IS 'Todo items with realtime enabled for webhook notifications';