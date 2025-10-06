import TelegramBot from 'node-telegram-bot-api';
import { DatabaseManager } from '../database/Database.js';
import { CommandHandler } from './handlers/CommandHandler.js';
import { CallbackHandler } from './handlers/CallbackHandler.js';
import { i18n } from '../utils/i18n.js';
export class CryptoArbitrageBot {
    constructor(token) {
        this.isRunning = false;
        this.summaryInterval = null;
        this.highProfitDeals = [];
        this.setupEnvironmentLogging();
        // Initialize bot without polling to prevent conflicts
        this.bot = new TelegramBot(token, { polling: false });
        this.db = DatabaseManager.getInstance();
        this.commandHandler = new CommandHandler(this.bot);
        this.callbackHandler = new CallbackHandler(this.bot);
        this.setupErrorHandling();
    }
    setupEnvironmentLogging() {
        console.log('=== BOT INITIALIZATION ===');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('Mock Data Enabled:', process.env.USE_MOCK_DATA === 'true');
        console.log('Webapp URL:', process.env.WEBAPP_URL);
        console.log('Exchange APIs configured:', {
            binance: !!process.env.BINANCE_API_KEY,
            okx: !!process.env.OKX_API_KEY,
            bybit: !!process.env.BYBIT_API_KEY,
            bitget: !!process.env.BITGET_API_KEY,
            mexc: !!process.env.MEXC_API_KEY,
            bingx: !!process.env.BINGX_API_KEY,
            gateio: !!process.env.GATE_IO_API_KEY,
            kucoin: !!process.env.KUCOIN_API_KEY,
        });
        console.log('========================');
    }
    async start() {
        try {
            // Initialize i18n
            await i18n.init();
            console.log('i18n initialized');
            // Initialize database
            await this.db.init();
            console.log('Database initialized');
            // Register command and callback handlers
            this.commandHandler.registerCommands();
            this.callbackHandler.registerCallbacks();
            // Set up bot commands menu
            await this.setupBotCommands();
            // Start polling with conflict handling
            await this.startPolling();
            this.isRunning = true;
            console.log('🚀 Crypto Arbitrage Bot started successfully!');
            // Start the summary interval (every 30 minutes)
            this.startSummaryInterval();
            // Get bot info
            const botInfo = await this.bot.getMe();
            console.log(`Bot username: @${botInfo.username}`);
        }
        catch (error) {
            console.error('Failed to start bot:', error);
            throw error;
        }
    }
    async startPolling() {
        try {
            console.log('🔄 Starting Telegram bot polling...');
            // Start polling with error handling
            this.bot.startPolling({
                polling: {
                    interval: 1000,
                    autoStart: false,
                    params: {
                        timeout: 10
                    }
                }
            });
            console.log('✅ Telegram bot polling started successfully');
        }
        catch (error) {
            if (error.response?.body?.error_code === 409) {
                console.warn('⚠️ Telegram bot conflict detected - another instance is running');
                console.log('🔄 This is normal during Railway deployments - bot will retry automatically');
                // Don't throw error, just log it - the bot can still function for web app
                return;
            }
            console.error('❌ Failed to start Telegram bot polling:', error);
            throw error;
        }
    }
    async stop() {
        if (this.isRunning) {
            this.bot.stopPolling();
            if (this.summaryInterval) {
                clearInterval(this.summaryInterval);
                this.summaryInterval = null;
            }
            await this.db.close();
            this.isRunning = false;
            console.log('Bot stopped');
        }
    }
    setupErrorHandling() {
        this.bot.on('error', (error) => {
            console.error('Bot error:', error);
        });
        this.bot.on('polling_error', (error) => {
            console.error('Polling error:', error);
        });
        // Handle unknown messages (only non-command messages)
        this.bot.on('message', (msg) => {
            // Only handle non-command text messages
            if (!msg.text || msg.text.startsWith('/'))
                return;
            // Handle non-command messages
            this.handleUnknownMessage(msg);
        });
        // Add debug logging for all messages
        this.bot.on('message', (msg) => {
            console.log(`📨 Received message: ${msg.text} from user ${msg.from?.id}`);
        });
    }
    async handleUnknownMessage(msg) {
        try {
            const user = await this.db.getUserModel().findByTelegramId(msg.from.id);
            const lng = user?.preferences.language || 'en';
            await this.bot.sendMessage(msg.chat.id, i18n.t('commands.unknown_command', lng));
        }
        catch (error) {
            console.error('Error handling unknown message:', error);
        }
    }
    async setupBotCommands() {
        const commands = [
            { command: 'start', description: 'Start the bot' },
            { command: 'help', description: 'Show help information' },
            { command: 'status', description: 'Show system status' },
            { command: 'settings', description: 'Configure settings' },
            { command: 'language', description: 'Change language' },
            { command: 'top', description: 'Show top opportunities' },
            { command: 'subscribe', description: 'Toggle notifications' },
            { command: 'webapp', description: 'Open web application' },
            { command: 'stats', description: 'Show statistics' }
        ];
        try {
            await this.bot.setMyCommands(commands);
            console.log('Bot commands menu set up successfully');
        }
        catch (error) {
            console.error('Failed to set up bot commands:', error);
        }
    }
    // Method to collect high-profit deals for summary
    collectHighProfitDeal(opportunity) {
        if (opportunity.profitPercentage < 2.0)
            return; // Only collect deals with >2% profit
        if (opportunity.profitPercentage > 110) {
            console.log(`🚨 Rejected unrealistic deal: ${opportunity.symbol} - ${opportunity.profitPercentage.toFixed(2)}% profit (${opportunity.buyExchange} → ${opportunity.sellExchange})`);
            return; // Safety check: reject deals >110% profit
        }
        this.highProfitDeals.push(opportunity);
        console.log(`Collected high profit deal: ${opportunity.symbol} - ${opportunity.profitPercentage.toFixed(2)}%`);
    }
    // Start the 30-minute summary interval
    startSummaryInterval() {
        // Send summary every 30 minutes (30 * 60 * 1000 ms)
        this.summaryInterval = setInterval(async () => {
            await this.sendProfitSummary();
        }, 30 * 60 * 1000);
        console.log('Summary interval started - summaries will be sent every 30 minutes');
    }
    // Method to send profit summary to subscribed users
    async sendProfitSummary() {
        try {
            const users = await this.db.getUserModel().getAllActiveUsers();
            const subscribedUsers = users.filter(user => user.preferences.notifications);
            if (subscribedUsers.length === 0) {
                this.highProfitDeals = []; // Clear the deals array
                return;
            }
            const dealCount = this.highProfitDeals.length;
            for (const user of subscribedUsers) {
                try {
                    let message;
                    if (dealCount === 0) {
                        message = i18n.t('notifications.no_high_profit_deals', user.preferences.language);
                    }
                    else {
                        const avgProfit = this.highProfitDeals.reduce((sum, deal) => sum + deal.profitPercentage, 0) / dealCount;
                        const maxProfit = Math.max(...this.highProfitDeals.map(deal => deal.profitPercentage));
                        message = i18n.formatMessage(i18n.t('notifications.profit_summary', user.preferences.language), {
                            count: dealCount.toString(),
                            avgProfit: avgProfit.toFixed(2),
                            maxProfit: maxProfit.toFixed(2)
                        });
                    }
                    await this.bot.sendMessage(user.telegramId, message, {
                        parse_mode: 'HTML'
                    });
                }
                catch (error) {
                    console.error(`Failed to send summary to user ${user.telegramId}:`, error);
                }
            }
            // Clear the deals array after sending summary
            this.highProfitDeals = [];
            console.log(`Sent profit summary to ${subscribedUsers.length} users. Deal count: ${dealCount}`);
        }
        catch (error) {
            console.error('Error sending profit summary:', error);
        }
    }
    // Method to send system notifications
    async sendSystemNotification(message, isError = false) {
        try {
            const users = await this.db.getUserModel().getAllActiveUsers();
            const subscribedUsers = users.filter(user => user.preferences.notifications);
            for (const user of subscribedUsers) {
                try {
                    const emoji = isError ? '⚠️' : 'ℹ️';
                    const notification = `${emoji} ${message}`;
                    await this.bot.sendMessage(user.telegramId, notification);
                }
                catch (error) {
                    console.error(`Failed to send notification to user ${user.telegramId}:`, error);
                }
            }
        }
        catch (error) {
            console.error('Error sending system notifications:', error);
        }
    }
    getBot() {
        return this.bot;
    }
    isRunningBot() {
        return this.isRunning;
    }
}
//# sourceMappingURL=TelegramBot.js.map