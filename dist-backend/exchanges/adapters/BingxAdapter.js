export class BingxAdapter {
    constructor() {
        this.name = 'bingx';
        this.connected = false;
        // Public data doesn't require API keys
    }
    async connect() {
        try {
            // Test connection with a simple API call
            const response = await fetch('https://open-api.bingx.com/openApi/spot/v1/common/serverTime');
            if (response.ok) {
                this.connected = true;
                console.log('✅ Connected to BingX (public data only)');
            }
            else {
                throw new Error(`BingX API ping failed: ${response.status}`);
            }
        }
        catch (error) {
            this.connected = false;
            console.error('❌ Failed to connect to BingX:', error);
            throw error;
        }
    }
    async getTickers() {
        // Check if we should use mock data
        if (process.env.USE_MOCK_DATA === 'true') {
            console.warn('Using mock data for BingX - USE_MOCK_DATA is true');
            return this.generateMockTickers();
        }
        if (!this.connected) {
            throw new Error('BingX is not connected');
        }
        try {
            console.log('Fetching real BingX tickers...');
            const response = await fetch('https://open-api.bingx.com/openApi/spot/v1/ticker/24hr');
            if (!response.ok) {
                throw new Error(`BingX API error: ${response.status}`);
            }
            const data = await response.json();
            console.log(`Received ${data?.data?.length || 0} tickers from BingX`);
            const tickers = (data.data || [])
                .filter((ticker) => ticker.bidPrice && ticker.askPrice)
                .map((ticker) => ({
                symbol: ticker.symbol,
                bid: parseFloat(ticker.bidPrice),
                ask: parseFloat(ticker.askPrice),
                timestamp: ticker.closeTime || Date.now(),
                exchange: 'bingx',
                volume: parseFloat(ticker.volume) || 0,
                blockchain: undefined,
                contractAddress: undefined
            }));
            if (!tickers || tickers.length === 0) {
                console.error('No real data received from BingX, falling back to mock');
                return this.generateMockTickers();
            }
            return tickers;
        }
        catch (error) {
            console.error('BingX API error:', error);
            // In production, throw the error instead of silently returning mock data
            if (process.env.NODE_ENV === 'production') {
                throw new Error(`Failed to fetch real data from BingX: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return this.generateMockTickers();
        }
    }
    async getOrderBook(symbol) {
        if (!this.connected) {
            throw new Error('BingX is not connected');
        }
        try {
            const response = await fetch(`https://open-api.bingx.com/openApi/spot/v1/market/depth?symbol=${symbol}&limit=100`);
            const data = await response.json();
            return {
                symbol,
                bids: data.data.bids.map((bid) => [parseFloat(bid[0]), parseFloat(bid[1])]),
                asks: data.data.asks.map((ask) => [parseFloat(ask[0]), parseFloat(ask[1])]),
                timestamp: Date.now(),
                exchange: 'bingx'
            };
        }
        catch (error) {
            console.error(`Error fetching order book for ${symbol} from BingX:`, error);
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
        const mockSymbols = ['BTC-USDT', 'ETH-USDT', 'BNB-USDT', 'ADA-USDT', 'SOL-USDT'];
        return mockSymbols.map(symbol => ({
            symbol,
            bid: 100 + Math.random() * 10,
            ask: 100 + Math.random() * 10,
            timestamp: Date.now(),
            exchange: 'bingx',
            volume: Math.random() * 1000000,
            blockchain: undefined,
            contractAddress: undefined
        }));
    }
}
//# sourceMappingURL=BingxAdapter.js.map