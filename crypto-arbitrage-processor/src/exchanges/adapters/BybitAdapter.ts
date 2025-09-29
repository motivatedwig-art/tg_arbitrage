import { ExchangeAdapter, Ticker, OrderBook } from '../types/index.js';

export class BybitAdapter implements ExchangeAdapter {
  public name: string = 'bybit';
  private connected: boolean = false;

  constructor() {
    // Public data doesn't require API keys
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple API call
      const response = await fetch('https://api.bybit.com/v5/market/time');
      if (response.ok) {
        this.connected = true;
        console.log('✅ Connected to Bybit (public data only)');
      } else {
        throw new Error(`Bybit API ping failed: ${response.status}`);
      }
    } catch (error) {
      this.connected = false;
      console.error('❌ Failed to connect to Bybit:', error);
      throw error;
    }
  }

  async getTickers(): Promise<Ticker[]> {
    // Check if we should use mock data
    if (process.env.USE_MOCK_DATA === 'true') {
      console.warn('Using mock data for Bybit - USE_MOCK_DATA is true');
      return this.generateMockTickers();
    }

    if (!this.connected) {
      throw new Error('Bybit is not connected');
    }

    try {
      console.log('Fetching real Bybit tickers...');
      const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot');
      
      if (!response.ok) {
        throw new Error(`Bybit API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received ${data?.result?.list?.length || 0} tickers from Bybit`);
      
      const tickers: Ticker[] = (data.result?.list || [])
        .filter((ticker: any) => ticker.bid1Price && ticker.ask1Price)
        .map((ticker: any) => ({
          symbol: ticker.symbol,
          bid: parseFloat(ticker.bid1Price),
          ask: parseFloat(ticker.ask1Price),
          timestamp: parseInt(ticker.time) || Date.now(),
          exchange: 'bybit',
          volume: parseFloat(ticker.volume24h) || 0,
          blockchain: undefined,
          contractAddress: undefined
        }));

      if (!tickers || tickers.length === 0) {
        console.error('No real data received from Bybit, falling back to mock');
        return this.generateMockTickers();
      }

      return tickers;
    } catch (error) {
      console.error('Bybit API error:', error);
      // In production, throw the error instead of silently returning mock data
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to fetch real data from Bybit: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return this.generateMockTickers();
    }
  }

  async getOrderBook(symbol: string): Promise<OrderBook> {
    if (!this.connected) {
      throw new Error('Bybit is not connected');
    }

    try {
      const response = await fetch(`https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${symbol}&limit=100`);
      const data = await response.json();
      
      return {
        symbol,
        bids: data.result.b.map((bid: [string, string]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: data.result.a.map((ask: [string, string]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: Date.now(),
        exchange: 'bybit'
      };
    } catch (error) {
      console.error(`Error fetching order book for ${symbol} from Bybit:`, error);
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
      exchange: 'bybit',
      volume: Math.random() * 1000000,
      blockchain: undefined,
      contractAddress: undefined
    }));
  }
}
