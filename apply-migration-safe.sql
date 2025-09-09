-- ================================================================================
-- SAFE MIGRATION SCRIPT for Supabase Dashboard
-- Date: 2025-01-09  
-- Description: Apply schema improvements with safety checks
-- 
-- INSTRUCTIONS:
-- 1. First run backup-current-schema.sql
-- 2. Then run this migration in sections
-- 3. Check for errors after each section
-- ================================================================================

-- ================================================================================
-- SECTION 1: Prepare and Clean Up
-- ================================================================================

-- Create backup tables for chat data
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        DROP TABLE IF EXISTS chat_sessions_migration_backup;
        CREATE TABLE chat_sessions_migration_backup AS SELECT * FROM chat_sessions;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        DROP TABLE IF EXISTS chat_messages_migration_backup;
        CREATE TABLE chat_messages_migration_backup AS SELECT * FROM chat_messages;
    END IF;
END $$;

-- ================================================================================
-- SECTION 2: Remove Old Structures (with CASCADE for dependencies)
-- ================================================================================

-- Drop existing policies safely
DO $$
BEGIN
    -- Drop policies on users table if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        DROP POLICY IF EXISTS "Users can read own data" ON users;
        DROP POLICY IF EXISTS "Enable insert for authentication" ON users;
        DROP POLICY IF EXISTS "Users can update own data" ON users;
    END IF;
END $$;

-- Drop old chat tables (they will be recreated with proper structure)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Drop custom users table if it exists (we'll use auth.users)
DROP TABLE IF EXISTS users CASCADE;

-- ================================================================================
-- SECTION 3: Create/Update Core Tables
-- ================================================================================

-- Ensure user_profiles exists with correct structure
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    nickname TEXT,
    date_of_birth DATE,
    occupation TEXT,
    bio TEXT,
    home_address TEXT,
    home_latitude DECIMAL(10, 8),
    home_longitude DECIMAL(11, 8),
    work_address TEXT,
    work_latitude DECIMAL(10, 8),
    work_longitude DECIMAL(11, 8),
    work_start_time TIME,
    work_end_time TIME,
    working_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday"]'::jsonb,
    preferred_language VARCHAR(10) DEFAULT 'ko',
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
    wake_up_time TIME,
    sleep_time TIME,
    life_context JSONB DEFAULT '{}'::jsonb,
    interests TEXT[],
    goals TEXT[],
    important_dates JSONB DEFAULT '[]'::jsonb,
    family_members JSONB DEFAULT '[]'::jsonb,
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    allergies TEXT[],
    dietary_preferences TEXT[],
    exercise_routine TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ================================================================================
-- SECTION 4: Create Friend-Related Tables
-- ================================================================================

-- Friends table
CREATE TABLE IF NOT EXISTS friends (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    relationship_type VARCHAR(50),
    nickname VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    meeting_frequency INT DEFAULT 0,
    last_meeting_date DATE,
    common_locations JSONB,
    common_event_types JSONB,
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

-- Friend invitations
CREATE TABLE IF NOT EXISTS friend_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255) NOT NULL,
    invitation_code VARCHAR(100) UNIQUE NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- Calendar sharing
CREATE TABLE IF NOT EXISTS calendar_sharing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) DEFAULT 'view',
    share_all_events BOOLEAN DEFAULT false,
    shared_categories JSONB,
    hide_details BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(owner_id, shared_with_id)
);

-- Friend groups
CREATE TABLE IF NOT EXISTS friend_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_name VARCHAR(100) NOT NULL,
    group_color VARCHAR(7),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friend group members
CREATE TABLE IF NOT EXISTS friend_group_members (
    group_id UUID NOT NULL REFERENCES friend_groups(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY(group_id, friend_id)
);

-- ================================================================================
-- SECTION 5: Create New Chat Tables with Proper Structure
-- ================================================================================

-- Chat sessions with UUID user_id referencing auth.users
CREATE TABLE chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '새 채팅',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Chat messages
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

-- ================================================================================
-- SECTION 6: Create Unified Trigger Function
-- ================================================================================

-- Drop all existing update_updated_at functions to avoid conflicts
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create single unified function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at column
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_sharing_updated_at
    BEFORE UPDATE ON calendar_sharing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Special trigger for chat messages to update session
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
-- SECTION 7: Create Comprehensive Indexes
-- ================================================================================

-- User profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Friends
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_friends_user_status ON friends(user_id, status);

-- Friend invitations
CREATE INDEX IF NOT EXISTS idx_friend_invitations_inviter ON friend_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_friend_invitations_email ON friend_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_friend_invitations_code ON friend_invitations(invitation_code);

-- Calendar sharing
CREATE INDEX IF NOT EXISTS idx_calendar_sharing_owner ON calendar_sharing(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sharing_shared_with ON calendar_sharing(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sharing_both ON calendar_sharing(owner_id, shared_with_id);

-- Friend groups
CREATE INDEX IF NOT EXISTS idx_friend_groups_user ON friend_groups(user_id);

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(session_id, created_at ASC);

-- JSONB indexes (using GIN for better performance)
CREATE INDEX IF NOT EXISTS idx_user_profiles_life_context ON user_profiles USING GIN (life_context);
CREATE INDEX IF NOT EXISTS idx_user_profiles_important_dates ON user_profiles USING GIN (important_dates);
CREATE INDEX IF NOT EXISTS idx_friends_common_locations ON friends USING GIN (common_locations);
CREATE INDEX IF NOT EXISTS idx_calendar_sharing_categories ON calendar_sharing USING GIN (shared_categories);

-- ================================================================================
-- SECTION 8: Enable RLS on All Tables
-- ================================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ================================================================================
-- SECTION 9: Create RLS Policies
-- ================================================================================

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Friends policies
CREATE POLICY "Users can view their friends" ON friends
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can add friends" ON friends
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friend status" ON friends
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can remove friends" ON friends
    FOR DELETE USING (auth.uid() = user_id);

-- Friend invitations policies
CREATE POLICY "Users can view their invitations" ON friend_invitations
    FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invitations" ON friend_invitations
    FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update their invitations" ON friend_invitations
    FOR UPDATE USING (auth.uid() = inviter_id);

-- Calendar sharing policies
CREATE POLICY "Users can view their calendar shares" ON calendar_sharing
    FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = shared_with_id);

CREATE POLICY "Users can create calendar shares" ON calendar_sharing
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their calendar shares" ON calendar_sharing
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their calendar shares" ON calendar_sharing
    FOR DELETE USING (auth.uid() = owner_id);

-- Friend groups policies
CREATE POLICY "Users can view their groups" ON friend_groups
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create groups" ON friend_groups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their groups" ON friend_groups
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their groups" ON friend_groups
    FOR DELETE USING (auth.uid() = user_id);

-- Friend group members policies
CREATE POLICY "Users can view group members" ON friend_group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM friend_groups 
            WHERE id = friend_group_members.group_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add group members" ON friend_group_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM friend_groups 
            WHERE id = friend_group_members.group_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can remove group members" ON friend_group_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM friend_groups 
            WHERE id = friend_group_members.group_id 
            AND user_id = auth.uid()
        )
    );

-- Chat sessions policies
CREATE POLICY "Users can view their chat sessions" ON chat_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create chat sessions" ON chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their chat sessions" ON chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their chat sessions" ON chat_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view messages in their sessions" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = chat_messages.session_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add messages to their sessions" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = chat_messages.session_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update messages in their sessions" ON chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = chat_messages.session_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages from their sessions" ON chat_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = chat_messages.session_id 
            AND user_id = auth.uid()
        )
    );

-- ================================================================================
-- SECTION 10: Verify Migration Success
-- ================================================================================

-- Check all tables were created
SELECT 'Tables Created' as status, COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles', 'friends', 'friend_invitations', 
    'calendar_sharing', 'friend_groups', 'friend_group_members',
    'chat_sessions', 'chat_messages'
);

-- Check RLS is enabled
SELECT 'RLS Enabled' as status, COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
AND tablename IN (
    'user_profiles', 'friends', 'friend_invitations',
    'calendar_sharing', 'friend_groups', 'friend_group_members',
    'chat_sessions', 'chat_messages'
);

-- Check indexes were created
SELECT 'Indexes Created' as status, COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- ================================================================================
-- Migration Complete! 
-- Next steps:
-- 1. Verify all tables and policies are created correctly
-- 2. Test with sample queries
-- 3. Update application code to use new schema
-- ================================================================================