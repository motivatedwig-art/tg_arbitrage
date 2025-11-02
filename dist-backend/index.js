import dotenv from 'dotenv';
import { CryptoArbitrageBot } from './bot/TelegramBot.js';
import { UnifiedArbitrageService } from './services/UnifiedArbitrageService.js';
import { DatabaseManager } from './database/Database.js';
import { WebAppServer } from './webapp/server.js';
import cron from 'node-cron';
// Load environment variables
dotenv.config();
// Validate environment
if (process.env.NODE_ENV === 'production') {
    process.env.USE_MOCK_DATA = 'false'; // Force disable mock data in production
}
console.log('🔧 Configuration:');
console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`  - Mock Data: ${process.env.USE_MOCK_DATA === 'true' ? 'ENABLED' : 'DISABLED'}`);
console.log(`  - Port: ${process.env.PORT || 3000}`);
class CryptoArbitrageApp {
    constructor() {
        try {
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            if (!botToken) {
                throw new Error('TELEGRAM_BOT_TOKEN is required');
            }
            console.log('🔧 Initializing components...');
            this.bot = new CryptoArbitrageBot(botToken);
            console.log('✅ Telegram bot initialized');
            this.arbitrageService = UnifiedArbitrageService.getInstance();
            console.log('✅ Arbitrage service initialized');
            this.db = DatabaseManager.getInstance();
            console.log('✅ Database manager initialized');
            this.webAppServer = new WebAppServer();
            console.log('✅ Web app server initialized');
            this.updateInterval = parseInt(process.env.UPDATE_INTERVAL || '600000');
            console.log('✅ All components initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize components:', error);
            throw error;
        }
    }
    async start() {
        try {
            console.log('🚀 Starting Crypto Arbitrage Bot...');
            // Start web app server first (required for health checks)
            console.log('🌐 Starting web app server...');
            try {
                await this.webAppServer.start(parseInt(process.env.PORT || '3000'));
                console.log('✅ Web app server started successfully');
            }
            catch (webError) {
                console.error('❌ Web app server failed to start:', webError);
                throw webError; // Don't continue if web server fails
            }
            // Start the unified arbitrage service
            console.log('🔌 Starting unified arbitrage service...');
            await this.arbitrageService.start();
            // Start the Telegram bot (non-blocking with graceful error handling)
            if (process.env.DISABLE_TELEGRAM_BOT === 'true') {
                console.log('🚫 Telegram bot disabled via DISABLE_TELEGRAM_BOT environment variable');
                console.log('🌐 Web application will run without Telegram bot');
            }
            else {
                try {
                    await this.bot.start();
                    console.log('✅ Telegram bot started successfully');
                }
                catch (botError) {
                    if (botError.response?.body?.error_code === 409) {
                        console.warn('⚠️ Telegram bot conflict - another instance is running');
                        console.log('🔄 This is normal during Railway deployments - web app will continue');
                    }
                    else {
                        console.error('⚠️ Telegram bot failed to start:', botError.message);
                    }
                    console.log('🌐 Web application will continue to function normally');
                }
            }
            // Schedule cleanup tasks
            this.scheduleCleanup();
            // Start blockchain scanner job if enabled
            if (process.env.BLOCKCHAIN_SCANNING_ENABLED !== 'false') {
                try {
                    const { BlockchainScannerJob } = await import('./jobs/BlockchainScannerJob.js');
                    BlockchainScannerJob.schedule();
                    // Run initial scan (non-blocking)
                    BlockchainScannerJob.runNow().catch(err => {
                        console.warn('⚠️ Initial blockchain scan failed:', err.message);
                    });
                }
                catch (error) {
                    console.warn('⚠️ Failed to start blockchain scanner job:', error);
                    // Don't fail the entire app if scanner fails
                }
            }
            console.log('✅ Crypto Arbitrage Bot is running!');
            console.log(`📊 Update interval: ${this.updateInterval / 1000} seconds`);
            console.log(`💰 Min profit threshold: ${this.arbitrageService.getArbitrageCalculator().getMinProfitThreshold()}%`);
            console.log(`🚨 Max profit threshold: ${this.arbitrageService.getArbitrageCalculator().getMaxProfitThreshold()}%`);
            console.log(`📈 Min volume threshold: ${this.arbitrageService.getArbitrageCalculator().getMinVolumeThreshold()}`);
        }
        catch (error) {
            console.error('❌ Failed to start application:', error);
            process.exit(1);
        }
    }
    scheduleCleanup() {
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
    async stop() {
        console.log('🛑 Stopping Crypto Arbitrage Bot...');
        try {
            this.arbitrageService.stop();
            await this.bot.stop();
            await this.webAppServer.stop();
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