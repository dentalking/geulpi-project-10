const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  try {
    console.log('Setting up users table...');
    
    // Try to create a test user to check if table exists
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const { data: testUser, error: insertError } = await supabase
      .from('users')
      .insert({
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User'
      })
      .select()
      .single();
    
    if (insertError) {
      if (insertError.code === '42P01') {
        // Table doesn't exist
        console.log('❌ Users table does not exist.');
        console.log('\n📝 Please create the table manually:');
        console.log('1. Go to Supabase Dashboard > SQL Editor');
        console.log('2. Click "New Query"');
        console.log('3. Copy and run the SQL from: supabase/migrations/001_create_users_table.sql');
        console.log('\nOr copy this SQL and run it:\n');
        console.log(`
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);
      } else if (insertError.code === '23505') {
        // Duplicate key - user already exists
        console.log('✅ Test user already exists. Database is set up correctly!');
      } else {
        console.error('Error:', insertError.message);
      }
    } else {
      console.log('✅ Test user created successfully:', testUser?.email);
      console.log('✅ Database setup completed successfully!');
    }
    
    // Verify the table exists by querying it
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (!queryError) {
      console.log('\n✅ Users table is accessible and working!');
      console.log('Current users in database:', users?.length || 0);
      if (users && users.length > 0) {
        console.log('Users:', users.map(u => u.email).join(', '));
      }
    } else {
      console.error('❌ Error accessing users table:', queryError.message);
    }
    
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();