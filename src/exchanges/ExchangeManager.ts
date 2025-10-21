import { ExchangeAdapter, ExchangeConfig, Ticker, ExchangeStatus, ExchangeName } from './types/index.js';
import { BinanceAdapter } from './adapters/BinanceAdapter.js';
import { OKXAdapter } from './adapters/OKXAdapter.js';
import { BybitAdapter } from './adapters/BybitAdapter.js';
import { MexcAdapter } from './adapters/MexcAdapter.js';
import { GateioAdapter } from './adapters/GateioAdapter.js';
import { KucoinAdapter } from './adapters/KucoinAdapter.js';

export class ExchangeManager {
  private static instance: ExchangeManager;
  private adapters: Map<string, ExchangeAdapter> = new Map();
  private tickerCache: Map<string, Ticker[]> = new Map();
  private lastUpdate: number = 0;
  private networkCache: Map<string, { networks: any[], timestamp: number }> = new Map();
  private readonly NETWORK_CACHE_DURATION = 3600000; // 1 hour in milliseconds

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
      {
        name: ExchangeName.MEXC,
        apiKey: process.env.MEXC_API_KEY || '',
        apiSecret: process.env.MEXC_API_SECRET || '',
        enableRateLimit: true,
        rateLimit: 50
      },
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
      case ExchangeName.MEXC:
        return new MexcAdapter();
      case ExchangeName.GATE_IO:
        return new GateioAdapter();
      case ExchangeName.KUCOIN:
        return new KucoinAdapter();
      default:
        throw new Error(`Unsupported exchange: ${config.name}`);
    }
  }

  public async updateAllTickers(): Promise<void> {
    // NEVER use mock data - always fetch real data from exchanges
    if (process.env.USE_MOCK_DATA === 'true') {
      console.error('❌ USE_MOCK_DATA is set to true, but mock data is DISABLED');
      console.error('❌ Will attempt to fetch real data instead');
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
    const exchanges = ['binance', 'okx', 'bybit', 'mexc', 'gateio', 'kucoin'];
    
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

  /**
   * Get currency networks for a specific exchange (with caching)
   */
  async getCurrencyNetworks(exchangeName: string, currency: string): Promise<any[]> {
    const cacheKey = `${exchangeName}-${currency}`;
    const cached = this.networkCache.get(cacheKey);
    
    // Return cached data if it's still fresh
    if (cached && (Date.now() - cached.timestamp) < this.NETWORK_CACHE_DURATION) {
      return cached.networks;
    }

    try {
      const adapter = this.adapters.get(exchangeName);
      if (!adapter) {
        console.warn(`Exchange ${exchangeName} not found`);
        return [];
      }

      // Use ccxt's fetchCurrencies method to get network information
      const exchange = (adapter as any).exchange;
      if (!exchange || !exchange.fetchCurrencies) {
        console.warn(`Exchange ${exchangeName} does not support fetchCurrencies`);
        return [];
      }

      const currencies = await exchange.fetchCurrencies();
      const currencyInfo = currencies[currency];
      
      if (!currencyInfo) {
        console.warn(`Currency ${currency} not found on ${exchangeName}`);
        return [];
      }

      const networks = currencyInfo.networks || [];
      
      // Cache the result
      this.networkCache.set(cacheKey, {
        networks,
        timestamp: Date.now()
      });

      return networks;
    } catch (error) {
      console.error(`Error fetching networks for ${currency} on ${exchangeName}:`, error);
      
      // Return cached data even if expired, as fallback
      if (cached) {
        console.log(`Using expired cache for ${cacheKey} due to API error`);
        return cached.networks;
      }
      
      return [];
    }
  }

  /**
   * Check if a currency is available for transfer on both exchanges
   */
  async checkTransferAvailability(
    currency: string, 
    buyExchange: string, 
    sellExchange: string
  ): Promise<{ buyAvailable: boolean | undefined; sellAvailable: boolean | undefined; commonNetworks: string[] }> {
    try {
      const [buyNetworks, sellNetworks] = await Promise.all([
        this.getCurrencyNetworks(buyExchange, currency),
        this.getCurrencyNetworks(sellExchange, currency)
      ]);

      // Normalize network names to blockchain names
      const buyBlockchains = buyNetworks
        .filter(network => network.deposit && network.withdraw)
        .map(network => this.normalizeNetworkToBlockchain(network.network))
        .filter(Boolean);

      const sellBlockchains = sellNetworks
        .filter(network => network.deposit && network.withdraw)
        .map(network => this.normalizeNetworkToBlockchain(network.network))
        .filter(Boolean);

      // Determine availability status
      // If both networks are empty, the exchange likely doesn't support the API - return undefined (unknown)
      // This implements fail-open: if we can't verify, we assume it's available
      const buyAvailable = buyNetworks.length === 0 ? undefined : buyBlockchains.length > 0;
      const sellAvailable = sellNetworks.length === 0 ? undefined : sellBlockchains.length > 0;

      // Find common blockchains (only if we have data from both exchanges)
      const commonNetworks = (buyBlockchains.length > 0 && sellBlockchains.length > 0)
        ? buyBlockchains.filter(chain => sellBlockchains.includes(chain))
        : [];

      return {
        buyAvailable,
        sellAvailable,
        commonNetworks
      };
    } catch (error) {
      console.error(`Error checking transfer availability for ${currency}:`, error);
      // On error, return undefined (unknown) to allow fail-open behavior
      return {
        buyAvailable: undefined,
        sellAvailable: undefined,
        commonNetworks: []
      };
    }
  }

  /**
   * Normalize network names to blockchain names
   */
  private normalizeNetworkToBlockchain(networkName: string): string | null {
    if (!networkName) return null;
    
    const network = networkName.toLowerCase();
    
    // Ethereum networks
    if (network.includes('ethereum') || network.includes('eth') || network.includes('erc20')) {
      return 'ethereum';
    }
    
    // BSC networks
    if (network.includes('bsc') || network.includes('bep20') || network.includes('binance')) {
      return 'bsc';
    }
    
    // Polygon networks
    if (network.includes('polygon') || network.includes('matic') || network.includes('poly')) {
      return 'polygon';
    }
    
    // Arbitrum networks
    if (network.includes('arbitrum') || network.includes('arb')) {
      return 'arbitrum';
    }
    
    // Optimism networks
    if (network.includes('optimism') || network.includes('op')) {
      return 'optimism';
    }
    
    // Solana networks
    if (network.includes('solana') || network.includes('sol')) {
      return 'solana';
    }
    
    // Tron networks
    if (network.includes('tron') || network.includes('trc20')) {
      return 'tron';
    }
    
    // Avalanche networks
    if (network.includes('avalanche') || network.includes('avax')) {
      return 'avalanche';
    }
    
    return null;
  }
}
