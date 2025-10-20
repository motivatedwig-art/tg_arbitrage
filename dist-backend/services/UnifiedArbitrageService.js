import { DatabaseManager } from '../database/Database.js';
import { ExchangeManager } from '../exchanges/ExchangeManager.js';
import { ArbitrageCalculator } from '../arbitrage/calculator/ArbitrageCalculator.js';
export class UnifiedArbitrageService {
    constructor() {
        this.isRunning = false;
        this.scanInterval = null;
        this.db = DatabaseManager.getInstance();
        this.exchangeManager = ExchangeManager.getInstance();
        this.arbitrageCalculator = new ArbitrageCalculator(parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'), parseFloat(process.env.MAX_PROFIT_THRESHOLD || '110'), parseFloat(process.env.MIN_VOLUME_THRESHOLD || '1000'));
    }
    static getInstance() {
        if (!UnifiedArbitrageService.instance) {
            UnifiedArbitrageService.instance = new UnifiedArbitrageService();
        }
        return UnifiedArbitrageService.instance;
    }
    async start() {
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
    stop() {
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
    isActive() {
        return this.isRunning;
    }
    async scanForOpportunities() {
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
            const opportunities = this.arbitrageCalculator.calculateArbitrageOpportunities(allTickers);
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
                console.log(`[${opp.symbol}] Buy on ${opp.buyExchange} @ ${opp.buyPrice}, Sell on ${opp.sellExchange} @ ${opp.sellPrice} | Net ${opp.profitPercentage.toFixed(3)}%`);
            }
            // Log highest profit opportunity
            if (opportunities.length > 0) {
                const topOpportunity = opportunities[0];
                console.log(`🏆 Top opportunity: ${topOpportunity.symbol} - ${topOpportunity.profitPercentage.toFixed(2)}% profit (${topOpportunity.buyExchange} → ${topOpportunity.sellExchange})`);
            }
        }
        catch (error) {
            console.error("❌ Arbitrage scan error:", error.message);
        }
    }
    async storeOpportunities(opportunities) {
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
        }
        catch (error) {
            console.error('❌ Failed to store opportunities:', error);
        }
    }
    // Method to get recent opportunities (for API endpoints)
    async getRecentOpportunities(minutes = 30) {
        try {
            console.log(`📥 [API] Fetching opportunities from last ${minutes} minutes...`);
            const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(minutes);
            console.log(`📥 [API] Retrieved ${opportunities.length} opportunities from database`);
            if (opportunities.length > 0) {
                // Log blockchain data
                const blockchainCount = opportunities.filter(o => o.blockchain).length;
                console.log(`📥 [API] ${blockchainCount}/${opportunities.length} opportunities have blockchain data`);
                console.log(`📥 [API] Sample: ${opportunities[0].symbol} - blockchain: ${opportunities[0].blockchain || 'MISSING'}`);
            }
            else {
                console.log('⚠️ [API] WARNING: No opportunities found in database!');
            }
            return opportunities;
        }
        catch (error) {
            console.error('❌ Failed to get recent opportunities:', error);
            return [];
        }
    }
    // Method to get top opportunities
    async getTopOpportunities(limit = 10) {
        try {
            return await this.db.getArbitrageModel().getTopOpportunities(limit);
        }
        catch (error) {
            console.error('❌ Failed to get top opportunities:', error);
            return [];
        }
    }
    // Method to get volume-based opportunities
    async getVolumeBasedOpportunities(minVolume = 10000, limit = 20) {
        try {
            const model = this.db.getArbitrageModel();
            if ('getVolumeBasedOpportunities' in model) {
                return await model.getVolumeBasedOpportunities(minVolume, limit);
            }
            // Fallback to regular top opportunities if volume filtering not available
            return await this.getTopOpportunities(limit);
        }
        catch (error) {
            console.error('❌ Failed to get volume-based opportunities:', error);
            return [];
        }
    }
    // Method to get user-specific filtered opportunities
    async getUserFilteredOpportunities(userId, exchanges, minProfit, maxVolume) {
        try {
            const model = this.db.getArbitrageModel();
            if ('getUserFilteredOpportunities' in model) {
                return await model.getUserFilteredOpportunities(userId, exchanges, minProfit, maxVolume);
            }
            // Fallback to regular top opportunities
            return await this.getTopOpportunities(20);
        }
        catch (error) {
            console.error('❌ Failed to get user-filtered opportunities:', error);
            return [];
        }
    }
    getArbitrageCalculator() {
        return this.arbitrageCalculator;
    }
    getExchangeManager() {
        return this.exchangeManager;
    }
}
//# sourceMappingURL=UnifiedArbitrageService.js.map