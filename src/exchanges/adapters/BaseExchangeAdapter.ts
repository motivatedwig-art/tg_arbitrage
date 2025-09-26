import ccxt from 'ccxt';
import { ExchangeAdapter, Ticker, OrderBook, ExchangeConfig, ExchangeStatus } from '../types/index.js';
import { TokenMetadataService } from '../../services/TokenMetadataService.js';

export abstract class BaseExchangeAdapter implements ExchangeAdapter {
  public name: string;
  protected exchange: any; // Using any for ccxt.Exchange to avoid type issues
  protected config: ExchangeConfig;
  protected connected: boolean = false;
  protected lastError?: string;
  protected errorCount: number = 0;
  protected tokenMetadataService: TokenMetadataService;

  constructor(config: ExchangeConfig) {
    this.name = config.name;
    this.config = config;
    this.exchange = this.createExchange();
    this.tokenMetadataService = TokenMetadataService.getInstance();
  }

  protected abstract createExchange(): any;

  public async connect(): Promise<void> {
    try {
      // Test connection with a more reliable method
      // Try fetchStatus first, fallback to fetchMarkets if not supported
      try {
        await this.exchange.fetchStatus();
      } catch (statusError) {
        // If fetchStatus is not supported, try fetchMarkets instead
        if (statusError instanceof Error && statusError.message.includes('fetchStatus() is not supported')) {
          console.log(`⚠️ ${this.name} doesn't support fetchStatus(), trying fetchMarkets()...`);
          await this.exchange.fetchMarkets();
        } else {
          throw statusError;
        }
      }
      
      this.connected = true;
      this.errorCount = 0;
      this.lastError = undefined;
      
      const hasApiKeys = this.config.apiKey && this.config.apiSecret;
      const keyStatus = hasApiKeys ? 'with API keys' : 'public data only';
      console.log(`✅ Connected to ${this.name} (${keyStatus})`);
    } catch (error) {
      this.connected = false;
      this.errorCount++;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to connect to ${this.name}:`, error);
      throw error;
    }
  }

  public async getTickers(): Promise<Ticker[]> {
    // Check if we should use mock data
    if (process.env.USE_MOCK_DATA === 'true') {
      console.warn(`Using mock data for ${this.name} - USE_MOCK_DATA is true`);
      return this.generateMockTickers();
    }

    if (!this.connected) {
      throw new Error(`${this.name} is not connected`);
    }

    // For production, always attempt real API calls
    try {
      const tickers = await this.exchange.fetchTickers();
      const result: Ticker[] = [];

      for (const [symbol, ticker] of Object.entries(tickers)) {
        const t = ticker as any; // Type assertion for ccxt ticker
        if (t.bid && t.ask) {
          // Get blockchain information for this token
          const blockchain = this.tokenMetadataService.getTokenBlockchain(symbol, this.name);
          const contractAddress = blockchain ? this.tokenMetadataService.getTokenContractAddress(symbol, blockchain) : undefined;

          result.push({
            symbol: symbol,
            bid: t.bid,
            ask: t.ask,
            timestamp: t.timestamp || Date.now(),
            exchange: this.name,
            volume: t.baseVolume,
            blockchain: blockchain || undefined,
            contractAddress: contractAddress || undefined
          });
        }
      }

      if (!result || result.length === 0) {
        console.error(`No real data received from ${this.name}, falling back to mock`);
        return this.generateMockTickers();
      }

      return result;
    } catch (error) {
      this.errorCount++;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Exchange API error for ${this.name}:`, error);
      
      // In production, throw the error instead of silently returning mock data
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to fetch real data from ${this.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      return this.generateMockTickers();
    }
  }

  private generateMockTickers(): Ticker[] {
    const mockSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT'];
    
    return mockSymbols.map(symbol => ({
      symbol,
      bid: 100 + Math.random() * 10,
      ask: 100 + Math.random() * 10,
      timestamp: Date.now(),
      exchange: this.name,
      volume: Math.random() * 1000000,
      blockchain: undefined,
      contractAddress: undefined
    }));
  }

  public async getOrderBook(symbol: string): Promise<OrderBook> {
    if (!this.connected) {
      throw new Error(`${this.name} is not connected`);
    }

    try {
      const orderBook = await this.exchange.fetchOrderBook(symbol);
      
      return {
        symbol: symbol,
        bids: orderBook.bids.map((bid: any) => [bid[0], bid[1]]),
        asks: orderBook.asks.map((ask: any) => [ask[0], ask[1]]),
        timestamp: orderBook.timestamp || Date.now(),
        exchange: this.name
      };
    } catch (error) {
      this.errorCount++;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error fetching order book from ${this.name}:`, error);
      throw error;
    }
  }

  public disconnect(): void {
    this.connected = false;
    console.log(`🔌 Disconnected from ${this.name}`);
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getStatus(): ExchangeStatus {
    return {
      name: this.name,
      isOnline: this.connected,
      lastUpdate: Date.now(),
      errorCount: this.errorCount,
      responseTime: 0, // TODO: Implement response time tracking
      lastError: this.lastError
    };
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async testConnection(): Promise<boolean> {
    try {
      // Try fetchStatus first, fallback to fetchMarkets if not supported
      try {
        await this.exchange.fetchStatus();
      } catch (statusError) {
        if (statusError instanceof Error && statusError.message.includes('fetchStatus() is not supported')) {
          await this.exchange.fetchMarkets();
        } else {
          throw statusError;
        }
      }
      return true;
    } catch (error) {
      console.error(`Connection test failed for ${this.name}:`, error);
      return false;
    }
  }
}
