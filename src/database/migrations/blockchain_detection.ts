/**
 * Database migration for blockchain detection tables
 */

import { DatabaseManager } from '../Database.js';

export async function createBlockchainTables(): Promise<void> {
  const db = DatabaseManager.getInstance();
  const dbInstance = db.getDatabase();

  // Check if running PostgreSQL or SQLite
  const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql://');

  if (isPostgres) {
    await createPostgresTables(dbInstance);
  } else {
    await createSQLiteTables(dbInstance);
  }
}

async function createPostgresTables(db: any): Promise<void> {
  const queries = [
    // Table to store detected blockchain information
    `
    CREATE TABLE IF NOT EXISTS token_blockchains (
      id SERIAL PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      blockchain VARCHAR(50) NOT NULL,
      contract_address VARCHAR(255),
      is_native BOOLEAN DEFAULT FALSE,
      is_primary BOOLEAN DEFAULT FALSE,
      confidence_score INTEGER DEFAULT 0,
      exchanges TEXT, -- JSON array of exchanges confirming this
      last_verified TIMESTAMP DEFAULT NOW(),
      metadata TEXT, -- JSON with additional info
      UNIQUE(symbol, blockchain, contract_address)
    );
    `,
    
    // Cache for exchange network data
    `
    CREATE TABLE IF NOT EXISTS exchange_networks (
      id SERIAL PRIMARY KEY,
      exchange VARCHAR(50) NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      network_data TEXT NOT NULL, -- JSON
      fetched_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(exchange, symbol)
    );
    `,
    
    // Indexes for quick lookups
    `
    CREATE INDEX IF NOT EXISTS idx_token_blockchain_symbol ON token_blockchains(symbol);
    `,
    `
    CREATE INDEX IF NOT EXISTS idx_token_blockchain_blockchain ON token_blockchains(blockchain);
    `,
    `
    CREATE INDEX IF NOT EXISTS idx_token_blockchain_confidence ON token_blockchains(confidence_score DESC);
    `,
    `
    CREATE INDEX IF NOT EXISTS idx_exchange_networks_exchange ON exchange_networks(exchange);
    `,
    `
    CREATE INDEX IF NOT EXISTS idx_exchange_networks_symbol ON exchange_networks(symbol);
    `
  ];

  for (const query of queries) {
    try {
      await db.query(query);
    } catch (error: any) {
      // Ignore "already exists" errors
      if (!error.message.includes('already exists')) {
        console.error('Migration error:', error);
        throw error;
      }
    }
  }

  console.log('✅ Blockchain detection tables created (PostgreSQL)');
}

async function createSQLiteTables(db: any): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Table to store detected blockchain information
      db.run(`
        CREATE TABLE IF NOT EXISTS token_blockchains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          symbol TEXT NOT NULL,
          blockchain TEXT NOT NULL,
          contract_address TEXT,
          is_native INTEGER DEFAULT 0,
          is_primary INTEGER DEFAULT 0,
          confidence_score INTEGER DEFAULT 0,
          exchanges TEXT, -- JSON array
          last_verified INTEGER DEFAULT (strftime('%s', 'now')),
          metadata TEXT, -- JSON
          UNIQUE(symbol, blockchain, contract_address)
        )
      `, (err: any) => {
        if (err) {
          console.error('Error creating token_blockchains:', err);
          reject(err);
          return;
        }

        // Cache for exchange network data
        db.run(`
          CREATE TABLE IF NOT EXISTS exchange_networks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exchange TEXT NOT NULL,
            symbol TEXT NOT NULL,
            network_data TEXT NOT NULL, -- JSON
            fetched_at INTEGER DEFAULT (strftime('%s', 'now')),
            UNIQUE(exchange, symbol)
          )
        `, (err: any) => {
          if (err) {
            console.error('Error creating exchange_networks:', err);
            reject(err);
            return;
          }

          // Indexes
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_token_blockchain_symbol ON token_blockchains(symbol)
          `);
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_token_blockchain_blockchain ON token_blockchains(blockchain)
          `);
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_token_blockchain_confidence ON token_blockchains(confidence_score DESC)
          `);
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_exchange_networks_exchange ON exchange_networks(exchange)
          `);
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_exchange_networks_symbol ON exchange_networks(symbol)
          `, () => {
            console.log('✅ Blockchain detection tables created (SQLite)');
            resolve();
          });
        });
      });
    });
  });
}

