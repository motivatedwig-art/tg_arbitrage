import { DatabaseManager } from '../database/Database.js';
import { ExchangeManager } from '../exchanges/ExchangeManager.js';
import { ArbitrageCalculator } from '../arbitrage/calculator/ArbitrageCalculator.js';
export class UnifiedArbitrageService {
    constructor() {
        this.isRunning = false;
        this.scanInterval = null;
        this.db = DatabaseManager.getInstance();
        this.exchangeManager = ExchangeManager.getInstance();
        this.arbitrageCalculator = new ArbitrageCalculator(parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'), parseFloat(process.env.MAX_PROFIT_THRESHOLD || '110'), parseFloat(process.env.MIN_VOLUME_THRESHOLD || '100') // Lower threshold to find more opportunities
        );
    }
    // Helper function to get 3-letter blockchain identifier
    getBlockchainTag(blockchain) {
        if (!blockchain)
            return '[???]';
        const blockchainMap = {
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
    // Public method to manually trigger a scan (for API endpoints)
    async triggerManualScan() {
        console.log('🔄 [MANUAL TRIGGER] Starting manual scan...');
        await this.scanForOpportunities();
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
                console.log(`${blockchainTag} [${opp.symbol}] Buy on ${opp.buyExchange} @ ${opp.buyPrice}, Sell on ${opp.sellExchange} @ ${opp.sellPrice} | Net ${opp.profitPercentage.toFixed(3)}%`);
            }
            // Log highest profit opportunity with blockchain tag
            if (opportunities.length > 0) {
                const topOpportunity = opportunities[0];
                const blockchainTag = this.getBlockchainTag(topOpportunity.blockchain);
                console.log(`🏆 ${blockchainTag} Top opportunity: ${topOpportunity.symbol} - ${topOpportunity.profitPercentage.toFixed(2)}% profit (${topOpportunity.buyExchange} → ${topOpportunity.sellExchange})`);
            }
        }
        catch (error) {
            console.error("❌ Arbitrage scan error:", error.message);
        }
    }
    async storeOpportunities(opportunities) {
        try {
            // Log blockchain data for debugging
            const topThree = opportunities.slice(0, 3).map(opp => ({
                symbol: opp.symbol,
                blockchain: opp.blockchain,
                profit: opp.profitPercentage.toFixed(2) + '%'
            }));
            console.log('🔍 Top 3 opportunities to store:', JSON.stringify(topThree, null, 2));
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
                console.log(`📥 [API] First: ${opportunities[0].symbol} (${opportunities[0].buyExchange} → ${opportunities[0].sellExchange}) - ${opportunities[0].profitPercentage.toFixed(2)}% - blockchain: ${opportunities[0].blockchain || 'UNKNOWN'}`);
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