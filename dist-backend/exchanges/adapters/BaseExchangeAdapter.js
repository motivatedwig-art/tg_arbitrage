import { TokenMetadataService } from '../../services/TokenMetadataService.js';
export class BaseExchangeAdapter {
    constructor(config) {
        this.connected = false;
        this.errorCount = 0;
        this.name = config.name;
        this.config = config;
        this.exchange = this.createExchange();
        this.tokenMetadataService = TokenMetadataService.getInstance();
    }
    async connect() {
        try {
            // Test connection with a more reliable method
            // Try fetchStatus first, fallback to fetchMarkets if not supported
            try {
                await this.exchange.fetchStatus();
            }
            catch (statusError) {
                // If fetchStatus is not supported, try fetchMarkets instead
                if (statusError instanceof Error && statusError.message.includes('fetchStatus() is not supported')) {
                    console.log(`⚠️ ${this.name} doesn't support fetchStatus(), trying fetchMarkets()...`);
                    await this.exchange.fetchMarkets();
                }
                else {
                    throw statusError;
                }
            }
            this.connected = true;
            this.errorCount = 0;
            this.lastError = undefined;
            const hasApiKeys = this.config.apiKey && this.config.apiSecret;
            const keyStatus = hasApiKeys ? 'with API keys' : 'public data only';
            console.log(`✅ Connected to ${this.name} (${keyStatus})`);
        }
        catch (error) {
            this.connected = false;
            this.errorCount++;
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Failed to connect to ${this.name}:`, error);
            throw error;
        }
    }
    async getTickers() {
        // Force real data in production
        if (process.env.NODE_ENV === 'production' || process.env.USE_MOCK_DATA === 'false') {
            if (!this.connected) {
                await this.connect();
            }
            // For production, always attempt real API calls
            try {
                const tickers = await this.exchange.fetchTickers();
                const result = [];
                for (const [symbol, ticker] of Object.entries(tickers)) {
                    const t = ticker; // Type assertion for ccxt ticker
                    if (t.bid && t.ask) {
                        // Get blockchain information for this token
                        const blockchain = this.tokenMetadataService.getTokenBlockchain(symbol, this.name);
                        const contractAddress = blockchain ? this.tokenMetadataService.getTokenContractAddress(symbol, blockchain) : undefined;
                        result.push({
                            symbol: symbol,
                            bid: t.bid,
                            ask: t.ask,
                            timestamp: t.timestamp || Date.now(),
                            exchange: this.name,
                            volume: t.baseVolume,
                            blockchain: blockchain || undefined,
                            contractAddress: contractAddress || undefined
                        });
                    }
                }
                if (!result || result.length === 0) {
                    console.error(`No real data received from ${this.name} in production`);
                    return []; // Return empty array in production
                }
                console.log(`${this.name}: Fetched ${result.length} real tickers`);
                return result;
            }
            catch (error) {
                this.errorCount++;
                this.lastError = error instanceof Error ? error.message : 'Unknown error';
                console.error(`Exchange API error for ${this.name}:`, error);
                // In production, return empty array instead of mock data
                if (process.env.NODE_ENV === 'production') {
                    return [];
                }
                // In development, still return mock data for testing
                return this.generateMockTickers();
            }
        }
        // Check if we should use mock data in development
        if (process.env.USE_MOCK_DATA === 'true') {
            console.warn(`Using mock data for ${this.name} - USE_MOCK_DATA is true`);
            return this.generateMockTickers();
        }
        if (!this.connected) {
            throw new Error(`${this.name} is not connected`);
        }
        // Fallback for development
        try {
            const tickers = await this.exchange.fetchTickers();
            const result = [];
            for (const [symbol, ticker] of Object.entries(tickers)) {
                const t = ticker; // Type assertion for ccxt ticker
                if (t.bid && t.ask) {
                    // Get blockchain information for this token
                    const blockchain = this.tokenMetadataService.getTokenBlockchain(symbol, this.name);
                    const contractAddress = blockchain ? this.tokenMetadataService.getTokenContractAddress(symbol, blockchain) : undefined;
                    result.push({
                        symbol: symbol,
                        bid: t.bid,
                        ask: t.ask,
                        timestamp: t.timestamp || Date.now(),
                        exchange: this.name,
                        volume: t.baseVolume,
                        blockchain: blockchain || undefined,
                        contractAddress: contractAddress || undefined
                    });
                }
            }
            return result.length > 0 ? result : this.generateMockTickers();
        }
        catch (error) {
            console.error(`Exchange API error for ${this.name}:`, error);
            return this.generateMockTickers();
        }
    }
    generateMockTickers() {
        const mockSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT'];
        return mockSymbols.map(symbol => ({
            symbol,
            bid: 100 + Math.random() * 10,
            ask: 100 + Math.random() * 10,
            timestamp: Date.now(),
            exchange: this.name,
            volume: Math.random() * 1000000,
            blockchain: undefined,
            contractAddress: undefined
        }));
    }
    async getOrderBook(symbol) {
        if (!this.connected) {
            throw new Error(`${this.name} is not connected`);
        }
        try {
            const orderBook = await this.exchange.fetchOrderBook(symbol);
            return {
                symbol: symbol,
                bids: orderBook.bids.map((bid) => [bid[0], bid[1]]),
                asks: orderBook.asks.map((ask) => [ask[0], ask[1]]),
                timestamp: orderBook.timestamp || Date.now(),
                exchange: this.name
            };
        }
        catch (error) {
            this.errorCount++;
            this.lastError = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error fetching order book from ${this.name}:`, error);
            throw error;
        }
    }
    disconnect() {
        this.connected = false;
        console.log(`🔌 Disconnected from ${this.name}`);
    }
    isConnected() {
        return this.connected;
    }
    getStatus() {
        return {
            name: this.name,
            isOnline: this.connected,
            lastUpdate: Date.now(),
            errorCount: this.errorCount,
            responseTime: 0, // TODO: Implement response time tracking
            lastError: this.lastError
        };
    }
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async testConnection() {
        try {
            // Try fetchStatus first, fallback to fetchMarkets if not supported
            try {
                await this.exchange.fetchStatus();
            }
            catch (statusError) {
                if (statusError instanceof Error && statusError.message.includes('fetchStatus() is not supported')) {
                    await this.exchange.fetchMarkets();
                }
                else {
                    throw statusError;
                }
            }
            return true;
        }
        catch (error) {
            console.error(`Connection test failed for ${this.name}:`, error);
            return false;
        }
    }
}
//# sourceMappingURL=BaseExchangeAdapter.js.map