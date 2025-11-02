import dotenv from 'dotenv';
import { CryptoArbitrageBot } from './bot/TelegramBot.js';
import { UnifiedArbitrageService } from './services/UnifiedArbitrageService.js';
import { DatabaseManager } from './database/Database.js';
import { WebAppServer } from './webapp/server.js';
import { DexScreenerService } from './services/DexScreenerService.js';
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
            console.log('🔧 Initializing components...');
            // Initialize database first (required for web app)
            this.db = DatabaseManager.getInstance();
            console.log('✅ Database manager initialized');
            // Initialize web app server (required for health checks)
            this.webAppServer = new WebAppServer();
            console.log('✅ Web app server initialized');
            // Initialize arbitrage service
            this.arbitrageService = UnifiedArbitrageService.getInstance();
            console.log('✅ Arbitrage service initialized');
            // Initialize DexScreener service with database cache
            const dexScreenerService = DexScreenerService.getInstance();
            dexScreenerService.setDatabase(this.db);
            console.log('✅ DexScreener service initialized with database cache');
            // Initialize Telegram bot (optional - app can run without it)
            const botToken = process.env.TELEGRAM_BOT_TOKEN;
            if (botToken) {
                this.bot = new CryptoArbitrageBot(botToken);
                console.log('✅ Telegram bot initialized');
            }
            else {
                console.warn('⚠️ TELEGRAM_BOT_TOKEN not found - Telegram bot will be disabled');
                // Create a dummy bot instance that won't be used
                this.bot = null;
            }
            this.updateInterval = parseInt(process.env.UPDATE_INTERVAL || '600000');
            console.log('✅ All components initialized successfully');
        }
        catch (error) {
            console.error('❌ Failed to initialize components:', error);
            console.error('   Error details:', error instanceof Error ? error.stack : error);
            throw error;
        }
    }
    async start() {
        // CRITICAL: Start web server FIRST and don't let it fail the app
        console.log('🌐 Starting web app server (required for health checks)...');
        try {
            await this.webAppServer.start(parseInt(process.env.PORT || '3000'));
            console.log('✅ Web app server started successfully - health check endpoint available');
        }
        catch (webError) {
            console.error('❌ CRITICAL: Web app server failed to start:', webError);
            console.error('   This is required for Railway health checks - exiting');
            process.exit(1);
        }
        // Start other services asynchronously (non-blocking)
        console.log('🚀 Starting Crypto Arbitrage Bot services (non-blocking)...');
        // Start the unified arbitrage service (non-blocking)
        console.log('🔌 Starting unified arbitrage service...');
        this.arbitrageService.start().catch((error) => {
            console.error('⚠️ Arbitrage service failed to start:', error.message);
            console.log('🌐 Web application will continue without arbitrage scanning');
            console.log('   You can manually trigger a scan via API if needed');
        });
        // Start the Telegram bot (non-blocking with graceful error handling)
        if (process.env.DISABLE_TELEGRAM_BOT === 'true' || !process.env.TELEGRAM_BOT_TOKEN) {
            if (process.env.DISABLE_TELEGRAM_BOT === 'true') {
                console.log('🚫 Telegram bot disabled via DISABLE_TELEGRAM_BOT environment variable');
            }
            else {
                console.log('🚫 Telegram bot disabled - TELEGRAM_BOT_TOKEN not found');
            }
            console.log('🌐 Web application will run without Telegram bot');
        }
        else {
            this.bot.start().catch((botError) => {
                if (botError.response?.body?.error_code === 409) {
                    console.warn('⚠️ Telegram bot conflict - another instance is running');
                    console.log('🔄 This is normal during Railway deployments - web app will continue');
                }
                else {
                    console.error('⚠️ Telegram bot failed to start:', botError.message);
                }
                console.log('🌐 Web application will continue to function normally');
            });
        }
        // Schedule cleanup tasks (non-blocking)
        try {
            this.scheduleCleanup();
        }
        catch (error) {
            console.warn('⚠️ Failed to schedule cleanup tasks:', error);
        }
        // Start blockchain scanner job if enabled (non-blocking)
        if (process.env.BLOCKCHAIN_SCANNING_ENABLED !== 'false') {
            import('./jobs/BlockchainScannerJob.js').then(({ BlockchainScannerJob }) => {
                try {
                    BlockchainScannerJob.schedule();
                    // Run initial scan (non-blocking)
                    BlockchainScannerJob.runNow().catch((err) => {
                        console.warn('⚠️ Initial blockchain scan failed:', err.message);
                    });
                }
                catch (error) {
                    console.warn('⚠️ Failed to start blockchain scanner job:', error);
                }
            }).catch((error) => {
                console.warn('⚠️ Failed to load blockchain scanner job:', error);
            });
        }
        console.log('✅ Application startup sequence completed!');
        console.log('🌐 Web server is ready - health check endpoint active at /api/health');
        console.log(`📊 Update interval: ${this.updateInterval / 1000} seconds`);
        // Log thresholds (with error handling)
        try {
            console.log(`💰 Min profit threshold: ${this.arbitrageService.getArbitrageCalculator().getMinProfitThreshold()}%`);
            console.log(`🚨 Max profit threshold: ${this.arbitrageService.getArbitrageCalculator().getMaxProfitThreshold()}%`);
            console.log(`📈 Min volume threshold: ${this.arbitrageService.getArbitrageCalculator().getMinVolumeThreshold()}`);
        }
        catch (error) {
            console.warn('⚠️ Could not log arbitrage thresholds:', error);
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
            if (this.bot && process.env.TELEGRAM_BOT_TOKEN) {
                await this.bot.stop();
            }
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