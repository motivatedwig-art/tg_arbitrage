import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  console.log('🔄 Running database migrations...');

  try {
    // Migration 1: Create users table
    const usersSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        telegram_id BIGINT UNIQUE NOT NULL,
        username TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        preferences JSONB NOT NULL DEFAULT '{}',
        api_keys_encrypted TEXT,
        is_active BOOLEAN DEFAULT true
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `;

    await pool.query(usersSQL);
    console.log('✅ Users table created');

    // Migration 2: Create arbitrage opportunities table
    const arbitrageSQL = `
      CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        symbol TEXT NOT NULL,
        buy_exchange TEXT NOT NULL,
        sell_exchange TEXT NOT NULL,
        buy_price DECIMAL(20, 8) NOT NULL,
        sell_price DECIMAL(20, 8) NOT NULL,
        profit_amount DECIMAL(20, 8) NOT NULL,
        profit_percentage DECIMAL(10, 4) NOT NULL,
        volume_24h DECIMAL(20, 8),
        spread_percentage DECIMAL(10, 4),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_arb_op_symbol ON arbitrage_opportunities(symbol);
      CREATE INDEX IF NOT EXISTS idx_arb_op_timestamp ON arbitrage_opportunities(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_arb_op_profit ON arbitrage_opportunities(profit_percentage DESC);
      CREATE INDEX IF NOT EXISTS idx_arb_op_created_at ON arbitrage_opportunities(created_at DESC);
    `;

    await pool.query(arbitrageSQL);
    console.log('✅ Arbitrage opportunities table created');

    console.log('🎉 All migrations completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
runMigrations();
