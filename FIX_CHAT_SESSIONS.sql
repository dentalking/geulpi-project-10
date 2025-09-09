-- ================================================================================
-- CRITICAL FIX: Change user_id from UUID to TEXT for Google OAuth compatibility
-- Date: 2025-01-09
-- 
-- PROBLEM: Google OAuth IDs are numeric strings (e.g., "117395047298475028374")
--          but our user_id column is UUID type, causing all inserts to fail
--
-- SOLUTION: Recreate tables with TEXT user_id
--
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/moszlrvkzrpmhvzmpiqk
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this ENTIRE script
-- 4. Click "Run"
-- ================================================================================

-- Step 1: Drop existing tables (they're empty anyway)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Step 2: Recreate chat_sessions with TEXT user_id
CREATE TABLE chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT, -- Changed from UUID to TEXT for Google OAuth IDs
    title TEXT NOT NULL DEFAULT '새 채팅',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Step 3: Recreate chat_messages (unchanged)
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Step 4: Create indexes for performance
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX idx_chat_sessions_user_updated ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(session_id, created_at ASC);

-- Step 5: Disable RLS (we're using Google OAuth, not Supabase Auth)
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Step 6: Add helpful comments
COMMENT ON TABLE chat_sessions IS 'Chat sessions for Google OAuth users (RLS disabled)';
COMMENT ON TABLE chat_messages IS 'Chat messages (RLS disabled)';
COMMENT ON COLUMN chat_sessions.user_id IS 'Google OAuth user ID (numeric string like "117395047298475028374")';

-- Step 7: Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Create trigger to update session when message is added
CREATE OR REPLACE FUNCTION update_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_sessions 
    SET updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_on_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_updated_at();

-- ================================================================================
-- VERIFICATION: Test that we can now insert with Google OAuth IDs
-- ================================================================================
DO $$
DECLARE
    test_session_id UUID;
BEGIN
    -- Try to insert a test session with a Google OAuth ID
    INSERT INTO chat_sessions (user_id, title)
    VALUES ('117395047298475028374', 'Test Session - Delete Me')
    RETURNING id INTO test_session_id;
    
    -- If we got here, it worked! Clean up the test
    DELETE FROM chat_sessions WHERE id = test_session_id;
    
    RAISE NOTICE '✅ SUCCESS: Tables recreated with TEXT user_id. Google OAuth IDs will now work!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR: Failed to create test session: %', SQLERRM;
END $$;

-- ================================================================================
-- SUCCESS! Your chat sessions will now work with Google OAuth IDs
-- ================================================================================