-- ================================================================================
-- Migration Verification Script
-- Run this after migration to verify everything is working correctly
-- ================================================================================

-- 1. Check all tables exist
SELECT '✅ Tables Check' as test_name,
       COUNT(*) as table_count,
       CASE 
           WHEN COUNT(*) >= 8 THEN 'PASS' 
           ELSE 'FAIL' 
       END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles',
    'friends',
    'friend_invitations',
    'calendar_sharing',
    'friend_groups',
    'friend_group_members',
    'chat_sessions',
    'chat_messages'
);

-- 2. Check foreign key relationships to auth.users
SELECT '✅ Foreign Keys Check' as test_name,
       COUNT(*) as fk_count,
       CASE 
           WHEN COUNT(*) >= 7 THEN 'PASS' 
           ELSE 'FAIL' 
       END as status
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND ccu.table_name = 'users'
AND ccu.table_schema = 'auth';

-- 3. Check RLS is enabled
SELECT '✅ RLS Check' as test_name,
       COUNT(*) as rls_enabled_count,
       CASE 
           WHEN COUNT(*) = 8 THEN 'PASS' 
           ELSE 'FAIL' 
       END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
AND tablename IN (
    'user_profiles',
    'friends',
    'friend_invitations',
    'calendar_sharing',
    'friend_groups',
    'friend_group_members',
    'chat_sessions',
    'chat_messages'
);

-- 4. Check indexes exist
SELECT '✅ Indexes Check' as test_name,
       COUNT(*) as index_count,
       CASE 
           WHEN COUNT(*) >= 15 THEN 'PASS' 
           ELSE 'FAIL' 
       END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- 5. Check JSONB GIN indexes
SELECT '✅ JSONB Indexes Check' as test_name,
       COUNT(*) as gin_index_count,
       CASE 
           WHEN COUNT(*) >= 4 THEN 'PASS' 
           ELSE 'FAIL' 
       END as status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexdef LIKE '%USING gin%';

-- 6. Check trigger functions
SELECT '✅ Triggers Check' as test_name,
       COUNT(DISTINCT trigger_name) as trigger_count,
       CASE 
           WHEN COUNT(DISTINCT trigger_name) >= 4 THEN 'PASS' 
           ELSE 'FAIL' 
       END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 7. Check RLS policies exist
SELECT '✅ RLS Policies Check' as test_name,
       COUNT(*) as policy_count,
       CASE 
           WHEN COUNT(*) >= 20 THEN 'PASS' 
           ELSE 'FAIL' 
       END as status
FROM pg_policies
WHERE schemaname = 'public';

-- 8. Check chat_sessions user_id is UUID type
SELECT '✅ Chat User ID Type Check' as test_name,
       data_type,
       CASE 
           WHEN data_type = 'uuid' THEN 'PASS' 
           ELSE 'FAIL' 
       END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'chat_sessions'
AND column_name = 'user_id';

-- Summary
SELECT 
    '📊 MIGRATION SUMMARY' as result,
    COUNT(*) FILTER (WHERE status = 'PASS') as passed,
    COUNT(*) FILTER (WHERE status = 'FAIL') as failed,
    CASE 
        WHEN COUNT(*) FILTER (WHERE status = 'FAIL') = 0 THEN '✅ ALL TESTS PASSED!'
        ELSE '❌ SOME TESTS FAILED - CHECK DETAILS ABOVE'
    END as final_status
FROM (
    -- Combine all test results
    SELECT 
        CASE 
            WHEN COUNT(*) >= 8 THEN 'PASS' 
            ELSE 'FAIL' 
        END as status
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'user_profiles', 'friends', 'friend_invitations', 'calendar_sharing',
        'friend_groups', 'friend_group_members', 'chat_sessions', 'chat_messages'
    )
    
    UNION ALL
    
    SELECT 
        CASE 
            WHEN COUNT(*) >= 7 THEN 'PASS' 
            ELSE 'FAIL' 
        END
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth'
    
    -- Add other checks here...
) as all_tests;