import TelegramBot from 'node-telegram-bot-api';
import { DatabaseManager } from '../database/Database.js';
import { CommandHandler } from './handlers/CommandHandler.js';
import { CallbackHandler } from './handlers/CallbackHandler.js';
import { ClaudeCommandHandler } from './handlers/ClaudeCommandHandler.js';
import { i18n } from '../utils/i18n.js';
import { config } from '../config/environment.js';
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
        this.claudeHandler = new ClaudeCommandHandler(this.bot);
        this.setupErrorHandling();
    }
    setupEnvironmentLogging() {
        console.log('=== BOT INITIALIZATION ===');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('Mock Data Enabled:', process.env.USE_MOCK_DATA === 'true');
        console.log('Webapp URL:', config.webappUrl);
        console.log('Exchange APIs configured:', {
            binance: !!process.env.BINANCE_API_KEY,
            okx: !!process.env.OKX_API_KEY,
            bybit: !!process.env.BYBIT_API_KEY,
            mexc: !!process.env.MEXC_API_KEY,
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
            this.claudeHandler.registerCommands();
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
        // Set up commands in both languages
        const commands = [
            { command: 'start', description: 'Start the bot / Запустить бота' },
            { command: 'help', description: 'Show help / Показать справку' },
            { command: 'status', description: 'System status / Статус системы' },
            { command: 'analyze', description: 'AI analysis / AI анализ' },
            { command: 'ai', description: 'AI top opportunities / AI возможности' },
            { command: 'settings', description: 'Configure settings / Настройки' },
            { command: 'language', description: 'Change language / Сменить язык' },
            { command: 'top', description: 'Top opportunities / Лучшие возможности' },
            { command: 'subscribe', description: 'Toggle notifications / Уведомления' },
            { command: 'webapp', description: 'Open web app / Открыть веб-приложение' },
            { command: 'stats', description: 'Show statistics / Статистика' }
        ];
        try {
            await this.bot.setMyCommands(commands);
            console.log('Bot commands menu set up successfully (bilingual)');
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
    // Start the daily summary at 12:00 GMT+5
    startSummaryInterval() {
        // Calculate time until next 12:00 GMT+5
        const now = new Date();
        const gmtPlus5 = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // Convert to GMT+5
        const next12PM = new Date(gmtPlus5);
        next12PM.setHours(12, 0, 0, 0); // Set to 12:00
        // If it's already past 12:00 today, schedule for tomorrow
        if (gmtPlus5.getHours() >= 12) {
            next12PM.setDate(next12PM.getDate() + 1);
        }
        const timeUntilNext = next12PM.getTime() - gmtPlus5.getTime();
        console.log(`Next daily summary scheduled for: ${next12PM.toISOString()} (GMT+5: 12:00)`);
        // Set initial timeout
        setTimeout(() => {
            this.sendDailySummary();
            // Then set interval for every 24 hours
            this.summaryInterval = setInterval(async () => {
                await this.sendDailySummary();
            }, 24 * 60 * 60 * 1000); // 24 hours
        }, timeUntilNext);
        console.log('Daily summary interval started - summaries will be sent daily at 12:00 GMT+5');
    }
    // Method to send daily summary to subscribed users
    async sendDailySummary() {
        try {
            const users = await this.db.getUserModel().getAllActiveUsers();
            const subscribedUsers = users.filter(user => user.preferences.notifications);
            if (subscribedUsers.length === 0) {
                this.highProfitDeals = []; // Clear the deals array
                return;
            }
            // Get opportunities from the last 24 hours
            const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(24 * 60); // 24 hours in minutes
            const highProfitOpportunities = opportunities.filter(opp => opp.profitPercentage > 2);
            for (const user of subscribedUsers) {
                try {
                    let message;
                    if (highProfitOpportunities.length === 0) {
                        message = i18n.t('notifications.no_high_profit_deals_daily', user.preferences.language);
                    }
                    else {
                        const avgProfit = highProfitOpportunities.reduce((sum, deal) => sum + deal.profitPercentage, 0) / highProfitOpportunities.length;
                        const maxProfit = Math.max(...highProfitOpportunities.map(deal => deal.profitPercentage));
                        message = i18n.formatMessage(i18n.t('notifications.daily_profit_summary', user.preferences.language), {
                            count: highProfitOpportunities.length.toString(),
                            avgProfit: avgProfit.toFixed(2),
                            maxProfit: maxProfit.toFixed(2)
                        });
                    }
                    await this.bot.sendMessage(user.telegramId, message, {
                        parse_mode: 'HTML'
                    });
                }
                catch (error) {
                    console.error(`Failed to send daily summary to user ${user.telegramId}:`, error);
                }
            }
            console.log(`Sent daily summary to ${subscribedUsers.length} users. High profit opportunities: ${highProfitOpportunities.length}`);
        }
        catch (error) {
            console.error('Error sending daily summary:', error);
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