import { ExchangeAdapter, Ticker, OrderBook } from '../types/index.js';

export class OKXAdapter implements ExchangeAdapter {
  public name: string = 'okx';
  private connected: boolean = false;

  constructor() {
    // Public data doesn't require API keys
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple API call
      const response = await fetch('https://www.okx.com/api/v5/public/time');
      if (response.ok) {
        this.connected = true;
        console.log('✅ Connected to OKX (public data only)');
      } else {
        throw new Error(`OKX API ping failed: ${response.status}`);
      }
    } catch (error) {
      this.connected = false;
      console.error('❌ Failed to connect to OKX:', error);
      throw error;
    }
  }

  async getTickers(): Promise<Ticker[]> {
    // Check if we should use mock data
    if (process.env.USE_MOCK_DATA === 'true') {
      console.warn('Using mock data for OKX - USE_MOCK_DATA is true');
      return this.generateMockTickers();
    }

    if (!this.connected) {
      throw new Error('OKX is not connected');
    }

    try {
      console.log('Fetching real OKX tickers...');
      const response = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT');
      
      if (!response.ok) {
        throw new Error(`OKX API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received ${data?.data?.length || 0} tickers from OKX`);
      
      const tickers: Ticker[] = (data.data || [])
        .filter((ticker: any) => ticker.bidPx && ticker.askPx)
        .map((ticker: any) => ({
          symbol: ticker.instId,
          bid: parseFloat(ticker.bidPx),
          ask: parseFloat(ticker.askPx),
          timestamp: parseInt(ticker.ts) || Date.now(),
          exchange: 'okx',
          volume: parseFloat(ticker.vol24h) || 0,
          blockchain: undefined,
          contractAddress: undefined
        }));

      if (!tickers || tickers.length === 0) {
        console.error('No real data received from OKX, falling back to mock');
        return this.generateMockTickers();
      }

      return tickers;
    } catch (error) {
      console.error('OKX API error:', error);
      // In production, throw the error instead of silently returning mock data
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to fetch real data from OKX: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return this.generateMockTickers();
    }
  }

  async getOrderBook(symbol: string): Promise<OrderBook> {
    if (!this.connected) {
      throw new Error('OKX is not connected');
    }

    try {
      const response = await fetch(`https://www.okx.com/api/v5/market/books?instId=${symbol}&sz=100`);
      const data = await response.json();
      
      return {
        symbol,
        bids: data.data[0].bids.map((bid: [string, string]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: data.data[0].asks.map((ask: [string, string]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: Date.now(),
        exchange: 'okx'
      };
    } catch (error) {
      console.error(`Error fetching order book for ${symbol} from OKX:`, error);
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
    const mockSymbols = ['BTC-USDT', 'ETH-USDT', 'BNB-USDT', 'ADA-USDT', 'SOL-USDT'];
    
    return mockSymbols.map(symbol => ({
      symbol,
      bid: 100 + Math.random() * 10,
      ask: 100 + Math.random() * 10,
      timestamp: Date.now(),
      exchange: 'okx',
      volume: Math.random() * 1000000,
      blockchain: undefined,
      contractAddress: undefined
    }));
  }
}
