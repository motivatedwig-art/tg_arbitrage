-- Migration script for contract address tables
-- Run this on your PostgreSQL database (Railway)

-- Create contract_addresses table
CREATE TABLE IF NOT EXISTS contract_addresses (
    id SERIAL PRIMARY KEY,
    token_symbol VARCHAR(20) NOT NULL,
    token_name VARCHAR(100),
    contract_address VARCHAR(100) NOT NULL,
    blockchain VARCHAR(50) NOT NULL,
    decimals INTEGER,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_verified_at TIMESTAMP,
    UNIQUE(token_symbol, blockchain, contract_address)
);

-- Create indexes for contract_addresses
CREATE INDEX IF NOT EXISTS idx_token_blockchain ON contract_addresses(token_symbol, blockchain);
CREATE INDEX IF NOT EXISTS idx_contract_address ON contract_addresses(contract_address);
CREATE INDEX IF NOT EXISTS idx_last_verified_at ON contract_addresses(last_verified_at);

-- Create pair_contracts table
CREATE TABLE IF NOT EXISTS pair_contracts (
    id SERIAL PRIMARY KEY,
    pair_symbol VARCHAR(50) NOT NULL,
    base_token_id INTEGER REFERENCES contract_addresses(id) ON DELETE CASCADE,
    quote_token_id INTEGER REFERENCES contract_addresses(id) ON DELETE CASCADE,
    blockchain VARCHAR(50) NOT NULL,
    dex_name VARCHAR(50),
    liquidity_usd DECIMAL(20, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pair_symbol, blockchain, dex_name)
);

-- Create indexes for pair_contracts
CREATE INDEX IF NOT EXISTS idx_pair_symbol ON pair_contracts(pair_symbol);
CREATE INDEX IF NOT EXISTS idx_pair_blockchain ON pair_contracts(blockchain);
CREATE INDEX IF NOT EXISTS idx_base_token_id ON pair_contracts(base_token_id);
CREATE INDEX IF NOT EXISTS idx_quote_token_id ON pair_contracts(quote_token_id);

-- Create failed_contract_lookups table for tracking failures
CREATE TABLE IF NOT EXISTS failed_contract_lookups (
    id SERIAL PRIMARY KEY,
    token_symbol VARCHAR(20) NOT NULL,
    blockchain VARCHAR(50) NOT NULL,
    error_message TEXT,
    failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    UNIQUE(token_symbol, blockchain)
);

-- Create index for failed lookups
CREATE INDEX IF NOT EXISTS idx_failed_lookups ON failed_contract_lookups(token_symbol, blockchain);

-- Create api_call_logs table for tracking API usage
CREATE TABLE IF NOT EXISTS api_call_logs (
    id SERIAL PRIMARY KEY,
    api_name VARCHAR(50) NOT NULL,
    endpoint VARCHAR(200),
    status_code INTEGER,
    success BOOLEAN DEFAULT FALSE,
    response_time_ms INTEGER,
    called_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
);

-- Create indexes for API logs
CREATE INDEX IF NOT EXISTS idx_api_name ON api_call_logs(api_name);
CREATE INDEX IF NOT EXISTS idx_called_at ON api_call_logs(called_at);
CREATE INDEX IF NOT EXISTS idx_api_success ON api_call_logs(success, called_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_contract_addresses_updated_at BEFORE UPDATE ON contract_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pair_contracts_updated_at BEFORE UPDATE ON pair_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

