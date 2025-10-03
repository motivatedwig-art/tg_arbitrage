import { ExchangeAdapter, Ticker, OrderBook } from '../types/index.js';

export class BinanceAdapter implements ExchangeAdapter {
  public name: string = 'binance';
  private connected: boolean = false;

  constructor() {
    // Public data doesn't require API keys
    // If API keys are provided, they can be used for authenticated requests
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple API call
      const response = await fetch('https://api.binance.com/api/v3/ping');
      if (response.ok) {
        this.connected = true;
        console.log('✅ Connected to Binance (public data only)');
      } else {
        throw new Error(`Binance API ping failed: ${response.status}`);
      }
    } catch (error) {
      this.connected = false;
      console.error('❌ Failed to connect to Binance:', error);
      throw error;
    }
  }

  async getTickers(): Promise<Ticker[]> {
    // Force real data in production
    if (process.env.NODE_ENV === 'production' || process.env.USE_MOCK_DATA === 'false') {
      if (!this.connected) {
        await this.connect();
      }

      try {
        console.log('Fetching real Binance tickers...');
        const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Filter and parse real ticker data
        const tickers = data
          .filter((item: any) => {
            return item.symbol.endsWith('USDT') && 
                   parseFloat(item.volume) > 0 &&
                   parseFloat(item.bidPrice) > 0 &&
                   parseFloat(item.askPrice) > 0;
          })
          .slice(0, 20) // Get more pairs for better opportunities
          .map((item: any) => ({
            symbol: this.formatSymbol(item.symbol),
            bid: parseFloat(item.bidPrice),
            ask: parseFloat(item.askPrice),
            timestamp: Date.now(),
            exchange: 'binance',
            volume: parseFloat(item.volume)
          }));

        console.log(`Binance: Fetched ${tickers.length} real tickers`);
        return tickers;
        
      } catch (error) {
        console.error('Binance API error:', error);
        // Only return empty array in production to avoid mock data
        if (process.env.NODE_ENV === 'production') {
          return [];
        }
        // In development, still return mock data for testing
        return this.generateMockTickers();
      }
    }
    
    // Only use mock data in development
    console.warn('Using mock data for Binance - USE_MOCK_DATA is true');
    return this.generateMockTickers();
  }

  async getOrderBook(symbol: string): Promise<OrderBook> {
    if (!this.connected) {
      throw new Error('Binance is not connected');
    }

    try {
      const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=100`);
      const data = await response.json();
      
      return {
        symbol,
        bids: data.bids.map((bid: [string, string]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
        asks: data.asks.map((ask: [string, string]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
        timestamp: Date.now(),
        exchange: 'binance'
      };
    } catch (error) {
      console.error(`Error fetching order book for ${symbol} from Binance:`, error);
      throw error;
    }
  }

  disconnect(): void {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private formatSymbol(symbol: string): string {
    // Convert BTCUSDT to BTC/USDT
    return symbol.replace('USDT', '/USDT');
  }

  private generateMockTickers(): Ticker[] {
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
