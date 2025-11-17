import pkg from 'pg';
const { Pool } = pkg;

async function addBlockchainColumn() {
  console.log('🚀 Adding blockchain column to arbitrage_opportunities table...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query('ALTER TABLE arbitrage_opportunities ADD COLUMN IF NOT EXISTS blockchain VARCHAR(50);');
    console.log('✅ Blockchain column added successfully');
  } catch (error) {
    console.error('❌ Failed to add blockchain column:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addBlockchainColumn().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
