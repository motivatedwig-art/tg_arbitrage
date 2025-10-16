import { DatabaseManagerPostgres } from '../src/database/DatabasePostgres.js';

async function setupPostgresTables() {
  console.log('🚀 Setting up PostgreSQL tables...');
  
  const db = DatabaseManagerPostgres.getInstance();
  
  try {
    await db.init();
    
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(100),
        created_at BIGINT NOT NULL,
        preferences JSONB NOT NULL DEFAULT '{}',
        api_keys_encrypted TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create arbitrage opportunities table
    await db.query(`
      CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        buy_exchange VARCHAR(50) NOT NULL,
        sell_exchange VARCHAR(50) NOT NULL,
        buy_price DECIMAL(20,8) NOT NULL,
        sell_price DECIMAL(20,8) NOT NULL,
        profit_percentage DECIMAL(10,4) NOT NULL,
        profit_amount DECIMAL(20,8) NOT NULL,
        volume DECIMAL(20,8) NOT NULL DEFAULT 0,
        volume_24h DECIMAL(20,8),
        blockchain VARCHAR(50),
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_arbitrage_symbol ON arbitrage_opportunities(symbol);
      CREATE INDEX IF NOT EXISTS idx_arbitrage_profit ON arbitrage_opportunities(profit_percentage DESC);
      CREATE INDEX IF NOT EXISTS idx_arbitrage_timestamp ON arbitrage_opportunities(timestamp);
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    `);
    
    console.log('✅ PostgreSQL tables created successfully');
    console.log('📊 Tables created: users, arbitrage_opportunities');
    console.log('🔍 Indexes created for performance optimization');
    
  } catch (error) {
    console.error('❌ Failed to setup PostgreSQL tables:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run the setup
if (import.meta.url === `file://${process.argv[1]}`) {
  setupPostgresTables().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

export { setupPostgresTables };
