const { createClient } = require('@supabase/supabase-js');

// Database connection
const dbUrl = process.env.DATABASE_URL || "postgresql://postgres.moszlrvkzrpmhvzmpiqk:BV.t$P4u$nb7ZsN@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";

// Parse the URL to get host
const match = dbUrl.match(/postgres[^@]+@([^:]+):(\d+)/);
if (!match) {
  console.error('Could not parse database URL');
  process.exit(1);
}

const supabaseUrl = `https://${match[1].replace('aws-0-ap-northeast-2.pooler.supabase.com', 'moszlrvkzrpmhvzmpiqk.supabase.co')}`;
// Use a dummy anon key for checking table structure
const supabaseAnonKey = 'dummy-key-for-structure-check';

console.log('Checking database schema for user_action_logs table...');
console.log('Project URL:', supabaseUrl);

// We'll use a direct query to check the table structure
const pg = require('pg');
const pool = new pg.Pool({
  connectionString: dbUrl,
});

async function checkSchema() {
  try {
    // Check if user_action_logs table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_action_logs'
      );
    `);
    
    console.log('Table exists:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Get column info
      const columnInfo = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_action_logs'
        AND column_name = 'user_id'
        ORDER BY ordinal_position;
      `);
      
      if (columnInfo.rows.length > 0) {
        console.log('user_id column info:');
        console.log(columnInfo.rows[0]);
      } else {
        console.log('user_id column not found');
      }
    }
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
