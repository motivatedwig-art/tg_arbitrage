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
      console.log(`📈 Retrieved ${Object.keys(allTickers).length} tickers from exchanges`);
      
      const opportunities = await this.arbitrageCalculator.calculateArbitrageOpportunities(allTickers);

      console.log(`🔍 Found ${opportunities.length} arbitrage opportunities`);
      
      // Log sample of opportunities with blockchain data
      if (opportunities.length > 0) {
        console.log('📋 Sample opportunities:');
        opportunities.slice(0, 3).forEach((opp, idx) => {
          console.log(`  ${idx + 1}. ${opp.symbol} | ${opp.buyExchange} -> ${opp.sellExchange} | ${opp.profitPercentage.toFixed(2)}% | Blockchain: ${opp.blockchain || 'MISSING'}`);
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

      // Log top opportunities
      for (const opp of opportunities.slice(0, 5)) {
        console.log(
          `[${opp.symbol}] Buy on ${opp.buyExchange} @ ${opp.buyPrice}, Sell on ${opp.sellExchange} @ ${opp.sellPrice} | Net ${opp.profitPercentage.toFixed(3)}%`
        );
      }

      // Log highest profit opportunity
      if (opportunities.length > 0) {
        const topOpportunity = opportunities[0];
        console.log(`🏆 Top opportunity: ${topOpportunity.symbol} - ${topOpportunity.profitPercentage.toFixed(2)}% profit (${topOpportunity.buyExchange} → ${topOpportunity.sellExchange})`);
      }

    } catch (error) {
      console.error("❌ Arbitrage scan error:", (error as any).message);
    }
  }

  private async storeOpportunities(opportunities: ArbitrageOpportunity[]): Promise<void> {
    try {
      // Log blockchain data for debugging
      const blockchainSample = opportunities.slice(0, 3).map(opp => ({
        symbol: opp.symbol,
        blockchain: opp.blockchain,
        profit: opp.profitPercentage
      }));
      console.log('🔍 Blockchain data sample:', JSON.stringify(blockchainSample, null, 2));
      
      await this.db.getArbitrageModel().insert(opportunities);
      console.log(`💾 Stored ${opportunities.length} opportunities in database with blockchain data`);
      
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
        console.log(`📥 [API] Sample: ${opportunities[0].symbol} - blockchain: ${opportunities[0].blockchain || 'MISSING'}`);
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
