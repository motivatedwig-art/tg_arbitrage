import TelegramBot from 'node-telegram-bot-api';
import { DatabaseManager } from '../database/Database.js';
import { CommandHandler } from './handlers/CommandHandler.js';
import { CallbackHandler } from './handlers/CallbackHandler.js';
import { ClaudeCommandHandler } from './handlers/ClaudeCommandHandler.js';
import { i18n } from '../utils/i18n.js';
import { config } from '../config/environment.js';
// These were previously loaded with require() inside a try/catch. This package
// is ESM ("type": "module"), where `require` is not defined at all, so both
// loads threw on every startup and logged "not available" as if the features
// had merely been switched off. They had never run.
//
// ContractsCommandHandler shells out to Python, but only when a command is
// invoked - importing it has no side effects - so its real availability is
// checked at runtime below rather than by whether the module can be loaded.
import { SummaryService } from '../services/SummaryService.js';
import { ContractsCommandHandler } from './handlers/ContractsCommandHandler.js';
export class CryptoArbitrageBot {
    constructor(token) {
        // Created in start() only when the Python bridge is actually usable.
        this.contractsHandler = null;
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
            // Register contract commands only where the Python bridge can run.
            // Registering them without it would leave users with commands that
            // always answer with a connection error.
            if (await ContractsCommandHandler.isAvailable()) {
                try {
                    this.contractsHandler = new ContractsCommandHandler(this.bot);
                    this.contractsHandler.registerCommands();
                }
                catch (error) {
                    console.warn('⚠️  Failed to register contracts commands:', error);
                }
            }
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
        // Set up commands in both languages - simplified version
        const commands = [
            { command: 'start', description: 'Start the bot / Запустить бота' },
            { command: 'help', description: 'Show help / Показать справку' },
            { command: 'webapp', description: 'Open web app / Открыть веб-приложение' },
            { command: 'subscribe', description: 'Toggle notifications / Уведомления' },
            { command: 'summary', description: '4-hour summary / 4-часовой отчет' },
            { command: 'contracts', description: 'Get contract addresses / Адреса контрактов' },
            { command: 'api_stats', description: 'API statistics / Статистика API' }
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
    // Start the 4-hour summary interval
    startSummaryInterval() {
        const summaryIntervalHours = parseInt(process.env.SUMMARY_INTERVAL_HOURS || '4');
        const intervalMs = summaryIntervalHours * 60 * 60 * 1000;
        // Send initial summary immediately
        this.send4HourSummary();
        // Then set interval for regular summaries
        this.summaryInterval = setInterval(async () => {
            await this.send4HourSummary();
        }, intervalMs);
        console.log(`4-hour summary interval started - summaries will be sent every ${summaryIntervalHours} hours`);
    }
    // Method to send 4-hour summary to subscribed users
    async send4HourSummary() {
        try {
            const users = await this.db.getUserModel().getAllActiveUsers();
            const subscribedUsers = users.filter(user => user.preferences.notifications);
            if (subscribedUsers.length === 0) {
                return;
            }
            // Generate summary using SummaryService
            const summaryService = SummaryService.getInstance();
            const summary = await summaryService.generate4HourSummary();
            for (const user of subscribedUsers) {
                try {
                    await this.bot.sendMessage(user.telegramId, summary, {
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true
                    });
                }
                catch (error) {
                    console.error(`Failed to send 4-hour summary to user ${user.telegramId}:`, error);
                }
            }
            console.log(`Sent 4-hour summary to ${subscribedUsers.length} users`);
        }
        catch (error) {
            console.error('Error sending 4-hour summary:', error);
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