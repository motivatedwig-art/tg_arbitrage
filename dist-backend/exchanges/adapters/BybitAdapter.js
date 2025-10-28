import ccxt from 'ccxt';
export class BybitAdapter {
    constructor(apiKey, apiSecret) {
        this.name = 'bybit';
        this.connected = false;
        // Initialize CCXT with authenticated credentials
        this.exchange = new ccxt.bybit({
            apiKey: apiKey || process.env.BYBIT_API_KEY || '',
            secret: apiSecret || process.env.BYBIT_API_SECRET || '',
            enableRateLimit: true,
            timeout: 10000,
            options: {
                defaultType: 'spot'
            }
        });
    }
    async connect() {
        try {
            // Test connection - load markets
            await this.exchange.loadMarkets();
            this.connected = true;
            const authStatus = this.exchange.apiKey ? 'authenticated' : 'public';
            console.log(`✅ Connected to Bybit (${authStatus})`);
        }
        catch (error) {
            this.connected = false;
            console.error('❌ Failed to connect to Bybit:', error);
            throw error;
        }
    }
    async getTickers() {
        if (!this.connected) {
            await this.connect();
        }
        try {
            console.log('Fetching Bybit tickers via CCXT (authenticated)...');
            // Use CCXT to fetch all tickers
            const tickers = await this.exchange.fetchTickers();
            // Convert CCXT format to our format
            const result = Object.values(tickers)
                .filter((ticker) => {
                return ticker.symbol.includes('/USDT') &&
                    ticker.bid > 0 &&
                    ticker.ask > 0 &&
                    ticker.baseVolume > 0;
            })
                .map((ticker) => ({
                symbol: ticker.symbol,
                bid: ticker.bid,
                ask: ticker.ask,
                timestamp: ticker.timestamp || Date.now(),
                exchange: 'bybit',
                volume: ticker.baseVolume || 0,
                blockchain: undefined,
                contractAddress: undefined
            }));
            console.log(`Bybit: Fetched ${result.length} authenticated tickers`);
            return result;
        }
        catch (error) {
            console.error('Bybit CCXT error:', error);
            throw new Error(`Failed to fetch Bybit data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getOrderBook(symbol) {
        if (!this.connected) {
            throw new Error('Bybit is not connected');
        }
        try {
            const orderBook = await this.exchange.fetchOrderBook(symbol, 100);
            return {
                symbol,
                bids: orderBook.bids,
                asks: orderBook.asks,
                timestamp: orderBook.timestamp || Date.now(),
                exchange: 'bybit'
            };
        }
        catch (error) {
            console.error(`Error fetching order book for ${symbol} from Bybit:`, error);
            throw error;
        }
    }
    disconnect() {
        this.connected = false;
    }
    isConnected() {
        return this.connected;
    }
}
//# sourceMappingURL=BybitAdapter.js.map