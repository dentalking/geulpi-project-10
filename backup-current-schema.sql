-- ================================================================================
-- BACKUP SCRIPT - Run this FIRST in Supabase Dashboard SQL Editor
-- Date: 2025-01-09
-- Description: Create backup tables before migration
-- ================================================================================

-- Step 1: Backup chat tables (if they exist)
DO $$
BEGIN
    -- Backup chat_sessions if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
        DROP TABLE IF EXISTS chat_sessions_backup_20250109;
        CREATE TABLE chat_sessions_backup_20250109 AS SELECT * FROM chat_sessions;
        RAISE NOTICE 'chat_sessions backed up to chat_sessions_backup_20250109';
    END IF;
    
    -- Backup chat_messages if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        DROP TABLE IF EXISTS chat_messages_backup_20250109;
        CREATE TABLE chat_messages_backup_20250109 AS SELECT * FROM chat_messages;
        RAISE NOTICE 'chat_messages backed up to chat_messages_backup_20250109';
    END IF;
END $$;

-- Step 2: Check current table structure
SELECT 
    'Current Tables' as check_type,
    array_agg(table_name ORDER BY table_name) as tables
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Step 3: Check foreign key relationships
SELECT 
    'Foreign Keys' as check_type,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Step 4: Check RLS status
SELECT 
    'RLS Status' as check_type,
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Step 5: Check existing users table
SELECT 
    'Users Table Check' as check_type,
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') 
        THEN 'Custom users table exists'
        ELSE 'No custom users table'
    END as status;

-- Step 6: Count records in important tables
SELECT 'Record Counts' as check_type;
SELECT 'chat_sessions' as table_name, COUNT(*) as count FROM chat_sessions WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_sessions')
UNION ALL
SELECT 'chat_messages' as table_name, COUNT(*) as count FROM chat_messages WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_messages')
UNION ALL
SELECT 'users' as table_name, COUNT(*) as count FROM users WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
UNION ALL
SELECT 'user_profiles' as table_name, COUNT(*) as count FROM user_profiles WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles')
UNION ALL
SELECT 'friends' as table_name, COUNT(*) as count FROM friends WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'friends');

-- ================================================================================
-- IMPORTANT: Save the output of these queries before proceeding with migration!
-- ================================================================================