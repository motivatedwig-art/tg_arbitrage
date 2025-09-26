import dotenv from 'dotenv';
import { CryptoArbitrageBot } from './bot/TelegramBot.js';
import { ExchangeManager } from './exchanges/ExchangeManager.js';
import { ArbitrageCalculator } from './arbitrage/calculator/ArbitrageCalculator.js';
import { DatabaseManager } from './database/Database.js';
import { WebAppServer } from './webapp/server.js';
import cron from 'node-cron';
// Load environment variables
dotenv.config();
class CryptoArbitrageApp {
    constructor() {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            throw new Error('TELEGRAM_BOT_TOKEN is required');
        }
        this.bot = new CryptoArbitrageBot(botToken);
        this.exchangeManager = ExchangeManager.getInstance();
        this.arbitrageCalculator = new ArbitrageCalculator(parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.5'), parseFloat(process.env.MAX_PROFIT_THRESHOLD || '110'));
        this.db = DatabaseManager.getInstance();
        this.webAppServer = new WebAppServer();
        this.updateInterval = parseInt(process.env.UPDATE_INTERVAL || '30000');
    }
    async start() {
        try {
            console.log('🚀 Starting Crypto Arbitrage Bot...');
            // Start the Telegram bot
            await this.bot.start();
            // Initialize exchanges
            console.log('🔌 Initializing exchanges...');
            await this.exchangeManager.initializeExchanges();
            // Start web app server
            console.log('🌐 Starting web app server...');
            await this.webAppServer.start(parseInt(process.env.PORT || '3000'));
            // Schedule regular updates
            this.scheduleUpdates();
            // Perform initial data update
            await this.updateArbitrageData();
            console.log('✅ Crypto Arbitrage Bot is running!');
            console.log(`📊 Update interval: ${this.updateInterval / 1000} seconds`);
            console.log(`💰 Min profit threshold: ${this.arbitrageCalculator.getMinProfitThreshold()}%`);
            console.log(`🚨 Max profit threshold: ${this.arbitrageCalculator.getMaxProfitThreshold()}%`);
        }
        catch (error) {
            console.error('❌ Failed to start application:', error);
            process.exit(1);
        }
    }
    scheduleUpdates() {
        // Update every 30 seconds (or as configured)
        const intervalSeconds = Math.max(30, this.updateInterval / 1000);
        const cronExpression = `*/${intervalSeconds} * * * * *`;
        console.log(`⏰ Scheduling updates every ${intervalSeconds} seconds`);
        cron.schedule(cronExpression, async () => {
            try {
                await this.updateArbitrageData();
            }
            catch (error) {
                console.error('Error in scheduled update:', error);
            }
        });
        // Cleanup old data every hour
        cron.schedule('0 * * * *', async () => {
            try {
                await this.db.getArbitrageModel().cleanupOldData(24);
                console.log('🧹 Cleaned up old arbitrage data');
            }
            catch (error) {
                console.error('Error cleaning up data:', error);
            }
        });
    }
    async updateArbitrageData() {
        try {
            console.log('📊 Updating arbitrage data...');
            // Update ticker data from all exchanges
            await this.exchangeManager.updateAllTickers();
            // Calculate arbitrage opportunities
            const allTickers = this.exchangeManager.getAllTickers();
            const opportunities = this.arbitrageCalculator.calculateArbitrageOpportunities(allTickers);
            console.log(`🔍 Found ${opportunities.length} arbitrage opportunities`);
            if (opportunities.length > 0) {
                // Store opportunities in database
                await this.db.getArbitrageModel().insert(opportunities);
                // Collect high-profit deals for summary (respecting max threshold)
                const highProfitOpportunities = opportunities.filter(opp => opp.profitPercentage >= 2.0 && opp.profitPercentage <= this.arbitrageCalculator.getMaxProfitThreshold());
                for (const opportunity of highProfitOpportunities) {
                    this.bot.collectHighProfitDeal(opportunity);
                }
                if (highProfitOpportunities.length > 0) {
                    console.log(`📊 Collected ${highProfitOpportunities.length} high-profit deals for summary`);
                }
                // Log top opportunity
                const topOpportunity = opportunities[0];
                console.log(`🏆 Top opportunity: ${topOpportunity.symbol} - ${topOpportunity.profitPercentage.toFixed(2)}% profit (${topOpportunity.buyExchange} → ${topOpportunity.sellExchange})`);
            }
        }
        catch (error) {
            console.error('Error updating arbitrage data:', error);
            await this.bot.sendSystemNotification(`System error: ${error instanceof Error ? error.message : 'Unknown error'}`, true);
        }
    }
    async stop() {
        console.log('🛑 Stopping Crypto Arbitrage Bot...');
        try {
            await this.bot.stop();
            await this.webAppServer.stop();
            await this.exchangeManager.disconnect();
            await this.db.close();
            console.log('✅ Application stopped successfully');
        }
        catch (error) {
            console.error('Error stopping application:', error);
        }
    }
}
// Handle process termination
const app = new CryptoArbitrageApp();
process.on('SIGINT', async () => {
    console.log('\n📡 Received SIGINT signal');
    await app.stop();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('\n📡 Received SIGTERM signal');
    await app.stop();
    process.exit(0);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
// Start the application
app.start().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map