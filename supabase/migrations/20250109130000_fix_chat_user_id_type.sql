-- Fix chat_sessions user_id type to support Google OAuth IDs
-- Google OAuth IDs are numeric strings, not UUIDs

-- Drop existing foreign key constraint and policies
ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey;

-- Change user_id from UUID to TEXT
ALTER TABLE chat_sessions 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Remove the NOT NULL constraint temporarily to allow NULL values
ALTER TABLE chat_sessions 
ALTER COLUMN user_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN chat_sessions.user_id IS 'Google OAuth user ID (numeric string)';

-- Ensure RLS is disabled (since we're using Google OAuth)
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;