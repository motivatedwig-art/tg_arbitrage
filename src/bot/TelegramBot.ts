import TelegramBot from 'node-telegram-bot-api';
import { DatabaseManager } from '../database/Database.js';
import { CommandHandler } from './handlers/CommandHandler.js';
import { CallbackHandler } from './handlers/CallbackHandler.js';
import { ClaudeCommandHandler } from './handlers/ClaudeCommandHandler.js';
import { i18n } from '../utils/i18n.js';
import { ArbitrageOpportunity } from '../exchanges/types/index.js';
import { config } from '../config/environment.js';

// Optional: SummaryService (may not be available in all deployments)
let SummaryService: any = null;
try {
  const summaryModule = require('../services/SummaryService.js');
  SummaryService = summaryModule.SummaryService;
} catch (error) {
  console.log('⚠️  SummaryService not available (optional feature)');
}

// Optional: Contracts command handler (requires Python)
let ContractsCommandHandler: any = null;
try {
  const contractsModule = require('./handlers/ContractsCommandHandler.js');
  ContractsCommandHandler = contractsModule.ContractsCommandHandler;
} catch (error) {
  console.log('⚠️  ContractsCommandHandler not available (Python integration optional)');
}

export class CryptoArbitrageBot {
  private bot: TelegramBot;
  private db: DatabaseManager;
  private commandHandler: CommandHandler;
  private callbackHandler: CallbackHandler;
  private claudeHandler: ClaudeCommandHandler;
  private contractsHandler: any = null; // Optional Python integration
  private isRunning: boolean = false;
  private summaryInterval: NodeJS.Timeout | null = null;
  private highProfitDeals: ArbitrageOpportunity[] = [];

  constructor(token: string) {
    this.setupEnvironmentLogging();
    // Initialize bot without polling to prevent conflicts
    this.bot = new TelegramBot(token, { polling: false });
    this.db = DatabaseManager.getInstance();
    this.commandHandler = new CommandHandler(this.bot);
    this.callbackHandler = new CallbackHandler(this.bot);
    this.claudeHandler = new ClaudeCommandHandler(this.bot);
    
    // Initialize contracts handler if available
    if (ContractsCommandHandler) {
      try {
        this.contractsHandler = new ContractsCommandHandler(this.bot);
        console.log('✅ Contracts command handler initialized');
      } catch (error) {
        console.warn('⚠️  Failed to initialize contracts handler:', error);
      }
    }

    this.setupErrorHandling();
  }

  private setupEnvironmentLogging(): void {
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

  public async start(): Promise<void> {
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
      
      // Register contracts commands if available
      if (this.contractsHandler) {
        try {
          this.contractsHandler.registerCommands();
        } catch (error) {
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
      
    } catch (error) {
      console.error('Failed to start bot:', error);
      throw error;
    }
  }

  private async startPolling(): Promise<void> {
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
    } catch (error: any) {
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

  public async stop(): Promise<void> {
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

  private setupErrorHandling(): void {
    this.bot.on('error', (error) => {
      console.error('Bot error:', error);
    });

    this.bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
    });

    // Handle unknown messages (only non-command messages)
    this.bot.on('message', (msg) => {
      // Only handle non-command text messages
      if (!msg.text || msg.text.startsWith('/')) return;
      
      // Handle non-command messages
      this.handleUnknownMessage(msg);
    });

    // Add debug logging for all messages
    this.bot.on('message', (msg) => {
      console.log(`📨 Received message: ${msg.text} from user ${msg.from?.id}`);
    });
  }

  private async handleUnknownMessage(msg: TelegramBot.Message): Promise<void> {
    try {
      const user = await this.db.getUserModel().findByTelegramId(msg.from!.id);
      const lng = user?.preferences.language || 'en';
      
      await this.bot.sendMessage(msg.chat.id, i18n.t('commands.unknown_command', lng));
    } catch (error) {
      console.error('Error handling unknown message:', error);
    }
  }

  private async setupBotCommands(): Promise<void> {
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
    } catch (error) {
      console.error('Failed to set up bot commands:', error);
    }
  }

  // Method to collect high-profit deals for summary
  public collectHighProfitDeal(opportunity: ArbitrageOpportunity): void {
    if (opportunity.profitPercentage < 2.0) return; // Only collect deals with >2% profit
    if (opportunity.profitPercentage > 110) {
      console.log(`🚨 Rejected unrealistic deal: ${opportunity.symbol} - ${opportunity.profitPercentage.toFixed(2)}% profit (${opportunity.buyExchange} → ${opportunity.sellExchange})`);
      return; // Safety check: reject deals >110% profit
    }
    
    this.highProfitDeals.push(opportunity);
    console.log(`Collected high profit deal: ${opportunity.symbol} - ${opportunity.profitPercentage.toFixed(2)}%`);
  }

  // Start the 4-hour summary interval
  private startSummaryInterval(): void {
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
  private async send4HourSummary(): Promise<void> {
    try {
      if (!SummaryService) {
        console.log('⚠️  SummaryService not available, skipping summary');
        return;
      }

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
        } catch (error) {
          console.error(`Failed to send 4-hour summary to user ${user.telegramId}:`, error);
        }
      }

      console.log(`Sent 4-hour summary to ${subscribedUsers.length} users`);
      
    } catch (error) {
      console.error('Error sending 4-hour summary:', error);
    }
  }

  // Method to send system notifications
  public async sendSystemNotification(message: string, isError: boolean = false): Promise<void> {
    try {
      const users = await this.db.getUserModel().getAllActiveUsers();
      const subscribedUsers = users.filter(user => user.preferences.notifications);

      for (const user of subscribedUsers) {
        try {
          const emoji = isError ? '⚠️' : 'ℹ️';
          const notification = `${emoji} ${message}`;

          await this.bot.sendMessage(user.telegramId, notification);
        } catch (error) {
          console.error(`Failed to send notification to user ${user.telegramId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error sending system notifications:', error);
    }
  }

  public getBot(): TelegramBot {
    return this.bot;
  }

  public isRunningBot(): boolean {
    return this.isRunning;
  }
}
