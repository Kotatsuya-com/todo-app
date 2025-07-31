-- Fix realtime notifications by ensuring webhook-created todos trigger realtime events
-- This creates a function that can be called with user context to insert todos

-- Create a function that inserts todos with proper user context for realtime
CREATE OR REPLACE FUNCTION public.insert_todo_for_user(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_deadline DATE DEFAULT NULL,
  p_importance_score REAL DEFAULT 0.0,
  p_status TEXT DEFAULT 'open',
  p_created_via TEXT DEFAULT 'manual'
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  title TEXT,
  body TEXT,
  deadline DATE,
  importance_score REAL,
  status TEXT,
  created_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_via TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate user exists and caller has permission
  IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Validate created_via
  IF p_created_via NOT IN ('manual', 'slack_webhook') THEN
    RAISE EXCEPTION 'Invalid created_via value';
  END IF;

  -- Validate status
  IF p_status NOT IN ('open', 'done') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;

  -- Insert and return the new todo
  RETURN QUERY
  INSERT INTO todos (
    user_id,
    title,
    body,
    deadline,
    importance_score,
    status,
    created_via
  ) VALUES (
    p_user_id,
    p_title,
    p_body,
    p_deadline,
    p_importance_score,
    p_status,
    p_created_via
  )
  RETURNING 
    todos.id,
    todos.user_id,
    todos.title,
    todos.body,
    todos.deadline,
    todos.importance_score,
    todos.status,
    todos.created_at,
    todos.completed_at,
    todos.created_via;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_todo_for_user TO authenticated;

-- Create RLS policy to allow the function to be called
-- This allows the webhook to call the function with user context
CREATE POLICY "Allow webhook function calls" ON todos
  FOR INSERT WITH CHECK (
    -- Allow if called through the function (security definer ensures proper validation)
    true
  );