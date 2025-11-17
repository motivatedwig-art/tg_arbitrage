-- Arbitrage opportunities schema (SQLite/PostgreSQL reference)
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  buy_exchange VARCHAR(50) NOT NULL,
  sell_exchange VARCHAR(50) NOT NULL,
  buy_price NUMERIC(38,18) NOT NULL,
  sell_price NUMERIC(38,18) NOT NULL,
  profit_percentage NUMERIC(18,8) NOT NULL,
  profit_amount NUMERIC(38,18) NOT NULL,
  volume NUMERIC(38,18) NOT NULL DEFAULT 0,
  volume_24h NUMERIC(38,18),
  blockchain VARCHAR(50),
  chain_id INTEGER,
  chain_name VARCHAR(100),
  contract_address TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  decimals INTEGER,
  contract_data_extracted BOOLEAN DEFAULT FALSE,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contract data enrichment columns
ALTER TABLE arbitrage_opportunities ADD COLUMN chain_id INTEGER;
ALTER TABLE arbitrage_opportunities ADD COLUMN chain_name VARCHAR(100);
ALTER TABLE arbitrage_opportunities ADD COLUMN contract_address TEXT;
ALTER TABLE arbitrage_opportunities ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE arbitrage_opportunities ADD COLUMN decimals INTEGER;
ALTER TABLE arbitrage_opportunities ADD COLUMN contract_data_extracted BOOLEAN DEFAULT FALSE;

