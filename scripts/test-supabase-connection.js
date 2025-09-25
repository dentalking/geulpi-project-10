// Direct Supabase client creation
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const SUPABASE_URL = 'https://moszlrvkzrpmhvzmpiqk.supabase.co';
// We need the service role key for this - will use API endpoint instead

async function testConnection() {
  try {
    console.log('Testing database schema via API endpoints...');

    // Test 1: Check if user_action_logs table exists
    const { data: tableData, error: tableError } = await supabase
      .from('user_action_logs')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('❌ user_action_logs table does not exist');
    } else if (tableError) {
      console.log('❌ Error accessing user_action_logs table:', tableError.message);
      console.log('Error code:', tableError.code);
    } else {
      console.log('✅ user_action_logs table exists');

      // Test 2: Try to get table structure
      const { data: testInsert, error: insertError } = await supabase
        .from('user_action_logs')
        .insert({
          user_id: 'test-user-123',  // Try with TEXT
          session_id: 'test-session',
          suggestion_text: 'Test suggestion',
          action_type: 'clicked'
        })
        .select('id, user_id');

      if (insertError) {
        console.log('Insert error (expected if UUID type):', insertError.message);
        console.log('Error code:', insertError.code);

        // Check if it's a type error
        if (insertError.message.includes('uuid') || insertError.code === '22P02') {
          console.log('\n⚠️  user_id appears to be UUID type. Migration needed.');
        } else if (insertError.message.includes('foreign key')) {
          console.log('\n⚠️  Foreign key constraint issue detected.');
        }
      } else {
        console.log('✅ Successfully inserted with TEXT user_id:', testInsert);

        // Clean up test data
        if (testInsert && testInsert[0]) {
          await supabase
            .from('user_action_logs')
            .delete()
            .eq('id', testInsert[0].id);
          console.log('Cleaned up test data');
        }
      }
    }

    // Test 3: Check users table structure
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (userData) {
      console.log('\n=== Users table info ===');
      console.log('Sample user ID type:', typeof userData[0]?.id, '(value:', userData[0]?.id, ')');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testConnection();