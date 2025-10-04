#!/usr/bin/env tsx

import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

async function fixProfitPercentageSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔧 Connecting to PostgreSQL database...');
    const client = await pool.connect();
    
    console.log('📊 Checking current schema...');
    const checkResult = await client.query(`
      SELECT column_name, data_type, numeric_precision, numeric_scale 
      FROM information_schema.columns 
      WHERE table_name = 'arbitrage_opportunities' 
      AND column_name = 'profit_percentage'
    `);
    
    if (checkResult.rows.length > 0) {
      const currentSchema = checkResult.rows[0];
      console.log(`Current schema: ${currentSchema.data_type}(${currentSchema.numeric_precision},${currentSchema.numeric_scale})`);
      
      if (currentSchema.numeric_precision < 15) {
        console.log('🔄 Updating profit_percentage column to DECIMAL(15,4)...');
        await client.query('ALTER TABLE arbitrage_opportunities ALTER COLUMN profit_percentage TYPE DECIMAL(15,4)');
        console.log('✅ Schema updated successfully!');
      } else {
        console.log('✅ Schema is already correct (DECIMAL(15,4))');
      }
    } else {
      console.log('❌ arbitrage_opportunities table not found');
    }
    
    client.release();
    console.log('🎉 Database schema fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
fixProfitPercentageSchema().catch(error => {
  console.error('Failed to run migration:', error);
  process.exit(1);
});
