import ccxt from 'ccxt';
export class BinanceAdapter {
    constructor(apiKey, apiSecret) {
        this.name = 'binance';
        this.connected = false;
        // Initialize CCXT with authenticated credentials if provided
        this.exchange = new ccxt.binance({
            apiKey: apiKey || process.env.BINANCE_API_KEY || '',
            secret: apiSecret || process.env.BINANCE_API_SECRET || '',
            enableRateLimit: true,
            timeout: 10000,
            options: {
                defaultType: 'spot',
                adjustForTimeDifference: true
            }
        });
    }
    async connect() {
        try {
            // Test connection - use authenticated endpoint if we have credentials
            await this.exchange.loadMarkets();
            this.connected = true;
            const authStatus = this.exchange.apiKey ? 'authenticated' : 'public';
            console.log(`✅ Connected to Binance (${authStatus})`);
        }
        catch (error) {
            this.connected = false;
            console.error('❌ Failed to connect to Binance:', error);
            throw error;
        }
    }
    async getTickers() {
        if (!this.connected) {
            await this.connect();
        }
        try {
            console.log('Fetching Binance tickers via CCXT (authenticated)...');
            // Use CCXT to fetch all tickers
            const tickers = await this.exchange.fetchTickers();
            // Convert CCXT format to our format
            const result = Object.values(tickers)
                .filter((ticker) => {
                return ticker.symbol.endsWith('/USDT') &&
                    ticker.bid > 0 &&
                    ticker.ask > 0 &&
                    ticker.baseVolume > 0;
            })
                .map((ticker) => ({
                symbol: ticker.symbol,
                bid: ticker.bid,
                ask: ticker.ask,
                timestamp: ticker.timestamp || Date.now(),
                exchange: 'binance',
                volume: ticker.baseVolume || 0,
                blockchain: undefined,
                contractAddress: undefined
            }));
            console.log(`Binance: Fetched ${result.length} authenticated tickers`);
            return result;
        }
        catch (error) {
            console.error('Binance CCXT error:', error);
            throw new Error(`Failed to fetch Binance data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getOrderBook(symbol) {
        if (!this.connected) {
            throw new Error('Binance is not connected');
        }
        try {
            const orderBook = await this.exchange.fetchOrderBook(symbol, 100);
            return {
                symbol,
                bids: orderBook.bids,
                asks: orderBook.asks,
                timestamp: orderBook.timestamp || Date.now(),
                exchange: 'binance'
            };
        }
        catch (error) {
            console.error(`Error fetching order book for ${symbol} from Binance:`, error);
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
//# sourceMappingURL=BinanceAdapter.js.map