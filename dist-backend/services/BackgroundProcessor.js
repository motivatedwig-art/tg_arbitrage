import dotenv from 'dotenv';
import { DatabaseManagerPostgres } from '../database/DatabasePostgres.js';
import { ExchangeManager } from '../exchanges/ExchangeManager.js';
import { ArbitrageCalculator } from '../arbitrage/calculator/ArbitrageCalculator.js';
dotenv.config();
export class BackgroundProcessor {
    constructor() {
        this.isProcessing = false;
        this.db = DatabaseManagerPostgres.getInstance();
        this.exchangeManager = ExchangeManager.getInstance();
        this.arbitrageCalculator = new ArbitrageCalculator(parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'), parseFloat(process.env.MAX_PROFIT_THRESHOLD || '110'));
    }
    async start() {
        try {
            console.log('🚀 Starting Background Arbitrage Processor...');
            // Initialize database
            await this.db.init();
            // Initialize exchanges
            console.log('🔌 Initializing exchanges...');
            await this.exchangeManager.initializeExchanges();
            // Start processing loop
            this.startProcessingLoop();
            // Start healthcheck (for Railway monitoring)
            this.startHealthcheck();
            console.log('✅ Background Processor is running!');
            console.log(`📊 Processing every ${process.env.UPDATE_INTERVAL || '30000'}ms`);
            console.log(`💰 Min profit threshold: ${this.arbitrageCalculator.getMinProfitThreshold()}%`);
        }
        catch (error) {
            console.error('❌ Failed to start processor:', error);
            process.exit(1);
        }
    }
    startProcessingLoop() {
        const interval = parseInt(process.env.UPDATE_INTERVAL || '30000');
        setInterval(async () => {
            if (this.isProcessing) {
                console.log('⏳ Skipping - previous process still running');
                return;
            }
            try {
                this.isProcessing = true;
                await this.processArbitrageData();
            }
            catch (error) {
                console.error('❌ Error in processing loop:', error);
            }
            finally {
                this.isProcessing = false;
            }
        }, interval);
    }
    startHealthcheck() {
        // Log health status every 5 minutes
        this.healthcheckInterval = setInterval(() => {
            const memoryUsage = process.memoryUsage();
            console.log('💚 Health Check:', {
                timestamp: new Date().toISOString(),
                memory: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
                uptime: Math.round(process.uptime()) + 's',
                processing: this.isProcessing
            });
        }, 5 * 60 * 1000);
    }
    async processArbitrageData() {
        const startTime = Date.now();
        console.log('📊 Processing arbitrage data...');
        try {
            // Update ticker data from all exchanges
            await this.exchangeManager.updateAllTickers();
            // Calculate arbitrage opportunities
            const allTickers = this.exchangeManager.getAllTickers();
            const opportunities = this.arbitrageCalculator.calculateArbitrageOpportunities(allTickers);
            console.log(`🔍 Found ${opportunities.length} arbitrage opportunities`);
            if (opportunities.length > 0) {
                // Store opportunities in database
                await this.db.insertOpportunities(opportunities);
                // Filter high-profit opportunities for summary
                const highProfitOpportunities = opportunities.filter(opp => opp.profitPercentage >= 2.0 &&
                    opp.profitPercentage <= this.arbitrageCalculator.getMaxProfitThreshold());
                if (highProfitOpportunities.length > 0) {
                    console.log(`📈 Found ${highProfitOpportunities.length} high-profit opportunities (>=2%)`);
                    // Log top 3 opportunities
                    highProfitOpportunities.slice(0, 3).forEach((opp, index) => {
                        console.log(`🏆 #${index + 1}: ${opp.symbol} - ${opp.profitPercentage.toFixed(2)}% profit (${opp.buyExchange} → ${opp.sellExchange})`);
                    });
                }
                else {
                    // Log top opportunity even if not high-profit
                    const topOpportunity = opportunities[0];
                    console.log(`🏆 Top: ${topOpportunity.symbol} - ${topOpportunity.profitPercentage.toFixed(2)}% profit`);
                }
                const processingTime = Date.now() - startTime;
                console.log(`✅ Processed ${opportunities.length} opportunities in ${processingTime}ms`);
            }
            else {
                console.log('ℹ️ No arbitrage opportunities found');
            }
        }
        catch (error) {
            console.error('❌ Error processing arbitrage data:', error);
            // Log detailed error for debugging
            if (error instanceof Error) {
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack
                });
            }
        }
    }
    async stop() {
        console.log('🛑 Stopping Background Processor...');
        try {
            // Clear intervals
            if (this.healthcheckInterval) {
                clearInterval(this.healthcheckInterval);
            }
            // Disconnect exchanges
            await this.exchangeManager.disconnect();
            // Close database connection
            await this.db.close();
            console.log('✅ Background Processor stopped successfully');
        }
        catch (error) {
            console.error('Error stopping processor:', error);
        }
    }
    getStatus() {
        const memoryUsage = process.memoryUsage();
        return {
            status: 'running',
            uptime: process.uptime(),
            memory: {
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
            },
            processing: this.isProcessing,
            timestamp: new Date().toISOString()
        };
    }
}
//# sourceMappingURL=BackgroundProcessor.js.map