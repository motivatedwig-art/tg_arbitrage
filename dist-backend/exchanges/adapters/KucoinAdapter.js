export class KucoinAdapter {
    constructor() {
        this.name = 'kucoin';
        this.connected = false;
        // Public data doesn't require API keys
    }
    async connect() {
        try {
            // Test connection with a simple API call
            const response = await fetch('https://api.kucoin.com/api/v1/timestamp');
            if (response.ok) {
                this.connected = true;
                console.log('✅ Connected to KuCoin (public data only)');
            }
            else {
                throw new Error(`KuCoin API ping failed: ${response.status}`);
            }
        }
        catch (error) {
            this.connected = false;
            console.error('❌ Failed to connect to KuCoin:', error);
            throw error;
        }
    }
    async getTickers() {
        // Check if we should use mock data
        if (process.env.USE_MOCK_DATA === 'true') {
            console.warn('Using mock data for KuCoin - USE_MOCK_DATA is true');
            return this.generateMockTickers();
        }
        if (!this.connected) {
            throw new Error('KuCoin is not connected');
        }
        try {
            console.log('Fetching real KuCoin tickers...');
            const response = await fetch('https://api.kucoin.com/api/v1/market/allTickers');
            if (!response.ok) {
                throw new Error(`KuCoin API error: ${response.status}`);
            }
            const data = await response.json();
            console.log(`Received ${data?.data?.ticker?.length || 0} tickers from KuCoin`);
            const tickers = (data.data?.ticker || [])
                .filter((ticker) => ticker.buy && ticker.sell)
                .map((ticker) => ({
                symbol: ticker.symbol,
                bid: parseFloat(ticker.buy),
                ask: parseFloat(ticker.sell),
                timestamp: parseInt(ticker.time) || Date.now(),
                exchange: 'kucoin',
                volume: parseFloat(ticker.vol) || 0,
                blockchain: undefined,
                contractAddress: undefined
            }));
            if (!tickers || tickers.length === 0) {
                console.error('No real data received from KuCoin, falling back to mock');
                return this.generateMockTickers();
            }
            return tickers;
        }
        catch (error) {
            console.error('KuCoin API error:', error);
            // In production, throw the error instead of silently returning mock data
            if (process.env.NODE_ENV === 'production') {
                throw new Error(`Failed to fetch real data from KuCoin: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return this.generateMockTickers();
        }
    }
    async getOrderBook(symbol) {
        if (!this.connected) {
            throw new Error('KuCoin is not connected');
        }
        try {
            const response = await fetch(`https://api.kucoin.com/api/v1/market/orderbook/level2_100?symbol=${symbol}`);
            const data = await response.json();
            return {
                symbol,
                bids: data.data.bids.map((bid) => [parseFloat(bid[0]), parseFloat(bid[1])]),
                asks: data.data.asks.map((ask) => [parseFloat(ask[0]), parseFloat(ask[1])]),
                timestamp: Date.now(),
                exchange: 'kucoin'
            };
        }
        catch (error) {
            console.error(`Error fetching order book for ${symbol} from KuCoin:`, error);
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
            exchange: 'kucoin',
            volume: Math.random() * 1000000,
            blockchain: undefined,
            contractAddress: undefined
        }));
    }
}
//# sourceMappingURL=KucoinAdapter.js.map