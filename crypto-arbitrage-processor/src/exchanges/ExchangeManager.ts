import { ExchangeAdapter, ExchangeConfig, Ticker, ExchangeStatus, ExchangeName } from './types/index.js';
import { BinanceAdapter } from './adapters/BinanceAdapter.js';
import { OKXAdapter } from './adapters/OKXAdapter.js';
import { BybitAdapter } from './adapters/BybitAdapter.js';
import { BitgetAdapter } from './adapters/BitgetAdapter.js';
import { MexcAdapter } from './adapters/MexcAdapter.js';
import { BingxAdapter } from './adapters/BingxAdapter.js';
import { GateioAdapter } from './adapters/GateioAdapter.js';
import { KucoinAdapter } from './adapters/KucoinAdapter.js';

export class ExchangeManager {
  private static instance: ExchangeManager;
  private adapters: Map<string, ExchangeAdapter> = new Map();
  private tickerCache: Map<string, Ticker[]> = new Map();
  private lastUpdate: number = 0;

  private constructor() {}

  public static getInstance(): ExchangeManager {
    if (!ExchangeManager.instance) {
      ExchangeManager.instance = new ExchangeManager();
    }
    return ExchangeManager.instance;
  }

  public async initializeExchanges(): Promise<void> {
    const configs = this.getExchangeConfigs();
    
    for (const config of configs) {
      try {
        const adapter = this.createAdapter(config);
        this.adapters.set(config.name, adapter);
        
        // Try to connect (non-blocking)
        try {
          await adapter.connect();
        } catch (error) {
          console.warn(`Failed to connect to ${config.name}, will continue without it:`, error);
        }
      } catch (error) {
        console.error(`Failed to initialize ${config.name}:`, error);
      }
    }

    console.log(`Initialized ${this.adapters.size} exchanges`);
  }

  private getExchangeConfigs(): ExchangeConfig[] {
    return [
      {
        name: ExchangeName.BINANCE,
        apiKey: process.env.BINANCE_API_KEY || '',
        apiSecret: process.env.BINANCE_API_SECRET || '',
        enableRateLimit: true,
        rateLimit: 1200
      },
      {
        name: ExchangeName.OKX,
        apiKey: process.env.OKX_API_KEY || '',
        apiSecret: process.env.OKX_API_SECRET || '',
        passphrase: process.env.OKX_PASSPHRASE || '',
        enableRateLimit: true,
        rateLimit: 100
      },
      {
        name: ExchangeName.BYBIT,
        apiKey: process.env.BYBIT_API_KEY || '',
        apiSecret: process.env.BYBIT_API_SECRET || '',
        enableRateLimit: true,
        rateLimit: 120
      },
      // Temporarily disabled - API endpoint issues
      // {
      //   name: ExchangeName.BITGET,
      //   apiKey: process.env.BITGET_API_KEY || '',
      //   apiSecret: process.env.BITGET_API_SECRET || '',
      //   passphrase: process.env.BITGET_PASSPHRASE || '',
      //   enableRateLimit: true,
      //   rateLimit: 100
      // },
      {
        name: ExchangeName.MEXC,
        apiKey: process.env.MEXC_API_KEY || '',
        apiSecret: process.env.MEXC_API_SECRET || '',
        enableRateLimit: true,
        rateLimit: 50
      },
      // Temporarily disabled - API endpoint issues
      // {
      //   name: ExchangeName.BINGX,
      //   apiKey: process.env.BINGX_API_KEY || '',
      //   apiSecret: process.env.BINGX_API_SECRET || '',
      //   enableRateLimit: true,
      //   rateLimit: 100
      // },
      {
        name: ExchangeName.GATE_IO,
        apiKey: process.env.GATE_IO_API_KEY || '',
        apiSecret: process.env.GATE_IO_API_SECRET || '',
        enableRateLimit: true,
        rateLimit: 200
      },
      {
        name: ExchangeName.KUCOIN,
        apiKey: process.env.KUCOIN_API_KEY || '',
        apiSecret: process.env.KUCOIN_API_SECRET || '',
        passphrase: process.env.KUCOIN_PASSPHRASE || '',
        enableRateLimit: true,
        rateLimit: 334
      }
    ];
  }

  private createAdapter(config: ExchangeConfig): ExchangeAdapter {
    switch (config.name) {
      case ExchangeName.BINANCE:
        return new BinanceAdapter();
      case ExchangeName.OKX:
        return new OKXAdapter();
      case ExchangeName.BYBIT:
        return new BybitAdapter();
      case ExchangeName.BITGET:
        return new BitgetAdapter();
      case ExchangeName.MEXC:
        return new MexcAdapter();
      case ExchangeName.BINGX:
        return new BingxAdapter();
      case ExchangeName.GATE_IO:
        return new GateioAdapter();
      case ExchangeName.KUCOIN:
        return new KucoinAdapter();
      default:
        throw new Error(`Unsupported exchange: ${config.name}`);
    }
  }

  public async updateAllTickers(): Promise<void> {
    // Check if we should use mock data
    if (process.env.USE_MOCK_DATA === 'true') {
      console.warn('Using mock data - USE_MOCK_DATA is true');
      this.generateMockTickers();
      this.lastUpdate = Date.now();
      return;
    }

    const promises: Promise<void>[] = [];

    for (const [name, adapter] of this.adapters) {
      if (adapter.isConnected()) {
        promises.push(this.updateExchangeTickers(name, adapter));
      }
    }

    await Promise.allSettled(promises);
    this.lastUpdate = Date.now();
  }

  private async updateExchangeTickers(name: string, adapter: ExchangeAdapter): Promise<void> {
    try {
      const tickers = await adapter.getTickers();
      this.tickerCache.set(name, tickers);
      console.log(`Updated ${tickers.length} tickers for ${name}`);
    } catch (error) {
      console.error(`Failed to update tickers for ${name}:`, error);
      // In production, throw the error instead of silently failing
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to fetch real data from ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private generateMockTickers(): void {
    const mockSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT'];
    const exchanges = ['binance', 'okx', 'bybit', 'bitget', 'mexc', 'bingx', 'gateio', 'kucoin'];
    
    exchanges.forEach(exchange => {
      const mockTickers: Ticker[] = mockSymbols.map(symbol => ({
        symbol,
        bid: 100 + Math.random() * 10,
        ask: 100 + Math.random() * 10,
        timestamp: Date.now(),
        exchange,
        volume: Math.random() * 1000000,
        blockchain: undefined,
        contractAddress: undefined
      }));
      
      this.tickerCache.set(exchange, mockTickers);
    });
    
    console.log('Generated mock tickers for all exchanges');
  }

  public getAllTickers(): Map<string, Ticker[]> {
    return new Map(this.tickerCache);
  }

  public getExchangeStatus(): ExchangeStatus[] {
    const statuses: ExchangeStatus[] = [];

    for (const [name, adapter] of this.adapters) {
      statuses.push({
        name: name,
        isOnline: adapter.isConnected(),
        lastUpdate: this.lastUpdate,
        errorCount: 0,
        responseTime: 0
      });
    }

    return statuses;
  }

  public getConnectedExchanges(): string[] {
    return Array.from(this.adapters.entries())
      .filter(([_, adapter]) => adapter.isConnected())
      .map(([name, _]) => name);
  }

  public async disconnect(): Promise<void> {
    for (const [name, adapter] of this.adapters) {
      try {
        adapter.disconnect();
      } catch (error) {
        console.error(`Error disconnecting from ${name}:`, error);
      }
    }
    this.adapters.clear();
    this.tickerCache.clear();
  }

  public getTickersForSymbol(symbol: string): Ticker[] {
    const result: Ticker[] = [];

    for (const tickers of this.tickerCache.values()) {
      const ticker = tickers.find(t => t.symbol === symbol);
      if (ticker) {
        result.push(ticker);
      }
    }

    return result;
  }

  public getLastUpdateTime(): number {
    return this.lastUpdate;
  }
}
