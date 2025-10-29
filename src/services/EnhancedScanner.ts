/**
 * Enhanced Scanner Service
 * Fetches ALL available trading pairs from exchanges instead of a limited set
 * Improves blockchain detection by using exchange metadata
 */

import { ExchangeManager } from '../exchanges/ExchangeManager.js';
import { ArbitrageCalculator } from '../arbitrage/calculator/ArbitrageCalculator.js';
import { DatabaseManager } from '../database/Database.js';
import { Ticker, ArbitrageOpportunity } from '../exchanges/types/index.js';
import { getTokenBlockchain } from '../services/TokenMetadataDatabase.js';

export class EnhancedScanner {
  private exchangeManager: ExchangeManager;
  private calculator: ArbitrageCalculator;
  private db: DatabaseManager;
  
  // Cache for exchange symbols to avoid refetching frequently
  private exchangeSymbolsCache: Map<string, { symbols: string[], timestamp: number }> = new Map();
  private readonly SYMBOLS_CACHE_DURATION = 3600000; // 1 hour

  constructor() {
    this.exchangeManager = ExchangeManager.getInstance();
    this.calculator = new ArbitrageCalculator(
      parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'),
      parseFloat(process.env.MAX_PROFIT_THRESHOLD || '50'),
      parseFloat(process.env.MIN_VOLUME_THRESHOLD || '10')
    );
    this.db = DatabaseManager.getInstance();
  }

  /**
   * Enhanced scanning that fetches ALL pairs from each exchange
   */
  public async scanAllPairs(): Promise<ArbitrageOpportunity[]> {
    console.log('🔍 [ENHANCED SCAN] Starting comprehensive pair scanning...');
    
    try {
      // Step 1: Fetch all available trading pairs from each exchange
      const allPairs = await this.fetchAllTradingPairs();
      console.log(`📊 Found ${allPairs.length} unique trading pairs across all exchanges`);
      
      // Step 2: Update tickers for all pairs (in batches to avoid rate limits)
      console.log('🔄 Fetching ticker data for all pairs...');
      await this.exchangeManager.updateAllTickers();
      
      // Step 3: Get all tickers and enhance with blockchain data
      const allTickers = this.exchangeManager.getAllTickers();
      const enhancedTickers = this.enhanceTickersWithBlockchain(allTickers);
      
      // Step 4: Calculate arbitrage opportunities
      console.log('💡 Calculating arbitrage opportunities...');
      const opportunities = await this.calculator.calculateArbitrageOpportunities(enhancedTickers);
      
      console.log(`✅ Found ${opportunities.length} arbitrage opportunities`);
      
      return opportunities;
      
    } catch (error) {
      console.error('❌ Enhanced scan error:', error);
      throw error;
    }
  }

  /**
   * Fetch all available trading pairs from all exchanges
   */
  private async fetchAllTradingPairs(): Promise<string[]> {
    const allPairs = new Set<string>();
    const adapters = this.exchangeManager['adapters'];
    
    for (const [exchangeName, adapter] of adapters.entries()) {
      try {
        console.log(`📡 Fetching pairs from ${exchangeName}...`);
        
        // Check cache first
        const cached = this.exchangeSymbolsCache.get(exchangeName);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < this.SYMBOLS_CACHE_DURATION) {
          console.log(`   ✅ Using cached pairs for ${exchangeName} (${cached.symbols.length} pairs)`);
          cached.symbols.forEach(symbol => allPairs.add(symbol));
          continue;
        }
        
        // Fetch all markets/symbols from exchange
        const markets = await adapter.getMarkets();
        const symbols = markets
          .filter(m => m.active && m.type === 'spot') // Only active spot markets
          .filter(m => m.quote === 'USDT' || m.quote === 'USDC' || m.quote === 'BTC' || m.quote === 'ETH') // Common quote currencies
          .map(m => m.symbol);
        
        console.log(`   ✅ ${exchangeName}: ${symbols.length} active pairs`);
        
        // Cache the results
        this.exchangeSymbolsCache.set(exchangeName, {
          symbols,
          timestamp: now
        });
        
        symbols.forEach(symbol => allPairs.add(symbol));
        
      } catch (error) {
        console.warn(`   ⚠️ Failed to fetch pairs from ${exchangeName}:`, error.message);
        // Continue with other exchanges
      }
    }
    
    return Array.from(allPairs);
  }

  /**
   * Enhance tickers with blockchain information from multiple sources
   */
  private enhanceTickersWithBlockchain(allTickers: Map<string, Ticker[]>): Map<string, Ticker[]> {
    const enhanced = new Map<string, Ticker[]>();
    
    for (const [exchange, tickers] of allTickers.entries()) {
      const enhancedTickers = tickers.map(ticker => {
        // If ticker already has blockchain, keep it
        if (ticker.blockchain) {
          return ticker;
        }
        
        // Try to detect blockchain from symbol
        const blockchain = this.detectBlockchainFromSymbol(ticker.symbol);
        
        return {
          ...ticker,
          blockchain
        };
      });
      
      enhanced.set(exchange, enhancedTickers);
    }
    
    return enhanced;
  }

  /**
   * Enhanced blockchain detection using multiple heuristics
   */
  private detectBlockchainFromSymbol(symbol: string): string {
    // Clean symbol
    const cleanSymbol = symbol
      .replace(/[\/\-_]/g, '')
      .replace(/USDT$|USDC$|BTC$|ETH$|BNB$|USD$|EUR$/i, '')
      .toUpperCase();
    
    // 1. Check comprehensive token database first
    const fromDb = getTokenBlockchain(symbol);
    if (fromDb) {
      return fromDb;
    }
    
    // 2. Pattern-based detection (more comprehensive)
    if (cleanSymbol.includes('SOL') || cleanSymbol.includes('WSOL')) return 'solana';
    if (cleanSymbol.includes('TRX') || cleanSymbol.includes('TRON')) return 'tron';
    if (cleanSymbol.includes('BNB') || cleanSymbol.includes('WBNB') || cleanSymbol === 'BNB') return 'bsc';
    if (cleanSymbol.includes('MATIC') || cleanSymbol.includes('WMATIC') || cleanSymbol === 'MATIC') return 'polygon';
    if (cleanSymbol.includes('ARB') && !cleanSymbol.includes('BARB')) return 'arbitrum';
    if (cleanSymbol === 'OP' || (cleanSymbol.includes('OP') && cleanSymbol.length <= 8)) return 'optimism';
    if (cleanSymbol.includes('AVAX') || cleanSymbol.includes('WAVAX') || cleanSymbol === 'AVAX') return 'avalanche';
    if (cleanSymbol.includes('TON') || cleanSymbol === 'TON') return 'ton';
    if (cleanSymbol.includes('APT') || cleanSymbol === 'APT') return 'aptos';
    if (cleanSymbol.includes('SUI') || cleanSymbol === 'SUI') return 'sui';
    if (cleanSymbol.includes('NEAR') || cleanSymbol === 'NEAR') return 'near';
    if (cleanSymbol.includes('ATOM') || cleanSymbol === 'ATOM') return 'cosmos';
    if (cleanSymbol.includes('DOT') || cleanSymbol === 'DOT') return 'polkadot';
    if (cleanSymbol.includes('ADA') || cleanSymbol === 'ADA') return 'cardano';
    
    // 3. Native chain tokens
    if (cleanSymbol === 'BTC' || cleanSymbol.includes('BTC')) return 'bitcoin';
    if (cleanSymbol === 'XRP' || cleanSymbol.includes('XRP')) return 'ripple';
    if (cleanSymbol === 'XLM' || cleanSymbol.includes('XLM')) return 'stellar';
    if (cleanSymbol === 'DOGE' || cleanSymbol.includes('DOGE')) return 'dogecoin';
    if (cleanSymbol === 'LTC' || cleanSymbol.includes('LTC')) return 'litecoin';
    
    // 4. For unknown tokens, don't default to Ethereum immediately
    // Instead, try to infer from common patterns
    // Many new tokens on Solana, BSC, or Polygon might have unique patterns
    
    // If it's a wrapped token (starts with W), check what it wraps
    if (cleanSymbol.startsWith('W') && cleanSymbol.length > 4) {
      const unwrapped = cleanSymbol.substring(1);
      if (unwrapped === 'BTC' || unwrapped === 'ETH') return 'ethereum';
      if (unwrapped === 'SOL') return 'solana';
      if (unwrapped === 'BNB') return 'bsc';
      if (unwrapped === 'MATIC') return 'polygon';
    }
    
    // 5. Last resort: Default to Ethereum (but log for analysis)
    console.log(`   ⚠️ Unknown blockchain for ${symbol}, defaulting to Ethereum`);
    return 'ethereum';
  }
}

