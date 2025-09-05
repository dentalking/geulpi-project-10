const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  try {
    console.log('Creating users table...');
    
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Create index on email
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `;
    
    console.log('Database setup completed successfully!');
    
    // Create a test user for verification
    const hashedPassword = await bcrypt.hash('test123', 10);
    await sql`
      INSERT INTO users (email, password, name) 
      VALUES ('test@example.com', ${hashedPassword}, 'Test User')
      ON CONFLICT (email) DO NOTHING
    `;
    
    console.log('Test user created (test@example.com / test123)');
    
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();