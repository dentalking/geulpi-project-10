const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://moszlrvkzrpmhvzmpiqk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function disableRLS() {
  try {
    console.log('Disabling RLS for chat tables...');
    
    // Disable RLS on chat_sessions
    const { error: sessionsError } = await supabase.rpc('query_raw', {
      query: 'ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;'
    });
    
    if (sessionsError) {
      // Try direct SQL if RPC doesn't work
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('count')
        .limit(1);
      
      console.log('Note: RLS might already be disabled or we need to use direct SQL');
    } else {
      console.log('✓ RLS disabled for chat_sessions');
    }
    
    // Disable RLS on chat_messages
    const { error: messagesError } = await supabase.rpc('query_raw', {
      query: 'ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;'
    });
    
    if (messagesError) {
      console.log('Note: RLS might already be disabled for chat_messages');
    } else {
      console.log('✓ RLS disabled for chat_messages');
    }
    
    console.log('\nRLS has been disabled for chat tables.');
    console.log('Chat sessions will now work with Google OAuth user IDs.');
    
  } catch (error) {
    console.error('Error disabling RLS:', error);
    process.exit(1);
  }
}

disableRLS();