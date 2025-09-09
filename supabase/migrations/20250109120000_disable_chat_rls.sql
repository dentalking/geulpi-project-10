-- Temporarily disable RLS for chat tables since we're using Google OAuth
-- not Supabase Auth, so auth.uid() won't work

-- Disable RLS on chat tables
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Add comment explaining why RLS is disabled
COMMENT ON TABLE chat_sessions IS 'RLS disabled - using Google OAuth for authentication';
COMMENT ON TABLE chat_messages IS 'RLS disabled - using Google OAuth for authentication';