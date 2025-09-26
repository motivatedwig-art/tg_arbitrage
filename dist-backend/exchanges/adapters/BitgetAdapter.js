export class BitgetAdapter {
    constructor() {
        this.name = 'bitget';
        this.connected = false;
        // Public data doesn't require API keys
    }
    async connect() {
        try {
            // Test connection with a simple API call
            const response = await fetch('https://api.bitget.com/api/v2/public/time');
            if (response.ok) {
                this.connected = true;
                console.log('✅ Connected to Bitget (public data only)');
            }
            else {
                throw new Error(`Bitget API ping failed: ${response.status}`);
            }
        }
        catch (error) {
            this.connected = false;
            console.error('❌ Failed to connect to Bitget:', error);
            throw error;
        }
    }
    async getTickers() {
        // Check if we should use mock data
        if (process.env.USE_MOCK_DATA === 'true') {
            console.warn('Using mock data for Bitget - USE_MOCK_DATA is true');
            return this.generateMockTickers();
        }
        if (!this.connected) {
            throw new Error('Bitget is not connected');
        }
        try {
            console.log('Fetching real Bitget tickers...');
            const response = await fetch('https://api.bitget.com/api/v2/spot/market/tickers');
            if (!response.ok) {
                throw new Error(`Bitget API error: ${response.status}`);
            }
            const data = await response.json();
            console.log(`Received ${data?.data?.length || 0} tickers from Bitget`);
            const tickers = (data.data || [])
                .filter((ticker) => ticker.bestBid && ticker.bestAsk)
                .map((ticker) => ({
                symbol: ticker.symbol,
                bid: parseFloat(ticker.bestBid),
                ask: parseFloat(ticker.bestAsk),
                timestamp: parseInt(ticker.ts) || Date.now(),
                exchange: 'bitget',
                volume: parseFloat(ticker.baseVolume) || 0,
                blockchain: undefined,
                contractAddress: undefined
            }));
            if (!tickers || tickers.length === 0) {
                console.error('No real data received from Bitget, falling back to mock');
                return this.generateMockTickers();
            }
            return tickers;
        }
        catch (error) {
            console.error('Bitget API error:', error);
            // In production, throw the error instead of silently returning mock data
            if (process.env.NODE_ENV === 'production') {
                throw new Error(`Failed to fetch real data from Bitget: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return this.generateMockTickers();
        }
    }
    async getOrderBook(symbol) {
        if (!this.connected) {
            throw new Error('Bitget is not connected');
        }
        try {
            const response = await fetch(`https://api.bitget.com/api/v2/spot/market/depth?symbol=${symbol}&limit=100`);
            const data = await response.json();
            return {
                symbol,
                bids: data.data.bids.map((bid) => [parseFloat(bid[0]), parseFloat(bid[1])]),
                asks: data.data.asks.map((ask) => [parseFloat(ask[0]), parseFloat(ask[1])]),
                timestamp: Date.now(),
                exchange: 'bitget'
            };
        }
        catch (error) {
            console.error(`Error fetching order book for ${symbol} from Bitget:`, error);
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
            exchange: 'bitget',
            volume: Math.random() * 1000000,
            blockchain: undefined,
            contractAddress: undefined
        }));
    }
}
//# sourceMappingURL=BitgetAdapter.js.map