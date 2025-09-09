const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase configuration
const supabaseUrl = 'https://moszlrvkzrpmhvzmpiqk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vc3pscnZrenJwbWh2em1waXFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA3NTc4NiwiZXhwIjoyMDcyNjUxNzg2fQ.wPyda52qH8UviX4SIX3aPPcOaPL1m1AqXQiFVlMQBfs';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  console.log('🚀 Starting Supabase Migration via JavaScript SDK...\n');

  try {
    // Step 1: Check current tables
    console.log('📊 Checking current tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    } else {
      console.log('Current tables:', tables?.map(t => t.table_name).join(', ') || 'None');
    }

    // Step 2: Read migration SQL
    console.log('\n📖 Reading migration SQL...');
    const migrationSQL = fs.readFileSync('apply-migration-safe.sql', 'utf8');
    
    // Split SQL into sections
    const sections = migrationSQL.split('-- ================================================================================');
    
    // Step 3: Execute migration sections
    console.log('\n🔧 Executing migration sections...');
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section || section.startsWith('--')) continue;
      
      // Extract section name
      const sectionMatch = section.match(/SECTION (\d+):/);
      const sectionNum = sectionMatch ? sectionMatch[1] : i;
      
      console.log(`\n  → Executing Section ${sectionNum}...`);
      
      // Clean up SQL statements
      const statements = section
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (!statement) continue;
        
        try {
          const { error } = await supabase.rpc('execute_sql', {
            query: statement + ';'
          });
          
          if (error) {
            console.error(`  ❌ Error in statement:`, error.message);
            // Continue with next statement
          } else {
            console.log(`  ✅ Statement executed successfully`);
          }
        } catch (err) {
          console.error(`  ❌ Error:`, err.message);
        }
      }
    }

    // Step 4: Verify migration
    console.log('\n🔍 Verifying migration...');
    
    // Check if new tables exist
    const { data: newTables, error: newTablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'user_profiles',
        'friends',
        'friend_invitations',
        'calendar_sharing',
        'friend_groups',
        'friend_group_members',
        'chat_sessions',
        'chat_messages'
      ]);

    if (newTablesError) {
      console.error('Error checking new tables:', newTablesError);
    } else {
      console.log('\n✅ Tables created:', newTables?.map(t => t.table_name).join(', ') || 'None');
    }

    console.log('\n✨ Migration process complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
executeMigration();