const pg = require('pg');

// Database connection - Use direct connection without pgbouncer for schema queries
const dbUrl = process.env.DIRECT_DATABASE_URL || "postgresql://postgres.moszlrvkzrpmhvzmpiqk:BV.t$P4u$nb7ZsN@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres";

console.log('Checking database schema for user_action_logs table...');

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
        SELECT column_name, data_type, is_nullable,
               column_default,
               character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_action_logs'
        AND column_name = 'user_id'
        ORDER BY ordinal_position;
      `);

      if (columnInfo.rows.length > 0) {
        console.log('\n=== user_id column current info ===');
        console.log('Column name:', columnInfo.rows[0].column_name);
        console.log('Data type:', columnInfo.rows[0].data_type);
        console.log('Is nullable:', columnInfo.rows[0].is_nullable);
        console.log('Default:', columnInfo.rows[0].column_default);

        // Check foreign key constraints
        const fkCheck = await pool.query(`
          SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          LEFT JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.table_name = 'user_action_logs'
            AND kcu.column_name = 'user_id'
            AND tc.constraint_type = 'FOREIGN KEY';
        `);

        if (fkCheck.rows.length > 0) {
          console.log('\n=== Foreign Key Info ===');
          console.log('Constraint name:', fkCheck.rows[0].constraint_name);
          console.log('References table:', fkCheck.rows[0].foreign_table_name);
          console.log('References column:', fkCheck.rows[0].foreign_column_name);
        } else {
          console.log('\n=== No foreign key constraint found ===');
        }

        // Check if we need to apply migration
        if (columnInfo.rows[0].data_type === 'uuid') {
          console.log('\n⚠️  user_id is currently UUID type. Migration needed to change to TEXT.');
        } else if (columnInfo.rows[0].data_type === 'text' || columnInfo.rows[0].data_type === 'character varying') {
          console.log('\n✅ user_id is already TEXT/VARCHAR type. Migration may have been applied.');
        }

      } else {
        console.log('user_id column not found');
      }

      // List all columns for reference
      const allColumns = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_action_logs'
        ORDER BY ordinal_position;
      `);

      console.log('\n=== All columns in user_action_logs ===');
      allColumns.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type}`);
      });

    } else {
      console.log('user_action_logs table does not exist yet');
    }
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();