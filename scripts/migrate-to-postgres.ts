import { DatabaseManager } from '../src/database/Database.js';

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    const db = DatabaseManager.getInstance();
    await db.init();
    
    console.log('Database initialized successfully');
    
    // Run migrations or seed data here if needed
    
    const isHealthy = await db.healthCheck();
    console.log('Database health check:', isHealthy ? 'PASS' : 'FAIL');
    
    await db.close();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();















