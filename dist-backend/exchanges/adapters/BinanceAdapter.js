export class BinanceAdapter {
    constructor() {
        this.name = 'binance';
        this.connected = false;
        // Public data doesn't require API keys
        // If API keys are provided, they can be used for authenticated requests
    }
    async connect() {
        try {
            // Test connection with a simple API call
            const response = await fetch('https://api.binance.com/api/v3/ping');
            if (response.ok) {
                this.connected = true;
                console.log('✅ Connected to Binance (public data only)');
            }
            else {
                throw new Error(`Binance API ping failed: ${response.status}`);
            }
        }
        catch (error) {
            this.connected = false;
            console.error('❌ Failed to connect to Binance:', error);
            throw error;
        }
    }
    async getTickers() {
        // Check if we should use mock data
        if (process.env.USE_MOCK_DATA === 'true') {
            console.warn('Using mock data for Binance - USE_MOCK_DATA is true');
            return this.generateMockTickers();
        }
        if (!this.connected) {
            throw new Error('Binance is not connected');
        }
        try {
            console.log('Fetching real Binance tickers...');
            const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
            if (!response.ok) {
                throw new Error(`Binance API error: ${response.status}`);
            }
            const data = await response.json();
            console.log(`Received ${data?.length || 0} tickers from Binance`);
            const tickers = data
                .filter((ticker) => ticker.bidPrice && ticker.askPrice)
                .map((ticker) => ({
                symbol: ticker.symbol,
                bid: parseFloat(ticker.bidPrice),
                ask: parseFloat(ticker.askPrice),
                timestamp: ticker.closeTime || Date.now(),
                exchange: 'binance',
                volume: parseFloat(ticker.volume) || 0,
                blockchain: undefined,
                contractAddress: undefined
            }));
            if (!tickers || tickers.length === 0) {
                console.error('No real data received from Binance, falling back to mock');
                return this.generateMockTickers();
            }
            return tickers;
        }
        catch (error) {
            console.error('Binance API error:', error);
            // In production, throw the error instead of silently returning mock data
            if (process.env.NODE_ENV === 'production') {
                throw new Error(`Failed to fetch real data from Binance: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return this.generateMockTickers();
        }
    }
    async getOrderBook(symbol) {
        if (!this.connected) {
            throw new Error('Binance is not connected');
        }
        try {
            const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=100`);
            const data = await response.json();
            return {
                symbol,
                bids: data.bids.map((bid) => [parseFloat(bid[0]), parseFloat(bid[1])]),
                asks: data.asks.map((ask) => [parseFloat(ask[0]), parseFloat(ask[1])]),
                timestamp: Date.now(),
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
    generateMockTickers() {
        const mockSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
        return mockSymbols.map(symbol => ({
            symbol,
            bid: 100 + Math.random() * 10,
            ask: 100 + Math.random() * 10,
            timestamp: Date.now(),
            exchange: 'binance',
            volume: Math.random() * 1000000,
            blockchain: undefined,
            contractAddress: undefined
        }));
    }
}
//# sourceMappingURL=BinanceAdapter.js.map