import { DatabaseManager } from '../database/Database.js';
import { ExchangeManager } from '../exchanges/ExchangeManager.js';
import { ArbitrageCalculator } from '../arbitrage/calculator/ArbitrageCalculator.js';
import { ArbitrageOpportunity } from '../exchanges/types/index.js';

export class UnifiedArbitrageService {
  private static instance: UnifiedArbitrageService;
  private db: DatabaseManager;
  private exchangeManager: ExchangeManager;
  private arbitrageCalculator: ArbitrageCalculator;
  private isRunning: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.db = DatabaseManager.getInstance();
    this.exchangeManager = ExchangeManager.getInstance();
    this.arbitrageCalculator = new ArbitrageCalculator(
      parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'),
      parseFloat(process.env.MAX_PROFIT_THRESHOLD || '110'),
      parseFloat(process.env.MIN_VOLUME_THRESHOLD || '100')  // Lower threshold to find more opportunities
    );
  }

  // Helper function to get 3-letter blockchain identifier
  private getBlockchainTag(blockchain?: string): string {
    if (!blockchain) return '[???]';
    
    const blockchainMap: { [key: string]: string } = {
      'ethereum': 'ETH',
      'bsc': 'BSC',
      'binance-smart-chain': 'BSC',
      'polygon': 'POL',
      'matic': 'POL',
      'arbitrum': 'ARB',
      'optimism': 'OPT',
      'solana': 'SOL',
      'tron': 'TRX',
      'avalanche': 'AVA',
      'avax': 'AVA',
      'fantom': 'FTM',
      'base': 'BAS',
      'sui': 'SUI',
      'aptos': 'APT',
      'ton': 'TON',
      'near': 'NEA',
      'cosmos': 'ATM',
      'polkadot': 'DOT',
      'cardano': 'ADA'
    };
    
    return `[${blockchainMap[blockchain.toLowerCase()] || blockchain.slice(0, 3).toUpperCase()}]`;
  }

  public static getInstance(): UnifiedArbitrageService {
    if (!UnifiedArbitrageService.instance) {
      UnifiedArbitrageService.instance = new UnifiedArbitrageService();
    }
    return UnifiedArbitrageService.instance;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Unified Arbitrage Service is already running');
      return;
    }

    console.log('🚀 Starting Unified Arbitrage Service...');
    this.isRunning = true;

    // Initialize exchanges
    await this.exchangeManager.initializeExchanges();

    // Initial scan
    await this.scanForOpportunities();

    // Set up interval scanning
    const scanIntervalMs = Number(process.env.SCAN_INTERVAL_MS || '600000');
    this.scanInterval = setInterval(async () => {
      await this.scanForOpportunities();
    }, scanIntervalMs);

    console.log(`✅ Unified Arbitrage Service started with ${scanIntervalMs}ms interval`);
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Unified Arbitrage Service...');
    this.isRunning = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    console.log('✅ Unified Arbitrage Service stopped');
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  // Public method to manually trigger a scan (for API endpoints)
  public async triggerManualScan(): Promise<void> {
    console.log('🔄 [MANUAL TRIGGER] Starting manual scan...');
    await this.scanForOpportunities();
  }

  private async scanForOpportunities(): Promise<void> {
    try {
      console.log('==================================================');
      console.log('📊 [ARBITRAGE SCAN] Starting scan at', new Date().toISOString());
      console.log('==================================================');
      
      // Clear old opportunities before new scan to prevent stale data
      console.log('🧹 Clearing old opportunities from database...');
      await this.db.getArbitrageModel().clearAllOpportunities();
      console.log('✅ Database cleared, starting fresh scan');
      
      // Update ticker data from all exchanges
      console.log('🔄 Updating ticker data from all exchanges...');
      await this.exchangeManager.updateAllTickers();
      
      // Calculate arbitrage opportunities
      const allTickers = this.exchangeManager.getAllTickers();
      let totalTickerCount = 0;
      for (const tickers of allTickers.values()) {
        totalTickerCount += tickers.length;
      }
      console.log(`📈 Retrieved ${allTickers.size} exchanges with ${totalTickerCount} total tickers`);
      
      const opportunities = await this.arbitrageCalculator.calculateArbitrageOpportunities(allTickers);

      console.log(`🔍 Found ${opportunities.length} arbitrage opportunities`);
      
      // Log top opportunities with blockchain data
      if (opportunities.length > 0) {
        console.log('📋 Top opportunities found:');
        opportunities.slice(0, 5).forEach((opp, idx) => {
          const blockchainTag = this.getBlockchainTag(opp.blockchain);
          console.log(`  ${idx + 1}. ${blockchainTag} ${opp.symbol} | ${opp.buyExchange} -> ${opp.sellExchange} | ${opp.profitPercentage.toFixed(2)}% | Blockchain: ${opp.blockchain || 'UNKNOWN'}`);
        });
      }

      if (opportunities.length === 0) {
        console.log('⚠️ [WARNING] No arbitrage opportunities found in this scan');
        console.log('💡 This could mean:');
        console.log('   - No profitable arbitrage exists currently');
        console.log('   - Exchange APIs are not responding');
        console.log('   - Profit thresholds are too high');
        console.log('   - Volume thresholds are too high');
        return;
      }

      // Store opportunities in database (will replace old ones with same timestamp threshold)
      await this.storeOpportunities(opportunities);

      // Log top opportunities with blockchain tags
      for (const opp of opportunities.slice(0, 5)) {
        const blockchainTag = this.getBlockchainTag(opp.blockchain);
        console.log(
          `${blockchainTag} [${opp.symbol}] Buy on ${opp.buyExchange} @ ${opp.buyPrice}, Sell on ${opp.sellExchange} @ ${opp.sellPrice} | Net ${opp.profitPercentage.toFixed(3)}%`
        );
      }

      // Log highest profit opportunity with blockchain tag
      if (opportunities.length > 0) {
        const topOpportunity = opportunities[0];
        const blockchainTag = this.getBlockchainTag(topOpportunity.blockchain);
        console.log(`🏆 ${blockchainTag} Top opportunity: ${topOpportunity.symbol} - ${topOpportunity.profitPercentage.toFixed(2)}% profit (${topOpportunity.buyExchange} → ${topOpportunity.sellExchange})`);
      }

    } catch (error) {
      console.error("❌ Arbitrage scan error:", (error as any).message);
    }
  }

  private async storeOpportunities(opportunities: ArbitrageOpportunity[]): Promise<void> {
    try {
      // Final filtering: Remove opportunities with extreme values that could cause database overflow
      const MAX_DECIMAL_20_8 = 999999999999; // Max for NUMERIC(20,8)
      const MAX_DECIMAL_18_8 = 9999999999; // Max for NUMERIC(18,8)
      
      const filtered = opportunities.filter(opp => {
        // Filter out unrealistic profits (>50% is already filtered, but check for extreme values)
        if (Math.abs(opp.profitPercentage) > MAX_DECIMAL_18_8) {
          console.warn(`🚨 [PRE-DB FILTER] Filtering ${opp.symbol}: profit percentage too extreme: ${opp.profitPercentage}`);
          return false;
        }
        
        // Filter out opportunities with extreme volumes
        if (opp.volume && Math.abs(opp.volume) > MAX_DECIMAL_20_8) {
          console.warn(`🚨 [PRE-DB FILTER] Filtering ${opp.symbol}: volume too extreme: ${opp.volume}`);
          return false;
        }
        
        // Filter out opportunities with extreme prices
        if (Math.abs(opp.buyPrice) > MAX_DECIMAL_20_8 || Math.abs(opp.sellPrice) > MAX_DECIMAL_20_8) {
          console.warn(`🚨 [PRE-DB FILTER] Filtering ${opp.symbol}: price too extreme: buy=${opp.buyPrice}, sell=${opp.sellPrice}`);
          return false;
        }
        
        // Filter out opportunities with extreme profit amounts
        if (Math.abs(opp.profitAmount) > MAX_DECIMAL_20_8) {
          console.warn(`🚨 [PRE-DB FILTER] Filtering ${opp.symbol}: profit amount too extreme: ${opp.profitAmount}`);
          return false;
        }
        
        return true;
      });
      
      if (filtered.length < opportunities.length) {
        console.warn(`⚠️ [PRE-DB FILTER] Filtered out ${opportunities.length - filtered.length} opportunities with extreme values`);
      }
      
      // Log blockchain data for debugging
      const topThree = filtered.slice(0, 3).map(opp => ({
        symbol: opp.symbol,
        blockchain: opp.blockchain,
        profit: opp.profitPercentage.toFixed(2) + '%'
      }));
      console.log('🔍 Top 3 opportunities to store:', JSON.stringify(topThree, null, 2));
      
      if (filtered.length === 0) {
        console.warn('⚠️ [PRE-DB FILTER] No opportunities remaining after filtering');
        return;
      }
      
      await this.db.getArbitrageModel().insert(filtered);
      console.log(`💾 Stored ${filtered.length}/${opportunities.length} opportunities in database with blockchain data`);
      
    } catch (error) {
      console.error('❌ Failed to store opportunities:', error);
    }
  }

  // Method to get recent opportunities (for API endpoints)
  public async getRecentOpportunities(minutes: number = 30): Promise<ArbitrageOpportunity[]> {
    try {
      console.log(`📥 [API] Fetching opportunities from last ${minutes} minutes...`);
      const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(minutes);
      console.log(`📥 [API] Retrieved ${opportunities.length} opportunities from database`);
      
      if (opportunities.length > 0) {
        // Log blockchain data
        const blockchainCount = opportunities.filter(o => o.blockchain).length;
        console.log(`📥 [API] ${blockchainCount}/${opportunities.length} opportunities have blockchain data`);
        console.log(`📥 [API] First: ${opportunities[0].symbol} (${opportunities[0].buyExchange} → ${opportunities[0].sellExchange}) - ${opportunities[0].profitPercentage.toFixed(2)}% - blockchain: ${opportunities[0].blockchain || 'UNKNOWN'}`);
      } else {
        console.log('⚠️ [API] WARNING: No opportunities found in database!');
      }
      
      return opportunities;
    } catch (error) {
      console.error('❌ Failed to get recent opportunities:', error);
      return [];
    }
  }

  // Method to get top opportunities
  public async getTopOpportunities(limit: number = 10): Promise<ArbitrageOpportunity[]> {
    try {
      return await this.db.getArbitrageModel().getTopOpportunities(limit);
    } catch (error) {
      console.error('❌ Failed to get top opportunities:', error);
      return [];
    }
  }

  // Method to get volume-based opportunities
  public async getVolumeBasedOpportunities(minVolume: number = 10000, limit: number = 20): Promise<ArbitrageOpportunity[]> {
    try {
      const model = this.db.getArbitrageModel();
      if ('getVolumeBasedOpportunities' in model) {
        return await (model as any).getVolumeBasedOpportunities(minVolume, limit);
      }
      // Fallback to regular top opportunities if volume filtering not available
      return await this.getTopOpportunities(limit);
    } catch (error) {
      console.error('❌ Failed to get volume-based opportunities:', error);
      return [];
    }
  }

  // Method to get user-specific filtered opportunities
  public async getUserFilteredOpportunities(userId: string, exchanges?: string[], minProfit?: number, maxVolume?: number): Promise<ArbitrageOpportunity[]> {
    try {
      const model = this.db.getArbitrageModel();
      if ('getUserFilteredOpportunities' in model) {
        return await (model as any).getUserFilteredOpportunities(userId, exchanges, minProfit, maxVolume);
      }
      // Fallback to regular top opportunities
      return await this.getTopOpportunities(20);
    } catch (error) {
      console.error('❌ Failed to get user-filtered opportunities:', error);
      return [];
    }
  }

  public getArbitrageCalculator(): ArbitrageCalculator {
    return this.arbitrageCalculator;
  }

  public getExchangeManager(): ExchangeManager {
    return this.exchangeManager;
  }
}
