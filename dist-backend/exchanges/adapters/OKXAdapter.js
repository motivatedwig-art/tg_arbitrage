import ccxt from 'ccxt';
export class OKXAdapter {
    constructor(apiKey, apiSecret, passphrase) {
        this.name = 'okx';
        this.connected = false;
        // Initialize CCXT with authenticated credentials
        this.exchange = new ccxt.okx({
            apiKey: apiKey || process.env.OKX_API_KEY || '',
            secret: apiSecret || process.env.OKX_API_SECRET || '',
            password: passphrase || process.env.OKX_PASSPHRASE || '',
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
            console.log(`✅ Connected to OKX (${authStatus})`);
        }
        catch (error) {
            this.connected = false;
            console.error('❌ Failed to connect to OKX:', error);
            throw error;
        }
    }
    async getTickers() {
        if (!this.connected) {
            await this.connect();
        }
        try {
            console.log('Fetching OKX tickers via CCXT (authenticated)...');
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
                exchange: 'okx',
                volume: ticker.baseVolume || 0,
                blockchain: undefined,
                contractAddress: undefined
            }));
            console.log(`OKX: Fetched ${result.length} authenticated tickers`);
            return result;
        }
        catch (error) {
            console.error('OKX CCXT error:', error);
            throw new Error(`Failed to fetch OKX data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getOrderBook(symbol) {
        if (!this.connected) {
            throw new Error('OKX is not connected');
        }
        try {
            const orderBook = await this.exchange.fetchOrderBook(symbol, 100);
            return {
                symbol,
                bids: orderBook.bids,
                asks: orderBook.asks,
                timestamp: orderBook.timestamp || Date.now(),
                exchange: 'okx'
            };
        }
        catch (error) {
            console.error(`Error fetching order book for ${symbol} from OKX:`, error);
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
//# sourceMappingURL=OKXAdapter.js.map