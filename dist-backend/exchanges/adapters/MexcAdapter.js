import ccxt from 'ccxt';
export class MexcAdapter {
    constructor(apiKey, apiSecret) {
        this.name = 'mexc';
        this.connected = false;
        // Initialize CCXT with authenticated credentials
        this.exchange = new ccxt.mexc({
            apiKey: apiKey || process.env.MEXC_API_KEY || '',
            secret: apiSecret || process.env.MEXC_API_SECRET || '',
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
            console.log(`✅ Connected to MEXC (${authStatus})`);
        }
        catch (error) {
            this.connected = false;
            console.error('❌ Failed to connect to MEXC:', error);
            throw error;
        }
    }
    async getTickers() {
        if (!this.connected) {
            await this.connect();
        }
        try {
            console.log('Fetching MEXC tickers via CCXT (authenticated)...');
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
                exchange: 'mexc',
                volume: ticker.baseVolume || 0,
                blockchain: undefined,
                contractAddress: undefined
            }));
            console.log(`MEXC: Fetched ${result.length} authenticated tickers`);
            return result;
        }
        catch (error) {
            console.error('MEXC CCXT error:', error);
            throw new Error(`Failed to fetch MEXC data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getOrderBook(symbol) {
        if (!this.connected) {
            throw new Error('MEXC is not connected');
        }
        try {
            const orderBook = await this.exchange.fetchOrderBook(symbol, 100);
            return {
                symbol,
                bids: orderBook.bids,
                asks: orderBook.asks,
                timestamp: orderBook.timestamp || Date.now(),
                exchange: 'mexc'
            };
        }
        catch (error) {
            console.error(`Error fetching order book for ${symbol} from MEXC:`, error);
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
//# sourceMappingURL=MexcAdapter.js.map