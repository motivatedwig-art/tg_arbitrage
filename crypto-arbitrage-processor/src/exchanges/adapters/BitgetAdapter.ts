import { ExchangeAdapter, Ticker, OrderBook } from '../types/index.js';

export class BitgetAdapter implements ExchangeAdapter {
  public name: string = 'bitget';
  private connected: boolean = false;

  constructor() {
    // Public data doesn't require API keys
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple API call
      const response = await fetch('https://api.bitget.com/api/v2/public/time');
      if (response.ok) {
        this.connected = true;
        console.log('✅ Connected to Bitget (public data only)');
      } else {
        throw new Error(`Bitget API ping failed: ${response.status}`);
      }
    } catch (error) {
      this.connected = false;
      console.error('❌ Failed to connect to Bitget:', error);
      throw error;
    }
  }

  async getTickers(): Promise<Ticker[]> {
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
      
      const tickers: Ticker[] = (data.data || [])
        .filter((ticker: any) => ticker.symbol && ticker.lastPr && ticker.symbol.includes('USDT'))
        .map((ticker: any) => {
          const price = parseFloat(ticker.lastPr);
          return {
            symbol: ticker.symbol,
            bid: price * 0.9999, // Approximate bid/ask spread
            ask: price * 1.0001,
            timestamp: parseInt(ticker.ts) || Date.now(),
            exchange: 'bitget',
            volume: parseFloat(ticker.baseVolume) || 0,
            blockchain: undefined,
            contractAddress: undefined
          };
        });

      if (!tickers || tickers.length === 0) {
        console.error('No real data received from Bitget, falling back to mock');
        return this.generateMockTickers();
      }

      return tickers;
    } catch (error) {
      console.error('Bitget API error:', error);
      // In production, throw the error instead of silently returning mock data
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to fetch real data from Bitget: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return this.generateMockTickers();
    }
  }

  async getOrderBook(symbol: string): Promise<OrderBook> {
    if (!this.connected) {
      throw new Error('Bitget is not connected');
    }

    try {
      const response = await fetch(`https://api.bitget.com/api/v2/spot/market/depth?symbol=${symbol}&limit=100`);
      const data = await response.json();
      
      return {
        symbol,
        bids: data.data.bids.map((bid: [string, string]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: data.data.asks.map((ask: [string, string]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: Date.now(),
        exchange: 'bitget'
      };
    } catch (error) {
      console.error(`Error fetching order book for ${symbol} from Bitget:`, error);
      throw error;
    }
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private generateMockTickers(): Ticker[] {
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
