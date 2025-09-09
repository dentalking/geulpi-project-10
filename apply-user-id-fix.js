const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://moszlrvkzrpmhvzmpiqk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function fixUserIdType() {
  try {
    console.log('Fixing chat_sessions user_id type...');
    
    // First, get existing sessions to backup
    const { data: existingSessions, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('*');
    
    if (fetchError) {
      console.log('No existing sessions or error fetching:', fetchError.message);
    } else {
      console.log(`Found ${existingSessions?.length || 0} existing sessions`);
    }
    
    // Apply the migration via direct SQL
    const migrationSQL = `
      -- Fix chat_sessions user_id type to support Google OAuth IDs
      -- Google OAuth IDs are numeric strings, not UUIDs
      
      -- Drop existing foreign key constraint
      ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey;
      
      -- Change user_id from UUID to TEXT
      ALTER TABLE chat_sessions 
      ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
      
      -- Remove the NOT NULL constraint to allow NULL values
      ALTER TABLE chat_sessions 
      ALTER COLUMN user_id DROP NOT NULL;
      
      -- Add comment explaining the change
      COMMENT ON COLUMN chat_sessions.user_id IS 'Google OAuth user ID (numeric string)';
      
      -- Ensure RLS is disabled (since we're using Google OAuth)
      ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
      ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
    `;
    
    // Note: Supabase JS client doesn't support direct DDL execution
    // We'll need to use the Supabase Dashboard SQL editor or psql
    console.log('\n📋 Please run the following SQL in Supabase Dashboard SQL Editor:');
    console.log('====================================================================');
    console.log(migrationSQL);
    console.log('====================================================================\n');
    
    // Test if we can create a session with a Google ID now
    const testGoogleId = '123456789012345678901'; // Example Google ID
    const { data: testSession, error: testError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: testGoogleId,
        title: 'Test Session with Google ID'
      })
      .select()
      .single();
    
    if (testError) {
      console.log('❌ Cannot create session with Google ID yet:', testError.message);
      console.log('   Please run the SQL migration above in Supabase Dashboard');
    } else {
      console.log('✅ Successfully created test session with Google ID!');
      // Clean up test session
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', testSession.id);
    }
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUserIdType();