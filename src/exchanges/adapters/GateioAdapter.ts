import { ExchangeAdapter, Ticker, OrderBook } from '../types/index.js';

export class GateioAdapter implements ExchangeAdapter {
  public name: string = 'gateio';
  private connected: boolean = false;

  constructor() {
    // Public data doesn't require API keys
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple API call
      const response = await fetch('https://api.gateio.ws/api/v4/spot/currencies');
      if (response.ok) {
        this.connected = true;
        console.log('✅ Connected to Gate.io (public data only)');
      } else {
        throw new Error(`Gate.io API ping failed: ${response.status}`);
      }
    } catch (error) {
      this.connected = false;
      console.error('❌ Failed to connect to Gate.io:', error);
      throw error;
    }
  }

  async getTickers(): Promise<Ticker[]> {
    // Check if we should use mock data
    if (process.env.USE_MOCK_DATA === 'true') {
      console.warn('Using mock data for Gate.io - USE_MOCK_DATA is true');
      return this.generateMockTickers();
    }

    if (!this.connected) {
      throw new Error('Gate.io is not connected');
    }

    try {
      console.log('Fetching real Gate.io tickers...');
      const response = await fetch('https://api.gateio.ws/api/v4/spot/tickers');
      
      if (!response.ok) {
        throw new Error(`Gate.io API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Received ${data?.length || 0} tickers from Gate.io`);
      
      const tickers: Ticker[] = (data || [])
        .filter((ticker: any) => ticker.highest_bid && ticker.lowest_ask)
        .map((ticker: any) => ({
          symbol: ticker.currency_pair,
          bid: parseFloat(ticker.highest_bid),
          ask: parseFloat(ticker.lowest_ask),
          timestamp: parseInt(ticker.update_time) * 1000 || Date.now(),
          exchange: 'gateio',
          volume: parseFloat(ticker.base_volume) || 0,
          blockchain: undefined,
          contractAddress: undefined
        }));

      if (!tickers || tickers.length === 0) {
        console.error('No real data received from Gate.io, falling back to mock');
        return this.generateMockTickers();
      }

      return tickers;
    } catch (error) {
      console.error('Gate.io API error:', error);
      // In production, throw the error instead of silently returning mock data
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to fetch real data from Gate.io: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return this.generateMockTickers();
    }
  }

  async getOrderBook(symbol: string): Promise<OrderBook> {
    if (!this.connected) {
      throw new Error('Gate.io is not connected');
    }

    try {
      const response = await fetch(`https://api.gateio.ws/api/v4/spot/order_book?currency_pair=${symbol}&limit=100`);
      const data = await response.json();
      
      return {
        symbol,
        bids: data.bids.map((bid: [string, string]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: data.asks.map((ask: [string, string]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: Date.now(),
        exchange: 'gateio'
      };
    } catch (error) {
      console.error(`Error fetching order book for ${symbol} from Gate.io:`, error);
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
    const mockSymbols = ['BTC_USDT', 'ETH_USDT', 'BNB_USDT', 'ADA_USDT', 'SOL_USDT'];
    
    return mockSymbols.map(symbol => ({
      symbol,
      bid: 100 + Math.random() * 10,
      ask: 100 + Math.random() * 10,
      timestamp: Date.now(),
      exchange: 'gateio',
      volume: Math.random() * 1000000,
      blockchain: undefined,
      contractAddress: undefined
    }));
  }
}
