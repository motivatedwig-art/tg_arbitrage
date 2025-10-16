import { DatabaseManagerPostgres } from '../src/database/DatabasePostgres.js';

async function addBlockchainColumn() {
  console.log('🚀 Adding blockchain column to arbitrage_opportunities table...');
  
  const db = DatabaseManagerPostgres.getInstance();
  
  try {
    await db.init();
    
    // Add blockchain column if it doesn't exist
    await db.query(`
      ALTER TABLE arbitrage_opportunities 
      ADD COLUMN IF NOT EXISTS blockchain VARCHAR(50)
    `);
    
    console.log('✅ Blockchain column added successfully');
    
  } catch (error) {
    console.error('❌ Failed to add blockchain column:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  addBlockchainColumn().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { addBlockchainColumn };
